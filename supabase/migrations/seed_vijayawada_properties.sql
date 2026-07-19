-- ============================================================
-- Seed Data: Vijayawada & Surrounding Areas
-- Categories: apartment, villa, residential-land, commercial-spaces, pg, farmhouse
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

-- ─────────────────────────────────────────────
-- APARTMENTS (Sale)
-- ─────────────────────────────────────────────
(
  'vjw-001', 'luxury-3bhk-benz-circle-vijayawada',
  'Luxury 3BHK Apartment near Benz Circle, Vijayawada',
  'Premium 3BHK apartment in the heart of Vijayawada near Benz Circle. Features Italian marble flooring, modular kitchen, covered parking, and 24/7 security. Walking distance to NTR Mall and major hospitals.',
  9500000, 5278, 'apartment', 'sale', 'published',
  3, 2, 2, 1, 1800, 1450, 1620,
  'semi-furnished', 'east', 3, true,
  '{"address":"Flat 702, Sri Sai Enclave, Benz Circle Road","locality":"Benz Circle","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520010","latitude":16.5062,"longitude":80.6480}',
  '[{"id":"v1a","url":"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80","alt":"Modern apartment living area","isPrimary":true,"order":0},{"id":"v1b","url":"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80","alt":"Apartment interior","isPrimary":false,"order":1},{"id":"v1c","url":"https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80","alt":"Modern bathroom","isPrimary":false,"order":2}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"lift","name":"Lift","icon":"ArrowUpDown","category":"basic"},{"id":"gated-security","name":"Gated Security","icon":"Shield","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"gym","name":"Gymnasium","icon":"Dumbbell","category":"lifestyle"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"}]',
  '[{"label":"Construction","value":"RCC Frame"},{"label":"Flooring","value":"Vitrified Tiles"},{"label":"Water Supply","value":"Municipal"},{"label":"Kitchen","value":"Modular"}]',
  true, true, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  532, 45, 12,
  '2026-03-10T09:00:00Z', '2026-06-28T11:00:00Z', '2026-03-12T08:00:00Z',
  true, false, true
),

(
  'vjw-002', '2bhk-apartment-rent-governorpet',
  '2BHK Furnished Apartment for Rent, Governorpet',
  'Fully furnished 2BHK apartment in Governorpet locality, ideal for working professionals and families. AC in all rooms, modular kitchen, covered parking. Near Vijayawada railway station and commercial hub.',
  18000, 0, 'apartment', 'rent', 'published',
  2, 2, 1, 1, 1100, 900, 1000,
  'furnished', 'north', 4, true,
  '{"address":"Flat 301, Sai Residency, MG Road","locality":"Governorpet","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520002","latitude":16.5193,"longitude":80.6305}',
  '[{"id":"v2a","url":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80","alt":"2BHK living room","isPrimary":true,"order":0},{"id":"v2b","url":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80","alt":"Dining area","isPrimary":false,"order":1}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"lift","name":"Lift","icon":"ArrowUpDown","category":"basic"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"}]',
  '[{"label":"Flooring","value":"Vitrified Tiles"},{"label":"Water Supply","value":"Municipal"}]',
  true, false, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  318, 28, 9,
  '2026-05-01T10:00:00Z', '2026-07-01T10:00:00Z', '2026-05-03T08:00:00Z',
  false, false, false
),

(
  'vjw-003', '4bhk-premium-apartment-patamata',
  '4BHK Premium Apartment, Patamata Colony',
  'Spacious 4BHK apartment in Patamata, one of Vijayawada''s most sought-after residential localities. Premium fittings, large balconies, vastu-compliant layout, and excellent ventilation.',
  14500000, 7250, 'apartment', 'sale', 'published',
  4, 3, 3, 2, 2000, 1700, 1850,
  'semi-furnished', 'east', 2, true,
  '{"address":"Flat 1202, Celestia Heights, Patamata Main Road","locality":"Patamata","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520007","latitude":16.4890,"longitude":80.6601}',
  '[{"id":"v3a","url":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80","alt":"Premium apartment exterior","isPrimary":true,"order":0},{"id":"v3b","url":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80","alt":"Living area","isPrimary":false,"order":1},{"id":"v3c","url":"https://images.unsplash.com/photo-1600566753086-00f18f6b0a56?w=800&q=80","alt":"Kitchen","isPrimary":false,"order":2}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"lift","name":"Lift","icon":"ArrowUpDown","category":"basic"},{"id":"gated-security","name":"Gated Security","icon":"Shield","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"gym","name":"Gymnasium","icon":"Dumbbell","category":"lifestyle"},{"id":"swimming-pool","name":"Swimming Pool","icon":"Waves","category":"lifestyle"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"},{"id":"clubhouse","name":"Clubhouse","icon":"Building2","category":"lifestyle"}]',
  '[{"label":"Construction","value":"RCC Shear Wall"},{"label":"Flooring","value":"Italian Marble"},{"label":"Water Supply","value":"Borewell + Municipal"},{"label":"Kitchen","value":"Modular with Chimney"}]',
  true, true, true, true, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'developer', true,
  891, 133, 41,
  '2026-01-20T10:00:00Z', '2026-07-05T10:00:00Z', '2026-01-25T08:00:00Z',
  true, false, true
),

