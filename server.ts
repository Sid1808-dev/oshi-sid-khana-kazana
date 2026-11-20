import path from 'node:path';
import express from 'express';
import {
  KitchenHttpError,
  recommendWithOpenRouter,
  scanIngredientsWithOpenRouter,
  type ServerImageInput,
} from './server/openrouterKitchen.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  app.post('/api/kitchen/scan', async (req, res) => {
    try {
      const body = (req.body || {}) as { images?: ServerImageInput[]; model?: string };
      const result = await scanIngredientsWithOpenRouter(body.images ?? [], body.model);
      res.json(result);
    } catch (err) {
      const status = err instanceof KitchenHttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : 'Unable to scan fridge photos.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/kitchen/recommend', async (req, res) => {
    try {
      const result = await recommendWithOpenRouter(req.body || {});
      res.json(result);
    } catch (err) {
      const status = err instanceof KitchenHttpError ? err.status : 500;
      const message =
        err instanceof Error ? err.message : 'Unable to generate recipe recommendations.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

void startServer();
