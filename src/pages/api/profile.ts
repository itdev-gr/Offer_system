import type { APIRoute } from 'astro';
import { requireUser } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

// GET - Get current user's profile
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await requireUser(cookies);
    const db = await getAdminDb();
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const userData = userDoc.data();
    
    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          uid: user.uid,
          email: userData?.email || user.email,
          name: userData?.name || '',
          surname: userData?.surname || '',
          company: userData?.company || '',
          phone: userData?.phone || '',
          extension: userData?.extension || '',
        },
      }),
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
      JSON.stringify({ error: error.message || 'Failed to fetch profile' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// PUT - Update current user's profile
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await requireUser(cookies);
    const { name, surname, company, phone, extension } = await request.json();
    
    const db = await getAdminDb();
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (surname !== undefined) {
      updateData.surname = surname.trim();
    }
    
    if (company !== undefined) {
      updateData.company = company.trim();
    }
    
    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }
    
    if (extension !== undefined) {
      updateData.extension = extension.trim();
    }
    
    await db.collection('users').doc(user.uid).update(updateData);
    
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
      JSON.stringify({ error: error.message || 'Failed to update profile' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
