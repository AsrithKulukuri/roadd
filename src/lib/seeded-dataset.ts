// ============================================================================
// VIJAYAWADA & GUNTUR 88 PROPERTIES & 15 PROJECTS MASTER DATASET
// ============================================================================

import type { Property } from '@/types/property';
import type { Project } from '@/types/project';

interface LocalityInfo {
  name: string;
  city: 'Vijayawada' | 'Guntur';
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  landmarks: string[];
}

export const VIJAYAWADA_LOCALITIES: LocalityInfo[] = [
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

export const GUNTUR_LOCALITIES: LocalityInfo[] = [
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
  ],
  villas: [
    [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80', alt: 'Contemporary Luxury Villa Exterior' },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', alt: 'Double Height Grand Living Room' },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', alt: 'Private Landscaped Lawn & Garden' },
      { url: 'https://images.unsplash.com/photo-1600566753086-00f18f6b0a56?w=1200&q=80', alt: 'Villa Master Suite with Walk-in Closet' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', alt: 'Gourmet Kitchen with Pantry' },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', alt: 'Private Swimming Pool & Deck' },
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
  { id: 'power-backup', name: '100% Power Backup', icon: 'Zap', category: 'utility' as const },
  { id: 'lift', name: 'High-Speed Elevators', icon: 'ArrowUpDown', category: 'basic' as const },
  { id: 'gated-security', name: '24/7 Gated Security', icon: 'Shield', category: 'safety' as const },
  { id: 'covered-parking', name: 'Covered Car Parking', icon: 'Car', category: 'parking' as const },
  { id: 'gym', name: 'Fully Equipped Gym', icon: 'Dumbbell', category: 'lifestyle' as const },
  { id: 'swimming-pool', name: 'Swimming Pool & Deck', icon: 'Waves', category: 'lifestyle' as const },
  { id: 'clubhouse', name: 'Grand Clubhouse', icon: 'Building2', category: 'lifestyle' as const },
  { id: 'park', name: 'Landscaped Garden & Parks', icon: 'Trees', category: 'lifestyle' as const },
  { id: 'cctv', name: 'CCTV Surveillance', icon: 'Camera', category: 'safety' as const },
  { id: 'vastu-compliant', name: '100% Vastu Compliant', icon: 'Compass', category: 'basic' as const },
  { id: 'children-play-area', name: "Children's Play Area", icon: 'Sparkles', category: 'lifestyle' as const },
  { id: 'jogging-track', name: 'Walking / Jogging Track', icon: 'Footprints', category: 'lifestyle' as const },
  { id: 'ev-charging', name: 'EV Charging Station', icon: 'PlugZap', category: 'parking' as const },
  { id: 'water-supply', name: '24x7 Municipal & Bore Water', icon: 'Droplets', category: 'utility' as const },
  { id: 'solar-power', name: 'Solar Street Lighting', icon: 'Sun', category: 'utility' as const },
  { id: 'rainwater-harvesting', name: 'Rainwater Harvesting', icon: 'CloudRain', category: 'utility' as const },
  { id: 'multipurpose-hall', name: 'Air-Conditioned Banquet Hall', icon: 'Store', category: 'society' as const },
  { id: 'intercom', name: 'Intercom Facility', icon: 'Phone', category: 'basic' as const },
];

function getAmenitySubset(type: string, index: number) {
  if (type === 'residential-land' || type === 'commercial-lands' || type === 'agricultural-lands') {
    return [
      ALL_AMENITIES[2],
      ALL_AMENITIES[7],
      ALL_AMENITIES[9],
      ALL_AMENITIES[13],
      ALL_AMENITIES[14],
      ALL_AMENITIES[15],
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

export function getSeededProperties(): Property[] {
  const properties: Property[] = [];
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

  const facings = ['east', 'west', 'north', 'north-east', 'south-east', 'south'] as const;
  const furnishings = ['semi-furnished', 'unfurnished', 'furnished'] as const;

  let count = 0;

  // 1. APARTMENTS / FLATS (30 Listings)
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
      reraId: `AP-RERA-DEMO-${10000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
    });
  }

  // 2. VILLAS (20 Listings)
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
      reraId: `AP-RERA-DEMO-${10000 + count}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
    });
  }

  // 3. PLOTS (15 Listings)
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

  // 4. COMMERCIAL (13 Listings)
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

  // 5. RENTALS & PG (10 Listings)
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

export const seededMockProperties: Property[] = getSeededProperties();
