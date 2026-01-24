import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase/admin';

export const GET: APIRoute = async () => {
  try {
    const db = await getAdminDb();
    await db.listCollections();

    return new Response(
      JSON.stringify({ ok: true, firebase: 'connected' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        firebase: 'error',
        message: error?.message || 'Health check failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
