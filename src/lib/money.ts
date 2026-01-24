export interface Totals {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  vatAmount: number;
  total: number;
}

export interface OfferItem {
  category: string;
  itemId: string;
  label: string;
  description: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function calculateTotals(
  items: OfferItem[],
  discountPercent: number,
  vatPercent: number
): Totals {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const vatAmount = taxable * (vatPercent / 100);
  const total = taxable + vatAmount;

  return {
    subtotal,
    discountAmount,
    taxable,
    vatAmount,
    total,
  };
}
