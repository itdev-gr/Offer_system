import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase/admin';
import { renderPdfTemplate } from '../../../lib/pdf-template';
import { chromium } from 'playwright';
import type { OfferItem } from '../../../lib/money';

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
    
    // Check if shareable link has expired
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

    const items = offer.items as OfferItem[];
    const totals = offer.totals;

    const createdAt = offer.createdAt?.toDate?.() || new Date(offer.createdAt);
    const validUntil = new Date(createdAt);
    validUntil.setDate(validUntil.getDate() + (offer.validityDays || 14));

    // Load sender (creator) information
    let senderName = '';
    let senderSurname = '';
    if (offer.createdBy?.uid) {
      try {
        const senderDoc = await db.collection('users').doc(offer.createdBy.uid).get();
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          senderName = senderData?.name || '';
          senderSurname = senderData?.surname || '';
        }
      } catch (error) {
        console.error('Error loading sender info:', error);
      }
    }

    // Render the PDF template to HTML
    const html = renderPdfTemplate({
      offerId,
      clientName: offer.clientName,
      companyName: offer.companyName || undefined,
      email: offer.email || undefined,
      senderName: senderName || undefined,
      senderSurname: senderSurname || undefined,
      currency: offer.currency || 'EUR',
      discountPercent: offer.discountPercent || 0,
      vatPercent: offer.vatPercent || 0,
      validityDays: offer.validityDays || 14,
      notes: offer.notes || undefined,
      items,
      totals,
      createdAt,
      validUntil,
    });

    // Generate PDF using Playwright
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
    });

    await browser.close();

    return new Response(pdf, {
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
