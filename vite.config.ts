/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const method = req.method ?? 'GET';
  let body: Uint8Array | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = new Uint8Array(Buffer.concat(chunks));
  }
  return new Request(url, { method, headers, body: body as BodyInit | undefined });
}

async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  const cookies = response.headers.getSetCookie();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Serves the same API that runs on Vercel (server/runtime.ts) from the Vite
 * dev server, backed by a local JSON file in .data/ - so `npm run dev` is the
 * whole site, no Vercel CLI needed.
 */
function devApi(): Plugin {
  return {
    name: 'xmas-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !/^\/api(\/|\?|$)/.test(req.url)) return next();
        try {
          const runtime = (await server.ssrLoadModule('/server/runtime.ts')) as typeof import('./server/runtime.js');
          await sendWebResponse(res, await runtime.handleRequest(await toWebRequest(req)));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  build: {
    target: 'es2022',
    rolldownOptions: {
      // Two pages: the public login page and the private app. The fixed
      // prefixes let middleware.ts serve login-* and shared-* files to anyone,
      // while app-* (menu, orders UI) is only served after logging in.
      // scripts/check-public-assets.mjs verifies nothing private leaks.
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'login' ? 'assets/login-[hash].js' : 'assets/app-[hash].js'),
        chunkFileNames: 'assets/shared-[hash].js',
        assetFileNames: 'assets/shared-[hash][extname]',
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
});
