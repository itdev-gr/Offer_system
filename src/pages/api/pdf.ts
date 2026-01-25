import type { APIRoute } from 'astro';
import { requireUser } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';
import { renderPdfTemplate } from '../../lib/pdf-template';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { OfferItem } from '../../lib/money';

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    await requireUser(cookies);

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

    // Generate PDF using Puppeteer with Chromium for serverless
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
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

    if (error instanceof Response) {
      return error;
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate PDF' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
