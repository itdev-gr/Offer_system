import type { APIRoute } from 'astro';
import { getAdminAuth, getAdminDb } from '../../lib/firebase/admin';
import { setSessionCookie } from '../../lib/auth/session';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'ID token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminAuth = await getAdminAuth();
    const adminDb = await getAdminDb();
    
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Auto-create user document if it doesn't exist
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        email: decodedToken.email,
        name: 'New',
        surname: 'User',
        role: 'user', // Default role
        createdAt: new Date(),
      });
    }
    
    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    
    // Set the session cookie
    setSessionCookie(cookies, sessionCookie);

    // Get user role
    const userData = userDoc.exists ? userDoc.data() : { role: 'user' };
    
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: userData?.role || 'user',
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Session login error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Authentication failed' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
