import type { AstroCookies } from 'astro';
import { getSessionCookie } from './session';
import { getAdminAuth, getAdminDb } from '../firebase/admin';

export interface AuthUser {
  uid: string;
  email: string | undefined;
  name?: string;
  surname?: string;
  role: 'admin' | 'user';
}

export async function verifySession(cookies: AstroCookies): Promise<AuthUser | null> {
  const sessionToken = getSessionCookie(cookies);
  
  if (!sessionToken) {
    return null;
  }

  try {
    const adminAuth = await getAdminAuth();
    const adminDb = await getAdminDb();
    const decodedToken = await adminAuth.verifySessionCookie(sessionToken, true);
    
    // Φόρτωσε το user document για να πάρεις το role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userData?.name,
      surname: userData?.surname,
      role: (userData?.role as 'admin' | 'user') || 'user', // Default: 'user'
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function requireAuth(cookies: AstroCookies): Promise<AuthUser> {
  const user = await verifySession(cookies);
  if (!user) {
    throw new Response(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
  return user;
}

export async function requireAdmin(cookies: AstroCookies): Promise<AuthUser> {
  const user = await requireAuth(cookies);
  if (user.role !== 'admin') {
    throw new Response(null, {
      status: 403,
      statusText: 'Forbidden - Admin access required',
    });
  }
  return user;
}

export async function requireUser(cookies: AstroCookies): Promise<AuthUser> {
  return await requireAuth(cookies); // Όλοι οι authenticated users μπορούν να δημιουργούν offers
}
