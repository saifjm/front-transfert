import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type JsonObject = Record<string, unknown>;

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: JsonObject,
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(
  req: IncomingMessage,
): Promise<JsonObject> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk),
    );
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}') as JsonObject;
}

function normalizeTargetPath(
  targetPath: string,
  projectRoot: string,
): string {
  const normalized = targetPath.replace(
    /^\/([A-Za-z]:[\\/])/,
    '$1',
  );

  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(projectRoot, normalized);
}

function isPathInside(
  candidatePath: string,
  allowedRoot: string,
): boolean {
  const relative = path.relative(
    path.resolve(allowedRoot),
    path.resolve(candidatePath),
  );

  return (
    relative === ''
    || (
      !relative.startsWith('..')
      && !path.isAbsolute(relative)
    )
  );
}

function createLocalFsWriterPlugin(
  allowedRoots: string[],
): Plugin {
  const resolvedAllowedRoots = allowedRoots.map(root =>
    path.resolve(root),
  );

  const resolveAllowedPath = (targetPath: string) => {
    const finalPath = normalizeTargetPath(
      targetPath,
      __dirname,
    );

    const allowed = resolvedAllowedRoots.some(root =>
      isPathInside(finalPath, root),
    );

    if (!allowed) {
      throw new Error('TARGET_PATH_NOT_ALLOWED');
    }

    return finalPath;
  };

  return {
    name: 'local-fs-writer',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/__localfs/write',
        async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, {
              ok: false,
              error: 'METHOD_NOT_ALLOWED',
            });
            return;
          }

          try {
            const body = await readJsonBody(req);

            const targetPath = String(
              body.targetPath || '',
            ).trim();

            const contentBase64 = String(
              body.contentBase64 || '',
            ).trim();

            if (!targetPath || !contentBase64) {
              sendJson(res, 400, {
                ok: false,
                error: 'INVALID_PAYLOAD',
              });
              return;
            }

            const finalPath =
              resolveAllowedPath(targetPath);

            await fs.mkdir(path.dirname(finalPath), {
              recursive: true,
            });

            await fs.writeFile(
              finalPath,
              Buffer.from(contentBase64, 'base64'),
            );

            sendJson(res, 200, {
              ok: true,
              path: finalPath,
            });
          } catch (error) {
            sendJson(res, 500, {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'WRITE_FAILED',
            });
          }
        },
      );

      server.middlewares.use(
        '/__localfs/delete',
        async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, {
              ok: false,
              error: 'METHOD_NOT_ALLOWED',
            });
            return;
          }

          try {
            const body = await readJsonBody(req);

            const targetPath = String(
              body.targetPath || '',
            ).trim();

            if (!targetPath) {
              sendJson(res, 400, {
                ok: false,
                error: 'INVALID_PAYLOAD',
              });
              return;
            }

            const finalPath =
              resolveAllowedPath(targetPath);

            await fs.rm(finalPath, {
              force: true,
            });

            sendJson(res, 200, {
              ok: true,
              path: finalPath,
            });
          } catch (error) {
            sendJson(res, 500, {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'DELETE_FAILED',
            });
          }
        },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const refProxyTarget =
    String(env.REF_PROXY_TARGET || '').trim();

  const domiProxyTarget =
    String(env.DOMI_PROXY_TARGET || '').trim();

  const domiBearerToken =
    String(env.DOMI_BEARER_TOKEN || '').trim();

  const bnaMockProxyTarget =
    String(env.BNA_MOCK_PROXY_TARGET || '').trim();

  const msTrProxyTarget =
    String(env.MS_TR_PROXY_TARGET || '').trim();

  const decProxyTarget =
    String(env.DEC_PROXY_TARGET || '').trim();

  const ibansysProxyTarget =
    String(env.IBANSYS_PROXY_TARGET || '').trim();

  const localFsAllowedRoots = String(
    env.LOCAL_FS_ALLOWED_ROOTS || __dirname,
  )
    .split(path.delimiter)
    .map(value => value.trim())
    .filter(Boolean);

  const proxy: Record<string, any> = {};

  if (refProxyTarget) {
    proxy['^/api/ref'] = {
      target: refProxyTarget,
      changeOrigin: true,
    };
  }

  if (domiProxyTarget) {
    proxy['^/api/domi'] = {
      target: domiProxyTarget,
      changeOrigin: true,
      rewrite: (requestPath: string) =>
        requestPath.replace(
          /^\/api\/domi/,
          '/api/v1',
        ),
      configure(proxyServer: any) {
        if (!domiBearerToken) {
          return;
        }

        proxyServer.on(
          'proxyReq',
          (proxyReq: any) => {
            proxyReq.setHeader(
              'Authorization',
              `Bearer ${domiBearerToken}`,
            );
          },
        );
      },
    };
  }

  if (bnaMockProxyTarget) {
    proxy['^/api/v1/bna'] = {
      target: bnaMockProxyTarget,
      changeOrigin: true,
    };

    proxy['^/api/v1/mock'] = {
      target: bnaMockProxyTarget,
      changeOrigin: true,
    };
  }

  if (msTrProxyTarget) {
    proxy['^/api/ms-tr'] = {
      target: msTrProxyTarget,
      changeOrigin: true,
    };
  }

  if (bnaMockProxyTarget) {
    proxy['^/api/v1/ibansys/back-office/callback'] = {
      target: bnaMockProxyTarget,
      changeOrigin: true,
    };
  }

  if (decProxyTarget) {
    proxy['^/api/dec-auth'] = {
      target: decProxyTarget,
      changeOrigin: true,
      rewrite: (requestPath: string) =>
        requestPath.replace(
          /^\/api\/dec-auth/,
          '/api/auth',
        ),
    };

    proxy['^/api/dc-ava'] = {
      target: decProxyTarget,
      changeOrigin: true,
    };
  }

  if (ibansysProxyTarget) {
    proxy['^/(api|auth|alimentation-bct)'] = {
      target: ibansysProxyTarget,
      changeOrigin: true,
    };
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      createLocalFsWriterPlugin(
        localFsAllowedRoots,
      ),
    ],

    publicDir: 'components/public',

    server: {
      port: 3000,
      open: true,
      proxy,
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
