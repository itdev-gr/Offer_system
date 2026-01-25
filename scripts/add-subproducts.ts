/**
 * Script to add 5 sub-products to each product in website categories
 * Run this with: npx tsx scripts/add-subproducts.ts
 */

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

async function addSubProductsToCatalog() {
  const baseUrl = process.env.API_URL || 'http://localhost:4321';
  
  // First, get the current catalog
  const catalogResponse = await fetch(`${baseUrl}/api/catalog`);
  if (!catalogResponse.ok) {
    console.error('Failed to fetch catalog');
    return;
  }
  
  const catalog = await catalogResponse.json();
  
  // For each website category
  for (const category of websiteCategories) {
    if (!catalog[category]) {
      console.log(`Category "${category}" not found, skipping...`);
      continue;
    }
    
    console.log(`\nProcessing category: ${category}`);
    
    // For each product in the category
    for (const product of catalog[category]) {
      console.log(`  Adding sub-products to: ${product.label}`);
      
      // Add each of the 5 sub-products
      for (const subProduct of commonSubProducts) {
        try {
          const response = await fetch(
            `${baseUrl}/api/catalog?category=${encodeURIComponent(category)}&itemId=${encodeURIComponent(product.id)}&action=add`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subProduct: {
                  id: `${product.id}-${subProduct.id}`,
                  label: subProduct.label,
                  description: subProduct.description,
                  price: subProduct.price,
                },
              }),
            }
          );
          
          if (response.ok) {
            console.log(`    ✓ Added: ${subProduct.label}`);
          } else {
            const error = await response.json();
            console.log(`    ✗ Failed: ${subProduct.label} - ${error.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.log(`    ✗ Error adding ${subProduct.label}:`, error);
        }
      }
    }
  }
  
  console.log('\n✓ Finished adding sub-products!');
}

// Note: This script requires authentication
// You'll need to run this from the admin dashboard or with proper authentication
console.log('This script needs to be run with admin authentication.');
console.log('Please use the admin dashboard at /admin/products to add sub-products manually,');
console.log('or implement authentication in this script.');

// Uncomment to run (after adding authentication):
// addSubProductsToCatalog();
