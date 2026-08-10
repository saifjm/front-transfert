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
        res.end(
          JSON.stringify({
            ok: false,
            error: 'METHOD_NOT_ALLOWED',
          }),
        );
        return;
      }

      try {
        const chunks: Buffer[] = [];

        for await (const chunk of req) {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk),
          );
        }

        const raw = Buffer.concat(chunks).toString('utf8');
        const body = JSON.parse(raw || '{}');

        const targetPath = String(
          body?.targetPath || '',
        ).trim();

        const contentBase64 = String(
          body?.contentBase64 || '',
        ).trim();

        if (!targetPath || !contentBase64) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: 'INVALID_PAYLOAD',
            }),
          );
          return;
        }

        const normalized = targetPath.replace(
          /^\/([A-Za-z]:[\\/])/,
          '$1',
        );

        const finalPath = path.isAbsolute(normalized)
          ? path.normalize(normalized)
          : path.resolve(__dirname, normalized);

        await fs.mkdir(path.dirname(finalPath), {
          recursive: true,
        });

        await fs.writeFile(
          finalPath,
          Buffer.from(contentBase64, 'base64'),
        );

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            path: finalPath,
          }),
        );
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: false,
            error: error?.message || 'WRITE_FAILED',
          }),
        );
      }
    });

    server.middlewares.use('/__localfs/delete', async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: false,
            error: 'METHOD_NOT_ALLOWED',
          }),
        );
        return;
      }

      try {
        const chunks: Buffer[] = [];

        for await (const chunk of req) {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk),
          );
        }

        const raw = Buffer.concat(chunks).toString('utf8');
        const body = JSON.parse(raw || '{}');

        const targetPath = String(
          body?.targetPath || '',
        ).trim();

        if (!targetPath) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: 'INVALID_PAYLOAD',
            }),
          );
          return;
        }

        const normalized = targetPath.replace(
          /^\/([A-Za-z]:[\\/])/,
          '$1',
        );

        const finalPath = path.isAbsolute(normalized)
          ? path.normalize(normalized)
          : path.resolve(__dirname, normalized);

        await fs.rm(finalPath, {
          force: true,
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            path: finalPath,
          }),
        );
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: false,
            error: error?.message || 'DELETE_FAILED',
          }),
        );
      }
    });
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localFsWriterPlugin,
  ],

  publicDir: 'components/public',

  server: {
    port: 3000,
    open: true,

    proxy: {
      /*
       * BNA Bank Mock Server
       *
       * These routes must be declared before the generic /api proxy,
       * otherwise they will be forwarded to port 8888.
       */
      '^/api/v1/bna': {
        target: 'http://localhost:8095',
        changeOrigin: true,
      },

      /*
       * Health check and state reset endpoints:
       *
       * GET  /api/v1/mock/health
       * POST /api/v1/mock/reset
       */
      '^/api/v1/mock': {
        target: 'http://localhost:8095',
        changeOrigin: true,
      },

      '^/api/ms-tr': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },

      /*
       * Local callback receiver exposed by the mock server.
       * Keep this route only for local end-to-end tests.
       */
      '^/api/v1/ibansys/back-office/callback': {
        target: 'http://localhost:8095',
        changeOrigin: true,
      },

      /*
       * DEC authentication.
       * Must remain before /api/dc-ava.
       */
      '^/api/dec-auth': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (requestPath: string) =>
          requestPath.replace(
            /^\/api\/dec-auth/,
            '/api/auth',
          ),
      },

      /*
       * DEC microservice.
       */
      '^/api/dc-ava': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },

      /*
       * Generic IBANSYS backend proxy.
       * Must remain last because it captures every /api route
       * not matched by a more specific rule above.
       */
      '^/(api|auth|alimentation-bct)': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});