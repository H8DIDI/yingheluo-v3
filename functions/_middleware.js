// SPA fallback: if a request returns 404 and isn't an API or asset, serve index.html
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);

  // API routes handle themselves
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  const response = await next();

  // Only rewrite 404s for pathless (no file extension) requests — SPA routes
  if (response.status === 404 && !url.pathname.includes('.')) {
    const indexUrl = new URL('/index.html', url.origin);
    const indexRes = await env.ASSETS.fetch(indexUrl);
    return new Response(indexRes.body, {
      status: 200,
      headers: indexRes.headers,
    });
  }

  return response;
}
