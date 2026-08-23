import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {} as Record<string, string>);

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// LOCALITIES DATA: VIJAYAWADA (58%) & GUNTUR (42%)
// ============================================================================

interface LocalityInfo {
  name: string;
  city: 'Vijayawada' | 'Guntur';
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  landmarks: string[];
}

const VIJAYAWADA_LOCALITIES: LocalityInfo[] = [
  { name: 'Benz Circle', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520010', lat: 16.5062, lng: 80.6480, landmarks: ['PVP Square Mall', 'Trendset Mall', 'Maddilapalem Junction'] },
  { name: 'Patamata', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520007', lat: 16.4890, lng: 80.6601, landmarks: ['High School Road', 'Autonagar Gate', 'Pantakaluva Road'] },
  { name: 'Moghalrajpuram', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520010', lat: 16.5020, lng: 80.6380, landmarks: ['Siddhartha College', 'Moghalrajpuram Caves', 'Madhu Gardens'] },
  { name: 'Labbipet', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520010', lat: 16.5085, lng: 80.6325, landmarks: ['MG Road', 'Gateway Hotel', 'Ramesh Hospitals'] },
  { name: 'Poranki', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521137', lat: 16.4780, lng: 80.6950, landmarks: ['Bandar Road Highway', 'Nagarjuna University View', 'Penamaluru Corridor'] },
  { name: 'Kanuru', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521212', lat: 16.5350, lng: 80.6820, landmarks: ['VR Siddhartha College', 'Time Hospital', 'Kamayya Thopu'] },
  { name: 'Penamaluru', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521139', lat: 16.4630, lng: 80.7120, landmarks: ['Bandar Road', 'Penamaluru Center', 'YSR Statue'] },
  { name: 'Tadepalli', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '522501', lat: 16.4820, lng: 80.5950, landmarks: ['AP Secretariat Approach', 'Buckingham Canal', 'Prakasam Barrage Link'] },
  { name: 'Mangalagiri', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '522503', lat: 16.4420, lng: 80.5650, landmarks: ['AIIMS Mangalagiri', 'IT Park Mangalagiri', 'Panakala Lakshmi Narasimha Temple'] },
  { name: 'Enikepadu', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521108', lat: 16.5210, lng: 80.7020, landmarks: ['Chennai-Kolkata Highway', 'SRK Institute of Tech', 'Gannavaram Route'] },
  { name: 'Ramavarappadu', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521108', lat: 16.5260, lng: 80.6720, landmarks: ['Ramavarappadu Ring', 'Inner Ring Road', 'Gunadala Link'] },
  { name: 'Nidamanuru', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521104', lat: 16.5340, lng: 80.7310, landmarks: ['Delhi Public School', 'NH16 Highway', 'Airport Road'] },
  { name: 'Gunadala', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520004', lat: 16.5320, lng: 80.6550, landmarks: ['Mary Matha Shrine', 'ESI Hospital', 'Eluru Road'] },
  { name: 'Auto Nagar', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520007', lat: 16.5250, lng: 80.5920, landmarks: ['Industrial Estate', '100 Feet Road', 'Kanuru Cross'] },
  { name: 'Bhavanipuram', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520012', lat: 16.5300, lng: 80.5950, landmarks: ['Swathi Theatre Center', 'Gollapudi Bypass', 'Bhavani Island Ghat'] },
  { name: 'Ibrahimpatnam', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '521456', lat: 16.5580, lng: 80.5410, landmarks: ['Ferry Ghat', 'Dr NTTPS Thermal Plant', 'Amaravati Seed Access Road'] },
];

const GUNTUR_LOCALITIES: LocalityInfo[] = [
  { name: 'Brodipet', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522002', lat: 16.3008, lng: 80.4428, landmarks: ['4/1 Brodipet Center', 'Naaz Center', 'Guntur Medical College'] },
  { name: 'Arundelpet', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522002', lat: 16.3075, lng: 80.4350, landmarks: ['Main Road Junction', 'Arundelpet Police Station', 'Hindu College'] },
  { name: 'Lakshmipuram', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522007', lat: 16.3120, lng: 80.4280, landmarks: ['Collectorate Road', 'Lodge Center', 'St. Joseph Hospital'] },
  { name: 'Gorantla', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522034', lat: 16.3350, lng: 80.4210, landmarks: ['Inner Ring Road Gorantla', 'VVIT Link Road', 'Gorantla Venkateswara Swamy Temple'] },
  { name: 'Amaravati Road', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522034', lat: 16.3280, lng: 80.4050, landmarks: ['Capital Expressway', 'Chalamaiah Gardens', 'RVR & JC College Route'] },
  { name: 'Mangalagiri', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522503', lat: 16.4380, lng: 80.5600, landmarks: ['Guntur-Vijayawada Highway', 'AIIMS Residential Hub', 'NRI Hospital Link'] },
  { name: 'Nallapadu', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522005', lat: 16.2750, lng: 80.3950, landmarks: ['Nallapadu Railway Station', 'ITC Agro Hub', 'Chilakaluripet Highway'] },
  { name: 'Inner Ring Road', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522034', lat: 16.3220, lng: 80.4450, landmarks: ['Auto Nagar Ring', 'Swarna Bharat Trust', 'Pattabhipuram Link'] },
  { name: 'Autonagar', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522001', lat: 16.3150, lng: 80.4620, landmarks: ['Heavy Vehicle Zone', 'Chennai Highway Link', 'Mirchi Yard Road'] },
  { name: 'Pattabhipuram', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522006', lat: 16.2950, lng: 80.4200, landmarks: ['Main Road Colony', 'Siva Temple', 'Koritapadu Link'] },
  { name: 'SVN Colony', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522006', lat: 16.3020, lng: 80.4100, landmarks: ['Sanjeevaiah Nagar', 'Kanna Vari Thota', 'St. Ann’s School'] },
  { name: 'Chandramouli Nagar', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522007', lat: 16.3180, lng: 80.4190, landmarks: ['Ring Road Junction', 'Doctors Colony', 'Brindavan Gardens Link'] },
  { name: 'AT Agraharam', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522004', lat: 16.2980, lng: 80.4500, landmarks: ['Kothapet Road', 'Railway Station East', 'Old Bus Stand'] },
  { name: 'Gujjanagundla', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522006', lat: 16.2880, lng: 80.4290, landmarks: ['Gujjanagundla Center', 'JKC College Road', 'Vidyanagar Link'] },
  { name: 'Koritapadu', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522007', lat: 16.3060, lng: 80.4220, landmarks: ['Sri Venkateswara Swamy Temple', 'Koritapadu High School', 'Lakshmipuram 4th Lane'] },
];

function getJitteredCoords(loc: LocalityInfo, index: number) {
  const latOffset = (Math.sin(index * 1.7) * 0.008) + ((index % 5) * 0.0015);
  const lngOffset = (Math.cos(index * 1.7) * 0.008) + ((index % 4) * 0.0015);
  return {
    latitude: Number((loc.lat + latOffset).toFixed(6)),
    longitude: Number((loc.lng + lngOffset).toFixed(6)),
  };
}

const PHOTO_SETS = {
  apartments: [
    [
      { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80', alt: 'High Rise Residential Complex Exterior' },
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80', alt: 'Spacious Designer Living Hall' },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80', alt: 'Master Bedroom with Balcony View' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', alt: 'Contemporary Modular Kitchen' },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80', alt: 'Modern Bathroom with Glass Partition' },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', alt: 'Balcony Sitout with Scenic Landscape' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', alt: 'Luxury Flat Interior Living Room' },
      { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80', alt: 'Dining and Open Concept Space' },
      { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80', alt: 'Guest Bedroom with Wardrobes' },
      { url: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=1200&q=80', alt: 'Italian Style Kitchen with Breakfast Bar' },
      { url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&q=80', alt: 'Bathroom Vanity & Fixtures' },
      { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80', alt: 'Grand Apartment Lobby Entrance' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1200&q=80', alt: 'Ultra Modern Living Room' },
      { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=80', alt: 'Master Suite with Hardwood Floors' },
      { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80', alt: 'Kitchen Island and Granite Counters' },
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80', alt: 'Kids Bedroom / Study Room' },
      { url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80', alt: 'Apartment Building Facade' },
      { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80', alt: 'Rooftop Swimming Pool' },
    ]
  ],
  villas: [
    [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80', alt: 'Contemporary Luxury Villa Exterior' },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', alt: 'Double Height Grand Living Room' },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', alt: 'Private Landscaped Lawn & Garden' },
      { url: 'https://images.unsplash.com/photo-1600566753086-00f18f6b0a56?w=1200&q=80', alt: 'Villa Master Suite with Walk-in Closet' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', alt: 'Gourmet Kitchen with Pantry' },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', alt: 'Private Swimming Pool & Deck' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80', alt: 'Independent Gated Villa Facade' },
      { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80', alt: 'Spacious Formal Hall' },
      { url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&q=80', alt: 'Family Lounge on First Floor' },
      { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80', alt: 'Bedroom with Attached Balcony' },
      { url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&q=80', alt: 'Private Terrace with Gazebo' },
      { url: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80', alt: 'Covered Car Porch and Driveway' },
    ]
  ],
  plots: [
    [
      { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', alt: 'CRDA Approved Plotted Layout Aerial View' },
      { url: 'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=1200&q=80', alt: 'Clear Boundary Demarcation & BT Roads' },
      { url: 'https://images.unsplash.com/photo-1595880500386-4b33823b29cd?w=1200&q=80', alt: 'Underground Drainage and Street Lighting' },
      { url: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&q=80', alt: 'Lush Green Avenue Plantation' },
      { url: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1200&q=80', alt: 'Main Grand Entrance Arch & Security' },
    ]
  ],
  commercial: [
    [
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80', alt: 'Prime Commercial Glass Facade Building' },
      { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80', alt: 'Furnished Open Plan Corporate Office' },
      { url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80', alt: 'Executive Conference & Meeting Room' },
      { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80', alt: 'Reception Area and Client Lounge' },
      { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80', alt: 'Commercial High Speed Elevators' },
    ]
  ],
  farmhouses: [
    [
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80', alt: 'Scenic Farmhouse Cottage Exterior' },
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80', alt: 'Rustic & Modern Farmhouse Interior' },
      { url: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80', alt: 'Organic Farming & Fruit Orchard Land' },
      { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', alt: 'Private Borewell & Drip Irrigation' },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', alt: 'Open Lawn Party Area with Swimming Pool' },
    ]
  ]
};

const ALL_AMENITIES = [
  { id: 'power-backup', name: '100% Power Backup', icon: 'Zap', category: 'utility' },
  { id: 'lift', name: 'High-Speed Elevators', icon: 'ArrowUpDown', category: 'basic' },
  { id: 'gated-security', name: '24/7 Gated Security', icon: 'Shield', category: 'safety' },
  { id: 'covered-parking', name: 'Covered Car Parking', icon: 'Car', category: 'parking' },
  { id: 'gym', name: 'Fully Equipped Gym', icon: 'Dumbbell', category: 'lifestyle' },
  { id: 'swimming-pool', name: 'Swimming Pool & Deck', icon: 'Waves', category: 'lifestyle' },
  { id: 'clubhouse', name: 'Grand Clubhouse', icon: 'Building2', category: 'lifestyle' },
  { id: 'park', name: 'Landscaped Garden & Parks', icon: 'Trees', category: 'lifestyle' },
  { id: 'cctv', name: 'CCTV Surveillance', icon: 'Camera', category: 'safety' },
  { id: 'vastu-compliant', name: '100% Vastu Compliant', icon: 'Compass', category: 'basic' },
  { id: 'children-play-area', name: "Children's Play Area", icon: 'Sparkles', category: 'lifestyle' },
  { id: 'jogging-track', name: 'Walking / Jogging Track', icon: 'Footprints', category: 'lifestyle' },
  { id: 'ev-charging', name: 'EV Charging Station', icon: 'PlugZap', category: 'parking' },
  { id: 'water-supply', name: '24x7 Municipal & Bore Water', icon: 'Droplets', category: 'utility' },
  { id: 'solar-power', name: 'Solar Street Lighting', icon: 'Sun', category: 'utility' },
  { id: 'rainwater-harvesting', name: 'Rainwater Harvesting', icon: 'CloudRain', category: 'utility' },
  { id: 'multipurpose-hall', name: 'Air-Conditioned Banquet Hall', icon: 'Store', category: 'society' },
  { id: 'intercom', name: 'Intercom Facility', icon: 'Phone', category: 'basic' },
];

function getAmenitySubset(type: string, index: number) {
  if (type === 'residential-land' || type === 'commercial-lands' || type === 'agricultural-lands') {
    return [
      ALL_AMENITIES[2], // security
      ALL_AMENITIES[7], // parks
      ALL_AMENITIES[9], // vastu
      ALL_AMENITIES[13], // water
      ALL_AMENITIES[14], // solar
      ALL_AMENITIES[15], // rainwater
    ];
  }
  if (type === 'villa' || type === 'farmhouse') {
    return ALL_AMENITIES.slice(0, 14);
  }
  return ALL_AMENITIES.filter((_, idx) => (idx + index) % 2 === 0 || idx < 8);
}

const CONTACTS = [
  { name: 'Srinivasa Rao Varma', phone: '+91 98480 12345', email: 'srinivas.varma@roadfacing.in', type: 'owner' },
  { name: 'Koteswara Rao Chowdary', phone: '+91 98491 54321', email: 'kotesh.chowdary@roadfacing.in', type: 'agent' },
  { name: 'Lakshmi Narayana Reddy', phone: '+91 94402 98765', email: 'narayana.reddy@roadfacing.in', type: 'builder' },
  { name: 'Venkat Ramana Murthy', phone: '+91 98855 67890', email: 'venkat.murthy@roadfacing.in', type: 'agent' },
  { name: 'Prasad Babu Naidu', phone: '+91 99890 11223', email: 'prasad.naidu@roadfacing.in', type: 'owner' },
  { name: 'Radha Krishna Guptha', phone: '+91 94900 33445', email: 'radhakrishna@roadfacing.in', type: 'agent' },
  { name: 'Suresh Kumar Raju', phone: '+91 98661 55667', email: 'suresh.raju@roadfacing.in', type: 'builder' },
];

const BUILDERS = [
  {
    name: 'Meridian Habitat Developers',
    experience: '18+ Years',
    projectsCount: '24 Completed Projects',
    phone: '+91 98480 22334',
    whatsapp: '+91 98480 22334',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80',
    description: 'Pioneering luxury high-rises and integrated townships across Vijayawada and the Amaravati capital region.',
  },
  {
    name: 'Amaravati Prime Infra',
    experience: '14+ Years',
    projectsCount: '16 Completed Projects',
    phone: '+91 98491 33445',
    whatsapp: '+91 98491 33445',
    logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&q=80',
    description: 'Leading developer delivering CRDA approved gated townships and premium commercial corridors in Guntur & Vijayawada.',
  },
  {
    name: 'Haritha Green Spaces & County',
    experience: '20+ Years',
    projectsCount: '32 Completed Projects',
    phone: '+91 94402 44556',
    whatsapp: '+91 94402 44556',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80',
    description: 'Creators of eco-luxury villa townships and resort-style gated communities.',
  },
  {
    name: 'Capital Crest Developers',
    experience: '12+ Years',
    projectsCount: '14 Completed Projects',
    phone: '+91 98855 55667',
    whatsapp: '+91 98855 55667',
    logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&q=80',
    description: 'Specializing in vastu-compliant premium residential apartments in prime urban hubs.',
  },
  {
    name: 'Nagarjuna Landmark Estates',
    experience: '22+ Years',
    projectsCount: '40 Completed Projects',
    phone: '+91 99890 66778',
    whatsapp: '+91 99890 66778',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&q=80',
    description: 'Trusted real estate brand in coastal Andhra Pradesh, synonymous with timely delivery and clear legal titles.',
  }
];

// Valid columns for Supabase sanitization
const VALID_PROPERTY_COLUMNS = new Set([
  'id', 'slug', 'title', 'description', 'price', 'pricePerSqft',
  'propertyType', 'listingType', 'saleType', 'status', 'bedrooms', 'bathrooms', 'balconies',
  'floors', 'totalFloors', 'floorNumber', 'parking', 'roadWidth', 'undividedShare',
  'area', 'carpetArea', 'builtUpArea', 'furnishing', 'facing', 'ageOfProperty',
  'possessionDate', 'isReadyToMove', 'location', 'images', 'coverImage', 'galleryImages',
  'videoUrl', 'amenities', 'features', 'reraId', 'isVerified', 'isFeatured',
  'isRecommended', 'isPremium', 'showOnMap', 'ownerId', 'ownerName', 'ownerPhone',
  'ownerEmail', 'ownerAvatar', 'ownerType', 'isOwnerVerified', 'viewCount', 'savedCount',
  'enquiryCount', 'createdAt', 'updatedAt', 'publishedAt', 'vastuCompliant', 'petFriendly',
  'gatedSecurity', 'refId', 'category', 'subtype', 'listingContext', 'attributes',
  'layoutMapUrl', 'floorPlanUrl', 'brochureUrl', 'displayCategory'
]);

const VALID_PROJECT_COLUMNS = new Set([
  'id', 'slug', 'name', 'tagline', 'description', 'projectType',
  'builderName', 'builderLogoUrl', 'builderPhone', 'builderWhatsapp',
  'location', 'reraId', 'reraApproved', 'noBrokerage',
  'constructionStatus', 'totalUnits', 'totalArea', 'phases',
  'configurations', 'images', 'coverImage', 'videoUrl',
  'brochureUrl', 'highlights', 'facilities', 'isFeatured',
  'isPublished', 'viewCount', 'createdAt', 'updatedAt',
  'crdaApproved', 'totalTowers', 'constructionUpdates', 'displayCategory'
]);

function cleanPropertyForSupabase(prop: any) {
  const p = { ...prop };
  p.attributes = {
    saleType: p.saleType,
    securityDeposit: p.securityDeposit,
    maintenanceCharge: p.maintenanceCharge,
    nearbySchools: p.nearbySchools,
    nearbyHospitals: p.nearbyHospitals,
    waterSupply: p.waterSupply,
  };
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROPERTY_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

function cleanProjectForSupabase(proj: any) {
  const p = { ...proj };
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROJECT_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

export function generateAllProperties(): any[] {
  const properties: any[] = [];
  const specificationsList = [
    [
      { label: 'Structure', value: 'RCC Framed Structure (Earthquake Resistant)' },
      { label: 'Flooring', value: '800x800mm Premium Glazed Vitrified Tiles' },
      { label: 'Main Door', value: 'Teak Wood Frame with Designer Teak Shutter' },
      { label: 'Sanitary', value: 'Jaquar / Kohler Concealed CP Fittings' },
      { label: 'Electrical', value: 'Finolex / Havells Fire-Resistant Copper Wiring' },
      { label: 'Painting', value: 'Asian Paints Royal Luxury Emulsion' },
    ],
    [
      { label: 'Superstructure', value: 'First Class Red Brick Masonry in Cement Mortar' },
      { label: 'Kitchen Platform', value: 'Granite Counter with Stainless Steel Sink & 2ft Dado' },
      { label: 'Windows', value: 'UPVC Sliding Windows with Mosquito Mesh & Safety Grills' },
      { label: 'Water Supply', value: '24 Hours Municipal Water + Deep Borewell Supply' },
      { label: 'Generator', value: '100% DG Backup for Common Areas and 1.5 KVA per Flat' },
      { label: 'Elevators', value: '6-Passenger Automatic High-Speed Johnson / Kone Lifts' },
    ]
  ];

  const facings = ['east', 'west', 'north', 'north-east', 'south-east', 'south'];
  const furnishings = ['semi-furnished', 'unfurnished', 'furnished'];

  let count = 0;

  // 1. APARTMENTS / FLATS (30 Listings: 17 Vijayawada, 13 Guntur)
  for (let i = 1; i <= 30; i++) {
    count++;
    const isVjw = i <= 17;
    const locPool = isVjw ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool[(i - 1) % locPool.length];
    const coords = getJitteredCoords(loc, count);
    const bhk = i % 5 === 1 ? 1 : i % 5 === 2 ? 2 : i % 5 === 3 ? 3 : i % 5 === 4 ? 4 : 3;
    const area = bhk === 1 ? 750 : bhk === 2 ? 1180 + (i * 15) : bhk === 3 ? 1650 + (i * 25) : 2450 + (i * 30);
    const carpetArea = Math.round(area * 0.78);
    const builtUpArea = Math.round(area * 0.90);
    
    const baseRate = loc.name === 'Benz Circle' || loc.name === 'Labbipet' ? 7800 : loc.name === 'Brodipet' || loc.name === 'Lakshmipuram' ? 6200 : 4600 + (i * 80);
    let price = Math.round((area * baseRate) / 50000) * 50000;
    if (price < 1200000) price = 1850000;
    if (price > 95000000) price = 85000000;
    const pricePerSqft = Math.round(price / area);

    const photoSet = PHOTO_SETS.apartments[(i - 1) % PHOTO_SETS.apartments.length];
    const contact = CONTACTS[(i - 1) % CONTACTS.length];
    const refId = `REF${String(100 + count).padStart(3, '0')}`;
    const id = `prop-apt-${String(count).padStart(3, '0')}`;
    const subtype = bhk === 4 ? (i % 2 === 0 ? 'pent-house' : 'duplex-flat') : 'flat';
    const isLuxury = price >= 10000000;
    const title = `${bhk} BHK ${isLuxury ? 'Luxury ' : ''}${subtype === 'pent-house' ? 'Penthouse' : subtype === 'duplex-flat' ? 'Duplex Apartment' : 'Flat'} in ${loc.name}, ${loc.city}`;
    const slug = `${bhk}bhk-${subtype}-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.city.toLowerCase()}-${count}`;

    properties.push({
      id,
      slug,
      refId,
      title,
      description: `Spacious and elegantly designed ${bhk} BHK ${subtype === 'pent-house' ? 'Penthouse' : 'apartment'} located in the prime residential hub of ${loc.name}, ${loc.city}. Built with 100% Vastu compliance, offering excellent natural ventilation, premium vitrified flooring, 24/7 security, high-speed elevators, and dedicated covered car parking. Near major educational institutions, hospitals, and shopping centers. Clear CRDA approved title with immediate registration support.`,
      price,
      pricePerSqft,
      propertyType: 'apartment',
      listingType: 'sale',
      saleType: i % 4 === 0 ? 'resale' : 'new',
      status: 'published',
      category: 'residential',
      subtype,
      bedrooms: bhk,
      bathrooms: Math.max(1, bhk),
      balconies: Math.max(1, bhk - 1),
      parking: bhk >= 3 ? 2 : 1,
      area,
      carpetArea,
      builtUpArea,
      superBuiltUpArea: area,
      undividedShare: Math.round(area * 0.35),
      roadWidth: 40,
      floors: 5,
      totalFloors: 5,
      floorNumber: (i % 5) + 1,
      furnishing: furnishings[i % furnishings.length],
      facing: facings[i % facings.length],
      ageOfProperty: i % 4 === 0 ? 3 : 0,
      possessionDate: i % 4 === 0 ? 'Immediate' : 'Ready to Move',
      isReadyToMove: true,
      location: {
        address: `Flat No ${(i % 5) + 1}0${(i % 4) + 1}, Sri Nilayam, ${loc.name} Main Road`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: loc.landmarks[i % loc.landmarks.length],
      },
      images: photoSet.map((p, idx) => ({
        id: `img-${count}-${idx}`,
        url: p.url,
        alt: `${title} - ${p.alt}`,
        isPrimary: idx === 0,
        order: idx
      })),
      coverImage: photoSet[0].url,
      galleryImages: photoSet.map(p => p.url),
      videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      amenities: getAmenitySubset('apartment', i),
      features: specificationsList[i % 2],
      isVerified: true,
      isFeatured: i % 4 === 0,
      isRecommended: i % 3 === 0,
      displayCategory: i % 4 === 0 ? 'featured' : i % 3 === 0 ? 'recommended' : (price <= 4500000 ? 'budget_friendly' : 'none'),
      isPremium: isLuxury,
      showOnMap: true,
      ownerId: 'admin-001',
      ownerName: contact.name,
      ownerPhone: contact.phone,
      ownerEmail: contact.email,
      ownerType: contact.type,
      isOwnerVerified: true,
      viewCount: 240 + (i * 35),
      savedCount: 18 + (i * 3),
      enquiryCount: 5 + (i % 7),
      vastuCompliant: true,
      petFriendly: true,
      gatedSecurity: true,
      powerBackup: true,
      waterSupply: 'Municipal + Borewell',
      nearbySchools: ['Delhi Public School', 'Nalanda Vidyaniketan', 'Sri Chaitanya'],
      nearbyHospitals: ['Ramesh Hospitals', 'Ayush Hospital', 'Manipal Hospital'],
      reraId: `AP-RERA-DEMO-${10000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
    });
  }

  // 2. VILLAS & INDEPENDENT HOUSES (20 Listings: 11 Vijayawada, 9 Guntur)
  for (let i = 1; i <= 20; i++) {
    count++;
    const isVjw = i <= 11;
    const locPool = isVjw ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool[(i + 2) % locPool.length];
    const coords = getJitteredCoords(loc, count);
    const bhk = i % 3 === 0 ? 5 : i % 2 === 0 ? 4 : 3;
    const plotAreaSqYds = 180 + (i * 12);
    const area = Math.round(plotAreaSqYds * 9 * 1.35);
    const carpetArea = Math.round(area * 0.80);
    const builtUpArea = area;

    let price = Math.round((12500000 + (i * 2400000)) / 100000) * 100000;
    if (price > 92000000) price = 89000000;
    const pricePerSqft = Math.round(price / area);

    const photoSet = PHOTO_SETS.villas[(i - 1) % PHOTO_SETS.villas.length];
    const contact = CONTACTS[(i + 2) % CONTACTS.length];
    const refId = `REF${String(100 + count).padStart(3, '0')}`;
    const id = `prop-vil-${String(count).padStart(3, '0')}`;
    const subtype = i % 3 === 0 ? 'villa' : i % 2 === 0 ? 'house' : 'villa';
    const isTriplex = i % 2 === 0;
    const title = `${bhk} BHK ${isTriplex ? 'Triplex Luxury ' : 'Contemporary '}${subtype === 'villa' ? 'Gated Villa' : 'Independent House'} in ${loc.name}, ${loc.city}`;
    const slug = `${bhk}bhk-${isTriplex ? 'triplex-' : ''}${subtype}-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.city.toLowerCase()}-${count}`;

    properties.push({
      id,
      slug,
      refId,
      title,
      description: `Magnificent ${bhk} BHK ${isTriplex ? 'Triplex ' : ''}independent villa situated in the exclusive residential enclave of ${loc.name}, ${loc.city}. Boasting private landscaped garden, home theatre room, double-height ceiling living hall, Italian modular kitchen, solar water heater, private car porch for 2 SUVs, and 24/7 security with CCTV surveillance. Enjoy quiet suburban living with quick 10-minute access to city commercial centers. Clear titles with spot registration.`,
      price,
      pricePerSqft,
      propertyType: subtype === 'villa' ? 'villa' : 'independent-house',
      listingType: 'sale',
      saleType: 'new',
      status: 'published',
      category: 'residential',
      subtype,
      bedrooms: bhk,
      bathrooms: bhk + 1,
      balconies: 3,
      parking: 2,
      area,
      carpetArea,
      builtUpArea,
      plotArea: plotAreaSqYds,
      roadWidth: 40,
      floors: isTriplex ? 3 : 2,
      totalFloors: isTriplex ? 3 : 2,
      floorNumber: 1,
      furnishing: furnishings[i % furnishings.length],
      facing: facings[(i + 1) % facings.length],
      ageOfProperty: 0,
      possessionDate: 'Ready to Move',
      isReadyToMove: true,
      location: {
        address: `Villa #${i * 2}, Green Valley Enclave, ${loc.name}`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: loc.landmarks[0],
      },
      images: photoSet.map((p, idx) => ({
        id: `img-${count}-${idx}`,
        url: p.url,
        alt: `${title} - ${p.alt}`,
        isPrimary: idx === 0,
        order: idx
      })),
      coverImage: photoSet[0].url,
      galleryImages: photoSet.map(p => p.url),
      videoUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      amenities: getAmenitySubset('villa', i),
      features: specificationsList[0],
      isVerified: true,
      isFeatured: i % 3 === 0,
      isRecommended: i % 2 === 0,
      displayCategory: i % 3 === 0 ? 'featured' : i % 2 === 0 ? 'recommended' : 'none',
      isPremium: true,
      showOnMap: true,
      ownerId: 'admin-001',
      ownerName: contact.name,
      ownerPhone: contact.phone,
      ownerEmail: contact.email,
      ownerType: 'builder',
      isOwnerVerified: true,
      viewCount: 410 + (i * 45),
      savedCount: 32 + (i * 4),
      enquiryCount: 12 + (i % 5),
      vastuCompliant: true,
      petFriendly: true,
      gatedSecurity: true,
      powerBackup: true,
      waterSupply: '24x7 Dedicated Municipal + Borewell',
      nearbySchools: ['KCP Siddhartha School', 'Bhashyam Blooms', 'Oakridge International'],
      nearbyHospitals: ['AIIMS Mangalagiri', 'Time Hospital', 'Capital Hospitals'],
      reraId: `AP-RERA-DEMO-${10000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
    });
  }

  // 3. PLOTS & LANDS (15 Listings: 8 Vijayawada, 7 Guntur)
  for (let i = 1; i <= 15; i++) {
    count++;
    const isVjw = i <= 8;
    const locPool = isVjw ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool[(i + 4) % locPool.length];
    const coords = getJitteredCoords(loc, count);
    const isCommercialOrFarm = i % 4 === 0;
    const propType = isCommercialOrFarm ? (i % 8 === 0 ? 'agricultural-lands' : 'commercial-lands') : 'residential-land';
    const subtype = propType === 'agricultural-lands' ? 'land' : 'venture-plot';
    const plotSizeSqYds = propType === 'agricultural-lands' ? 1210 : 167 + (i * 20);
    const area = plotSizeSqYds * 9;

    const pricePerSqYd = propType === 'commercial-lands' ? 45000 : propType === 'agricultural-lands' ? 18000 : 16000 + (i * 900);
    const price = Math.round((plotSizeSqYds * pricePerSqYd) / 50000) * 50000;
    const pricePerSqft = Math.round(price / area);

    const photoSet = propType === 'agricultural-lands' ? PHOTO_SETS.farmhouses[0] : PHOTO_SETS.plots[0];
    const contact = CONTACTS[(i + 3) % CONTACTS.length];
    const refId = `REF${String(100 + count).padStart(3, '0')}`;
    const id = `prop-plt-${String(count).padStart(3, '0')}`;
    const title = `${plotSizeSqYds} Sq.Yds ${propType === 'commercial-lands' ? 'Commercial Highway' : propType === 'agricultural-lands' ? 'Farmland / Farm Plot' : 'CRDA Approved Residential Plot'} in ${loc.name}, ${loc.city}`;
    const slug = `${plotSizeSqYds}sqyds-${propType}-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.city.toLowerCase()}-${count}`;

    properties.push({
      id,
      slug,
      refId,
      title,
      description: `Prime ${plotSizeSqYds} Sq.Yds ${propType.replace('-', ' ')} situated in a high-growth corridor of ${loc.name}, ${loc.city}. Featuring 40ft/60ft wide black top roads, underground drainage, central water supply system, compound wall with grand entrance arch, avenue plantation, and 100% clear titles. Immediate bank loan facility available from all leading nationalized banks. Guaranteed high appreciation potential in Amaravati capital growth zone.`,
      price,
      pricePerSqft,
      propertyType: propType,
      listingType: 'sale',
      saleType: 'new',
      status: 'published',
      category: propType === 'commercial-lands' ? 'commercial' : propType === 'agricultural-lands' ? 'agricultural' : 'residential',
      subtype,
      bedrooms: 0,
      bathrooms: 0,
      balconies: 0,
      parking: 0,
      area,
      plotArea: plotSizeSqYds,
      roadWidth: 40,
      furnishing: 'unfurnished',
      facing: facings[i % facings.length],
      ageOfProperty: 0,
      possessionDate: 'Immediate',
      isReadyToMove: true,
      location: {
        address: `Plot No ${i * 5}, Capital Horizon Venture, ${loc.name}`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: loc.landmarks[0],
      },
      images: photoSet.map((p, idx) => ({
        id: `img-${count}-${idx}`,
        url: p.url,
        alt: `${title} - ${p.alt}`,
        isPrimary: idx === 0,
        order: idx
      })),
      coverImage: photoSet[0].url,
      galleryImages: photoSet.map(p => p.url),
      amenities: getAmenitySubset(propType, i),
      features: [
        { label: 'Approval Authority', value: 'CRDA / RERA Approved Layout' },
        { label: 'Road Width', value: '40 Feet Black Top Road' },
        { label: 'Electricity', value: 'Underground Cabling with Transformer' },
        { label: 'Drainage', value: 'Underground Sewerage System' },
        { label: 'Security', value: 'Gated Layout with Security Gate' },
      ],
      isVerified: true,
      isFeatured: i % 4 === 0,
      isRecommended: i % 3 === 0,
      displayCategory: i % 4 === 0 ? 'featured' : (price <= 3500000 ? 'budget_friendly' : 'none'),
      isPremium: price >= 5000000,
      showOnMap: true,
      ownerId: 'admin-001',
      ownerName: contact.name,
      ownerPhone: contact.phone,
      ownerEmail: contact.email,
      ownerType: 'agent',
      isOwnerVerified: true,
      viewCount: 310 + (i * 28),
      savedCount: 24 + (i * 3),
      enquiryCount: 9 + (i % 4),
      vastuCompliant: true,
      petFriendly: true,
      gatedSecurity: true,
      reraId: `CRDA-AP-DEMO-${20000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 4)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 4)).toISOString(),
    });
  }

  // 4. COMMERCIAL PROPERTIES (13 Listings: 8 Vijayawada, 5 Guntur)
  for (let i = 1; i <= 13; i++) {
    count++;
    const isVjw = i <= 8;
    const locPool = isVjw ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool[(i + 1) % locPool.length];
    const coords = getJitteredCoords(loc, count);
    const sub = i % 3 === 0 ? 'shops' : i % 2 === 0 ? 'commercial-spaces' : 'buildings';
    const area = sub === 'shops' ? 650 + (i * 40) : sub === 'buildings' ? 4500 + (i * 200) : 1800 + (i * 80);
    const carpetArea = Math.round(area * 0.82);

    let price = sub === 'buildings' ? 48000000 + (i * 2500000) : sub === 'shops' ? 4200000 + (i * 350000) : 12500000 + (i * 900000);
    if (price > 95000000) price = 87500000;
    const pricePerSqft = Math.round(price / area);

    const photoSet = PHOTO_SETS.commercial[0];
    const contact = CONTACTS[(i + 4) % CONTACTS.length];
    const refId = `REF${String(100 + count).padStart(3, '0')}`;
    const id = `prop-com-${String(count).padStart(3, '0')}`;
    const title = `${area} Sq.Ft ${sub === 'shops' ? 'High Street Retail Shop' : sub === 'buildings' ? 'Independent Commercial Building' : 'Grade-A Office Space'} in ${loc.name}, ${loc.city}`;
    const slug = `${area}sqft-${sub}-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.city.toLowerCase()}-${count}`;

    properties.push({
      id,
      slug,
      refId,
      title,
      description: `State-of-the-art commercial property with high footfall in the commercial center of ${loc.name}, ${loc.city}. Boasting glass facade, dedicated basement car parking, high-speed passenger & service lifts, 100% DG backup, central air conditioning provision, and fire safety systems. Ideal for corporate offices, IT firms, diagnostic centers, retail showrooms, or banks looking for high-yield rental return.`,
      price,
      pricePerSqft,
      propertyType: sub,
      listingType: 'sale',
      saleType: 'new',
      status: 'published',
      category: 'commercial',
      subtype: sub === 'shops' ? 'shop' : sub === 'buildings' ? 'building' : 'godown',
      bedrooms: 0,
      bathrooms: 2,
      balconies: 0,
      parking: 4,
      area,
      carpetArea,
      builtUpArea: area,
      roadWidth: 60,
      floors: sub === 'buildings' ? 4 : 1,
      totalFloors: 5,
      floorNumber: sub === 'shops' ? 1 : 2,
      furnishing: 'furnished',
      facing: facings[i % facings.length],
      ageOfProperty: 1,
      possessionDate: 'Ready to Move',
      isReadyToMove: true,
      location: {
        address: `Door No 40-1-${i}, Prime Commercial Towers, ${loc.name}`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: loc.landmarks[0],
      },
      images: photoSet.map((p, idx) => ({
        id: `img-${count}-${idx}`,
        url: p.url,
        alt: `${title} - ${p.alt}`,
        isPrimary: idx === 0,
        order: idx
      })),
      coverImage: photoSet[0].url,
      galleryImages: photoSet.map(p => p.url),
      videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      amenities: ALL_AMENITIES.slice(0, 10),
      features: [
        { label: 'Building Type', value: 'Commercial Complex / Business Hub' },
        { label: 'Power Backup', value: '100% DG Power Backup' },
        { label: 'Elevators', value: 'High Speed Passenger & Service Lifts' },
        { label: 'Security', value: '24/7 Security with Electronic Access' },
      ],
      isVerified: true,
      isFeatured: i % 3 === 0,
      isRecommended: i % 2 === 0,
      displayCategory: i % 3 === 0 ? 'featured' : 'none',
      isPremium: price >= 20000000,
      showOnMap: true,
      ownerId: 'admin-001',
      ownerName: contact.name,
      ownerPhone: contact.phone,
      ownerEmail: contact.email,
      ownerType: 'builder',
      isOwnerVerified: true,
      viewCount: 380 + (i * 30),
      savedCount: 29 + (i * 2),
      enquiryCount: 14 + (i % 6),
      vastuCompliant: true,
      gatedSecurity: true,
      powerBackup: true,
      reraId: `AP-RERA-COM-${30000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 5)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 5)).toISOString(),
    });
  }

  // 5. RENTALS & PG (10 Listings: 6 Vijayawada, 4 Guntur)
  for (let i = 1; i <= 10; i++) {
    count++;
    const isVjw = i <= 6;
    const locPool = isVjw ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool[(i + 3) % locPool.length];
    const coords = getJitteredCoords(loc, count);
    const isPg = i % 4 === 0;
    const bhk = isPg ? 1 : i % 3 === 0 ? 3 : 2;
    const area = isPg ? 350 : bhk === 3 ? 1650 : 1150;
    const rentPrice = isPg ? 8500 + (i * 500) : bhk === 3 ? 28000 + (i * 1500) : 16000 + (i * 1000);
    const deposit = rentPrice * 3;

    const photoSet = isPg ? PHOTO_SETS.apartments[1] : PHOTO_SETS.apartments[0];
    const contact = CONTACTS[(i + 1) % CONTACTS.length];
    const refId = `REF${String(100 + count).padStart(3, '0')}`;
    const id = `prop-rnt-${String(count).padStart(3, '0')}`;
    const title = isPg
      ? `Luxury Co-Living / PG Room with Food in ${loc.name}, ${loc.city}`
      : `Furnished ${bhk} BHK Apartment for Rent in ${loc.name}, ${loc.city}`;
    const slug = `${isPg ? 'pg-coliving' : `${bhk}bhk-rent`}-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.city.toLowerCase()}-${count}`;

    properties.push({
      id,
      slug,
      refId,
      title,
      description: isPg
        ? `Premium co-living PG accommodation in ${loc.name}, ${loc.city}. Includes 3 times homely South Indian food, high-speed WiFi, daily housekeeping, AC, geyser, refrigerator, washing machine, and 24/7 security. Ideal for working professionals and university students.`
        : `Well-maintained ${bhk} BHK fully/semi furnished flat for rent in ${loc.name}, ${loc.city}. Located in a gated residential community with lift, power backup, covered car parking, 24x7 municipal water supply, and security. Close to IT companies, schools, and shopping malls.`,
      price: rentPrice,
      pricePerSqft: 0,
      securityDeposit: deposit,
      maintenanceCharge: 2000,
      propertyType: isPg ? 'pg-coliving' : 'apartment',
      listingType: isPg ? 'pg' : 'rent',
      status: 'published',
      category: 'residential',
      subtype: isPg ? 'flat' : 'flat',
      bedrooms: bhk,
      bathrooms: bhk,
      balconies: 1,
      parking: 1,
      area,
      carpetArea: Math.round(area * 0.8),
      builtUpArea: area,
      furnishing: 'furnished',
      facing: facings[i % facings.length],
      ageOfProperty: 2,
      possessionDate: 'Immediate',
      isReadyToMove: true,
      location: {
        address: `Flat #${(i % 4) + 1}02, Sai Residency, ${loc.name}`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: loc.landmarks[0],
      },
      images: photoSet.map((p, idx) => ({
        id: `img-${count}-${idx}`,
        url: p.url,
        alt: `${title} - ${p.alt}`,
        isPrimary: idx === 0,
        order: idx
      })),
      coverImage: photoSet[0].url,
      galleryImages: photoSet.map(p => p.url),
      videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      amenities: ALL_AMENITIES.slice(0, 8),
      features: [
        { label: 'Furnishing Type', value: 'Fully Furnished with Wardrobes & AC' },
        { label: 'Food Option', value: isPg ? '3 Times Food Included' : 'Self Cooking Kitchen' },
        { label: 'Preferred Tenants', value: 'Family / Working Professionals' },
      ],
      isVerified: true,
      isFeatured: i % 3 === 0,
      isRecommended: false,
      displayCategory: 'none',
      isPremium: false,
      showOnMap: true,
      ownerId: 'admin-001',
      ownerName: contact.name,
      ownerPhone: contact.phone,
      ownerEmail: contact.email,
      ownerType: 'owner',
      isOwnerVerified: true,
      viewCount: 290 + (i * 20),
      savedCount: 15 + i,
      enquiryCount: 8 + (i % 3),
      vastuCompliant: true,
      petFriendly: !isPg,
      gatedSecurity: true,
      powerBackup: true,
      waterSupply: '24x7 Water Supply',
      createdAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
    });
  }

  return properties;
}

export function generateAllProjects(): any[] {
  const projects: any[] = [];

  const projectTemplates = [
    {
      name: 'Meridian Skyline Towers',
      tagline: 'Iconic High-Rise Living on Bandar Highway',
      projectType: 'apartment',
      city: 'Vijayawada' as const,
      locality: 'Poranki',
      builderIdx: 0,
      constructionStatus: 'under-construction',
      totalUnits: 240,
      totalTowers: 3,
      totalArea: '5.5 Acres',
      phases: [
        { id: 'ph-1', name: 'Tower A & B (River View)', status: 'under-construction', possessionDate: 'Dec 2026', totalUnits: 160 },
        { id: 'ph-2', name: 'Tower C (Clubhouse Wing)', status: 'new-launch', possessionDate: 'June 2027', totalUnits: 80 },
      ],
      configs: [
        { id: 'cfg-1', label: '2 BHK Luxury', bedrooms: 2, builtUpAreaMin: 1220, builtUpAreaMax: 1280, priceMin: 5800000, priceMax: 6100000, pricePerUnit: 4750, floorPlanUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80', possessionDate: 'Dec 2026' },
        { id: 'cfg-2', label: '3 BHK Royal', bedrooms: 3, builtUpAreaMin: 1680, builtUpAreaMax: 1750, priceMin: 8000000, priceMax: 8400000, pricePerUnit: 4800, floorPlanUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', possessionDate: 'Dec 2026' },
        { id: 'cfg-3', label: '4 BHK Sky Suite', bedrooms: 4, builtUpAreaMin: 2450, builtUpAreaMax: 2500, priceMin: 12500000, priceMax: 13000000, pricePerUnit: 5100, floorPlanUrl: 'https://images.unsplash.com/photo-1600566753086-00f18efc204b?w=800&q=80', possessionDate: 'June 2027' },
      ],
      highlights: ['Bandar Road Highway Facing', '35,000 Sq.Ft Grand Clubhouse', 'Infinity Rooftop Pool', '100% Vastu Compliant Design'],
      facilities: ['Olympic Size Swimming Pool', 'Badminton Courts', 'Creche & Day Care', 'EV Charging Bays', 'Yoga Meditation Deck'],
      photoCategory: 'apartments'
    },
    {
      name: 'Amaravati Serene County Villas',
      tagline: 'Ultra-Luxury Gated Community Triplex Villas',
      projectType: 'villa',
      city: 'Guntur' as const,
      locality: 'Gorantla',
      builderIdx: 1,
      constructionStatus: 'under-construction',
      totalUnits: 88,
      totalTowers: 0,
      totalArea: '12 Acres',
      phases: [
        { id: 'ph-1', name: 'Phase 1 - Royal Villas', status: 'ready-to-move', possessionDate: 'Ready to Move', totalUnits: 44 },
        { id: 'ph-2', name: 'Phase 2 - Imperial Villas', status: 'under-construction', possessionDate: 'March 2027', totalUnits: 44 },
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK East Facing Villa', bedrooms: 3, builtUpAreaMin: 2800, builtUpAreaMax: 2900, plotSizeMin: 200, plotSizeMax: 200, priceMin: 18500000, priceMax: 19500000, pricePerUnit: 6600, floorPlanUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', possessionDate: 'Ready to Move' },
        { id: 'cfg-2', label: '4 BHK Grand Triplex Villa', bedrooms: 4, builtUpAreaMin: 3650, builtUpAreaMax: 3800, plotSizeMin: 267, plotSizeMax: 267, priceMin: 26500000, priceMax: 28000000, pricePerUnit: 7200, floorPlanUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', possessionDate: 'March 2027' },
      ],
      highlights: ['Inner Ring Road Gorantla Hub', 'Private Plunge Pool Provision', 'Double Height Formal Living', 'Solar Powered Township'],
      facilities: ['Clubhouse with Banquet Hall', 'Tennis Court', 'Children Play Park', '24/7 Security with Intercom'],
      photoCategory: 'villas'
    },
    {
      name: 'Capital Crest Horizon City',
      tagline: 'CRDA Approved Plotted Township Near AIIMS',
      projectType: 'venture',
      city: 'Vijayawada' as const,
      locality: 'Mangalagiri',
      builderIdx: 2,
      constructionStatus: 'ready-to-move',
      totalUnits: 180,
      totalArea: '25 Acres',
      phases: [
        { id: 'ph-1', name: 'Sector A & B', status: 'ready-to-move', possessionDate: 'Immediate Registration', totalUnits: 180 }
      ],
      configs: [
        { id: 'cfg-1', label: 'Residential Plot (167 Sq.Yds)', plotSizeMin: 167, plotSizeMax: 167, priceMin: 3800000, priceMax: 4000000, pricePerUnit: 23000, possessionDate: 'Immediate' },
        { id: 'cfg-2', label: 'Corner Plot (220 Sq.Yds)', plotSizeMin: 220, plotSizeMax: 220, priceMin: 5200000, priceMax: 5500000, pricePerUnit: 24000, possessionDate: 'Immediate' },
        { id: 'cfg-3', label: 'Commercial Facing Plot (300 Sq.Yds)', plotSizeMin: 300, plotSizeMax: 300, priceMin: 8500000, priceMax: 9000000, pricePerUnit: 29000, possessionDate: 'Immediate' },
      ],
      highlights: ['5 Mins from AIIMS Mangalagiri', '60ft & 40ft Wide BT Roads', 'Underground Power & Drainage', 'High Appreciation Zone'],
      facilities: ['Avenue Plantation', 'Grand Entrance Gateway', 'Compound Wall Protection', 'Children Theme Park'],
      photoCategory: 'plots'
    },
    {
      name: 'Benz Circle Royal Grandeur',
      tagline: 'Ultra-Luxury Living in the Heart of Vijayawada',
      projectType: 'apartment',
      city: 'Vijayawada' as const,
      locality: 'Benz Circle',
      builderIdx: 3,
      constructionStatus: 'ready-to-move',
      totalUnits: 65,
      totalTowers: 1,
      totalArea: '2 Acres',
      phases: [
        { id: 'ph-1', name: 'Main Tower', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 65 }
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK Elite', bedrooms: 3, builtUpAreaMin: 1850, builtUpAreaMax: 1950, priceMin: 14500000, priceMax: 15500000, pricePerUnit: 7800, possessionDate: 'Immediate' },
        { id: 'cfg-2', label: '4 BHK Duplex Penthouse', bedrooms: 4, builtUpAreaMin: 3100, builtUpAreaMax: 3250, priceMin: 26000000, priceMax: 27500000, pricePerUnit: 8400, possessionDate: 'Immediate' },
      ],
      highlights: ['Prime Benz Circle Locality', 'Walk to Malls & Restaurants', 'High Speed Mitsubishi Elevators', 'Double Basement Parking'],
      facilities: ['Rooftop Infinity Swimming Pool', 'Fully Equipped Gym', 'Terrace Party Lounge', 'EV Charging Slots'],
      photoCategory: 'apartments'
    },
    {
      name: 'Amaravati Highway Greens',
      tagline: 'Integrated Residential Township on Express Corridor',
      projectType: 'apartment',
      city: 'Guntur' as const,
      locality: 'Amaravati Road',
      builderIdx: 4,
      constructionStatus: 'under-construction',
      totalUnits: 320,
      totalTowers: 4,
      totalArea: '8 Acres',
      phases: [
        { id: 'ph-1', name: 'Tower 1 & 2', status: 'under-construction', possessionDate: 'Oct 2026', totalUnits: 160 },
        { id: 'ph-2', name: 'Tower 3 & 4', status: 'new-launch', possessionDate: 'Dec 2027', totalUnits: 160 },
      ],
      configs: [
        { id: 'cfg-1', label: '2 BHK Comfort', bedrooms: 2, builtUpAreaMin: 1150, builtUpAreaMax: 1200, priceMin: 4800000, priceMax: 5100000, pricePerUnit: 4200, possessionDate: 'Oct 2026' },
        { id: 'cfg-2', label: '3 BHK Premium', bedrooms: 3, builtUpAreaMin: 1580, builtUpAreaMax: 1650, priceMin: 6800000, priceMax: 7200000, pricePerUnit: 4300, possessionDate: 'Oct 2026' },
      ],
      highlights: ['Direct Amaravati Expressway Access', 'Over 70% Open Green Space', 'RERA & CRDA Approved', 'School Bus Pick & Drop Point'],
      facilities: ['Clubhouse & Banquet Hall', 'Cricket Practice Net', 'Skating Rink for Kids', '24/7 Security with Boom Barriers'],
      photoCategory: 'apartments'
    },
    {
      name: 'Krishna Riverfront Haven Villas',
      tagline: 'Bespoke River-Facing Gated Community Villas',
      projectType: 'villa',
      city: 'Vijayawada' as const,
      locality: 'Tadepalli',
      builderIdx: 0,
      constructionStatus: 'under-construction',
      totalUnits: 52,
      totalArea: '8 Acres',
      phases: [
        { id: 'ph-1', name: 'Phase 1', status: 'under-construction', possessionDate: 'Dec 2026', totalUnits: 52 }
      ],
      configs: [
        { id: 'cfg-1', label: '4 BHK Waterfront Villa', bedrooms: 4, builtUpAreaMin: 3800, builtUpAreaMax: 4100, priceMin: 32000000, priceMax: 35000000, pricePerUnit: 8500, possessionDate: 'Dec 2026' },
      ],
      highlights: ['Prakasam Barrage & River Views', 'Private Lift Inside Villa', 'Italian Marble Flooring', 'Private Lawn with Jacuzzi'],
      facilities: ['Riverfront Promenade Walk', 'Clubhouse with Spa', 'Fine Dining Cafe', 'Concierge Service'],
      photoCategory: 'villas'
    },
    {
      name: 'Nagarjuna Imperial Brodipet',
      tagline: 'Premium Boutique Flats in Guntur Central',
      projectType: 'apartment',
      city: 'Guntur' as const,
      locality: 'Brodipet',
      builderIdx: 4,
      constructionStatus: 'ready-to-move',
      totalUnits: 40,
      totalTowers: 1,
      totalArea: '1.2 Acres',
      phases: [
        { id: 'ph-1', name: 'Main Block', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 40 }
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK Super Luxury', bedrooms: 3, builtUpAreaMin: 1800, builtUpAreaMax: 1880, priceMin: 11000000, priceMax: 11800000, pricePerUnit: 6200, possessionDate: 'Immediate' },
      ],
      highlights: ['Brodipet 4th Line Location', 'Only 2 Flats Per Floor', '100% Teak Wood Finishes', '2 Car Parks Per Unit'],
      facilities: ['Gymnasium', 'Rooftop Gazebo', 'Intercom Security', '24 Hours Power Backup'],
      photoCategory: 'apartments'
    },
    {
      name: 'Kanuru Green Palms Residency',
      tagline: 'Serene Family Living Close to Education Hub',
      projectType: 'apartment',
      city: 'Vijayawada' as const,
      locality: 'Kanuru',
      builderIdx: 2,
      constructionStatus: 'under-construction',
      totalUnits: 140,
      totalTowers: 2,
      totalArea: '3 Acres',
      phases: [
        { id: 'ph-1', name: 'Block A & B', status: 'under-construction', possessionDate: 'March 2027', totalUnits: 140 }
      ],
      configs: [
        { id: 'cfg-1', label: '2 BHK', bedrooms: 2, builtUpAreaMin: 1180, builtUpAreaMax: 1220, priceMin: 5200000, priceMax: 5500000, pricePerUnit: 4400, possessionDate: 'March 2027' },
        { id: 'cfg-2', label: '3 BHK', bedrooms: 3, builtUpAreaMin: 1550, builtUpAreaMax: 1620, priceMin: 7000000, priceMax: 7400000, pricePerUnit: 4500, possessionDate: 'March 2027' },
      ],
      highlights: ['Near VR Siddhartha College', 'Peaceful Residential Setting', 'CRDA & RERA Approved', 'Bank Loan Available'],
      facilities: ['Swimming Pool', 'Children Play Zone', 'Community Hall', 'Gym'],
      photoCategory: 'apartments'
    },
    {
      name: 'Lakshmipuram Heights',
      tagline: 'Modern Urban Residences in Prime Guntur',
      projectType: 'apartment',
      city: 'Guntur' as const,
      locality: 'Lakshmipuram',
      builderIdx: 1,
      constructionStatus: 'ready-to-move',
      totalUnits: 50,
      totalTowers: 1,
      totalArea: '1.5 Acres',
      phases: [
        { id: 'ph-1', name: 'Tower 1', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 50 }
      ],
      configs: [
        { id: 'cfg-1', label: '2 BHK', bedrooms: 2, builtUpAreaMin: 1200, builtUpAreaMax: 1250, priceMin: 6800000, priceMax: 7200000, pricePerUnit: 5700, possessionDate: 'Immediate' },
        { id: 'cfg-2', label: '3 BHK', bedrooms: 3, builtUpAreaMin: 1750, builtUpAreaMax: 1800, priceMin: 9800000, priceMax: 10500000, pricePerUnit: 5800, possessionDate: 'Immediate' },
      ],
      highlights: ['Walk to St. Joseph Hospital', 'Vitrified Flooring', 'Generator Backup', '24/7 Security'],
      facilities: ['Multipurpose Hall', 'Gym', 'Covered Parking', 'Elevators'],
      photoCategory: 'apartments'
    },
    {
      name: 'Enikepadu Capital Corridor Venture',
      tagline: 'RERA Approved Highway Facing Layout',
      projectType: 'venture',
      city: 'Vijayawada' as const,
      locality: 'Enikepadu',
      builderIdx: 3,
      constructionStatus: 'ready-to-move',
      totalUnits: 120,
      totalArea: '15 Acres',
      phases: [
        { id: 'ph-1', name: 'Phase 1', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 120 }
      ],
      configs: [
        { id: 'cfg-1', label: 'Plot (180 Sq.Yds)', plotSizeMin: 180, plotSizeMax: 180, priceMin: 4500000, priceMax: 4800000, pricePerUnit: 25000, possessionDate: 'Immediate' },
        { id: 'cfg-2', label: 'Plot (250 Sq.Yds)', plotSizeMin: 250, plotSizeMax: 250, priceMin: 6500000, priceMax: 7000000, pricePerUnit: 26000, possessionDate: 'Immediate' },
      ],
      highlights: ['NH16 Highway Connectivity', '100% Clear Title', 'Underground Drainage', 'Avenue Plantation'],
      facilities: ['Gated Entrance Arch', 'Street Lights', 'Water Pipeline', 'Parks'],
      photoCategory: 'plots'
    },
    {
      name: 'Pattabhipuram Grandeur Apartments',
      tagline: 'Spacious Residential Flats in Established Locality',
      projectType: 'apartment',
      city: 'Guntur' as const,
      locality: 'Pattabhipuram',
      builderIdx: 4,
      constructionStatus: 'new-launch',
      totalUnits: 60,
      totalTowers: 1,
      totalArea: '1.8 Acres',
      phases: [
        { id: 'ph-1', name: 'Main Tower', status: 'new-launch', possessionDate: 'Dec 2027', totalUnits: 60 }
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK', bedrooms: 3, builtUpAreaMin: 1620, builtUpAreaMax: 1680, priceMin: 7800000, priceMax: 8200000, pricePerUnit: 4800, possessionDate: 'Dec 2027' },
      ],
      highlights: ['Pattabhipuram Main Road Link', 'Vastu Designed', 'Modern Elevators', 'Rainwater Harvesting'],
      facilities: ['Party Hall', 'Fitness Center', 'Solar Backup for Common Areas'],
      photoCategory: 'apartments'
    },
    {
      name: 'Penamaluru Royal Orchids Villas',
      tagline: 'Serene Gated Community Villas Surrounded by Greenery',
      projectType: 'villa',
      city: 'Vijayawada' as const,
      locality: 'Penamaluru',
      builderIdx: 2,
      constructionStatus: 'under-construction',
      totalUnits: 45,
      totalArea: '6 Acres',
      phases: [
        { id: 'ph-1', name: 'Orchid Enclave', status: 'under-construction', possessionDate: 'May 2027', totalUnits: 45 }
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK Duplex Villa', bedrooms: 3, builtUpAreaMin: 2600, builtUpAreaMax: 2750, priceMin: 16500000, priceMax: 17500000, pricePerUnit: 6300, possessionDate: 'May 2027' },
      ],
      highlights: ['Bandar Road Corridor', 'Private Backyard Garden', 'Solar Water Heating', 'Clubhouse Access'],
      facilities: ['Swimming Pool', 'Gym', 'Badminton Court', 'Security Guard Post'],
      photoCategory: 'villas'
    },
    {
      name: 'Koritapadu Pride Towers',
      tagline: 'Central Living with High Standard Finishes',
      projectType: 'apartment',
      city: 'Guntur' as const,
      locality: 'Koritapadu',
      builderIdx: 1,
      constructionStatus: 'ready-to-move',
      totalUnits: 36,
      totalTowers: 1,
      totalArea: '1 Acre',
      phases: [
        { id: 'ph-1', name: 'Pride Block', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 36 }
      ],
      configs: [
        { id: 'cfg-1', label: '3 BHK', bedrooms: 3, builtUpAreaMin: 1700, builtUpAreaMax: 1750, priceMin: 8800000, priceMax: 9200000, pricePerUnit: 5200, possessionDate: 'Immediate' },
      ],
      highlights: ['Koritapadu High School Route', 'Granite Flooring', 'Concealed Wiring', '100% Vastu'],
      facilities: ['Elevator', 'Intercom', 'DG Backup'],
      photoCategory: 'apartments'
    },
    {
      name: 'Patamata Horizon Heights',
      tagline: 'Lifestyle Residences Near Autonagar Gate',
      projectType: 'apartment',
      city: 'Vijayawada' as const,
      locality: 'Patamata',
      builderIdx: 0,
      constructionStatus: 'under-construction',
      totalUnits: 95,
      totalTowers: 1,
      totalArea: '2.5 Acres',
      phases: [
        { id: 'ph-1', name: 'Block A', status: 'under-construction', possessionDate: 'Feb 2027', totalUnits: 95 }
      ],
      configs: [
        { id: 'cfg-1', label: '2 BHK', bedrooms: 2, builtUpAreaMin: 1240, builtUpAreaMax: 1280, priceMin: 6500000, priceMax: 6800000, pricePerUnit: 5300, possessionDate: 'Feb 2027' },
        { id: 'cfg-2', label: '3 BHK', bedrooms: 3, builtUpAreaMin: 1680, builtUpAreaMax: 1740, priceMin: 9200000, priceMax: 9600000, pricePerUnit: 5500, possessionDate: 'Feb 2027' },
      ],
      highlights: ['Near High School Road', 'Children Play Zone', 'Covered Car Parking', '24 Hours Water'],
      facilities: ['Clubhouse', 'Gym', 'Elevators', 'Power Backup'],
      photoCategory: 'apartments'
    },
    {
      name: 'Inner Ring Road Golden Palms Layout',
      tagline: 'Prime Plotted Development on Guntur Ring Corridor',
      projectType: 'venture',
      city: 'Guntur' as const,
      locality: 'Inner Ring Road',
      builderIdx: 3,
      constructionStatus: 'ready-to-move',
      totalUnits: 110,
      totalArea: '14 Acres',
      phases: [
        { id: 'ph-1', name: 'Phase 1', status: 'ready-to-move', possessionDate: 'Immediate', totalUnits: 110 }
      ],
      configs: [
        { id: 'cfg-1', label: 'Plot (167 Sq.Yds)', plotSizeMin: 167, plotSizeMax: 167, priceMin: 4200000, priceMax: 4500000, pricePerUnit: 25000, possessionDate: 'Immediate' },
        { id: 'cfg-2', label: 'Plot (220 Sq.Yds)', plotSizeMin: 220, plotSizeMax: 220, priceMin: 5800000, priceMax: 6200000, pricePerUnit: 26000, possessionDate: 'Immediate' },
      ],
      highlights: ['Direct Inner Ring Road Access', '100% CRDA Approved', 'Underground Sewerage', 'Avenue Greenery'],
      facilities: ['Security Gate', 'Park Area', 'Street Lighting', 'Compound Wall'],
      photoCategory: 'plots'
    }
  ];

  for (let idx = 0; idx < projectTemplates.length; idx++) {
    const tmpl = projectTemplates[idx];
    const locPool = tmpl.city === 'Vijayawada' ? VIJAYAWADA_LOCALITIES : GUNTUR_LOCALITIES;
    const loc = locPool.find(l => l.name === tmpl.locality) || locPool[0];
    const coords = getJitteredCoords(loc, idx + 50);
    const builder = BUILDERS[tmpl.builderIdx];
    const id = `proj-${tmpl.city.toLowerCase().slice(0, 3)}-${String(idx + 1).padStart(3, '0')}`;
    const slug = `${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tmpl.city.toLowerCase()}`;

    const photoSet = tmpl.photoCategory === 'villas'
      ? PHOTO_SETS.villas[0]
      : tmpl.photoCategory === 'plots'
      ? PHOTO_SETS.plots[0]
      : PHOTO_SETS.apartments[0];

    projects.push({
      id,
      slug,
      name: tmpl.name,
      tagline: tmpl.tagline,
      description: `${tmpl.name} is a marquee ${tmpl.projectType} development by ${builder.name}, strategically positioned in ${loc.name}, ${loc.city}, Andhra Pradesh. Spanning ${tmpl.totalArea}, this landmark project combines contemporary architecture, 100% Vastu compliance, expansive open spaces, and world-class lifestyle amenities. Designed to provide unmatched luxury, superior connectivity, and stellar capital appreciation in the Amaravati capital region.`,
      projectType: tmpl.projectType,
      builderName: builder.name,
      builderLogoUrl: builder.logoUrl,
      builderPhone: builder.phone,
      builderWhatsapp: builder.whatsapp,
      location: {
        address: `${tmpl.name} Site, ${loc.name} Main Road`,
        locality: loc.name,
        city: loc.city,
        state: 'Andhra Pradesh',
        pincode: loc.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      reraId: `AP-RERA-PROJ-${40000 + idx}`,
      reraApproved: true,
      crdaApproved: true,
      noBrokerage: true,
      constructionStatus: tmpl.constructionStatus,
      totalUnits: tmpl.totalUnits,
      totalTowers: tmpl.totalTowers || (tmpl.projectType === 'apartment' ? 2 : 0),
      totalArea: tmpl.totalArea,
      phases: tmpl.phases,
      configurations: tmpl.configs,
      images: photoSet.map((p, pIdx) => ({
        id: `img-proj-${idx + 1}-${pIdx}`,
        url: p.url,
        alt: `${tmpl.name} - ${p.alt}`,
        category: pIdx === 0 ? 'exterior' : pIdx === 1 ? 'interior' : pIdx === 2 ? 'amenity' : 'aerial',
        isPrimary: pIdx === 0
      })),
      coverImage: photoSet[0].url,
      videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      brochureUrl: `https://roadfacing.in/brochures/${slug}-sample-brochure.pdf`,
      highlights: tmpl.highlights,
      facilities: tmpl.facilities,
      isFeatured: idx < 6,
      displayCategory: idx < 6 ? 'featured' : (idx % 2 === 0 ? 'recommended' : 'none'),
      isPublished: true,
      viewCount: 650 + (idx * 60),
      createdAt: new Date(Date.now() - (idx * 86400000 * 5)).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return projects;
}

async function main() {
  console.log("=================================================================");
  console.log("🚀 ROAD REAL ESTATE — SEEDING 88 PROPERTIES & 15 BUILDER PROJECTS");
  console.log("📍 COVERING STRICTLY VIJAYAWADA & GUNTUR, ANDHRA PRADESH");
  console.log("=================================================================\n");

  const rawProperties = generateAllProperties();
  const rawProjects = generateAllProjects();

  const properties = rawProperties.map(cleanPropertyForSupabase);
  const projects = rawProjects.map(cleanProjectForSupabase);

  console.log(`Generated ${properties.length} Properties:`);
  const vjwProps = properties.filter(p => p.location.city === 'Vijayawada');
  const gntProps = properties.filter(p => p.location.city === 'Guntur');
  console.log(`  • Vijayawada: ${vjwProps.length} (${((vjwProps.length/properties.length)*100).toFixed(1)}%)`);
  console.log(`  • Guntur: ${gntProps.length} (${((gntProps.length/properties.length)*100).toFixed(1)}%)`);
  console.log(`  • Price range: ₹${Math.min(...properties.map(p => p.price)).toLocaleString('en-IN')} – ₹${Math.max(...properties.map(p => p.price)).toLocaleString('en-IN')}`);

  console.log(`\nGenerated ${projects.length} Builder Projects:`);
  const vjwProjs = projects.filter(p => p.location.city === 'Vijayawada');
  const gntProjs = projects.filter(p => p.location.city === 'Guntur');
  console.log(`  • Vijayawada: ${vjwProjs.length}`);
  console.log(`  • Guntur: ${gntProjs.length}`);

  // 1. Write comprehensive SQL migration file
  console.log("\n📁 Generating SQL migration file: supabase/migrations/seed_80_plus_properties.sql...");
  
  const propertiesSqlValues = properties.map(p => {
    const locJson = JSON.stringify(p.location).replace(/'/g, "''");
    const imgJson = JSON.stringify(p.images).replace(/'/g, "''");
    const amenJson = JSON.stringify(p.amenities).replace(/'/g, "''");
    const featJson = JSON.stringify(p.features).replace(/'/g, "''");
    const attrJson = JSON.stringify(p.attributes || {}).replace(/'/g, "''");

    return `(
  '${p.id}', '${p.slug}', '${p.refId || ''}', '${p.title.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}',
  ${p.price}, ${p.pricePerSqft || 0}, '${p.propertyType}', '${p.listingType}', '${p.status}',
  ${p.bedrooms || 0}, ${p.bathrooms || 0}, ${p.balconies || 0}, ${p.floors || 1}, ${p.totalFloors || 1}, ${p.floorNumber || 1},
  ${p.parking || 0}, ${p.roadWidth || 40}, ${p.undividedShare || 0}, ${p.area || 0}, ${p.carpetArea || 0}, ${p.builtUpArea || 0},
  '${p.furnishing || 'unfurnished'}', '${p.facing || 'east'}', ${p.ageOfProperty || 0}, '${p.possessionDate || 'Immediate'}', ${p.isReadyToMove !== false},
  '${locJson}'::jsonb, '${imgJson}'::jsonb, '${p.coverImage || ''}', '${p.videoUrl || ''}',
  '${amenJson}'::jsonb, '${featJson}'::jsonb, '${p.reraId || ''}',
  ${Boolean(p.isVerified)}, ${Boolean(p.isFeatured)}, ${Boolean(p.isRecommended)}, ${Boolean(p.isPremium)}, ${p.showOnMap !== false},
  '${p.ownerId}', '${(p.ownerName || '').replace(/'/g, "''")}', '${p.ownerPhone || ''}', '${p.ownerEmail || ''}', '${p.ownerType || 'owner'}', ${Boolean(p.isOwnerVerified)},
  ${p.viewCount || 0}, ${p.savedCount || 0}, ${p.enquiryCount || 0},
  '${p.createdAt}', '${p.updatedAt}', '${p.publishedAt}',
  ${Boolean(p.vastuCompliant)}, ${Boolean(p.petFriendly)}, ${Boolean(p.gatedSecurity)},
  '${p.category || 'residential'}', '${p.subtype || 'flat'}', '${p.displayCategory || 'none'}', '${attrJson}'::jsonb
)`;
  });

  const projectsSqlValues = projects.map(p => {
    const locJson = JSON.stringify(p.location).replace(/'/g, "''");
    const imgJson = JSON.stringify(p.images).replace(/'/g, "''");
    const phasesJson = JSON.stringify(p.phases).replace(/'/g, "''");
    const configsJson = JSON.stringify(p.configurations).replace(/'/g, "''");
    const highlightsJson = JSON.stringify(p.highlights).replace(/'/g, "''");
    const facilitiesJson = JSON.stringify(p.facilities).replace(/'/g, "''");

    return `(
  '${p.id}', '${p.slug}', '${p.name.replace(/'/g, "''")}', '${(p.tagline || '').replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}',
  '${p.projectType}', '${p.builderName.replace(/'/g, "''")}', '${p.builderLogoUrl || ''}', '${p.builderPhone || ''}', '${p.builderWhatsapp || ''}',
  '${locJson}'::jsonb, '${p.reraId || ''}', ${Boolean(p.reraApproved)}, ${Boolean(p.crdaApproved)}, ${Boolean(p.noBrokerage)},
  '${p.constructionStatus}', ${p.totalUnits || 0}, ${p.totalTowers || 0}, '${p.totalArea || ''}',
  '${phasesJson}'::jsonb, '${configsJson}'::jsonb, '${imgJson}'::jsonb, '${p.coverImage || ''}',
  '${p.videoUrl || ''}', '${p.brochureUrl || ''}', '${highlightsJson}'::jsonb, '${facilitiesJson}'::jsonb,
  ${Boolean(p.isFeatured)}, ${Boolean(p.isPublished)}, ${p.viewCount || 0},
  '${p.createdAt}', '${p.updatedAt}', '${p.displayCategory || 'none'}'
)`;
  });

  const sqlContent = `-- ============================================================================
-- ROAD REAL ESTATE: SEED 88 COMPLETE PROPERTIES & 15 BUILDER PROJECTS
-- LOCATIONS: VIJAYAWADA & GUNTUR, ANDHRA PRADESH ONLY
-- IDEMPOTENT INSERTION WITH ON CONFLICT DO UPDATE
-- ============================================================================

-- 1. Insert 88 Properties
INSERT INTO public.properties (
  id, slug, "refId", title, description,
  price, "pricePerSqft", "propertyType", "listingType", status,
  bedrooms, bathrooms, balconies, floors, "totalFloors", "floorNumber",
  parking, "roadWidth", "undividedShare", area, "carpetArea", "builtUpArea",
  furnishing, facing, "ageOfProperty", "possessionDate", "isReadyToMove",
  location, images, "coverImage", "videoUrl",
  amenities, features, "reraId",
  "isVerified", "isFeatured", "isRecommended", "isPremium", "showOnMap",
  "ownerId", "ownerName", "ownerPhone", "ownerEmail", "ownerType", "isOwnerVerified",
  "viewCount", "savedCount", "enquiryCount",
  "createdAt", "updatedAt", "publishedAt",
  "vastuCompliant", "petFriendly", "gatedSecurity",
  category, subtype, "displayCategory", attributes
) VALUES
${propertiesSqlValues.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  "pricePerSqft" = EXCLUDED."pricePerSqft",
  location = EXCLUDED.location,
  images = EXCLUDED.images,
  "coverImage" = EXCLUDED."coverImage",
  amenities = EXCLUDED.amenities,
  features = EXCLUDED.features,
  "isVerified" = EXCLUDED."isVerified",
  "isFeatured" = EXCLUDED."isFeatured",
  "isRecommended" = EXCLUDED."isRecommended",
  "displayCategory" = EXCLUDED."displayCategory",
  attributes = EXCLUDED.attributes,
  "updatedAt" = EXCLUDED."updatedAt";

-- 2. Insert 15 Builder Projects
INSERT INTO public.projects (
  id, slug, name, tagline, description,
  "projectType", "builderName", "builderLogoUrl", "builderPhone", "builderWhatsapp",
  location, "reraId", "reraApproved", "crdaApproved", "noBrokerage",
  "constructionStatus", "totalUnits", "totalTowers", "totalArea",
  phases, configurations, images, "coverImage",
  "videoUrl", "brochureUrl", highlights, facilities,
  "isFeatured", "isPublished", "viewCount",
  "createdAt", "updatedAt", "displayCategory"
) VALUES
${projectsSqlValues.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  phases = EXCLUDED.phases,
  configurations = EXCLUDED.configurations,
  images = EXCLUDED.images,
  "coverImage" = EXCLUDED."coverImage",
  "isFeatured" = EXCLUDED."isFeatured",
  "isPublished" = EXCLUDED."isPublished",
  "displayCategory" = EXCLUDED."displayCategory",
  "updatedAt" = EXCLUDED."updatedAt";
`;

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/seed_80_plus_properties.sql');
  fs.writeFileSync(migrationPath, sqlContent, 'utf8');
  console.log(`✅ Saved ${Math.round(sqlContent.length / 1024)} KB SQL seed file.`);

  // 2. Direct Supabase Database Seeding via JS Client
  console.log("\n⚡ Connecting to Supabase and seeding properties & projects directly...");

  try {
    const BATCH_SIZE = 20;
    let propsInserted = 0;

    for (let i = 0; i < properties.length; i += BATCH_SIZE) {
      const batch = properties.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('properties').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.warn(`  ⚠️ Properties batch ${i / BATCH_SIZE + 1} notice:`, error.message);
      } else {
        propsInserted += batch.length;
        console.log(`  ✓ Inserted properties ${propsInserted}/${properties.length}`);
      }
    }

    const { error: projError } = await supabase.from('projects').upsert(projects, { onConflict: 'id' });
    if (projError) {
      console.warn("  ⚠️ Projects insert notice:", projError.message);
    } else {
      console.log(`  ✓ Inserted all ${projects.length} builder projects successfully.`);
    }

    console.log("\n🎉 Database Seeding Completed Successfully!");
  } catch (err: any) {
    console.error("Seeding error:", err.message || err);
  }
}

main().catch(console.error);