(
  'vjw-004', '1bhk-apartment-rent-krishnalanka',
  'Affordable 1BHK for Rent, Krishnalanka',
  'Well-maintained 1BHK apartment for rent in Krishnalanka. Suitable for bachelors and couples. Close to Krishna River bank, Kanaka Durga temple, and city center. Peaceful locality.',
  8500, 0, 'apartment', 'rent', 'published',
  1, 1, 1, 0, 650, 520, 590,
  'unfurnished', 'west', 8, true,
  '{"address":"D-12, Annapurna Colony, Krishnalanka","locality":"Krishnalanka","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520013","latitude":16.5120,"longitude":80.6200}',
  '[{"id":"v4a","url":"https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80","alt":"1BHK interior","isPrimary":true,"order":0},{"id":"v4b","url":"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80","alt":"Bedroom","isPrimary":false,"order":1}]',
  '[{"id":"water-supply","name":"24x7 Water Supply","icon":"Droplets","category":"utility"},{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"}]',
  '[{"label":"Flooring","value":"Ceramic Tiles"},{"label":"Water Supply","value":"Municipal"}]',
  true, false, false, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  201, 12, 4,
  '2026-06-01T10:00:00Z', '2026-07-10T10:00:00Z', '2026-06-03T08:00:00Z',
  false, false, false
),

-- ─────────────────────────────────────────────
-- VILLAS
-- ─────────────────────────────────────────────
(
  'vjw-005', 'luxury-villa-undavalli-vijayawada',
  'Luxury 4BHK Independent Villa, Undavalli Caves Road',
  'Stunning independent villa on Undavalli Caves Road with panoramic Krishna river views. Private swimming pool, landscaped garden, smart home automation, modular kitchen with Bosch appliances, and Italian marble flooring throughout. A truly premium lifestyle property.',
  55000000, 11000, 'villa', 'sale', 'published',
  4, 5, 3, 3, 5000, 4200, 4600,
  'furnished', 'east', 1, true,
  '{"address":"Plot 18, River View Enclave, Undavalli Caves Road","locality":"Undavalli","city":"Vijayawada","state":"Andhra Pradesh","pincode":"522501","latitude":16.4743,"longitude":80.5987}',
  '[{"id":"v5a","url":"https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","alt":"Luxury villa exterior","isPrimary":true,"order":0},{"id":"v5b","url":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80","alt":"Villa living room","isPrimary":false,"order":1},{"id":"v5c","url":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80","alt":"Modern kitchen","isPrimary":false,"order":2},{"id":"v5d","url":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80","alt":"Master bedroom","isPrimary":false,"order":3}]',
  '[{"id":"swimming-pool","name":"Swimming Pool","icon":"Waves","category":"lifestyle"},{"id":"gym","name":"Gymnasium","icon":"Dumbbell","category":"lifestyle"},{"id":"gated-security","name":"Gated Security","icon":"Shield","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"park","name":"Park / Garden","icon":"Trees","category":"lifestyle"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"},{"id":"ev-charging","name":"EV Charging","icon":"PlugZap","category":"parking"},{"id":"solar-panels","name":"Solar Panels","icon":"Sun","category":"utility"}]',
  '[{"label":"Construction","value":"RCC Frame Structure"},{"label":"Flooring","value":"Italian Marble"},{"label":"Kitchen","value":"Modular with Bosch Appliances"},{"label":"Pool","value":"Private Swimming Pool"},{"label":"Smart Home","value":"Full Automation"}]',
  true, true, true, true, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  1247, 89, 23,
  '2025-11-15T10:30:00Z', '2026-06-20T14:00:00Z', '2025-11-20T08:00:00Z',
  true, true, true
),

