import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import type {RegionId, TrendClassification, VariableId} from './src/types/omi.ts';
import {compareRegions} from './server/processing/comparison.ts';
import {extractObservationsFromCsv, parseCsvText} from './server/processing/csvProcessor.ts';
import {runStatisticalAnalysis} from './server/processing/trendAnalysis.ts';
import {
  createTrendChallenge,
  getChallengeProgress,
  getDatasetById,
  listAllDatasets,
  saveUploadedDataset,
  submitTrendChallengeAnswer,
} from './server/services/datasetStore.ts';
import {askGeminiAssistant} from './server/services/geminiService.ts';
import {fetchNasaPowerSeries, STUDY_REGIONS} from './server/services/nasaPower.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({limit: '4mb'}));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 10 * 1024 * 1024}, // 10 MB CSV limit
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Fetch real NASA POWER observations & compute statistics for Lagos or Edo
  app.get('/api/regions/:region', async (req: Request, res: Response) => {
    try {
      const regionParam = String(req.params.region || '').toLowerCase();
      if (regionParam !== 'lagos' && regionParam !== 'edo') {
        res.status(400).json({error: 'Region must be either "lagos" or "edo".'});
        return;
      }

      const variableParam = String(req.query.variable || 'temperature').toLowerCase();
      if (variableParam !== 'temperature' && variableParam !== 'rainfall') {
        res.status(400).json({error: 'Variable must be "temperature" or "rainfall".'});
        return;
      }

      const startYear = Number(req.query.startYear || 2005);
      const endYear = Number(req.query.endYear || 2023);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear > endYear) {
        res.status(400).json({error: 'Invalid historical year range provided.'});
        return;
      }

      const dataset = await fetchNasaPowerSeries({
        region: regionParam,
        variable: variableParam,
        startYear,
        endYear,
      });

      // Also keep in session list so Dashboard, Comparison, and AI Assistant can reference it by ID
      saveUploadedDataset(dataset);
      res.json(dataset);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve regional environmental dataset.';
      res.status(502).json({error: message});
    }
  });

  // Upload and analyse a real CSV dataset
  app.post('/api/datasets/upload', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({error: 'No CSV file was uploaded.'});
        return;
      }

      const csvText = req.file.buffer.toString('utf8');
      const dateColumn = String(req.body.dateColumn || '').trim();
      const valueColumn = String(req.body.valueColumn || '').trim();
      const variable = (String(req.body.variable || 'temperature').trim() as VariableId) || 'temperature';
      const unit = String(req.body.unit || '').trim();
      const region = (String(req.body.region || 'lagos').trim() as RegionId) || 'lagos';
      const customRegion = String(req.body.customRegion || '').trim();
      const sourceLabel = String(req.body.sourceLabel || '').trim();
      const description = String(req.body.description || '').trim();

      if (!dateColumn || !valueColumn) {
        res.status(400).json({error: 'Both dateColumn and valueColumn must be selected.'});
        return;
      }
      if (!unit) {
        res.status(400).json({error: 'Measurement unit is required (e.g., °C or mm).'});
        return;
      }

      const parsed = parseCsvText(csvText);
      const extracted = extractObservationsFromCsv(parsed, dateColumn, valueColumn);
      const analysis = runStatisticalAnalysis(extracted.observations, {
        totalRows: extracted.totalRows,
        missingOrInvalidRows: extracted.missingOrInvalidRows,
        duplicateDatesCount: extracted.duplicateDatesCount,
        unit,
        variable,
        alpha: 0.05,
      });

      const regionMeta = region === 'lagos' || region === 'edo' ? STUDY_REGIONS[region] : null;
      const regionLabel =
        region === 'custom'
          ? customRegion || 'Custom Study Region'
          : regionMeta
            ? regionMeta.label
            : 'Lagos State';

      const id = `csv_${crypto.randomUUID().slice(0, 8)}`;
      const dataset = {
        metadata: {
          id,
          name: req.file.originalname.replace(/\.csv$/i, '') || 'Uploaded Dataset',
          source: sourceLabel || `Uploaded CSV (${req.file.originalname})`,
          sourceType: 'uploaded_csv' as const,
          region,
          regionLabel,
          coordinates: regionMeta?.coordinates,
          variable,
          unit,
          description: description || undefined,
          granularity: extracted.granularity,
          createdAt: new Date().toISOString(),
        },
        analysis,
        warnings: extracted.warnings,
      };

      saveUploadedDataset({metadata: dataset.metadata, analysis: dataset.analysis});
      res.json(dataset);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to parse or analyse the uploaded CSV file.';
      res.status(400).json({error: message});
    }
  });

  app.get('/api/datasets', (_req, res) => {
    res.json({datasets: listAllDatasets()});
  });

  app.get('/api/datasets/:id', (req, res) => {
    const found = getDatasetById(String(req.params.id));
    if (!found) {
      res.status(404).json({error: 'Dataset not found.'});
      return;
    }
    res.json(found);
  });

  // Regional comparison (either two uploaded/stored dataset IDs or aligned NASA POWER series for Lagos & Edo)
  app.post('/api/compare', async (req: Request, res: Response) => {
    try {
      const mode = String(req.body?.mode || 'nasa');

      if (mode === 'datasets') {
        const lagosId = String(req.body?.lagosDatasetId || '');
        const edoId = String(req.body?.edoDatasetId || '');
        const lagosDs = getDatasetById(lagosId);
        const edoDs = getDatasetById(edoId);

        if (!lagosDs || !edoDs) {
          res.status(400).json({error: 'Select both a Lagos dataset and an Edo dataset to compare.'});
          return;
        }

        const result = compareRegions(lagosDs, edoDs);
        res.json({comparison: result, lagosDataset: lagosDs, edoDataset: edoDs});
        return;
      }

      const variable = req.body?.variable === 'rainfall' ? 'rainfall' : 'temperature';
      const startYear = Number(req.body?.startYear || 2005);
      const endYear = Number(req.body?.endYear || 2023);

      const [lagosDs, edoDs] = await Promise.all([
        fetchNasaPowerSeries({region: 'lagos', variable, startYear, endYear}),
        fetchNasaPowerSeries({region: 'edo', variable, startYear, endYear}),
      ]);

      saveUploadedDataset(lagosDs);
      saveUploadedDataset(edoDs);

      const result = compareRegions(lagosDs, edoDs);
      res.json({comparison: result, lagosDataset: lagosDs, edoDataset: edoDs});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete regional comparison.';
      res.status(502).json({error: message});
    }
  });

  // Trend Detective Challenge endpoints
  app.get('/api/challenge/progress', (_req, res) => {
    res.json(getChallengeProgress());
  });

  app.post('/api/challenge/new', async (req: Request, res: Response) => {
    try {
      const region = req.body?.region === 'lagos' || req.body?.region === 'edo' ? req.body.region : undefined;
      const variable =
        req.body?.variable === 'temperature' || req.body?.variable === 'rainfall' ? req.body.variable : undefined;
      const datasetId = req.body?.datasetId ? String(req.body.datasetId) : undefined;

      const challenge = await createTrendChallenge({region, variable, datasetId});
      res.json({challenge, progress: getChallengeProgress()});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate Trend Detective Challenge.';
      res.status(400).json({error: message});
    }
  });

  app.post('/api/challenge/:id/submit', (req: Request, res: Response) => {
    try {
      const challengeId = String(req.params.id || '');
      const selectedAnswer = String(req.body?.answer || '') as TrendClassification;
      const submission = submitTrendChallengeAnswer(challengeId, selectedAnswer);
      res.json({submission, progress: getChallengeProgress()});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to validate challenge answer.';
      res.status(400).json({error: message});
    }
  });

  // Gemini AI Assistant endpoint (strictly grounded in computed dataset/comparison context)
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    try {
      const question = String(req.body?.question || '').trim();
      if (!question) {
        res.status(400).json({error: 'Please enter a question for the AI Assistant.'});
        return;
      }

      const datasetId = req.body?.datasetId ? String(req.body.datasetId) : null;
      const activeDataset = datasetId ? getDatasetById(datasetId) || null : null;
      const comparison = req.body?.comparison || null;
      const history = Array.isArray(req.body?.history) ? req.body.history : [];

      if (!activeDataset && !comparison) {
        res.status(400).json({
          error:
            'No analysed dataset or comparison is currently active. Load a regional dataset on the Dashboard, upload a CSV file, or run a Comparison first.',
        });
        return;
      }

      const reply = await askGeminiAssistant({
        question,
        history,
        activeDataset,
        comparison,
      });

      res.json({reply});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini Assistant request failed.';
      const status =
        message.includes('GEMINI_API_KEY') || message.includes('high demand') || message.includes('UNAVAILABLE')
          ? 503
          : 500;
      res.status(status).json({error: message});
    }
  });

  // Global API error handler (including multer file size errors)
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    res.status(400).json({error: message});
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Omi AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
