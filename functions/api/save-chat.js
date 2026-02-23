import { jsonResponse, methodNotAllowed, parseStoredJson, readJson } from './_utils.js';

const INSERT_SQL = `
  INSERT INTO chat_log (user_input, ai_output, created_at)
  VALUES (?, ?, ?)
`;

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return methodNotAllowed();
  }

  const parsed = await readJson(request);
  if (!parsed.ok || !parsed.data || typeof parsed.data !== 'object') {
    return jsonResponse({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const payload = parsed.data;
  const promptSource =
    payload.prompt ?? payload.userInput ?? payload.user_input ?? payload.input ?? '';
  const prompt =
    typeof promptSource === 'string' && promptSource.trim()
      ? promptSource.trim()
      : '';
  if (!prompt) {
    return jsonResponse({ error: 'INVALID_PROMPT' }, { status: 400 });
  }

  const planPayload = payload.plan ?? payload.jsonPlan ?? payload.json_plan;
  if (!planPayload) {
    return jsonResponse({ error: 'INVALID_PLAN' }, { status: 400 });
  }

  const assistantMessage =
    typeof payload.assistantMessage === 'string'
      ? payload.assistantMessage
      : typeof payload.assistant_message === 'string'
        ? payload.assistant_message
        : typeof payload.reply === 'string'
          ? payload.reply
          : '';

  const outputType =
    typeof payload.type === 'string' && payload.type.trim() ? payload.type.trim() : 'plan';
  const aiOutput = JSON.stringify({
    type: outputType,
    assistantMessage,
    jsonPlan: planPayload,
  });
  const now = new Date().toISOString();

  const result = await env.DB.prepare(INSERT_SQL).bind(prompt, aiOutput, now).run();
  const meta = result.meta ?? {};
  const recordId = String(meta.last_row_id ?? meta.lastRowId ?? crypto.randomUUID());

  return jsonResponse(
    {
      id: recordId,
      prompt,
      aiOutput: parseStoredJson(aiOutput),
      createdAt: now,
    },
    { status: 201 }
  );
}