(
  'vjw-006', '3bhk-villa-kanuru-vijayawada',
  'Independent 3BHK Villa with Garden, Kanuru',
  'Beautiful independent villa in Kanuru with a spacious front garden and private terrace. Vastu-compliant design, 2-car parking, generator backup, and borewell. Great connectivity to Vijayawada city and Guntur highway.',
  18500000, 7400, 'villa', 'sale', 'published',
  3, 3, 2, 2, 2500, 2100, 2300,
  'semi-furnished', 'north', 5, true,
  '{"address":"Plot 34, Green Valley Villas, Kanuru","locality":"Kanuru","city":"Vijayawada","state":"Andhra Pradesh","pincode":"521212","latitude":16.5350,"longitude":80.6820}',
  '[{"id":"v6a","url":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80","alt":"Villa front view","isPrimary":true,"order":0},{"id":"v6b","url":"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80","alt":"Living room","isPrimary":false,"order":1},{"id":"v6c","url":"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80","alt":"Garden area","isPrimary":false,"order":2}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"park","name":"Park / Garden","icon":"Trees","category":"lifestyle"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"water-supply","name":"24x7 Water Supply","icon":"Droplets","category":"utility"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"}]',
  '[{"label":"Construction","value":"RCC Frame"},{"label":"Flooring","value":"Vitrified Tiles"},{"label":"Water Supply","value":"Borewell + Municipal"},{"label":"Boundary","value":"Compound Wall"}]',
  true, true, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  412, 56, 18,
  '2026-02-10T10:00:00Z', '2026-06-30T10:00:00Z', '2026-02-15T08:00:00Z',
  true, false, true
),

-- ─────────────────────────────────────────────
-- RESIDENTIAL PLOTS / LAND
-- ─────────────────────────────────────────────
(
  'vjw-007', 'residential-plot-tadepalli-vijayawada',
  'RERA Approved 200 Sq Yd Residential Plot, Tadepalli',
  'Prime residential plot in Tadepalli (Amaravati Capital Region). RERA approved layout with 40 ft road, underground drainage, street lights, and compound wall. Excellent investment opportunity near the upcoming Amaravati state capital.',
  4800000, 2667, 'residential-land', 'sale', 'published',
  0, 0, 0, 0, 1800, 1800, 0,
  'unfurnished', 'north', 0, true,
  '{"address":"Plot 89, Siddhartha Nagar Layout, Tadepalli","locality":"Tadepalli","city":"Vijayawada","state":"Andhra Pradesh","pincode":"522501","latitude":16.4820,"longitude":80.5950}',
  '[{"id":"v7a","url":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80","alt":"Residential plot","isPrimary":true,"order":0},{"id":"v7b","url":"https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800&q=80","alt":"Plot aerial view","isPrimary":false,"order":1}]',
  '[]',
  '[{"label":"Plot Type","value":"Residential"},{"label":"Road Width","value":"40 ft"},{"label":"Boundary Wall","value":"Yes"},{"label":"Drainage","value":"Underground"},{"label":"RERA","value":"P02800001234"}]',
  true, true, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'developer', true,
  412, 56, 18,
  '2026-04-15T10:00:00Z', '2026-06-30T10:00:00Z', '2026-04-18T08:00:00Z',
  false, false, false
),

