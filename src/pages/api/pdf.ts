import type { APIRoute } from 'astro';
import { requireUser } from '../../lib/auth/middleware';
import { generateOfferPdf } from '../../lib/generate-offer-pdf';

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
