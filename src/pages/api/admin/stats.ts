import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware';
import { getAdminDb } from '../../../lib/firebase/admin';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    await requireAdmin(cookies);
    const db = await getAdminDb();
    
    // Get users count
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    const adminUsers = usersSnapshot.docs.filter(
      (doc) => doc.data().role === 'admin'
    ).length;
    const regularUsers = totalUsers - adminUsers;
    
    // Get offers count
    const offersSnapshot = await db.collection('offers').get();
    const totalOffers = offersSnapshot.size;
    
    // Calculate offers by month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentOffers = offersSnapshot.docs.filter((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt);
      return createdAt >= sixMonthsAgo;
    });
    
    const offersByMonth: Record<string, number> = {};
    recentOffers.forEach((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      offersByMonth[monthKey] = (offersByMonth[monthKey] || 0) + 1;
    });
    
    // Calculate total revenue (sum of all offer totals)
    let totalRevenue = 0;
    offersSnapshot.docs.forEach((doc) => {
      const totals = doc.data().totals;
      if (totals?.total) {
        totalRevenue += totals.total;
      }
    });
    
    // Get recent offers (last 10)
    const recentOffersList = recentOffers
      .sort((a, b) => {
        const dateA = a.data().createdAt?.toDate?.() || new Date(a.data().createdAt);
        const dateB = b.data().createdAt?.toDate?.() || new Date(b.data().createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10)
      .map((doc) => ({
        id: doc.id,
        clientName: doc.data().clientName,
        total: doc.data().totals?.total || 0,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        createdBy: doc.data().createdBy,
      }));
    
    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            admins: adminUsers,
            regular: regularUsers,
          },
          offers: {
            total: totalOffers,
            recent: recentOffers.length,
            byMonth: offersByMonth,
          },
          revenue: {
            total: totalRevenue,
          },
          recentOffers: recentOffersList,
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
      JSON.stringify({ error: error.message || 'Failed to fetch stats' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
