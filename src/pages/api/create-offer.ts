import type { APIRoute } from 'astro';
import { requireUser } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';
import { generateOfferPdf } from '../../lib/generate-offer-pdf';
import type { OfferItem, Totals } from '../../lib/money';

interface CreateOfferRequest {
  clientName: string;
  clickupId: string;
  companyName?: string;
  email?: string;
  currency: string;
  discountAmount: number;
  vatPercent: number;
  validityDays: number;
  notes?: string;
  items: OfferItem[];
  totals: Totals;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await requireUser(cookies);
    const body: CreateOfferRequest = await request.json();

    // Validation
    if (!body.clientName?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Client name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.clickupId?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Clickup ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.items || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one item is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const db = await getAdminDb();
    const offerRef = db.collection('offers').doc();
    const offerId = offerRef.id;

    const offerData = {
      clientName: body.clientName.trim(),
      clickupId: body.clickupId.trim(),
      companyName: body.companyName?.trim() || null,
      email: body.email?.trim() || null,
      currency: body.currency || 'EUR',
      discountAmount: body.discountAmount ?? 0,
      vatPercent: body.vatPercent || 0,
      validityDays: body.validityDays || 14,
      notes: body.notes?.trim() || null,
      items: body.items,
      totals: body.totals,
      createdAt: new Date(),
      createdBy: {
        uid: user.uid,
        email: user.email || null,
      },
    };

    await offerRef.set(offerData);

    const webhookUrl = import.meta.env.ZAPIER_OFFER_WEBHOOK_URL as string | undefined;
    if (webhookUrl?.trim()) {
      try {
        const pdfBuffer = await generateOfferPdf(offerId);
        const formData = new FormData();
        formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `offer-${offerId.slice(0, 8)}.pdf`);
        formData.append('clickupTaskId', body.clickupId.trim());
        formData.append('offerTitle', body.clientName.trim());
        formData.append('offerId', offerId);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
          await fetch(webhookUrl.trim(), {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('Zapier webhook error (offer still created):', err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, offerId }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Create offer error:', error);
    
    if (error instanceof Response) {
      return error;
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create offer' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
