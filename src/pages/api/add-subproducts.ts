import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth/middleware';
import { getAdminDb } from '../../lib/firebase/admin';

const websiteCategories = [
  'Website Development',
  'Local SEO',
  'Web SEO',
  'AI SEO',
  'Social Media'
];

const commonSubProducts = [
  {
    id: 'extra-pages',
    label: 'Extra Pages',
    description: 'Additional pages beyond the standard package',
    price: 100
  },
  {
    id: 'seo-setup',
    label: 'SEO Setup',
    description: 'Basic SEO configuration and optimization',
    price: 200
  },
  {
    id: 'contact-form',
    label: 'Contact Form',
    description: 'Custom contact form with email notifications',
    price: 150
  },
  {
    id: 'analytics-setup',
    label: 'Analytics Setup',
    description: 'Google Analytics and tracking code integration',
    price: 100
  },
  {
    id: 'ssl-certificate',
    label: 'SSL Certificate',
    description: 'Secure SSL certificate installation',
    price: 50
  }
];

// POST - Add 5 sub-products to each product in website categories (admin only)
export const POST: APIRoute = async ({ cookies }) => {
  try {
    await requireAdmin(cookies);
    
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
    
    const catalog = catalogDoc.data() as Record<string, any[]>;
    const results: string[] = [];
    let totalAdded = 0;
    
    // For each website category
    for (const category of websiteCategories) {
      if (!catalog[category]) {
        results.push(`Category "${category}" not found, skipping...`);
        continue;
      }
      
      // For each product in the category
      for (const product of catalog[category]) {
        // Initialize subProducts array if it doesn't exist
        if (!product.subProducts) {
          product.subProducts = [];
        }
        
        // Add each of the 5 sub-products (only if they don't already exist)
        for (const subProduct of commonSubProducts) {
          const subProductId = `${product.id}-${subProduct.id}`;
          const existingIndex = product.subProducts.findIndex(sp => sp.id === subProductId);
          
          if (existingIndex < 0) {
            product.subProducts.push({
              id: subProductId,
              label: subProduct.label,
              description: subProduct.description,
              price: subProduct.price,
            });
            totalAdded++;
            results.push(`Added "${subProduct.label}" to "${product.label}" in "${category}"`);
          } else {
            results.push(`Sub-product "${subProduct.label}" already exists in "${product.label}"`);
          }
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
        totalAdded,
        results,
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
    
    console.error('Add sub-products error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to add sub-products' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
