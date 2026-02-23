export function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function methodNotAllowed() {
  return new Response('Method Not Allowed', { status: 405 });
}

export async function readJson(request) {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

export function normalizeProjectId(payload, fallbackId) {
  if (payload && typeof payload === 'object' && typeof payload.id === 'string') {
    const trimmed = payload.id.trim();
    if (trimmed) return trimmed;
  }
  return fallbackId;
}

export function parseStoredJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeName(value, fallback) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}
