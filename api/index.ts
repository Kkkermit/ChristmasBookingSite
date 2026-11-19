// The one and only Vercel Function. vercel.json rewrites every /api/* request
// here; server/app.ts does the routing and checks the session cookie on every
// endpoint except login/logout.
import { handleRequest } from '../server/runtime.js';

export default {
  fetch: handleRequest,
};
