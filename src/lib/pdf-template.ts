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

  const itemsByCategory = items.reduce((acc: Record<string, OfferItem[]>, item) => {
    const key = item.category || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const categorySections = Object.entries(itemsByCategory)
    .map(
      ([category, categoryItems]) => `
      <div class="accordion-item mb-3">
        <div class="accordion-header w-full bg-[#0b2f41] text-white px-4 py-3 flex items-center justify-between">
          <span class="font-medium">${escapeHtml(category)}</span>
        </div>
        <div class="accordion-content border border-gray-200 border-t-0 bg-white">
          <ul class="p-4 space-y-2">
            ${categoryItems
              .map(
                (item) => `
              <li class="text-sm text-gray-700 list-disc list-inside">
                ${escapeHtml(item.label)}
                ${(notes || item.description) ? `<span class="text-xs text-gray-500"> — ${escapeHtml(notes || item.description || '')}</span>` : ''}
              </li>
            `
              )
              .join('')}
          </ul>
        </div>
      </div>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Offer #${offerId.slice(0, 8)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @page {
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        background: #5aa9a5;
      }
      .print-page {
        background: #5aa9a5;
        padding: 2.5rem 1.5rem;
        width: 100%;
      }
      .accordion-content {
        display: block !important;
      }
    </style>
  </head>
  <body>
    <div class="print-page">
      <div class="max-w-5xl mx-auto">
        <!-- Hero Section -->
        <div class="bg-gradient-to-b from-[#118b8f] to-[#0f6f7c] rounded-2xl p-8 md:p-12 mb-10 text-white shadow-lg">
          <div class="flex flex-col gap-6">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center font-bold">
                  IT
                </div>
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-white/80">IT DEV</p>
                  <p class="text-xs text-white/70">Web & Digital Solutions</p>
                </div>
              </div>
            </div>

            <h1 class="text-2xl sm:text-3xl font-bold text-center tracking-wide">
              ΤΕΧΝΙΚΗ & ΟΙΚΟΝΟΜΙΚΗ ΠΡΟΤΑΣΗ
            </h1>

            <div class="bg-white text-gray-900 rounded-2xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto">
              <div class="bg-[#0b2f41] text-white rounded-t-2xl px-6 py-3 -mx-6 -mt-6 mb-6 text-center font-semibold">
                ${escapeHtml(clientName)}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p class="text-xs uppercase text-gray-500">Prepared for</p>
                  <p class="font-semibold">${escapeHtml(clientName)}</p>
                  ${companyName ? `<p class="text-gray-600">${escapeHtml(companyName)}</p>` : ''}
                  ${senderName || senderSurname ? `
                  <p class="text-xs uppercase text-gray-500 mt-4">From</p>
                  <p class="text-gray-700">
                    ${escapeHtml([senderName, senderSurname].filter(Boolean).join(' '))}
                  </p>
                  ` : ''}
                </div>
                <div>
                  <p class="text-xs uppercase text-gray-500">Client</p>
                  ${email ? `<p class="text-gray-700">${escapeHtml(email)}</p>` : ''}
                  <p class="text-gray-700">Πρόταση εκδόθηκε: ${createdAt.toLocaleDateString()}</p>
                  <p class="text-gray-700">Πρόταση ισχύει έως: ${validUntil.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Idea Section -->
        <section class="mb-10">
          <div class="relative overflow-hidden rounded-2xl bg-[#0b2f41] text-white shadow-lg">
            <div class="absolute inset-y-0 left-[48%] w-[140px] rotate-12 bg-[#3f8f8a]"></div>
            <div class="relative p-8 md:p-10">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <h2 class="text-3xl font-bold leading-tight mb-4">
                    Έχετε την ιδέα;
                    <br />
                    Εμείς την
                    <br />
                    υλοποιούμε.
                  </h2>
                </div>
                <div class="text-base leading-relaxed text-white/90">
                  Μια ολοκληρωμένη ομάδα από εξειδικευμένους συνεργάτες είναι δίπλα
                  σας κάθε στιγμή & συνεργάζονται για το καλύτερο αποτέλεσμα.
                </div>
              </div>

              <div class="border-t border-white/20 pt-8">
                <h2 class="text-xl font-bold mb-4">Ποιοί είμαστε;</h2>
                <p class="text-sm mb-8 text-white/90">
                  Σας ευχαριστούμε για το ενδιαφέρον που εκδηλώσατε να συνεργαστείτε
                  μαζί μας. Στόχος μας είναι να παρέχουμε υπηρεσίες υψηλής ποιότητας,
                  με συνέπεια και έμφαση στην ταχύτητα, την ασφάλεια και τη
                  διαφορετικότητα.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="bg-[#5aa9a5] rounded-lg p-6 text-white">
                    <div class="mb-4">
                      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="white"/>
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold mb-3">Our Mission</h3>
                    <p class="text-sm leading-relaxed">
                      Έχουμε αναπτύξει το δικό μας σύστημα διαχείρισης περιεχομένου (Content Management System), δίνοντας έμφαση στην ταχύτητα, την ασφάλεια, την διαφορετικότητα και την ευκολία στη χρήση.
                    </p>
                  </div>
                  <div class="bg-[#5aa9a5] rounded-lg p-6 text-white">
                    <div class="mb-4">
                      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
                        <circle cx="12" cy="12" r="2" fill="white"/>
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold mb-3">Our Vision</h3>
                    <p class="text-sm leading-relaxed">
                      Το CMS μας έχει αποτελέσει τη βάση για περισσότερες από 200 κατασκευές ιστοσελίδων και ηλεκτρονικών καταστημάτων σε Ελλάδα και εξωτερικό, πάντα με συνεχή εξέλιξη, ενσωματώνοντας τις πιο σύγχρονες τεχνολογίες και λειτουργίες.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Capabilities Section -->
        <section class="mb-10 bg-white rounded-xl p-6 shadow">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Δυνατότητες - Υπηρεσίες</h2>
          <div class="space-y-3">
            ${categorySections}
          </div>
        </section>

        <!-- Financial Offer Section -->
        <section class="mb-10 bg-white rounded-xl p-6 shadow">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Οικονομική προσφορά</h2>
          <div class="overflow-x-auto bg-white border border-gray-200 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Κατηγορία</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Υπηρεσία</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ποσότητα</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Τιμή</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Σύνολο</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td class="px-4 py-3 text-sm text-gray-900">${escapeHtml(item.category)}</td>
                    <td class="px-4 py-3">
                      <p class="text-sm font-medium text-gray-900">${escapeHtml(item.label)}</p>
                      ${(notes || item.description) ? `<p class="text-xs text-gray-500">${escapeHtml(notes || item.description || '')}</p>` : ''}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${item.qty}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${formatCurrency(item.unitPrice, currency)}${(item.category === 'Local SEO' || item.category === 'Web SEO' || item.category === 'AI SEO' || item.category === 'Social Media') && item.itemId !== 'extra-video' && item.itemId !== 'extra-post' && item.itemId !== 'extra-hosting' && item.itemId !== 'extra-page' ? ' / μήνα' : ''}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${formatCurrency(item.lineTotal, currency)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="flex justify-end mt-4">
            <div class="w-64 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal:</span>
                <span class="text-gray-900">${formatCurrency(totals.subtotal, currency)}</span>
              </div>
              ${discountPercent > 0 ? `
              <div class="flex justify-between text-sm text-green-600">
                <span>Discount (${discountPercent}%):</span>
                <span>-${formatCurrency(totals.discountAmount, currency)}</span>
              </div>
              ` : ''}
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Taxable:</span>
                <span class="text-gray-900">${formatCurrency(totals.taxable, currency)}</span>
              </div>
              ${vatPercent > 0 ? `
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">VAT (${vatPercent}%):</span>
                <span class="text-gray-900">${formatCurrency(totals.vatAmount, currency)}</span>
              </div>
              ` : ''}
              <div class="flex justify-between text-lg font-bold border-t pt-2 text-[#0f6f7c]">
                <span>Total:</span>
                <span>${formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Payment Methods Section -->
        <section class="mb-10 bg-white rounded-xl p-6 shadow">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Τρόποι πληρωμής & συνεργασίας</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="border border-gray-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">01. Αποστολή σύμβασης</h3>
              <p class="text-sm text-gray-600">
                Αποστολή υπογεγραμμένης σύμβασης με υπηρεσίες, αξία επένδυσης και προκαταβολή 40%.
              </p>
            </div>
            <div class="border border-gray-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">02. Κατασκευή</h3>
              <p class="text-sm text-gray-600">
                Ξεκινάμε την κατασκευή και ανεβάζουμε demo. Ακολουθεί πληρωμή 25%.
              </p>
            </div>
            <div class="border border-gray-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">03. Εκπαίδευση</h3>
              <p class="text-sm text-gray-600">
                Παράδοση έργου και εκπαίδευση για όλες τις λειτουργίες. Πληρωμή 25%.
              </p>
            </div>
            <div class="border border-gray-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">04. Ολοκλήρωση</h3>
              <p class="text-sm text-gray-600">
                Δημοσίευση online και τελικός έλεγχος. Καταβάλλεται η τελευταία δόση 10%.
              </p>
            </div>
          </div>
        </section>

      </div>
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