(
  'vjw-008', 'commercial-plot-auto-nagar-vijayawada',
  'Commercial Plot 500 Sq Yd, Auto Nagar Industrial Area',
  'Corner commercial plot in Auto Nagar with excellent road frontage on 60 ft road. Ideal for showroom, warehouse, or service centre. Clear title documents, municipal approved. High vehicle traffic zone.',
  9500000, 5278, 'commercial-land', 'sale', 'published',
  0, 0, 0, 0, 4500, 4500, 0,
  'unfurnished', 'north', 0, true,
  '{"address":"Plot 12, Auto Nagar Main Road, Vijayawada","locality":"Auto Nagar","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520007","latitude":16.5250,"longitude":80.5920}',
  '[{"id":"v8a","url":"https://images.unsplash.com/photo-1595880500386-4b33823b29cd?w=800&q=80","alt":"Commercial plot","isPrimary":true,"order":0},{"id":"v8b","url":"https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800&q=80","alt":"Surrounding area","isPrimary":false,"order":1}]',
  '[]',
  '[{"label":"Plot Type","value":"Commercial"},{"label":"Road Frontage","value":"60 ft Main Road"},{"label":"Corner Plot","value":"Yes"},{"label":"Zone","value":"Industrial / Commercial"}]',
  true, false, false, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  289, 22, 8,
  '2026-05-10T10:00:00Z', '2026-07-01T10:00:00Z', '2026-05-12T08:00:00Z',
  false, false, false
),

-- ─────────────────────────────────────────────
-- COMMERCIAL SPACES
-- ─────────────────────────────────────────────
(
  'vjw-009', 'commercial-office-space-mg-road-vijayawada',
  'Ready Office Space 2000 Sqft, MG Road Vijayawada',
  'Prime commercial office space on MG Road, Vijayawada''s most prominent business corridor. Features server room, reception, pantry, 6 cabins, conference room, and high-speed internet. Ideal for banks, IT firms, and corporate offices.',
  180000, 0, 'commercial-spaces', 'rent', 'published',
  0, 2, 0, 4, 2000, 1700, 1850,
  'furnished', 'north', 3, true,
  '{"address":"3rd Floor, Srinivasa Towers, MG Road","locality":"MG Road","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520010","latitude":16.5070,"longitude":80.6490}',
  '[{"id":"v9a","url":"https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80","alt":"Modern office space","isPrimary":true,"order":0},{"id":"v9b","url":"https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80","alt":"Open plan office","isPrimary":false,"order":1},{"id":"v9c","url":"https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80","alt":"Conference room","isPrimary":false,"order":2}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"lift","name":"Lift","icon":"ArrowUpDown","category":"basic"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"}]',
  '[{"label":"Cabin Count","value":"6 Cabins"},{"label":"Conference Room","value":"20-seater"},{"label":"Internet","value":"1 Gbps Leased Line"},{"label":"Floors","value":"Floor 3 of 8"}]',
  true, true, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  623, 41, 19,
  '2026-02-01T10:00:00Z', '2026-07-01T10:00:00Z', '2026-02-05T08:00:00Z',
  false, false, true
),

(
  'vjw-010', 'retail-shop-besant-road-vijayawada',
  'Retail Shop 800 Sqft for Rent, Besant Road',
  'Prime retail shop space on busy Besant Road, one of the most-footfall streets in Vijayawada. Ground floor, glass facade, 2 parking slots included. Ideal for garments, electronics, or food & beverage outlet.',
  85000, 0, 'commercial-spaces', 'rent', 'published',
  0, 1, 0, 2, 800, 680, 750,
  'unfurnished', 'west', 6, true,
  '{"address":"Shop 4, Sree Complex, Besant Road","locality":"Besant Road","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520001","latitude":16.5140,"longitude":80.6320}',
  '[{"id":"v10a","url":"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80","alt":"Retail shop facade","isPrimary":true,"order":0},{"id":"v10b","url":"https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80","alt":"Shop interior","isPrimary":false,"order":1}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"}]',
  '[{"label":"Floor","value":"Ground Floor"},{"label":"Frontage","value":"30 ft Glass Facade"},{"label":"Load","value":"Three Phase Power"}]',
  true, false, false, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  341, 29, 14,
  '2026-03-15T10:00:00Z', '2026-07-02T10:00:00Z', '2026-03-18T08:00:00Z',
  false, false, false
),

