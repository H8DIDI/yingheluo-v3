import {
  jsonResponse,
  methodNotAllowed,
  normalizeName,
  normalizeProjectId,
  readJson,
} from './_utils.js';

const LIST_SQL = `
  SELECT id, project_id as projectId, name, created_at as createdAt, updated_at as updatedAt
  FROM projects
  ORDER BY updated_at DESC
`;

const INSERT_SQL = `
  INSERT INTO projects (id, project_id, name, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`;

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    const result = await env.DB.prepare(LIST_SQL).all();
    return jsonResponse(result.results ?? []);
  }

  if (request.method === 'POST') {
    const parsed = await readJson(request);
    if (!parsed.ok || !parsed.data || typeof parsed.data !== 'object') {
      return jsonResponse({ error: 'INVALID_JSON' }, { status: 400 });
    }

    const payload = parsed.data;
    const recordId =
      typeof payload.id === 'string' && payload.id.trim()
        ? payload.id.trim()
        : crypto.randomUUID();
    const projectId = normalizeProjectId(payload.data, recordId);
    const name = normalizeName(payload.name, 'Untitled Project');
    const data = payload.data ?? {};
    const now = new Date().toISOString();

    await env.DB.prepare(INSERT_SQL).bind(
      recordId,
      projectId,
      name,
      JSON.stringify(data),
      now,
      now
    ).run();

    return jsonResponse(
      {
        id: recordId,
        projectId,
        name,
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 }
    );
  }

  return methodNotAllowed();
}
