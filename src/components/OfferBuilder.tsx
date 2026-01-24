import { useState, useEffect } from 'react';
import type { OfferItem } from '../lib/money';
import catalogData from '../data/catalog.json';
import OfferSummary from './OfferSummary';

interface CatalogItem {
  id: string;
  label: string;
  description: string;
  price: number;
}

type Catalog = Record<string, CatalogItem[]>;

const catalog = catalogData as Catalog;
const categories = Object.keys(catalog);

export default function OfferBuilder() {
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]);
  const [selectedItems, setSelectedItems] = useState<OfferItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [validityDays, setValidityDays] = useState(14);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleItemToggle = (category: string, item: CatalogItem) => {
    const existingIndex = selectedItems.findIndex(
      (si) => si.itemId === item.id && si.category === category
    );

    if (existingIndex >= 0) {
      // Remove item
      setSelectedItems(selectedItems.filter((_, i) => i !== existingIndex));
    } else {
      // Add item
      const newItem: OfferItem = {
        category,
        itemId: item.id,
        label: item.label,
        description: item.description,
        unitPrice: item.price,
        qty: 1,
        lineTotal: item.price,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const isItemSelected = (category: string, itemId: string) => {
    return selectedItems.some(
      (si) => si.itemId === itemId && si.category === category
    );
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  useEffect(() => {
    // Check if user is admin
    fetch('/api/users')
      .then((res) => {
        if (res.ok) {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        // Not admin or error
        setIsAdmin(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientName.trim()) {
      setError('Client name is required');
      return;
    }

    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      const { calculateTotals } = await import('../lib/money');
      const totals = calculateTotals(selectedItems, discountPercent, vatPercent);

      const response = await fetch('/api/create-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          companyName: companyName.trim() || undefined,
          email: email.trim() || undefined,
          currency,
          discountPercent,
          vatPercent,
          validityDays,
          notes: notes.trim() || undefined,
          items: selectedItems,
          totals,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create offer');
      }

      const data = await response.json();
      window.location.href = `/offers/${data.offerId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to create offer');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Create New Offer</h1>
          <div className="space-x-4">
            {isAdmin && (
              <a
                href="/admin"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Admin
              </a>
            )}
            <a
              href="/logout"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Categories */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-4">Categories</h2>
                <nav className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Panel - Items */}
            <div className="col-span-12 lg:col-span-9">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">{selectedCategory}</h2>
                <div className="space-y-4">
                  {catalog[selectedCategory].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isItemSelected(selectedCategory, item.id)}
                        onChange={() => handleItemToggle(selectedCategory, item)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                        <p className="text-sm font-semibold text-indigo-600 mt-2">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(item.price)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Offer Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(e) =>
                            setDiscountPercent(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          VAT (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={vatPercent}
                          onChange={(e) =>
                            setVatPercent(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Validity (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={validityDays}
                          onChange={(e) =>
                            setValidityDays(parseInt(e.target.value) || 14)
                          }
                          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Panel at Bottom */}
          <div className="mt-6">
            <OfferSummary
              items={selectedItems}
              discountPercent={discountPercent}
              vatPercent={vatPercent}
              currency={currency}
              onItemsChange={setSelectedItems}
            />

            <div className="mt-4 flex gap-4">
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={selectedItems.length === 0}
              >
                Clear Selection
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0 || !clientName.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
