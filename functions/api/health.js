import { jsonResponse } from './_utils.js';

export async function onRequest({ env }) {
  const uptimeSource = typeof performance !== 'undefined' ? performance.now() : 0;
  const uptimeSec = Math.round(uptimeSource / 1000);
  const dbPath = env && env.DB_NAME ? String(env.DB_NAME) : 'cloudflare-d1';

  return jsonResponse({
    ok: true,
    dbPath,
    time: new Date().toISOString(),
    uptimeSec,
  });
}
