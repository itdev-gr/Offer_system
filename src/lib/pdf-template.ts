import type { OfferItem } from './money';
import { formatCurrency } from './money';

interface PdfTemplateProps {
  offerId: string;
  clientName: string;
  companyName?: string;
  email?: string;
  senderName?: string;
  senderSurname?: string;
  currency: string;
  discountPercent: number;
  vatPercent: number;
  validityDays: number;
  notes?: string;
  items: OfferItem[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxable: number;
    vatAmount: number;
    total: number;
  };
  createdAt: Date;
  validUntil: Date;
}

export function renderPdfTemplate(props: PdfTemplateProps): string {
  const {
    offerId,
    clientName,
    companyName,
    email,
    senderName,
    senderSurname,
    currency,
    discountPercent,
    vatPercent,
    validityDays,
    notes,
    items,
    totals,
    createdAt,
    validUntil,
  } = props;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.category)}</td>
        <td>
          <strong>${escapeHtml(item.label)}</strong><br />
          <span style="color: #666; font-size: 10px;">${escapeHtml(item.description)}</span>
        </td>
        <td class="text-right">${item.qty}</td>
        <td class="text-right">${formatCurrency(item.unitPrice, currency)}</td>
        <td class="text-right"><strong>${formatCurrency(item.lineTotal, currency)}</strong></td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Offer #${offerId.slice(0, 8)}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: #333;
        padding: 40px;
      }
      .header {
        border-bottom: 2px solid #4f46e5;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .company-name {
        font-size: 24px;
        font-weight: bold;
        color: #4f46e5;
        margin-bottom: 5px;
      }
      .company-address {
        font-size: 10px;
        color: #666;
      }
      .offer-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      .client-info, .offer-details {
        flex: 1;
      }
      .section-title {
        font-size: 10px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 5px;
      }
      .section-content {
        font-size: 12px;
        color: #333;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      thead {
        background-color: #f3f4f6;
      }
      th {
        text-align: left;
        padding: 10px;
        font-size: 10px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        border-bottom: 2px solid #e5e7eb;
      }
      td {
        padding: 10px;
        font-size: 11px;
        border-bottom: 1px solid #e5e7eb;
      }
      .text-right {
        text-align: right;
      }
      .totals {
        margin-left: auto;
        width: 250px;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 11px;
      }
      .totals-row.total {
        font-size: 14px;
        font-weight: bold;
        border-top: 2px solid #333;
        padding-top: 10px;
        margin-top: 10px;
      }
      .notes {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        font-size: 10px;
        color: #666;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-name">Your Company Name</div>
      <div class="company-address">
        123 Business Street, City, Country<br />
        Email: info@company.com | Phone: +1 234 567 890
      </div>
    </div>

    <div class="offer-info">
      <div class="client-info">
        <div class="section-title">Client Information</div>
        <div class="section-content">
          <strong>${escapeHtml(clientName)}</strong><br />
          ${companyName ? `${escapeHtml(companyName)}<br />` : ''}
          ${email ? `${escapeHtml(email)}<br />` : ''}
          ${senderName || senderSurname ? `
          <div style="margin-top: 15px;">
            <div class="section-title">From</div>
            <div class="section-content">
              ${escapeHtml([senderName, senderSurname].filter(Boolean).join(' '))}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
      <div class="offer-details">
        <div class="section-title">Offer Details</div>
        <div class="section-content">
          <strong>Offer #:</strong> ${offerId.slice(0, 8)}<br />
          <strong>Date:</strong> ${createdAt.toLocaleDateString()}<br />
          <strong>Valid Until:</strong> ${validUntil.toLocaleDateString()}<br />
          <strong>Validity:</strong> ${validityDays} days
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(totals.subtotal, currency)}</span>
      </div>
      ${
        discountPercent > 0
          ? `
      <div class="totals-row" style="color: #059669;">
        <span>Discount (${discountPercent}%):</span>
        <span>-${formatCurrency(totals.discountAmount, currency)}</span>
      </div>
      `
          : ''
      }
      <div class="totals-row">
        <span>Taxable:</span>
        <span>${formatCurrency(totals.taxable, currency)}</span>
      </div>
      ${
        vatPercent > 0
          ? `
      <div class="totals-row">
        <span>VAT (${vatPercent}%):</span>
        <span>${formatCurrency(totals.vatAmount, currency)}</span>
      </div>
      `
          : ''
      }
      <div class="totals-row total">
        <span>Total:</span>
        <span>${formatCurrency(totals.total, currency)}</span>
      </div>
    </div>

    ${
      notes
        ? `
    <div class="notes">
      <div class="section-title">Notes</div>
      <div class="section-content" style="white-space: pre-wrap;">${escapeHtml(notes)}</div>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>This offer is valid until ${validUntil.toLocaleDateString()}</p>
      <p style="margin-top: 10px;">Thank you for your business!</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
