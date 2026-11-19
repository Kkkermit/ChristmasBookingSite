import { createApp, type Handler } from './app.js';
import { BOOKING_FORM_TEMPLATE_BASE64 } from './assets/booking-form-template.js';
import { ConfigError, loadConfig } from './config.js';
import { chooseStore, createStore } from './store/index.js';

let templateBytes: Uint8Array | null = null;

/**
 * The blank booking form. It's embedded in the code (generated from
 * server/assets/booking-form-template.pdf) so the Vercel Function has no
 * extra files to bundle.
 */
export async function loadTemplate(): Promise<Uint8Array> {
  templateBytes ??= new Uint8Array(Buffer.from(BOOKING_FORM_TEMPLATE_BASE64, 'base64'));
  return templateBytes;
}

let app: Promise<Handler> | null = null;

function getApp(): Promise<Handler> {
  app ??= (async () => {
    const config = loadConfig(process.env);
    const store = await createStore(chooseStore(process.env, config.isProduction));
    return createApp({ config, store, loadTemplate });
  })().catch((err) => {
    app = null; // retry on the next request (e.g. a transient Redis outage)
    throw err;
  });
  return app;
}

/** Entry point shared by the Vercel function and the Vite dev server. */
export async function handleRequest(request: Request): Promise<Response> {
  try {
    return await (await getApp())(request);
  } catch (err) {
    console.error('API failed to start', err);
    const message =
      err instanceof ConfigError ? err.message : 'The server could not start. Check the Vercel function logs.';
    return Response.json(
      { error: message, code: 'CONFIG' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
