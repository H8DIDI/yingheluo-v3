import {
  jsonResponse,
  methodNotAllowed,
  normalizeName,
  normalizeProjectId,
  parseStoredJson,
  readJson,
} from '../_utils.js';

const DETAIL_SQL = `
  SELECT id, project_id as projectId, name, data, created_at as createdAt, updated_at as updatedAt
  FROM projects
  WHERE id = ?
`;

const CURRENT_SQL = `
  SELECT id, project_id as projectId, name
  FROM projects
  WHERE id = ?
`;

const UPDATE_DATA_SQL = `
  UPDATE projects
  SET name = ?, project_id = ?, data = ?, updated_at = ?
  WHERE id = ?
`;

const UPDATE_META_SQL = `
  UPDATE projects
  SET name = ?, updated_at = ?
  WHERE id = ?
`;

const DELETE_SQL = 'DELETE FROM projects WHERE id = ?';

export async function onRequest({ request, env, params }) {
  const id = params?.id ? String(params.id) : '';
  if (!id) {
    return jsonResponse({ error: 'MISSING_ID' }, { status: 400 });
  }

  if (request.method === 'GET') {
    const row = await env.DB.prepare(DETAIL_SQL).bind(id).first();
    if (!row) {
      return jsonResponse({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return jsonResponse({
      ...row,
      data: parseStoredJson(row.data),
    });
  }

  if (request.method === 'PUT') {
    const parsed = await readJson(request);
    if (!parsed.ok || !parsed.data || typeof parsed.data !== 'object') {
      return jsonResponse({ error: 'INVALID_JSON' }, { status: 400 });
    }

    const payload = parsed.data;
    const current = await env.DB.prepare(CURRENT_SQL).bind(id).first();
    if (!current) {
      return jsonResponse({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const name = normalizeName(payload.name, current.name);
    const hasData = Object.prototype.hasOwnProperty.call(payload, 'data');
    const data = hasData ? payload.data : null;
    const projectId = data ? normalizeProjectId(data, current.projectId) : current.projectId;
    const now = new Date().toISOString();

    if (data) {
      await env.DB.prepare(UPDATE_DATA_SQL).bind(
        name,
        projectId,
        JSON.stringify(data),
        now,
        id
      ).run();
    } else {
      await env.DB.prepare(UPDATE_META_SQL).bind(name, now, id).run();
    }

    return jsonResponse({
      id,
      projectId,
      name,
      updatedAt: now,
    });
  }

  if (request.method === 'DELETE') {
    const result = await env.DB.prepare(DELETE_SQL).bind(id).run();
    const changes = result?.meta?.changes ?? 0;
    return jsonResponse({ ok: changes > 0 });
  }

  return methodNotAllowed();
}
