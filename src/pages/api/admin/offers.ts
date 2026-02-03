import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware';
import { getAdminDb } from '../../../lib/firebase/admin';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    await requireAdmin(cookies);
    const db = await getAdminDb();
    
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Get all offers and sort in memory (more reliable than requiring index)
    const snapshot = await db.collection('offers').get();
    
    // Convert to array and sort by createdAt
    let offers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
      };
    });
    
    // Sort by createdAt descending
    offers.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Apply pagination
    const total = offers.length;
    offers = offers.slice(offset, offset + limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        offers: offers.map((offer) => ({
          ...offer,
          createdAt: offer.createdAt instanceof Date 
            ? offer.createdAt.toISOString() 
            : offer.createdAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
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
      JSON.stringify({ error: error.message || 'Failed to fetch offers' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
  try {
    await requireAdmin(cookies);
    const offerId = url.searchParams.get('id');
    if (!offerId?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Offer ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const db = await getAdminDb();
    const offerRef = db.collection('offers').doc(offerId);
    const doc = await offerRef.get();
    if (!doc.exists) {
      return new Response(
        JSON.stringify({ error: 'Offer not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    await offerRef.delete();
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete offer' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
