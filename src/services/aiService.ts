// AI Service - Chat functionality for AI assistant

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestOptions {
  signal?: AbortSignal;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

const AI_API_URL =
  (import.meta.env.VITE_AI_API_URL as string | undefined) ?? 'https://openrouter.ai/api/v1';
const AI_API_KEY =
  (import.meta.env.VITE_AI_API_KEY as string | undefined) ?? '';
const AI_MODEL =
  (import.meta.env.VITE_AI_MODEL as string | undefined) ?? 'xiaomi/mimo-v2-flash:free';

function normalizeAiUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const candidates = hasScheme ? [trimmed] : [`https://${trimmed}`, trimmed];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      const pathname = url.pathname.replace(/\/+$/, '');
      if (!pathname || pathname === '/') {
        url.pathname = '/v1/chat/completions';
        return url.toString();
      }
      if (pathname.endsWith('/v1')) {
        url.pathname = `${pathname}/chat/completions`;
        return url.toString();
      }
      return url.toString();
    } catch {
      // Try next candidate.
    }
  }

  return trimmed;
}

function extractAiContent(payload: any): string {
  if (payload?.choices?.length) {
    const message = payload.choices[0]?.message?.content;
    if (typeof message === 'string') return message;
  }
  if (typeof payload?.message?.content === 'string') return payload.message.content;
  if (typeof payload?.content === 'string') return payload.content;
  if (typeof payload?.reply === 'string') return payload.reply;
  if (typeof payload?.text === 'string') return payload.text;
  if (typeof payload?.data === 'string') return payload.data;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload ?? '');
  }
}

export async function requestAiChat(
  messages: ChatMessage[],
  options?: ChatRequestOptions
): Promise<string> {
  const apiUrl = normalizeAiUrl(options?.apiUrl?.trim() || AI_API_URL || '');
  const apiKey = options?.apiKey?.trim() || AI_API_KEY;
  const model = options?.model?.trim() || AI_MODEL;

  if (!apiUrl) {
    throw new Error('AI API 未配置，请在界面填写地址或设置 VITE_AI_API_URL');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
    }),
    signal: options?.signal,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  let payload: any = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      return text;
    }
  }
  return extractAiContent(payload);
}