-- ─────────────────────────────────────────────
-- PG / CO-LIVING
-- ─────────────────────────────────────────────
(
  'vjw-011', 'pg-accommodation-boys-siddhartha-nagar',
  'Boys PG with AC Rooms, Siddhartha Nagar Vijayawada',
  'Well-maintained boys PG accommodation near Siddhartha Engineering College and IT companies. AC rooms with attached bathrooms, WiFi, laundry, housekeeping, and home-cooked meals. Triple, double and single sharing available.',
  8500, 0, 'pg', 'rent', 'published',
  1, 1, 0, 0, 200, 180, 200,
  'furnished', 'east', 4, true,
  '{"address":"H.No 45-12-8, Siddhartha Nagar Main Road","locality":"Siddhartha Nagar","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520010","latitude":16.5080,"longitude":80.6560}',
  '[{"id":"v11a","url":"https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80","alt":"PG room interior","isPrimary":true,"order":0},{"id":"v11b","url":"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80","alt":"Furnished room","isPrimary":false,"order":1},{"id":"v11c","url":"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80","alt":"Common area","isPrimary":false,"order":2}]',
  '[{"id":"water-supply","name":"24x7 Water Supply","icon":"Droplets","category":"utility"},{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"maintenance-staff","name":"Maintenance Staff","icon":"Wrench","category":"society"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"}]',
  '[{"label":"Meals","value":"Included (Veg)"},{"label":"WiFi","value":"100 Mbps Unlimited"},{"label":"Laundry","value":"Included"},{"label":"Sharing","value":"Single / Double / Triple"}]',
  true, false, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  289, 34, 11,
  '2026-04-01T10:00:00Z', '2026-07-05T10:00:00Z', '2026-04-05T08:00:00Z',
  false, false, true
),

(
  'vjw-012', 'girls-pg-near-vnr-college-vijayawada',
  'Girls PG (Safe & Secure), Near VNR College, Bandar Road',
  'Premium ladies-only PG accommodation near VNR Vignan College on Bandar Road. 24/7 CCTV, biometric entry, warden on premises. Meals, WiFi, and laundry included. Only 500m from bus stop.',
  10000, 0, 'pg', 'rent', 'published',
  1, 1, 0, 0, 220, 200, 220,
  'furnished', 'north', 2, true,
  '{"address":"Plot 22, Lakshmi Nagar, Bandar Road","locality":"Bandar Road","city":"Vijayawada","state":"Andhra Pradesh","pincode":"520007","latitude":16.4980,"longitude":80.6310}',
  '[{"id":"v12a","url":"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80","alt":"Girls PG room","isPrimary":true,"order":0},{"id":"v12b","url":"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80","alt":"Common area","isPrimary":false,"order":1}]',
  '[{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"},{"id":"gated-security","name":"Gated Security","icon":"Shield","category":"safety"},{"id":"water-supply","name":"24x7 Water Supply","icon":"Droplets","category":"utility"},{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"maintenance-staff","name":"Maintenance Staff","icon":"Wrench","category":"society"}]',
  '[{"label":"Gender","value":"Ladies Only"},{"label":"Warden","value":"24/7 On-Premises"},{"label":"Entry","value":"Biometric Access"},{"label":"Meals","value":"Included (Veg/Egg)"}]',
  true, false, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  198, 21, 7,
  '2026-05-15T10:00:00Z', '2026-07-05T10:00:00Z', '2026-05-18T08:00:00Z',
  false, false, true
),

-- ─────────────────────────────────────────────
-- FARMHOUSE
-- ─────────────────────────────────────────────
(
  'vjw-013', 'luxury-farmhouse-ibrahimpatnam',
  'Luxury Farmhouse with Pool, Ibrahimpatnam',
  'Magnificent luxury farmhouse estate on 2 acres in Ibrahimpatnam, 25km from Vijayawada city. Features a 4BHK bungalow, private swimming pool, mango orchard, guest cottage, and fully landscaped grounds. Perfect weekend retreat or permanent countryside living.',
  35000000, 4375, 'farmhouse', 'sale', 'published',
  4, 4, 2, 4, 8000, 3200, 3800,
  'furnished', 'east', 3, true,
  '{"address":"Survey No. 45, Ibrahimpatnam Village Road","locality":"Ibrahimpatnam","city":"Vijayawada","state":"Andhra Pradesh","pincode":"521456","latitude":16.5580,"longitude":80.5410}',
  '[{"id":"v13a","url":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80","alt":"Farmhouse exterior","isPrimary":true,"order":0},{"id":"v13b","url":"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80","alt":"Living room","isPrimary":false,"order":1},{"id":"v13c","url":"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80","alt":"Farmhouse grounds","isPrimary":false,"order":2}]',
  '[{"id":"swimming-pool","name":"Swimming Pool","icon":"Waves","category":"lifestyle"},{"id":"park","name":"Park / Garden","icon":"Trees","category":"lifestyle"},{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"solar-panels","name":"Solar Panels","icon":"Sun","category":"utility"},{"id":"rainwater-harvesting","name":"Rainwater Harvesting","icon":"CloudRain","category":"utility"}]',
  '[{"label":"Land Area","value":"2 Acres"},{"label":"Orchard","value":"Mango + Coconut"},{"label":"Water","value":"Borewell + Pond"},{"label":"Guest House","value":"1 Cottage Included"}]',
  true, true, true, true, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'owner', true,
  876, 67, 15,
  '2026-01-10T10:00:00Z', '2026-06-25T10:00:00Z', '2026-01-15T08:00:00Z',
  true, true, true
),

