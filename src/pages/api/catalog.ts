import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

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

// GET - Get all catalog (public, but admin can edit)
export const GET: APIRoute = async ({ url }) => {
  try {
    const db = await getAdminDb();
    const forceMigrate = url.searchParams.get('migrate') === 'true';
    const catalogDoc = await db.collection('config').doc('catalog').get();
    
    // Force migration from JSON if requested
    if (forceMigrate) {
      try {
        const catalogData = await import('../../data/catalog.json');
        const catalog = catalogData.default as Catalog;
        
        // Save to Firestore
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
        console.error('Failed to import catalog.json:', importError);
        return new Response(
          JSON.stringify({ error: 'Failed to migrate catalog from JSON' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
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
        // Validate sub-products if they exist (recursive)
        if (item.subProducts && Array.isArray(item.subProducts)) {
          const validateSubProduct = (subProduct: SubProduct, path: string): string | null => {
            if (!subProduct.id || !subProduct.label || typeof subProduct.price !== 'number') {
              return `Invalid sub-product at "${path}": id, label, and price are required`;
            }
            // Validate nested sub-products recursively
            if (subProduct.subProducts && Array.isArray(subProduct.subProducts)) {
              for (const nestedSubProduct of subProduct.subProducts) {
                const nestedError = validateSubProduct(nestedSubProduct, `${path}.${nestedSubProduct.id}`);
                if (nestedError) return nestedError;
              }
            }
            return null;
          };
          
          for (const subProduct of item.subProducts) {
            const error = validateSubProduct(subProduct, `item.${item.id}.${subProduct.id}`);
            if (error) {
              return new Response(
                JSON.stringify({ error }),
                {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
          }
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

// Helper function to find and update nested sub-product
function findAndUpdateSubProduct(
  subProducts: SubProduct[],
  targetId: string,
  parentId: string | null,
  action: 'add' | 'update' | 'delete',
  newSubProduct?: SubProduct
): boolean {
  for (let i = 0; i < subProducts.length; i++) {
    const sp = subProducts[i];
    
    // If this is the target sub-product
    if (sp.id === targetId && (parentId === null || parentId === sp.id)) {
      if (action === 'delete') {
        subProducts.splice(i, 1);
        return true;
      } else if (action === 'update' || action === 'add') {
        if (newSubProduct) {
          // Preserve nested sub-products if updating
          if (action === 'update' && sp.subProducts) {
            newSubProduct.subProducts = sp.subProducts;
          }
          subProducts[i] = newSubProduct;
          return true;
        }
      }
    }
    
    // If we're looking for a nested sub-product and this has children
    if (parentId === sp.id && sp.subProducts) {
      if (findAndUpdateSubProduct(sp.subProducts, targetId, null, action, newSubProduct)) {
        return true;
      }
    }
  }
  
  return false;
}

// PATCH - Manage sub-products (add, update, delete) including nested (admin only)
export const PATCH: APIRoute = async ({ request, cookies, url }) => {
  try {
    await requireAdmin(cookies);
    const category = url.searchParams.get('category');
    const itemId = url.searchParams.get('itemId');
    const subProductId = url.searchParams.get('subProductId');
    const parentSubProductId = url.searchParams.get('parentSubProductId'); // For nested sub-products
    const action = url.searchParams.get('action') || 'add'; // add, update, delete
    
    if (!category || !itemId) {
      return new Response(
        JSON.stringify({ error: 'category and itemId are required' }),
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
    
    if (!catalog[category]) {
      return new Response(
        JSON.stringify({ error: `Category "${category}" not found` }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const itemIndex = catalog[category].findIndex(i => i.id === itemId);
    if (itemIndex < 0) {
      return new Response(
        JSON.stringify({ error: `Product "${itemId}" not found in category "${category}"` }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const item = catalog[category][itemIndex];
    
    // Initialize subProducts array if it doesn't exist
    if (!item.subProducts) {
      item.subProducts = [];
    }
    
    if (action === 'delete') {
      // Delete sub-product (or nested sub-product)
      if (!subProductId) {
        return new Response(
          JSON.stringify({ error: 'subProductId is required for delete action' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (parentSubProductId) {
        // Delete nested sub-product
        const parentSubProduct = item.subProducts.find(sp => sp.id === parentSubProductId);
        if (!parentSubProduct) {
          return new Response(
            JSON.stringify({ error: `Parent sub-product "${parentSubProductId}" not found` }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (!parentSubProduct.subProducts) {
          parentSubProduct.subProducts = [];
        }
        parentSubProduct.subProducts = parentSubProduct.subProducts.filter(sp => sp.id !== subProductId);
      } else {
        // Delete top-level sub-product
        item.subProducts = item.subProducts.filter(sp => sp.id !== subProductId);
      }
    } else {
      // Add or update sub-product
      const body = await request.json();
      const subProduct: SubProduct = body.subProduct;
      
      if (!subProduct || !subProduct.id || !subProduct.label || typeof subProduct.price !== 'number') {
        return new Response(
          JSON.stringify({ error: 'subProduct with id, label, and price is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (parentSubProductId) {
        // Add/update nested sub-product
        const parentSubProduct = item.subProducts.find(sp => sp.id === parentSubProductId);
        if (!parentSubProduct) {
          return new Response(
            JSON.stringify({ error: `Parent sub-product "${parentSubProductId}" not found` }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (!parentSubProduct.subProducts) {
          parentSubProduct.subProducts = [];
        }
        const nestedIndex = parentSubProduct.subProducts.findIndex(sp => sp.id === subProduct.id);
        if (nestedIndex >= 0) {
          // Update existing nested sub-product
          parentSubProduct.subProducts[nestedIndex] = subProduct;
        } else {
          // Add new nested sub-product
          parentSubProduct.subProducts.push(subProduct);
        }
      } else {
        // Add/update top-level sub-product
        const subProductIndex = item.subProducts.findIndex(sp => sp.id === subProduct.id);
        if (subProductIndex >= 0) {
          // Update existing sub-product
          item.subProducts[subProductIndex] = subProduct;
        } else {
          // Add new sub-product
          item.subProducts.push(subProduct);
        }
      }
    }
    
    // Update the item in the catalog
    catalog[category][itemIndex] = item;
    
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
    
    console.error('Manage sub-product error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to manage sub-product' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
