import { getAdminDb } from './firebase/admin';
import { renderPdfTemplate } from './pdf-template';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { OfferItem } from './money';

/**
 * Generate the offer PDF as a Buffer. Callers are responsible for auth/expiry checks.
 */
export async function generateOfferPdf(offerId: string): Promise<Buffer> {
  const db = await getAdminDb();
  const offerDoc = await db.collection('offers').doc(offerId).get();

  if (!offerDoc.exists) {
    throw new Error('Offer not found');
  }

  const offer = offerDoc.data()!;
  const items = offer.items as OfferItem[];
  const totals = offer.totals;

  const createdAt = offer.createdAt?.toDate?.() || new Date(offer.createdAt);
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + (offer.validityDays || 14));

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

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);

  const pdf = await page.pdf({
    width: '210mm',
    height: `${Math.max(bodyHeight / 3.779527559, 297)}mm`,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });

  await browser.close();

  return Buffer.from(pdf);
}
