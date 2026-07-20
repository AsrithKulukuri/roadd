const fs = require('fs');
const path = require('path');

const localities = [
  { name: 'Benz Circle', city: 'Vijayawada', lat: 16.5062, lng: 80.6480, pincode: '520010' },
  { name: 'Patamata', city: 'Vijayawada', lat: 16.4890, lng: 80.6601, pincode: '520007' },
  { name: 'Governorpet', city: 'Vijayawada', lat: 16.5193, lng: 80.6305, pincode: '520002' },
  { name: 'Krishnalanka', city: 'Vijayawada', lat: 16.5120, lng: 80.6200, pincode: '520013' },
  { name: 'Kanuru', city: 'Vijayawada', lat: 16.5350, lng: 80.6820, pincode: '521212' },
  { name: 'Poranki', city: 'Vijayawada', lat: 16.4780, lng: 80.6950, pincode: '521137' },
  { name: 'Penamaluru', city: 'Vijayawada', lat: 16.4630, lng: 80.7120, pincode: '521139' },
  { name: 'Auto Nagar', city: 'Vijayawada', lat: 16.5250, lng: 80.5920, pincode: '520007' },
  { name: 'Gannavaram', city: 'Vijayawada', lat: 16.5410, lng: 80.7980, pincode: '521101' },
  { name: 'Ibrahimpatnam', city: 'Vijayawada', lat: 16.5580, lng: 80.5410, pincode: '521456' },
  { name: 'Tadepalli', city: 'Vijayawada', lat: 16.4820, lng: 80.5950, pincode: '522501' },
  { name: 'Undavalli', city: 'Vijayawada', lat: 16.4743, lng: 80.5987, pincode: '522501' },
  { name: 'Mangalagiri', city: 'Guntur', lat: 16.4420, lng: 80.5650, pincode: '522503' },
  { name: 'Kunchanapalli', city: 'Guntur', lat: 16.4580, lng: 80.5820, pincode: '522501' },
  { name: 'Amaravati', city: 'Vijayawada', lat: 16.5130, lng: 80.5150, pincode: '522020' },
  { name: 'Brodipet', city: 'Guntur', lat: 16.3008, lng: 80.4428, pincode: '522002' },
  { name: 'Arundelpet', city: 'Guntur', lat: 16.3075, lng: 80.4350, pincode: '522002' },
  { name: 'Vidhyadharapuram', city: 'Vijayawada', lat: 16.5310, lng: 80.6050, pincode: '520012' },
];

const propertyTypes = ['apartment', 'villa', 'residential-land', 'commercial-spaces', 'pg', 'farmhouse'];
const listingTypes = ['sale', 'rent'];
const furnishings = ['unfurnished', 'semi-furnished', 'furnished'];
const facings = ['east', 'west', 'north', 'south', 'north-east', 'south-east'];

const sampleImages = {
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  ],
  villa: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'
  ],
  'residential-land': [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800&q=80'
  ],
  'commercial-spaces': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80'
  ],
  pg: [
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'
  ],
  farmhouse: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80'
  ]
};

const defaultAmenities = [
  { id: 'power-backup', name: 'Power Backup', icon: 'Zap', category: 'utility' },
  { id: 'lift', name: 'Lift', icon: 'ArrowUpDown', category: 'basic' },
  { id: 'gated-security', name: 'Gated Security', icon: 'Shield', category: 'safety' },
  { id: 'covered-parking', name: 'Covered Parking', icon: 'Car', category: 'parking' },
  { id: 'cctv', name: 'CCTV Surveillance', icon: 'Camera', category: 'safety' }
];

