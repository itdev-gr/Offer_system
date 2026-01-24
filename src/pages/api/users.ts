import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

// GET - List all users (admin only)
export const GET: APIRoute = async ({ cookies }) => {
  try {
    await requireAdmin(cookies);
    const db = await getAdminDb();
    
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    
    return new Response(JSON.stringify({ success: true, users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch users' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// POST - Create or update user (admin only)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await requireAdmin(cookies);
    const { uid, email, name, surname, role } = await request.json();
    
    if (!uid || !email) {
      return new Response(
        JSON.stringify({ error: 'uid and email are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (role && !['admin', 'user'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'role must be "admin" or "user"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const db = await getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const userData: any = {
      email,
      name: name || 'New',
      surname: surname || 'User',
      role: role || 'user',
    };
    
    if (!userDoc.exists) {
      userData.createdAt = new Date();
    } else {
      userData.updatedAt = new Date();
    }
    
    await userRef.set(userData, { merge: true });
    
    return new Response(
      JSON.stringify({ success: true, user: { uid, ...userData } }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create/update user' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// PUT - Update user (admin only)
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    await requireAdmin(cookies);
    const { uid, role, name, surname } = await request.json();
    
    if (!uid) {
      return new Response(
        JSON.stringify({ error: 'uid is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const db = await getAdminDb();
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'role must be "admin" or "user"' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      updateData.role = role;
    }
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (surname !== undefined) {
      updateData.surname = surname;
    }
    
    await db.collection('users').doc(uid).update(updateData);
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update user' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
