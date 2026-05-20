import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localFsWriterPlugin = {
  name: 'local-fs-writer',
  configureServer(server: any) {
    server.middlewares.use('/__localfs/write', async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
        return;
      }

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = JSON.parse(raw || '{}');

        const targetPath = String(body?.targetPath || '').trim();
        const contentBase64 = String(body?.contentBase64 || '').trim();
        if (!targetPath || !contentBase64) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'INVALID_PAYLOAD' }));
          return;
        }

        // Resolve Windows/Unix absolute paths safely for local dev writes.
        const normalized = targetPath.replace(/^\/([A-Za-z]:[\\/])/, '$1');
        const finalPath = path.isAbsolute(normalized)
          ? path.normalize(normalized)
          : path.resolve(__dirname, normalized);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.writeFile(finalPath, Buffer.from(contentBase64, 'base64'));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, path: finalPath }));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: error?.message || 'WRITE_FAILED' }));
      }
    });

    server.middlewares.use('/__localfs/delete', async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
        return;
      }

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = JSON.parse(raw || '{}');

        const targetPath = String(body?.targetPath || '').trim();
        if (!targetPath) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'INVALID_PAYLOAD' }));
          return;
        }

        const normalized = targetPath.replace(/^\/([A-Za-z]:[\\/])/, '$1');
        const finalPath = path.isAbsolute(normalized)
          ? path.normalize(normalized)
          : path.resolve(__dirname, normalized);
        await fs.rm(finalPath, { force: true });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, path: finalPath }));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: error?.message || 'DELETE_FAILED' }));
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), localFsWriterPlugin],
  publicDir: 'components/public',
  server: {
    port: 3000,
    open: true,
    proxy: {
      // DEC auth — must be before /api/dc-ava to avoid prefix conflict
      '^/api/dec-auth': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/dec-auth/, '/api/auth'),
      },
      // DEC microservice (port 8086) — must be listed before the generic /api rule.
      '^/api/dc-ava': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
    
      '^/(api|auth|alimentation-bct)': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
