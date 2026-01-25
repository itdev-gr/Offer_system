import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

interface SubProduct {
  id: string;
  label: string;
  description: string;
  price: number;
}

interface CatalogItem {
  id: string;
  label: string;
  description: string;
  price: number;
  subProducts?: SubProduct[];
}

type Catalog = Record<string, CatalogItem[]>;

// POST - Delete last N sub-products from all products (admin only)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await requireAdmin(cookies);
    
    const { count = 100 } = await request.json().catch(() => ({ count: 100 }));
    const deleteCount = Math.max(1, Math.min(1000, parseInt(count.toString()) || 100));
    
    const db = await getAdminDb();
    const catalogDoc = await db.collection('config').doc('catalog').get();
    
    if (!catalogDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Catalog not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const catalog: Catalog = catalogDoc.data() as Catalog;
    const results: string[] = [];
    let totalDeleted = 0;
    const allSubProducts: Array<{ category: string; productId: string; productLabel: string; subProduct: SubProduct }> = [];
    
    // Collect all sub-products with their metadata
    for (const [category, products] of Object.entries(catalog)) {
      for (const product of products) {
        if (product.subProducts && product.subProducts.length > 0) {
          for (const subProduct of product.subProducts) {
            allSubProducts.push({
              category,
              productId: product.id,
              productLabel: product.label,
              subProduct,
            });
          }
        }
      }
    }
    
    // Sort by some criteria (we'll use reverse order to get "last" ones)
    // Since we don't have timestamps, we'll delete from the end of the array
    const subProductsToDelete = allSubProducts.slice(-deleteCount);
    
    if (subProductsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          totalDeleted: 0,
          message: 'No sub-products found to delete',
          results: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Group by product for efficient deletion
    const deletionsByProduct = new Map<string, Array<{ category: string; productLabel: string; subProduct: SubProduct }>>();
    
    for (const item of subProductsToDelete) {
      const key = `${item.category}-${item.productId}`;
      if (!deletionsByProduct.has(key)) {
        deletionsByProduct.set(key, []);
      }
      deletionsByProduct.get(key)!.push({
        category: item.category,
        productLabel: item.productLabel,
        subProduct: item.subProduct,
      });
    }
    
    // Delete sub-products from each product
    for (const [key, items] of deletionsByProduct.entries()) {
      const [category, productId] = key.split('-');
      const product = catalog[category]?.find(p => p.id === productId);
      
      if (product && product.subProducts) {
        const subProductIdsToDelete = new Set(items.map(i => i.subProduct.id));
        const beforeCount = product.subProducts.length;
        product.subProducts = product.subProducts.filter(sp => !subProductIdsToDelete.has(sp.id));
        const deletedCount = beforeCount - product.subProducts.length;
        totalDeleted += deletedCount;
        
        for (const item of items) {
          results.push(`Deleted "${item.subProduct.label}" from "${item.productLabel}" in "${category}"`);
        }
        
        // Remove subProducts array if empty
        if (product.subProducts.length === 0) {
          delete product.subProducts;
        }
      }
    }
    
    // Save updated catalog
    await db.collection('config').doc('catalog').set({
      ...catalog,
      updatedAt: new Date(),
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        requested: deleteCount,
        results: results.slice(0, 50), // Limit results to first 50 for response size
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    console.error('Delete sub-products error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete sub-products' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
