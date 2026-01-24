import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../lib/auth/session';

export const POST: APIRoute = async ({ cookies }) => {
  clearSessionCookie(cookies);
  
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