-- ─────────────────────────────────────────────
-- EXTRA: GUNTUR (nearby)
-- ─────────────────────────────────────────────
(
  'vjw-014', '3bhk-apartment-guntur-brodipet',
  '3BHK Modern Apartment, Brodipet Guntur',
  'Well-designed 3BHK apartment in Brodipet, Guntur''s prime residential locality. Modular kitchen, covered parking, backup power, and 24/7 security. Walking distance to Guntur bus station and commercial area.',
  8200000, 4556, 'apartment', 'sale', 'published',
  3, 2, 2, 1, 1800, 1450, 1620,
  'semi-furnished', 'east', 4, true,
  '{"address":"Flat 504, Sai Towers, 7th Lane, Brodipet","locality":"Brodipet","city":"Guntur","state":"Andhra Pradesh","pincode":"522002","latitude":16.3008,"longitude":80.4428}',
  '[{"id":"v14a","url":"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80","alt":"3BHK apartment","isPrimary":true,"order":0},{"id":"v14b","url":"https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=80","alt":"Kitchen","isPrimary":false,"order":1}]',
  '[{"id":"power-backup","name":"Power Backup","icon":"Zap","category":"utility"},{"id":"lift","name":"Lift","icon":"ArrowUpDown","category":"basic"},{"id":"gated-security","name":"Gated Security","icon":"Shield","category":"safety"},{"id":"covered-parking","name":"Covered Parking","icon":"Car","category":"parking"},{"id":"cctv","name":"CCTV Surveillance","icon":"Camera","category":"safety"}]',
  '[{"label":"Construction","value":"RCC Frame"},{"label":"Flooring","value":"Vitrified Tiles"},{"label":"Water Supply","value":"Municipal + Borewell"}]',
  true, false, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'agent', true,
  445, 38, 10,
  '2026-03-20T10:00:00Z', '2026-07-01T10:00:00Z', '2026-03-22T08:00:00Z',
  true, false, false
),

(
  'vjw-015', 'plot-for-sale-amaravati-capital-region',
  'NA Plot in Amaravati Capital Region, 150 Sq Yd',
  'Non-agricultural approved plot in Amaravati Capital Region. Clear title, government approved layout, 30 ft road, water line, and power supply. Exceptional investment opportunity in the upcoming capital of Andhra Pradesh. Price expected to appreciate 3x in 5 years.',
  6750000, 5000, 'residential-land', 'sale', 'published',
  0, 0, 0, 0, 1350, 1350, 0,
  'unfurnished', 'east', 0, true,
  '{"address":"Plot 67, Green Meadows Phase 2, Amaravati","locality":"Amaravati","city":"Vijayawada","state":"Andhra Pradesh","pincode":"522020","latitude":16.5130,"longitude":80.5150}',
  '[{"id":"v15a","url":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80","alt":"Amaravati plot","isPrimary":true,"order":0},{"id":"v15b","url":"https://images.unsplash.com/photo-1595880500386-4b33823b29cd?w=800&q=80","alt":"Surrounding area","isPrimary":false,"order":1}]',
  '[]',
  '[{"label":"Plot Type","value":"Residential (NA)"},{"label":"Road Width","value":"30 ft"},{"label":"Government Approval","value":"Yes"},{"label":"Region","value":"Amaravati Capital Area"}]',
  true, true, true, false, true,
  'admin-001', 'Ravi Shankar', '+919876543201', 'ravi@roadfacing.in', 'developer', true,
  921, 112, 37,
  '2025-12-01T10:00:00Z', '2026-07-01T10:00:00Z', '2025-12-05T08:00:00Z',
  false, false, false
)

ON CONFLICT (id) DO NOTHING;
