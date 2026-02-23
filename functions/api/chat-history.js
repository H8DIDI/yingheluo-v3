import { jsonResponse, methodNotAllowed, parseStoredJson, readJson } from './_utils.js';

const LIST_SQL = `
  SELECT id, user_input as prompt, ai_output as aiOutput, created_at as createdAt
  FROM chat_log
  ORDER BY created_at DESC
  LIMIT 30
`;

const INSERT_SQL = `
  INSERT INTO chat_log (user_input, ai_output, created_at)
  VALUES (?, ?, ?)
`;

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type')?.trim().toLowerCase();
    const result = await env.DB.prepare(LIST_SQL).all();
    let rows = (result.results ?? []).map((row) => {
      const aiOutput = parseStoredJson(row.aiOutput);
      const isObject = aiOutput && typeof aiOutput === 'object';
      const jsonPlan = isObject ? aiOutput.jsonPlan ?? aiOutput.plan : undefined;
      const assistantMessage = isObject
        ? aiOutput.assistantMessage ?? aiOutput.message
        : undefined;
      const type = isObject ? aiOutput.type : undefined;
      return {
        id: row.id,
        prompt: row.prompt,
        aiOutput,
        jsonPlan,
        assistantMessage,
        type,
        createdAt: row.createdAt,
      };
    });
    if (typeFilter) {
      rows = rows.filter((row) =>
        row.type === typeFilter ||
        (typeFilter === 'plan' && row.jsonPlan)
      );
    }
    return jsonResponse(rows.slice(0, 10));
  }

  if (request.method === 'POST') {
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

    const logType =
      typeof payload.type === 'string' && payload.type.trim()
        ? payload.type.trim()
        : undefined;
    const planPayload = payload.jsonPlan ?? payload.json_plan ?? payload.plan;
    const assistantMessage =
      payload.assistantMessage ?? payload.assistant_message ?? payload.reply;
    const outputPayload = payload.aiOutput ?? payload.ai_output ?? payload.output;

    if (!outputPayload && !assistantMessage && !planPayload) {
      return jsonResponse({ error: 'INVALID_OUTPUT' }, { status: 400 });
    }

    let aiOutput = '';
    if (outputPayload) {
      aiOutput =
        typeof outputPayload === 'string' ? outputPayload : JSON.stringify(outputPayload);
    } else {
      const payloadType = logType ?? (planPayload ? 'plan' : 'chat');
      aiOutput = JSON.stringify({
        type: payloadType,
        assistantMessage: assistantMessage ?? '',
        jsonPlan: planPayload ?? undefined,
      });
    }
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

  return methodNotAllowed();
}
