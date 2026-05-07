// vite.config.ts
import { defineConfig } from "file:///C:/Users/Alaa/Desktop/AVA_REF/AVA/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Alaa/Desktop/AVA_REF/AVA/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/Alaa/Desktop/AVA_REF/AVA/node_modules/@tailwindcss/vite/dist/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Alaa/Desktop/AVA_REF/AVA/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var localFsWriterPlugin = {
  name: "local-fs-writer",
  configureServer(server) {
    server.middlewares.use("/__localfs/write", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
        return;
      }
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw || "{}");
        const targetPath = String(body?.targetPath || "").trim();
        const contentBase64 = String(body?.contentBase64 || "").trim();
        if (!targetPath || !contentBase64) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "INVALID_PAYLOAD" }));
          return;
        }
        const normalized = targetPath.replace(/^\/([A-Za-z]:[\\/])/, "$1");
        const finalPath = path.isAbsolute(normalized) ? path.normalize(normalized) : path.resolve(__dirname, normalized);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.writeFile(finalPath, Buffer.from(contentBase64, "base64"));
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, path: finalPath }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: error?.message || "WRITE_FAILED" }));
      }
    });
    server.middlewares.use("/__localfs/delete", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
        return;
      }
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw || "{}");
        const targetPath = String(body?.targetPath || "").trim();
        if (!targetPath) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "INVALID_PAYLOAD" }));
          return;
        }
        const normalized = targetPath.replace(/^\/([A-Za-z]:[\\/])/, "$1");
        const finalPath = path.isAbsolute(normalized) ? path.normalize(normalized) : path.resolve(__dirname, normalized);
        await fs.rm(finalPath, { force: true });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, path: finalPath }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: error?.message || "DELETE_FAILED" }));
      }
    });
  }
};
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss(), localFsWriterPlugin],
  server: {
    port: 3e3,
    open: true,
    proxy: {
      "/api/ref": {
        target: "http://localhost:8090",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (res) => {
            delete res.headers["www-authenticate"];
          });
        }
      },
      "/api/wf": {
        target: "http://localhost:8843",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (res) => {
            delete res.headers["www-authenticate"];
          });
        }
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (res) => {
            delete res.headers["www-authenticate"];
          });
        }
      },
      "/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (res) => {
            delete res.headers["www-authenticate"];
          });
        }
      },
      "/alimentation-bct/": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (res) => {
            delete res.headers["www-authenticate"];
          });
        }
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBbGFhXFxcXERlc2t0b3BcXFxcQVZBX1JFRlxcXFxBVkFcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFsYWFcXFxcRGVza3RvcFxcXFxBVkFfUkVGXFxcXEFWQVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWxhYS9EZXNrdG9wL0FWQV9SRUYvQVZBL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcclxuXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xyXG5cclxuY29uc3QgbG9jYWxGc1dyaXRlclBsdWdpbiA9IHtcclxuICBuYW1lOiAnbG9jYWwtZnMtd3JpdGVyJyxcclxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyOiBhbnkpIHtcclxuICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9fX2xvY2FsZnMvd3JpdGUnLCBhc3luYyAocmVxOiBhbnksIHJlczogYW55KSA9PiB7XHJcbiAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcclxuICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogZmFsc2UsIGVycm9yOiAnTUVUSE9EX05PVF9BTExPV0VEJyB9KSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlcSkge1xyXG4gICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rIDogQnVmZmVyLmZyb20oY2h1bmspKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcmF3ID0gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4Jyk7XHJcbiAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmF3IHx8ICd7fScpO1xyXG5cclxuICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gU3RyaW5nKGJvZHk/LnRhcmdldFBhdGggfHwgJycpLnRyaW0oKTtcclxuICAgICAgICBjb25zdCBjb250ZW50QmFzZTY0ID0gU3RyaW5nKGJvZHk/LmNvbnRlbnRCYXNlNjQgfHwgJycpLnRyaW0oKTtcclxuICAgICAgICBpZiAoIXRhcmdldFBhdGggfHwgIWNvbnRlbnRCYXNlNjQpIHtcclxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogZmFsc2UsIGVycm9yOiAnSU5WQUxJRF9QQVlMT0FEJyB9KSk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIFdpbmRvd3MvVW5peCBhYnNvbHV0ZSBwYXRocyBzYWZlbHkgZm9yIGxvY2FsIGRldiB3cml0ZXMuXHJcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IHRhcmdldFBhdGgucmVwbGFjZSgvXlxcLyhbQS1aYS16XTpbXFxcXC9dKS8sICckMScpO1xyXG4gICAgICAgIGNvbnN0IGZpbmFsUGF0aCA9IHBhdGguaXNBYnNvbHV0ZShub3JtYWxpemVkKVxyXG4gICAgICAgICAgPyBwYXRoLm5vcm1hbGl6ZShub3JtYWxpemVkKVxyXG4gICAgICAgICAgOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBub3JtYWxpemVkKTtcclxuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmRpcm5hbWUoZmluYWxQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKGZpbmFsUGF0aCwgQnVmZmVyLmZyb20oY29udGVudEJhc2U2NCwgJ2Jhc2U2NCcpKTtcclxuXHJcbiAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgb2s6IHRydWUsIHBhdGg6IGZpbmFsUGF0aCB9KSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCAnV1JJVEVfRkFJTEVEJyB9KSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9fX2xvY2FsZnMvZGVsZXRlJywgYXN5bmMgKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xyXG4gICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDU7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgb2s6IGZhbHNlLCBlcnJvcjogJ01FVEhPRF9OT1RfQUxMT1dFRCcgfSkpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiByZXEpIHtcclxuICAgICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgPyBjaHVuayA6IEJ1ZmZlci5mcm9tKGNodW5rKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHJhdyA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygndXRmOCcpO1xyXG4gICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJhdyB8fCAne30nKTtcclxuXHJcbiAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IFN0cmluZyhib2R5Py50YXJnZXRQYXRoIHx8ICcnKS50cmltKCk7XHJcbiAgICAgICAgaWYgKCF0YXJnZXRQYXRoKSB7XHJcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgb2s6IGZhbHNlLCBlcnJvcjogJ0lOVkFMSURfUEFZTE9BRCcgfSkpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IHRhcmdldFBhdGgucmVwbGFjZSgvXlxcLyhbQS1aYS16XTpbXFxcXC9dKS8sICckMScpO1xyXG4gICAgICAgIGNvbnN0IGZpbmFsUGF0aCA9IHBhdGguaXNBYnNvbHV0ZShub3JtYWxpemVkKVxyXG4gICAgICAgICAgPyBwYXRoLm5vcm1hbGl6ZShub3JtYWxpemVkKVxyXG4gICAgICAgICAgOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBub3JtYWxpemVkKTtcclxuICAgICAgICBhd2FpdCBmcy5ybShmaW5hbFBhdGgsIHsgZm9yY2U6IHRydWUgfSk7XHJcblxyXG4gICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IG9rOiB0cnVlLCBwYXRoOiBmaW5hbFBhdGggfSkpO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgb2s6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgJ0RFTEVURV9GQUlMRUQnIH0pKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCksIHRhaWx3aW5kY3NzKCksIGxvY2FsRnNXcml0ZXJQbHVnaW5dLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIG9wZW46IHRydWUsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaS9yZWYnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDkwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHsgcHJveHkub24oJ3Byb3h5UmVzJywgKHJlcykgPT4geyBkZWxldGUgcmVzLmhlYWRlcnNbJ3d3dy1hdXRoZW50aWNhdGUnXTsgfSk7IH0sXHJcbiAgICAgIH0sXHJcbiAgICAgICcvYXBpL3dmJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODg0MycsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7IHByb3h5Lm9uKCdwcm94eVJlcycsIChyZXMpID0+IHsgZGVsZXRlIHJlcy5oZWFkZXJzWyd3d3ctYXV0aGVudGljYXRlJ107IH0pOyB9LFxyXG4gICAgICB9LFxyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4geyBwcm94eS5vbigncHJveHlSZXMnLCAocmVzKSA9PiB7IGRlbGV0ZSByZXMuaGVhZGVyc1snd3d3LWF1dGhlbnRpY2F0ZSddOyB9KTsgfSxcclxuICAgICAgfSxcclxuICAgICAgJy9hdXRoJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7IHByb3h5Lm9uKCdwcm94eVJlcycsIChyZXMpID0+IHsgZGVsZXRlIHJlcy5oZWFkZXJzWyd3d3ctYXV0aGVudGljYXRlJ107IH0pOyB9LFxyXG4gICAgICB9LFxyXG4gICAgICAnL2FsaW1lbnRhdGlvbi1iY3QvJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7IHByb3h5Lm9uKCdwcm94eVJlcycsIChyZXMpID0+IHsgZGVsZXRlIHJlcy5oZWFkZXJzWyd3d3ctYXV0aGVudGljYXRlJ107IH0pOyB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICdkaXN0JyxcclxuICAgIHNvdXJjZW1hcDogdHJ1ZVxyXG4gIH1cclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVMsU0FBUyxvQkFBb0I7QUFDOVQsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUx1SixJQUFNLDJDQUEyQztBQU90TyxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUU3RCxJQUFNLHNCQUFzQjtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLGdCQUFnQixRQUFhO0FBQzNCLFdBQU8sWUFBWSxJQUFJLG9CQUFvQixPQUFPLEtBQVUsUUFBYTtBQUN2RSxVQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLFlBQUksYUFBYTtBQUNqQixZQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUNoRCxZQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsSUFBSSxPQUFPLE9BQU8scUJBQXFCLENBQUMsQ0FBQztBQUNsRTtBQUFBLE1BQ0Y7QUFFQSxVQUFJO0FBQ0YsY0FBTSxTQUFtQixDQUFDO0FBQzFCLHlCQUFpQixTQUFTLEtBQUs7QUFDN0IsaUJBQU8sS0FBSyxPQUFPLFNBQVMsS0FBSyxJQUFJLFFBQVEsT0FBTyxLQUFLLEtBQUssQ0FBQztBQUFBLFFBQ2pFO0FBQ0EsY0FBTSxNQUFNLE9BQU8sT0FBTyxNQUFNLEVBQUUsU0FBUyxNQUFNO0FBQ2pELGNBQU0sT0FBTyxLQUFLLE1BQU0sT0FBTyxJQUFJO0FBRW5DLGNBQU0sYUFBYSxPQUFPLE1BQU0sY0FBYyxFQUFFLEVBQUUsS0FBSztBQUN2RCxjQUFNLGdCQUFnQixPQUFPLE1BQU0saUJBQWlCLEVBQUUsRUFBRSxLQUFLO0FBQzdELFlBQUksQ0FBQyxjQUFjLENBQUMsZUFBZTtBQUNqQyxjQUFJLGFBQWE7QUFDakIsY0FBSSxVQUFVLGdCQUFnQixrQkFBa0I7QUFDaEQsY0FBSSxJQUFJLEtBQUssVUFBVSxFQUFFLElBQUksT0FBTyxPQUFPLGtCQUFrQixDQUFDLENBQUM7QUFDL0Q7QUFBQSxRQUNGO0FBR0EsY0FBTSxhQUFhLFdBQVcsUUFBUSx1QkFBdUIsSUFBSTtBQUNqRSxjQUFNLFlBQVksS0FBSyxXQUFXLFVBQVUsSUFDeEMsS0FBSyxVQUFVLFVBQVUsSUFDekIsS0FBSyxRQUFRLFdBQVcsVUFBVTtBQUN0QyxjQUFNLEdBQUcsTUFBTSxLQUFLLFFBQVEsU0FBUyxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDM0QsY0FBTSxHQUFHLFVBQVUsV0FBVyxPQUFPLEtBQUssZUFBZSxRQUFRLENBQUM7QUFFbEUsWUFBSSxhQUFhO0FBQ2pCLFlBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELFlBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxJQUFJLE1BQU0sTUFBTSxVQUFVLENBQUMsQ0FBQztBQUFBLE1BQ3ZELFNBQVMsT0FBWTtBQUNuQixZQUFJLGFBQWE7QUFDakIsWUFBSSxVQUFVLGdCQUFnQixrQkFBa0I7QUFDaEQsWUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFLElBQUksT0FBTyxPQUFPLE9BQU8sV0FBVyxlQUFlLENBQUMsQ0FBQztBQUFBLE1BQ2hGO0FBQUEsSUFDRixDQUFDO0FBRUQsV0FBTyxZQUFZLElBQUkscUJBQXFCLE9BQU8sS0FBVSxRQUFhO0FBQ3hFLFVBQUksSUFBSSxXQUFXLFFBQVE7QUFDekIsWUFBSSxhQUFhO0FBQ2pCLFlBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELFlBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxJQUFJLE9BQU8sT0FBTyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xFO0FBQUEsTUFDRjtBQUVBLFVBQUk7QUFDRixjQUFNLFNBQW1CLENBQUM7QUFDMUIseUJBQWlCLFNBQVMsS0FBSztBQUM3QixpQkFBTyxLQUFLLE9BQU8sU0FBUyxLQUFLLElBQUksUUFBUSxPQUFPLEtBQUssS0FBSyxDQUFDO0FBQUEsUUFDakU7QUFDQSxjQUFNLE1BQU0sT0FBTyxPQUFPLE1BQU0sRUFBRSxTQUFTLE1BQU07QUFDakQsY0FBTSxPQUFPLEtBQUssTUFBTSxPQUFPLElBQUk7QUFFbkMsY0FBTSxhQUFhLE9BQU8sTUFBTSxjQUFjLEVBQUUsRUFBRSxLQUFLO0FBQ3ZELFlBQUksQ0FBQyxZQUFZO0FBQ2YsY0FBSSxhQUFhO0FBQ2pCLGNBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELGNBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxJQUFJLE9BQU8sT0FBTyxrQkFBa0IsQ0FBQyxDQUFDO0FBQy9EO0FBQUEsUUFDRjtBQUVBLGNBQU0sYUFBYSxXQUFXLFFBQVEsdUJBQXVCLElBQUk7QUFDakUsY0FBTSxZQUFZLEtBQUssV0FBVyxVQUFVLElBQ3hDLEtBQUssVUFBVSxVQUFVLElBQ3pCLEtBQUssUUFBUSxXQUFXLFVBQVU7QUFDdEMsY0FBTSxHQUFHLEdBQUcsV0FBVyxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBRXRDLFlBQUksYUFBYTtBQUNqQixZQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUNoRCxZQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsSUFBSSxNQUFNLE1BQU0sVUFBVSxDQUFDLENBQUM7QUFBQSxNQUN2RCxTQUFTLE9BQVk7QUFDbkIsWUFBSSxhQUFhO0FBQ2pCLFlBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELFlBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxJQUFJLE9BQU8sT0FBTyxPQUFPLFdBQVcsZ0JBQWdCLENBQUMsQ0FBQztBQUFBLE1BQ2pGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLEdBQUcsbUJBQW1CO0FBQUEsRUFDckQsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFBRSxnQkFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRO0FBQUUsbUJBQU8sSUFBSSxRQUFRLGtCQUFrQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUN0RztBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFBRSxnQkFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRO0FBQUUsbUJBQU8sSUFBSSxRQUFRLGtCQUFrQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUN0RztBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFBRSxnQkFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRO0FBQUUsbUJBQU8sSUFBSSxRQUFRLGtCQUFrQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUN0RztBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFBRSxnQkFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRO0FBQUUsbUJBQU8sSUFBSSxRQUFRLGtCQUFrQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUN0RztBQUFBLE1BQ0Esc0JBQXNCO0FBQUEsUUFDcEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFBRSxnQkFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRO0FBQUUsbUJBQU8sSUFBSSxRQUFRLGtCQUFrQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUN0RztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsRUFDYjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