function generatePropertiesSQL(count = 200) {
  const values = [];

  for (let i = 1; i <= count; i++) {
    const loc = localities[i % localities.length];
    const pType = propertyTypes[i % propertyTypes.length];
    const lType = pType === 'pg' ? 'rent' : listingTypes[i % listingTypes.length];
    const bhk = pType === 'residential-land' || pType === 'commercial-spaces' ? 0 : (i % 4) + 1;
    const baths = bhk > 0 ? Math.max(1, bhk - 1) : (pType === 'commercial-spaces' ? 2 : 0);
    const area = pType === 'residential-land' ? 1200 + (i * 15) : 800 + (i * 25);
    
    let price = 0;
    if (lType === 'rent') {
      price = pType === 'pg' ? 6000 + (i * 150) : 12000 + (i * 500);
    } else {
      price = pType === 'villa' ? 15000000 + (i * 500000) : 3500000 + (i * 150000);
    }

    const pricePerSqft = lType === 'rent' ? 0 : Math.round(price / area);
    const jitterLat = loc.lat + (Math.sin(i) * 0.015);
    const jitterLng = loc.lng + (Math.cos(i) * 0.015);
    
    const id = `prop-vjw-${String(i).padStart(3, '0')}`;
    const title = `${bhk > 0 ? bhk + 'BHK ' : ''}${pType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} in ${loc.name}, ${loc.city}`;
    const slug = `${pType}-${bhk > 0 ? bhk + 'bhk-' : ''}${loc.name.toLowerCase().replace(/\s+/g, '-')}-${i}`;
    const desc = `Premium ${pType.replace('-', ' ')} for ${lType} located in ${loc.name}, ${loc.city}. Excellent connectivity, modern infrastructure, vastu-compliant layout, 24/7 security, and peaceful surrounding environment. Perfect investment or residence.`;

    const imagesJson = JSON.stringify(
      (sampleImages[pType] || sampleImages.apartment).map((url, idx) => ({
        id: `img-${i}-${idx}`,
        url,
        alt: `${title} image ${idx + 1}`,
        isPrimary: idx === 0,
        order: idx
      }))
    ).replace(/'/g, "''");

    const locationJson = JSON.stringify({
      address: `Door No. ${i * 3}-${i}, ${loc.name} Main Road`,
      locality: loc.name,
      city: loc.city,
      state: 'Andhra Pradesh',
      pincode: loc.pincode,
      latitude: parseFloat(jitterLat.toFixed(5)),
      longitude: parseFloat(jitterLng.toFixed(5))
    }).replace(/'/g, "''");

    const amenitiesJson = JSON.stringify(defaultAmenities).replace(/'/g, "''");
    const featuresJson = JSON.stringify([
      { label: 'Construction', value: 'RCC Frame Structure' },
      { label: 'Flooring', value: 'Vitrified Tiles' },
      { label: 'Water Supply', value: 'Municipal + Borewell' }
    ]).replace(/'/g, "''");

    const isFeatured = i % 5 === 0;
    const isRecommended = i % 3 === 0;
    const isVerified = i % 2 === 0;

    values.push(`(
  '${id}', '${slug}', '${title.replace(/'/g, "''")}', '${desc.replace(/'/g, "''")}', ${price}, ${pricePerSqft}, '${pType}', '${lType}',
  'published', ${bhk}, ${baths}, ${bhk > 0 ? 1 : 0}, 1, ${area}, ${Math.round(area * 0.8)}, ${Math.round(area * 0.9)},
  '${furnishings[i % furnishings.length]}', '${facings[i % facings.length]}', ${(i % 10)}, true,
  '${locationJson}', '${imagesJson}', '${amenitiesJson}', '${featuresJson}',
  ${isVerified}, ${isFeatured}, ${isRecommended}, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  ${100 + i * 7}, ${10 + i}, ${2 + (i % 5)},
  NOW(), NOW(), NOW(),
  true, true, true
)`);
  }

  const sql = `-- ============================================================
-- Seed 200 Properties for Vijayawada, Guntur & Surrounding Areas
-- Run in Supabase SQL Editor
-- ============================================================

INSERT INTO public.properties (
  id, slug, title, description, price, "pricePerSqft", "propertyType", "listingType",
  status, bedrooms, bathrooms, balconies, parking, area, "carpetArea", "builtUpArea",
  furnishing, facing, "ageOfProperty", "isReadyToMove",
  location, images, amenities, features,
  "isVerified", "isFeatured", "isRecommended", "isPremium", "showOnMap",
  "ownerId", "ownerName", "ownerPhone", "ownerEmail", "ownerType", "isOwnerVerified",
  "viewCount", "savedCount", "enquiryCount",
  "createdAt", "updatedAt", "publishedAt",
  "vastuCompliant", "petFriendly", "gatedSecurity"
) VALUES
${values.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`;

  return sql;
}

const sqlOutput = generatePropertiesSQL(200);
fs.writeFileSync(path.join(__dirname, '../supabase/migrations/seed_200_properties.sql'), sqlOutput);
console.log('Successfully generated seed_200_properties.sql with 200 entries!');
