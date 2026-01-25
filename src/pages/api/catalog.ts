import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

interface CatalogItem {
  id: string;
  label: string;
  description: string;
  price: number;
}

type Catalog = Record<string, CatalogItem[]>;

// GET - Get all catalog (public, but admin can edit)
export const GET: APIRoute = async () => {
  try {
    const db = await getAdminDb();
    const catalogDoc = await db.collection('config').doc('catalog').get();
    
    if (!catalogDoc.exists) {
      // Auto-migrate from JSON file if catalog doesn't exist in Firestore
      try {
        const catalogData = await import('../../data/catalog.json');
        const catalog = catalogData.default as Catalog;
        
        // Save to Firestore for future use
        await db.collection('config').doc('catalog').set({
          ...catalog,
          migratedAt: new Date(),
        });
        
        return new Response(
          JSON.stringify(catalog),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (importError) {
        // If import fails, return empty catalog
        console.error('Failed to import catalog.json:', importError);
        return new Response(
          JSON.stringify({}),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    const catalog = catalogDoc.data() as Catalog;
    // Remove metadata fields before returning
    const { updatedAt, migratedAt, ...cleanCatalog } = catalog;
    
    return new Response(
      JSON.stringify(cleanCatalog),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Get catalog error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get catalog' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// POST - Update entire catalog (admin only)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await requireAdmin(cookies);
    const catalog: Catalog = await request.json();
    
    // Validate catalog structure
    if (typeof catalog !== 'object' || Array.isArray(catalog)) {
      return new Response(
        JSON.stringify({ error: 'Catalog must be an object with category keys' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validate each category
    for (const [category, items] of Object.entries(catalog)) {
      if (!Array.isArray(items)) {
        return new Response(
          JSON.stringify({ error: `Category "${category}" must be an array` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      for (const item of items) {
        if (!item.id || !item.label || typeof item.price !== 'number') {
          return new Response(
            JSON.stringify({ error: `Invalid item in category "${category}": id, label, and price are required` }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }
    
    const db = await getAdminDb();
    await db.collection('config').doc('catalog').set({
      ...catalog,
      updatedAt: new Date(),
    });
    
    return new Response(
      JSON.stringify({ success: true, catalog }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    console.error('Update catalog error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update catalog' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// PUT - Add or update a product in a category (admin only)
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    await requireAdmin(cookies);
    const { category, item } = await request.json();
    
    if (!category || !item) {
      return new Response(
        JSON.stringify({ error: 'category and item are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!item.id || !item.label || typeof item.price !== 'number') {
      return new Response(
        JSON.stringify({ error: 'item must have id, label, and price' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const db = await getAdminDb();
    const catalogDoc = await db.collection('config').doc('catalog').get();
    const catalog: Catalog = catalogDoc.exists ? (catalogDoc.data() as Catalog) : {};
    
    // Initialize category if it doesn't exist
    if (!catalog[category]) {
      catalog[category] = [];
    }
    
    // Find and update or add item
    const itemIndex = catalog[category].findIndex(i => i.id === item.id);
    if (itemIndex >= 0) {
      catalog[category][itemIndex] = item;
    } else {
      catalog[category].push(item);
    }
    
    await db.collection('config').doc('catalog').set({
      ...catalog,
      updatedAt: new Date(),
    });
    
    return new Response(
      JSON.stringify({ success: true, catalog }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    console.error('Update product error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update product' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// DELETE - Delete a product or category (admin only)
export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  try {
    await requireAdmin(cookies);
    const category = url.searchParams.get('category');
    const itemId = url.searchParams.get('itemId');
    
    if (!category) {
      return new Response(
        JSON.stringify({ error: 'category is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
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
    
    if (itemId) {
      // Delete specific item
      if (!catalog[category]) {
        return new Response(
          JSON.stringify({ error: `Category "${category}" not found` }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      catalog[category] = catalog[category].filter(item => item.id !== itemId);
      
      // Remove category if empty
      if (catalog[category].length === 0) {
        delete catalog[category];
      }
    } else {
      // Delete entire category
      if (!catalog[category]) {
        return new Response(
          JSON.stringify({ error: `Category "${category}" not found` }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      delete catalog[category];
    }
    
    await db.collection('config').doc('catalog').set({
      ...catalog,
      updatedAt: new Date(),
    });
    
    return new Response(
      JSON.stringify({ success: true, catalog }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    
    console.error('Delete product/category error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete product/category' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
