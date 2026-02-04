import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase/admin';
import { generateOfferPdf } from '../../../lib/generate-offer-pdf';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const offerId = url.searchParams.get('offerId');
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'offerId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const db = await getAdminDb();
    const offerDoc = await db.collection('offers').doc(offerId).get();

    if (!offerDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Offer not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const offer = offerDoc.data()!;

    const now = new Date();
    const expiresAt = offer.shareableLinkExpiresAt?.toDate?.() || new Date(offer.shareableLinkExpiresAt);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'This offer link has expired' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const pdfBuffer = await generateOfferPdf(offerId);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="offer-${offerId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate PDF' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
