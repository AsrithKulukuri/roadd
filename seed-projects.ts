import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {} as Record<string, string>);

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dummyProjects = [
  {
    id: `proj-apt-${Date.now()}`,
    slug: 'mock-luxury-apartments',
    name: 'Mock Luxury Apartments',
    tagline: 'Premium living in the city',
    description: 'A luxurious apartment complex with state-of-the-art amenities and beautiful city views.',
    projectType: 'apartment',
    builderName: 'Mock Builders Inc',
    location: {
      address: '123 Downtown Ave',
      locality: 'Downtown',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      latitude: 17.721,
      longitude: 83.315,
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15165.62623340076!2d83.3089456!3d17.714541!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39433e14fb5053%3A0xc3c45dbd4d98c253!2sVisakhapatnam%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1715426189569!5m2!1sen!2sin'
    },
    reraApproved: true,
    reraId: 'AP-RERA-12345',
    constructionStatus: 'under-construction',
    totalUnits: 200,
    totalTowers: 2,
    phases: [
      { id: 'ph-1', name: 'Tower A', status: 'under-construction', possessionDate: 'Dec 2026' }
    ],
    configurations: [
      {
        id: 'cfg-apt-1',
        label: '2 BHK',
        superBuiltUpAreaMin: 1200,
        superBuiltUpAreaMax: 1250,
        priceMin: 6000000,
        priceMax: 6250000,
        pricePerUnit: 5000,
        possessionDate: 'Dec 2026',
        floorPlanUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80'
      },
      {
        id: 'cfg-apt-2',
        label: '2 BHK',
        superBuiltUpAreaMin: 1300,
        superBuiltUpAreaMax: 1300,
        priceMin: 6500000,
        priceMax: 6500000,
        pricePerUnit: 5000,
        possessionDate: 'Dec 2026',
        floorPlanUrl: 'https://images.unsplash.com/photo-1600566753086-00f18efc204b?w=800&q=80'
      },
      {
        id: 'cfg-apt-3',
        label: '3 BHK',
        superBuiltUpAreaMin: 1800,
        superBuiltUpAreaMax: 1850,
        priceMin: 9000000,
        priceMax: 9250000,
        pricePerUnit: 5000,
        possessionDate: 'Dec 2026',
        floorPlanUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'
      }
    ],
    images: [
      { id: 'img-apt-1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80', alt: 'Building Exterior', category: 'exterior', isPrimary: true },
      { id: 'img-apt-2', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80', alt: 'Lobby', category: 'interior' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
    highlights: ['Prime Location', 'Metro Connectivity', 'Premium Finishes'],
    facilities: ['Swimming Pool', 'Gymnasium', '24/7 Security'],
    isFeatured: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `proj-plot-${Date.now()}`,
    slug: 'mock-green-ventures',
    name: 'Mock Green Ventures',
    tagline: 'Invest in your future',
    description: 'A premium plotted development offering excellent ROI and peaceful living away from the city chaos.',
    projectType: 'venture',
    builderName: 'Mock Layouts LLC',
    location: {
      address: '45 Highway Road',
      locality: 'Madhurawada',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      latitude: 17.821,
      longitude: 83.355,
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30325.2655768565!2d83.33611385!3d17.82133285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a395b058098c4af%3A0x2dbf17e33dcfa6de!2sMadhurawada%2C%20Visakhapatnam%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1715426248981!5m2!1sen!2sin'
    },
    reraApproved: true,
    crdaApproved: true,
    constructionStatus: 'ready-to-move',
    totalUnits: 150,
    totalArea: '20 Acres',
    phases: [
      { id: 'ph-2', name: 'Phase 1', status: 'ready-to-move' }
    ],
    configurations: [
      {
        id: 'cfg-plot-1',
        label: 'Residential Plot',
        plotSizeMin: 150,
        plotSizeMax: 150,
        priceMin: 3000000,
        priceMax: 3000000,
        pricePerUnit: 20000,
        possessionDate: 'Immediate',
        floorPlanUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'
      },
      {
        id: 'cfg-plot-2',
        label: 'Residential Plot',
        plotSizeMin: 200,
        plotSizeMax: 200,
        priceMin: 4000000,
        priceMax: 4000000,
        pricePerUnit: 20000,
        possessionDate: 'Immediate',
        floorPlanUrl: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=800&q=80'
      }
    ],
    images: [
      { id: 'img-plot-1', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80', alt: 'Layout aerial', category: 'aerial', isPrimary: true }
    ],
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    highlights: ['Highway Facing', 'Clear Title', 'Bank Loan Available'],
    facilities: ['Black top roads', 'Underground drainage', 'Park'],
    isFeatured: false,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `proj-villa-${Date.now()}`,
    slug: 'mock-royal-villas',
    name: 'Mock Royal Villas',
    tagline: 'Exquisite independent living',
    description: 'Ultra-luxury villas with private pools and smart home automation.',
    projectType: 'villa',
    builderName: 'Mock Premium Developers',
    location: {
      address: '77 Hills Drive',
      locality: 'Rushikonda',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      latitude: 17.771,
      longitude: 83.375,
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15159.206587979319!2d83.37255155!3d17.77977055!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a395af2f6e52dc7%3A0x6b876fc15c4a169b!2sRushikonda%2C%20Visakhapatnam%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1715426284687!5m2!1sen!2sin'
    },
    reraApproved: true,
    constructionStatus: 'new-launch',
    totalUnits: 45,
    totalArea: '5 Acres',
    phases: [
      { id: 'ph-3', name: 'Phase 1', status: 'new-launch', possessionDate: 'Mar 2027' }
    ],
    configurations: [
      {
        id: 'cfg-villa-1',
        label: '4 BHK Villa',
        builtUpAreaMin: 3500,
        builtUpAreaMax: 3500,
        priceMin: 35000000,
        priceMax: 35000000,
        pricePerUnit: 10000,
        possessionDate: 'Mar 2027',
        floorPlanUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
      }
    ],
    images: [
      { id: 'img-villa-1', url: 'https://images.unsplash.com/photo-1613490908571-9ce224a1b023?w=1200&q=80', alt: 'Villa exterior', category: 'exterior', isPrimary: true },
      { id: 'img-villa-2', url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80', alt: 'Living Room', category: 'interior' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1613490908571-9ce224a1b023?w=1200&q=80',
    highlights: ['Private Pool', 'Smart Home', 'Sea View'],
    facilities: ['Clubhouse', 'Tennis Court', 'Concierge Services'],
    isFeatured: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function seed() {
  console.log("Cleaning up old dummy projects...");
  await supabase.from('projects').delete().like('name', 'Mock%');

  console.log("Seeding dummy projects...");
  for (const proj of dummyProjects) {
    const { error } = await supabase.from('projects').insert([proj]);
    if (error) {
      console.error(`Failed to insert ${proj.name}:`, error.message);
    } else {
      console.log(`Inserted ${proj.name} successfully.`);
    }
  }
  console.log("Seeding complete.");
}

seed();
