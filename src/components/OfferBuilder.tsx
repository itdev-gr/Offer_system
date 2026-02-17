import { useState, useEffect } from 'react';
import type { OfferItem } from '../lib/money';
import catalogData from '../data/catalog.json';
import OfferSummary from './OfferSummary';

interface SubProduct {
  id: string;
  label: string;
  description: string;
  price: number;
  subProducts?: SubProduct[]; // Nested sub-products
}

interface CatalogItem {
  id: string;
  label: string;
  description: string;
  price: number;
  subProducts?: SubProduct[];
}

type Catalog = Record<string, CatalogItem[]>;

// Fallback catalog from JSON file
const fallbackCatalog = catalogData as Catalog;

export default function OfferBuilder() {
  const [catalog, setCatalog] = useState<Catalog>(fallbackCatalog);
  const [categories, setCategories] = useState<string[]>(Object.keys(fallbackCatalog));
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
  const [selectedItems, setSelectedItems] = useState<OfferItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clickupId, setClickupId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [validityDays, setValidityDays] = useState(14);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSubProducts, setExpandedSubProducts] = useState<Set<string>>(new Set());
  const [selectedSubProducts, setSelectedSubProducts] = useState<Map<string, Set<string>>>(new Map());
  const [selectedNestedSubProducts, setSelectedNestedSubProducts] = useState<Map<string, Set<string>>>(new Map());
  const [extraVideosByCategory, setExtraVideosByCategory] = useState<Record<string, number>>({});
  const [extraPostsByCategory, setExtraPostsByCategory] = useState<Record<string, number>>({});
  const [extraHostingByCategory, setExtraHostingByCategory] = useState<Record<string, number>>({});
  const [extraPagesByCategory, setExtraPagesByCategory] = useState<Record<string, number>>({});
  const [extraLanguagesByCategory, setExtraLanguagesByCategory] = useState<Record<string, number>>({});
  const [customPriceByItem, setCustomPriceByItem] = useState<Record<string, number>>({});

  const getSyntheticExtraItems = (): OfferItem[] => {
    const result: OfferItem[] = [];
    categories.forEach((cat) => {
      const qtyV = extraVideosByCategory[cat] || 0;
      if (qtyV > 0) {
        result.push({
          category: cat,
          itemId: 'extra-video',
          label: 'Extra video',
          description: '€50 per video',
          unitPrice: 50,
          qty: qtyV,
          lineTotal: 50 * qtyV,
        });
      }
      const qtyP = extraPostsByCategory[cat] || 0;
      if (qtyP > 0) {
        result.push({
          category: cat,
          itemId: 'extra-post',
          label: 'Extra post',
          description: '€25 per post',
          unitPrice: 25,
          qty: qtyP,
          lineTotal: 25 * qtyP,
        });
      }
      const qtyH = extraHostingByCategory[cat] || 0;
      if (qtyH > 0) {
        result.push({
          category: cat,
          itemId: 'extra-hosting',
          label: 'Hosting',
          description: '€120 per year',
          unitPrice: 120,
          qty: qtyH,
          lineTotal: 120 * qtyH,
        });
      }
      const qtyPg = extraPagesByCategory[cat] || 0;
      if (qtyPg > 0) {
        result.push({
          category: cat,
          itemId: 'extra-page',
          label: 'Extra page',
          description: '€90 per page',
          unitPrice: 90,
          qty: qtyPg,
          lineTotal: 90 * qtyPg,
        });
      }
      const qtyL = extraLanguagesByCategory[cat] || 0;
      if (qtyL > 0) {
        result.push({
          category: cat,
          itemId: 'extra-language',
          label: 'Language',
          description: '€50 per language',
          unitPrice: 50,
          qty: qtyL,
          lineTotal: 50 * qtyL,
        });
      }
    });
    return result;
  };

  const allItemsForOffer = [...selectedItems, ...getSyntheticExtraItems()];
  const hasAnyItems = allItemsForOffer.length > 0;

  const handleItemsChangeFromSummary = (newItems: OfferItem[]) => {
    const catalogItems = newItems.filter(
      (i) =>
        i.itemId !== 'extra-video' &&
        i.itemId !== 'extra-post' &&
        i.itemId !== 'extra-hosting' &&
        i.itemId !== 'extra-page' &&
        i.itemId !== 'extra-language'
    );
    const newExtraVideos: Record<string, number> = { ...extraVideosByCategory };
    const newExtraPosts: Record<string, number> = { ...extraPostsByCategory };
    const newExtraHosting: Record<string, number> = { ...extraHostingByCategory };
    const newExtraPages: Record<string, number> = { ...extraPagesByCategory };
    const newExtraLanguages: Record<string, number> = { ...extraLanguagesByCategory };
    newItems.filter((i) => i.itemId === 'extra-video').forEach((i) => {
      newExtraVideos[i.category] = i.qty;
    });
    newItems.filter((i) => i.itemId === 'extra-post').forEach((i) => {
      newExtraPosts[i.category] = i.qty;
    });
    newItems.filter((i) => i.itemId === 'extra-hosting').forEach((i) => {
      newExtraHosting[i.category] = i.qty;
    });
    newItems.filter((i) => i.itemId === 'extra-page').forEach((i) => {
      newExtraPages[i.category] = i.qty;
    });
    newItems.filter((i) => i.itemId === 'extra-language').forEach((i) => {
      newExtraLanguages[i.category] = i.qty;
    });
    const newCustomPrices: Record<string, number> = { ...customPriceByItem };
    catalogItems.forEach((i) => {
      const catItems = catalog[i.category];
      const catalogItem = catItems?.find((c) => c.id === i.itemId);
      if (catalogItem?.price === 0 && i.unitPrice > 0) {
        newCustomPrices[`${i.category}-${i.itemId}`] = i.unitPrice;
      }
    });
    setSelectedItems(catalogItems);
    setExtraVideosByCategory(newExtraVideos);
    setExtraPostsByCategory(newExtraPosts);
    setExtraHostingByCategory(newExtraHosting);
    setExtraPagesByCategory(newExtraPages);
    setExtraLanguagesByCategory(newExtraLanguages);
    setCustomPriceByItem(newCustomPrices);
  };

  const toggleItemExpanded = (category: string, itemId: string) => {
    const key = `${category}-${itemId}`;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemToggle = (category: string, item: CatalogItem) => {
    const existingIndex = selectedItems.findIndex(
      (si) => si.itemId === item.id && si.category === category
    );

    if (existingIndex >= 0) {
      // Remove item and its sub-products
      setSelectedItems(selectedItems.filter((_, i) => i !== existingIndex));
      const key = `${category}-${item.id}`;
      const newSelectedSubProducts = new Map(selectedSubProducts);
      newSelectedSubProducts.delete(key);
      setSelectedSubProducts(newSelectedSubProducts);
    } else {
      // Add item (use custom price when catalog price is 0)
      const key = `${category}-${item.id}`;
      const effectivePrice = item.price === 0 ? (customPriceByItem[key] ?? 0) : item.price;
      const newItem: OfferItem = {
        category,
        itemId: item.id,
        label: item.label,
        description: item.description,
        unitPrice: effectivePrice,
        qty: 1,
        lineTotal: effectivePrice,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const handleSubProductToggle = (category: string, itemId: string, subProduct: SubProduct, parentSubProductId?: string) => {
    const key = `${category}-${itemId}`;
    
    if (parentSubProductId) {
      // Handle nested sub-product
      const nestedKey = `${key}-${parentSubProductId}`;
      const newSelectedNested = new Map(selectedNestedSubProducts);
      
      if (!newSelectedNested.has(nestedKey)) {
        newSelectedNested.set(nestedKey, new Set());
      }
      
      const nestedSet = newSelectedNested.get(nestedKey)!;
      if (nestedSet.has(subProduct.id)) {
        nestedSet.delete(subProduct.id);
      } else {
        nestedSet.add(subProduct.id);
      }
      
      setSelectedNestedSubProducts(newSelectedNested);
    } else {
      // Handle top-level sub-product
      const newSelectedSubProducts = new Map(selectedSubProducts);
      
      if (!newSelectedSubProducts.has(key)) {
        newSelectedSubProducts.set(key, new Set());
      }
      
      const subProductsSet = newSelectedSubProducts.get(key)!;
      if (subProductsSet.has(subProduct.id)) {
        subProductsSet.delete(subProduct.id);
      } else {
        subProductsSet.add(subProduct.id);
      }
      
      setSelectedSubProducts(newSelectedSubProducts);
    }
    
    // Update the main item's lineTotal
    updateItemLineTotal(category, itemId);
  };

  const updateItemLineTotal = (category: string, itemId: string) => {
    const itemIndex = selectedItems.findIndex(
      (si) => si.itemId === itemId && si.category === category
    );
    
    if (itemIndex >= 0) {
      const item = selectedItems[itemIndex];
      const catalogItem = catalog[category]?.find(i => i.id === itemId);
      if (!catalogItem) return;
      
      const key = `${category}-${itemId}`;
      const selectedSubs = selectedSubProducts.get(key) || new Set();
      
      // Calculate top-level sub-products total
      let subProductsTotal = catalogItem.subProducts
        ?.filter(sp => selectedSubs.has(sp.id))
        .reduce((sum, sp) => {
          let nestedTotal = 0;
          // Add nested sub-products if selected
          if (sp.subProducts) {
            const nestedKey = `${key}-${sp.id}`;
            const selectedNested = selectedNestedSubProducts.get(nestedKey) || new Set();
            nestedTotal = sp.subProducts
              .filter(nsp => selectedNested.has(nsp.id))
              .reduce((nestedSum, nsp) => nestedSum + nsp.price, 0);
          }
          return sum + sp.price + nestedTotal;
        }, 0) || 0;
      
      const newItems = [...selectedItems];
      newItems[itemIndex] = {
        ...item,
        lineTotal: item.unitPrice + subProductsTotal,
      };
      setSelectedItems(newItems);
    }
  };

  const toggleSubProductExpanded = (category: string, itemId: string, subProductId: string) => {
    const key = `${category}-${itemId}-${subProductId}`;
    const newExpanded = new Set(expandedSubProducts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubProducts(newExpanded);
  };

  const isSubProductSelected = (category: string, itemId: string, subProductId: string, parentSubProductId?: string): boolean => {
    const key = `${category}-${itemId}`;
    if (parentSubProductId) {
      const nestedKey = `${key}-${parentSubProductId}`;
      return selectedNestedSubProducts.get(nestedKey)?.has(subProductId) || false;
    }
    return selectedSubProducts.get(key)?.has(subProductId) || false;
  };

  const isItemSelected = (category: string, itemId: string) => {
    return selectedItems.some(
      (si) => si.itemId === itemId && si.category === category
    );
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
    setExtraVideosByCategory({});
    setExtraPostsByCategory({});
    setExtraHostingByCategory({});
    setExtraPagesByCategory({});
    setExtraLanguagesByCategory({});
    setCustomPriceByItem({});
  };

  useEffect(() => {
    // Load catalog from API
    fetch('/api/catalog')
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Failed to load catalog');
      })
      .then((data: Catalog) => {
        if (data && Object.keys(data).length > 0) {
          setCatalog(data);
          const cats = Object.keys(data);
          setCategories(cats);
          if (cats.length > 0 && !cats.includes(selectedCategory)) {
            setSelectedCategory(cats[0]);
          }
        }
        setIsLoadingCatalog(false);
      })
      .catch((err) => {
        console.error('Error loading catalog from API, using fallback:', err);
        // Use fallback catalog if API fails
        setCatalog(fallbackCatalog);
        const cats = Object.keys(fallbackCatalog);
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
        setIsLoadingCatalog(false);
      });

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

    if (!clickupId.trim()) {
      setError('Clickup ID is required');
      return;
    }

    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      const { calculateTotals } = await import('../lib/money');
      const totals = calculateTotals(allItemsForOffer, discountAmount, vatPercent);

      const response = await fetch('/api/create-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clickupId: clickupId.trim(),
          companyName: companyName.trim() || undefined,
          email: email.trim() || undefined,
          currency,
          discountAmount,
          vatPercent,
          validityDays,
          notes: notes.trim() || undefined,
          items: allItemsForOffer,
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
              href="/profile"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Profile
            </a>
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
                {isLoadingCatalog ? (
                  <p className="text-gray-500 text-center py-8">Loading products...</p>
                ) : catalog[selectedCategory] && catalog[selectedCategory].length > 0 ? (
                <div className="space-y-4">
                  {catalog[selectedCategory].map((item) => {
                    const itemKey = `${selectedCategory}-${item.id}`;
                    const isExpanded = expandedItems.has(itemKey);
                    const hasSubProducts = item.subProducts && item.subProducts.length > 0;
                    const selectedSubs = selectedSubProducts.get(itemKey);
                    const subProductsTotal = item.subProducts
                      ?.filter(sp => selectedSubs?.has(sp.id))
                      .reduce((sum, sp) => {
                        let nestedTotal = 0;
                        if (sp.subProducts) {
                          const nestedKey = `${itemKey}-${sp.id}`;
                          const selectedNested = selectedNestedSubProducts.get(nestedKey) || new Set();
                          nestedTotal = sp.subProducts
                            .filter(nsp => selectedNested.has(nsp.id))
                            .reduce((nestedSum, nsp) => nestedSum + nsp.price, 0);
                        }
                        return sum + sp.price + nestedTotal;
                      }, 0) || 0;
                    const isCustomPrice = item.price === 0;
                    const effectiveUnitPrice = isCustomPrice ? (customPriceByItem[itemKey] ?? 0) : item.price;
                    const totalPrice = effectiveUnitPrice + subProductsTotal;
                    const isSelected = isItemSelected(selectedCategory, item.id);
                    
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <label className="flex items-start space-x-3 p-4 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(selectedCategory, item)}
                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {isCustomPrice ? (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <label className="text-sm text-gray-600">Custom price (€):</label>
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={customPriceByItem[itemKey] ?? ''}
                                        onChange={(e) => {
                                          const v = parseFloat(e.target.value) || 0;
                                          setCustomPriceByItem((prev) => ({ ...prev, [itemKey]: v }));
                                          if (isSelected) {
                                            setSelectedItems((prev) =>
                                              prev.map((si) =>
                                                si.category === selectedCategory && si.itemId === item.id
                                                  ? { ...si, unitPrice: v, lineTotal: v }
                                                  : si
                                              )
                                            );
                                          }
                                        }}
                                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm font-semibold text-indigo-600">
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'EUR',
                                      }).format(item.price)}
                                      {['Local SEO', 'Web SEO', 'AI SEO', 'Social Media'].includes(selectedCategory) && ' / μήνα'}
                                    </p>
                                  )}
                                  {(isSelected && subProductsTotal > 0) || (isCustomPrice && isSelected && effectiveUnitPrice > 0) ? (
                                    <>
                                      {subProductsTotal > 0 && (
                                        <>
                                          <span className="text-gray-400">+</span>
                                          <p className="text-sm text-gray-600">
                                            {new Intl.NumberFormat('en-US', {
                                              style: 'currency',
                                              currency: 'EUR',
                                            }).format(subProductsTotal)} (extras)
                                          </p>
                                        </>
                                      )}
                                      <span className="text-gray-400">=</span>
                                      <p className="text-sm font-bold text-indigo-700">
                                        {new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: 'EUR',
                                        }).format(totalPrice)}
                                      </p>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {hasSubProducts && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemExpanded(selectedCategory, item.id);
                                  }}
                                  className="ml-4 text-indigo-600 hover:text-indigo-700"
                                >
                                  <svg
                                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </label>
                        {isExpanded && hasSubProducts && isSelected && (
                          <div className="bg-gray-50 border-t border-gray-200 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">Extra Services:</p>
                            <div className="space-y-2 ml-6">
                              {item.subProducts.map((subProduct) => {
                                const subProductKey = `${itemKey}-${subProduct.id}`;
                                const isSubExpanded = expandedSubProducts.has(subProductKey);
                                const hasNestedSubProducts = subProduct.subProducts && subProduct.subProducts.length > 0;
                                const selectedNested = selectedNestedSubProducts.get(subProductKey);
                                const nestedTotal = subProduct.subProducts
                                  ?.filter(nsp => selectedNested?.has(nsp.id))
                                  .reduce((sum, nsp) => sum + nsp.price, 0) || 0;
                                
                                return (
                                  <div key={subProduct.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <label
                                      className="flex items-start space-x-2 cursor-pointer p-2 hover:bg-gray-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSubProductSelected(selectedCategory, item.id, subProduct.id)}
                                        onChange={() => handleSubProductToggle(selectedCategory, item.id, subProduct)}
                                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{subProduct.label}</p>
                                            <p className="text-xs text-gray-600">{subProduct.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <p className="text-xs font-semibold text-indigo-600">
                                                +{new Intl.NumberFormat('en-US', {
                                                  style: 'currency',
                                                  currency: 'EUR',
                                                }).format(subProduct.price)}
                                              </p>
                                              {isSubProductSelected(selectedCategory, item.id, subProduct.id) && nestedTotal > 0 && (
                                                <>
                                                  <span className="text-gray-400 text-xs">+</span>
                                                  <p className="text-xs text-gray-500">
                                                    {new Intl.NumberFormat('en-US', {
                                                      style: 'currency',
                                                      currency: 'EUR',
                                                    }).format(nestedTotal)} (nested)
                                                  </p>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          {hasNestedSubProducts && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubProductExpanded(selectedCategory, item.id, subProduct.id);
                                              }}
                                              className="ml-2 text-indigo-600 hover:text-indigo-700"
                                            >
                                              <svg
                                                className={`w-4 h-4 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                    {isSubExpanded && hasNestedSubProducts && isSubProductSelected(selectedCategory, item.id, subProduct.id) && (
                                      <div className="bg-gray-100 border-t border-gray-200 p-3 ml-8">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Nested Services:</p>
                                        <div className="space-y-1">
                                          {subProduct.subProducts.map((nestedSubProduct) => (
                                            <label
                                              key={nestedSubProduct.id}
                                              className="flex items-start space-x-2 cursor-pointer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSubProductSelected(selectedCategory, item.id, nestedSubProduct.id, subProduct.id)}
                                                onChange={() => handleSubProductToggle(selectedCategory, item.id, nestedSubProduct, subProduct.id)}
                                                className="mt-1 h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                              />
                                              <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-900">{nestedSubProduct.label}</p>
                                                <p className="text-xs text-gray-600">{nestedSubProduct.description}</p>
                                                <p className="text-xs font-semibold text-indigo-600 mt-1">
                                                  +{new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: 'EUR',
                                                  }).format(nestedSubProduct.price)}
                                                </p>
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No products in this category.</p>
                )}

                {selectedCategory === 'Social Media' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Extras (this category)</p>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Extra videos (€50 each):</label>
                        <input
                          type="number"
                          min={0}
                          value={extraVideosByCategory[selectedCategory] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setExtraVideosByCategory((prev) => ({ ...prev, [selectedCategory]: v }));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Extra posts (€25 each):</label>
                        <input
                          type="number"
                          min={0}
                          value={extraPostsByCategory[selectedCategory] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setExtraPostsByCategory((prev) => ({ ...prev, [selectedCategory]: v }));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedCategory === 'Website Development' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Extras (this category)</p>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Hosting (€120 each):</label>
                        <input
                          type="number"
                          min={0}
                          value={extraHostingByCategory[selectedCategory] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setExtraHostingByCategory((prev) => ({ ...prev, [selectedCategory]: v }));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Extra pages (€90 each):</label>
                        <input
                          type="number"
                          min={0}
                          value={extraPagesByCategory[selectedCategory] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setExtraPagesByCategory((prev) => ({ ...prev, [selectedCategory]: v }));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Language (€50 each):</label>
                        <input
                          type="number"
                          min={0}
                          value={extraLanguagesByCategory[selectedCategory] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setExtraLanguagesByCategory((prev) => ({ ...prev, [selectedCategory]: v }));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Offer Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clickup ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={clickupId}
                          onChange={(e) => setClickupId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
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
                          Discount (€)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountAmount}
                          onChange={(e) =>
                            setDiscountAmount(parseFloat(e.target.value) || 0)
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
                        Description (shown with each product on the offer)
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
              items={allItemsForOffer}
              discountAmount={discountAmount}
              vatPercent={vatPercent}
              currency={currency}
              onItemsChange={handleItemsChangeFromSummary}
            />

            <div className="mt-4 flex gap-4">
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={!hasAnyItems}
              >
                Clear Selection
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasAnyItems || !clientName.trim() || !clickupId.trim()}
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
