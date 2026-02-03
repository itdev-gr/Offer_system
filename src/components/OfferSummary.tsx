import { useState, useEffect } from 'react';
import type { OfferItem } from '../lib/money';
import { formatCurrency, calculateTotals } from '../lib/money';

interface OfferSummaryProps {
  items: OfferItem[];
  discountPercent: number;
  vatPercent: number;
  currency: string;
  onItemsChange: (items: OfferItem[]) => void;
}

export default function OfferSummary({
  items,
  discountPercent,
  vatPercent,
  currency,
  onItemsChange,
}: OfferSummaryProps) {
  const [localItems, setLocalItems] = useState<OfferItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleQtyChange = (category: string, itemId: string, newQty: number) => {
    if (newQty < 1) return;
    const updated = localItems.map((item) =>
      item.category === category && item.itemId === itemId
        ? { ...item, qty: newQty, lineTotal: item.unitPrice * newQty }
        : item
    );
    setLocalItems(updated);
    onItemsChange(updated);
  };

  const handleRemove = (category: string, itemId: string) => {
    const updated = localItems.filter((item) => !(item.category === category && item.itemId === itemId));
    setLocalItems(updated);
    onItemsChange(updated);
  };

  const totals = calculateTotals(localItems, discountPercent, vatPercent);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Selected Items</h2>
      
      {localItems.length === 0 ? (
        <p className="text-gray-500 text-sm">No items selected</p>
      ) : (
        <>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {localItems.map((item) => (
              <div key={`${item.category}-${item.itemId}`} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.category, item.itemId)}
                    className="text-red-600 hover:text-red-800 text-sm ml-2"
                    type="button"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) =>
                        handleQtyChange(item.category, item.itemId, parseInt(e.target.value) || 1)
                      }
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <p className="font-semibold text-sm">
                    {formatCurrency(item.lineTotal, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({discountPercent}%):</span>
                <span>-{formatCurrency(totals.discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Taxable:</span>
              <span>{formatCurrency(totals.taxable, currency)}</span>
            </div>
            {vatPercent > 0 && (
              <div className="flex justify-between text-sm">
                <span>VAT ({vatPercent}%):</span>
                <span>{formatCurrency(totals.vatAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>{formatCurrency(totals.total, currency)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
