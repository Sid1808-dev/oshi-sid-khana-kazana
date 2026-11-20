import {
  KitchenHttpError,
  recommendWithOpenRouter,
  scanIngredientsWithOpenRouter,
  type ServerImageInput,
} from '../../server/openrouterKitchen.ts';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const pathname = new URL(req.url).pathname;
    const body = (await req.json()) as Record<string, unknown>;

    if (pathname.endsWith('/scan') || body.action === 'scan') {
      const result = await scanIngredientsWithOpenRouter(
        (body.images as ServerImageInput[]) ?? [],
        typeof body.model === 'string' ? body.model : undefined
      );
      return jsonResponse(200, result);
    }

    const result = await recommendWithOpenRouter(body);
    return jsonResponse(200, result);
  } catch (err) {
    const status = err instanceof KitchenHttpError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : 'Unable to reach OpenRouter service.';
    return jsonResponse(status, { error: message });
  }
}
