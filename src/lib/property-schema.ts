export type PropertyCategory = "residential" | "commercial" | "industrial" | "agricultural";

export type PropertySubtype =
  | "flat" | "duplex-flat" | "house" | "villa" | "venture-plot" | "land" | "pent-house"      // residential
  | "floor" | "shop" | "building"                                                             // commercial (+ land, shared)
  | "godown" | "warehouse"                                                                    // industrial (+ building, land shared)
  | "farm-house";                                                                              // agricultural (+ land, shared)

export interface CategoryFieldConfig {
  key: string;
  label: string;
  inputType: "text" | "number" | "dropdown" | "multiselect" | "yesno" | "measurement";
  options?: string[];
  maxRange?: number;
  required?: boolean;
  helpText?: string;
}

// Shared dropdown option sets
export const FACING_FULL_OPTIONS = [
  "east", "west", "north", "south", 
  "eastnorth", "eastsouth", "eastwest", 
  "westnorth", "westsouth", "northsouth"
];

export const FACING_BASIC_OPTIONS = ["east", "west", "north", "south"];

export const FURNISHED_STATUS_OPTIONS = ["furnished", "unfurnished", "semi-furnished"];

export const WATER_SOURCE_STD_OPTIONS = ["bore", "municipality", "both"];

export const WATER_SOURCE_AGRI_OPTIONS = ["bore", "lake"];

export const AGE_OF_PROPERTY_OPTIONS = [
  "new-construction (<3 yrs)",
  "3-7 years",
  "7-10 years",
  "10-15 years",
  "15-20 years",
  "20+ years"
];

export const LAND_APPROVED_BY_OPTIONS = ["CRDA", "Panchayat", "Corporation", "UDA"];

export const YES_NO_OPTIONS = ["yes", "no"];

export const LEASE_STATUS_OPTIONS = ["open", "locked"];

export const CULTIVATION_CROPS_DEFAULT = ["Paddy", "Chilli", "Cotton", "Maize", "Tobacco", "Sugarcane", "Mango", "Banana"];

export const DUPLEX_FLOOR_COMBINATIONS = [
  "1+2", "2+3", "3+4", "4+5", "5+6", "6+7", "7+8", "8+9", "9+10", "10+11", "11+12"
];

// Helper to generate range dropdown options up to N (e.g., 35)
export function generateNumericRange(max: number = 35): string[] {
  return Array.from({ length: max }, (_, i) => String(i + 1));
}

// Subtype list by category
export const CATEGORY_SUBTYPES: Record<PropertyCategory, { id: PropertySubtype; label: string }[]> = {
  residential: [
    { id: "flat", label: "Flat" },
    { id: "duplex-flat", label: "Duplex Flat" },
    { id: "house", label: "Independent House" },
    { id: "villa", label: "Villa" },
    { id: "venture-plot", label: "Venture Plot" },
    { id: "land", label: "Land / Open Plot" },
    { id: "pent-house", label: "Penthouse" },
  ],
  commercial: [
    { id: "floor", label: "Commercial Floor" },
    { id: "shop", label: "Commercial Shop" },
    { id: "building", label: "Commercial Building" },
    { id: "land", label: "Commercial Land" },
  ],
  industrial: [
    { id: "godown", label: "Godown" },
    { id: "warehouse", label: "Warehouse" },
    { id: "building", label: "Industrial Building" },
    { id: "land", label: "Industrial Land" },
  ],
  agricultural: [
    { id: "land", label: "Agricultural Land" },
    { id: "farm-house", label: "Farmhouse" },
  ],
};

// Common fields across residential building subtypes (Flat, Duplex, Penthouse)
const COMMON_FLAT_FIELDS: CategoryFieldConfig[] = [
  { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number", required: true },
  { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number" },
  { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number", required: true },
  { key: "undividedShare", label: "Undivided Share (sqyd)", inputType: "number" },
  { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS, required: true },
  { key: "totalFloors", label: "Total Floors in Building", inputType: "dropdown", options: generateNumericRange(35) },
  { key: "propertyOnFloor", label: "Property on Floor", inputType: "dropdown", options: generateNumericRange(35) },
  { key: "parking", label: "Parking Slots", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
  { key: "cupboards", label: "Cupboards Included", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "balconies", label: "Balconies", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "bathrooms", label: "Bathrooms", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "poojaRoom", label: "Pooja Room", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "homeTheatreRoom", label: "Home Theatre Room", inputType: "yesno", options: YES_NO_OPTIONS },
  // TODO: Normalize Lifts convention (yes/no vs numeric count) across Flat vs Commercial vs Industrial
  { key: "lifts", label: "Number of Lifts", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
  { key: "ageOfProperty", label: "Age of Property", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
];

const COMMON_HOUSE_FIELDS: CategoryFieldConfig[] = [
  { key: "builtUpArea", label: "Total Built-up Area (sqft)", inputType: "number", required: true },
  { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number" },
  { key: "measurements", label: "Measurements (Width x Depth)", inputType: "measurement", helpText: "e.g. 40 x 60" },
  { key: "roadWidth", label: "Width of Facing Road (ft)", inputType: "number" },
  { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS, required: true },
  { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "parking", label: "Parking", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
  { key: "cupboards", label: "Cupboards Included", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "balconies", label: "Balconies", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "bathrooms", label: "Bathrooms", inputType: "dropdown", options: generateNumericRange(10) },
  { key: "poojaRoom", label: "Pooja Room", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "homeTheatreRoom", label: "Home Theatre Room", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "lifts", label: "Lift Available", inputType: "yesno", options: YES_NO_OPTIONS },
  { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
  { key: "ageOfProperty", label: "Age of Property", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
];

export const PROPERTY_CATEGORY_SCHEMA: Record<PropertyCategory, Record<string, CategoryFieldConfig[]>> = {
  residential: {
    flat: COMMON_FLAT_FIELDS,
    
    "duplex-flat": [
      ...COMMON_FLAT_FIELDS,
      { key: "duplexCombination", label: "Combination of Two Floors", inputType: "dropdown", options: DUPLEX_FLOOR_COMBINATIONS, helpText: "e.g. 1+2, 2+3" }
    ],

    house: COMMON_HOUSE_FIELDS,

    // TODO: Villa annotated as 'listable under both Project and standalone Property'
    villa: [
      { key: "listingContext", label: "Listing Mode Context", inputType: "dropdown", options: ["standalone", "project", "both"], required: true },
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      ...COMMON_HOUSE_FIELDS
    ],

    "venture-plot": [
      { key: "totalAreaSqyd", label: "Total Area (sqyd)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements (Width x Depth)", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "landApprovedBy", label: "Land Approved By", inputType: "dropdown", options: LAND_APPROVED_BY_OPTIONS },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "gatedCommunity", label: "Gated Community", inputType: "yesno", options: YES_NO_OPTIONS },
      { key: "totalPlots", label: "Total Plots in Venture", inputType: "number" },
      { key: "plotNo", label: "Plot Number", inputType: "text" },
      { key: "undergroundDrainage", label: "Underground Drainage", inputType: "yesno", options: YES_NO_OPTIONS },
      { key: "streetLights", label: "Street Lights Available", inputType: "yesno", options: YES_NO_OPTIONS }
    ],

    land: [
      { key: "totalAreaSqyd", label: "Total Land Area (sqyd)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements (Width x Depth)", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "landApprovedBy", label: "Land Approved By", inputType: "dropdown", options: LAND_APPROVED_BY_OPTIONS },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "readyToConstruct", label: "Ready to Construct House", inputType: "yesno", options: YES_NO_OPTIONS }
    ],

    "pent-house": [
      ...COMMON_FLAT_FIELDS,
      { key: "bpsApproval", label: "BPS Approval", inputType: "yesno", options: YES_NO_OPTIONS }
    ]
  },

  commercial: {
    floor: [
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number" },
      { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number", required: true },
      { key: "undividedShare", label: "Undivided Share (sqyd)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "propertyOnFloor", label: "Property on Floor", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "parking", label: "Parking Slots", inputType: "dropdown", options: generateNumericRange(20) },
      { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
      { key: "balconies", label: "Balconies", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "bathrooms", label: "Washrooms / Bathrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "lifts", label: "Lifts", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "ageOfProperty", label: "Age of Property", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
      { key: "servantRoom", label: "Servant Room Available", inputType: "yesno", options: YES_NO_OPTIONS },
      { key: "pantry", label: "Pantry Area Available", inputType: "yesno", options: YES_NO_OPTIONS },
      { key: "presentRent", label: "Present Rent / Month (₹)", inputType: "number" },
      { key: "leaseStatus", label: "Lease Status", inputType: "dropdown", options: LEASE_STATUS_OPTIONS }
    ],

    shop: [
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number" },
      { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number", required: true },
      { key: "undividedShare", label: "Undivided Share (sqyd)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "propertyOnFloor", label: "Property on Floor", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "parking", label: "Parking Slots", inputType: "dropdown", options: generateNumericRange(20) },
      { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
      { key: "bathrooms", label: "Washrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "lifts", label: "Lifts", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "ageOfProperty", label: "Age of Property", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS }
    ],

    land: [
      { key: "totalAreaSqyd", label: "Total Commercial Land Area (sqyd)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements (Width x Depth)", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "landApprovedBy", label: "Land Approved By", inputType: "dropdown", options: LAND_APPROVED_BY_OPTIONS },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "gatedCommunity", label: "Gated Commercial Park", inputType: "yesno", options: YES_NO_OPTIONS }
    ],

    building: [
      { key: "totalAreaSqyd", label: "Total Land Area (sqyd)", inputType: "number" },
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number" },
      { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "parking", label: "Parking Capacity", inputType: "dropdown", options: generateNumericRange(35) },
      { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
      { key: "balconies", label: "Balconies", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "bathrooms", label: "Bathrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "lifts", label: "Lifts", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "ageOfProperty", label: "Age of Property", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
      { key: "presentRent", label: "Monthly Rental Income (₹)", inputType: "number" }
    ]
  },

  industrial: {
    godown: [
      { key: "totalAreaSqyd", label: "Total Land Area (sqyd)", inputType: "number" },
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number", required: true },
      { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number" },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road for Trucks (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "parking", label: "Heavy Vehicle Parking", inputType: "dropdown", options: generateNumericRange(20) },
      { key: "bathrooms", label: "Washrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "ageOfProperty", label: "Age of Structure", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
      { key: "presentRent", label: "Monthly Rent (₹)", inputType: "number" }
    ],

    warehouse: [
      { key: "totalAreaSqyd", label: "Total Land Area (sqyd)", inputType: "number" },
      { key: "superBuiltUpArea", label: "Super Built-up Area (sqft)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number", required: true },
      { key: "carpetArea", label: "Carpet Area (sqft)", inputType: "number" },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "parking", label: "Vehicle Dock Parking", inputType: "dropdown", options: generateNumericRange(20) },
      { key: "bathrooms", label: "Washrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS },
      { key: "ageOfProperty", label: "Age of Structure", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS },
      { key: "presentRent", label: "Monthly Rent (₹)", inputType: "number" }
    ],

    building: [
      { key: "totalAreaSqyd", label: "Total Land Area (sqyd)", inputType: "number" },
      { key: "builtUpArea", label: "Built-up Area (sqft)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "parking", label: "Parking", inputType: "dropdown", options: generateNumericRange(20) },
      { key: "furnishing", label: "Furnished Status", inputType: "dropdown", options: FURNISHED_STATUS_OPTIONS },
      { key: "balconies", label: "Balconies", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "bathrooms", label: "Washrooms", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "lifts", label: "Freight / Goods Lifts", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS }
    ],

    land: [
      { key: "totalAreaSqyd", label: "Total Industrial Land Area (sqyd)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "roadWidth", label: "Width of Facing Road (ft)", inputType: "number" },
      { key: "facing", label: "Facing", inputType: "dropdown", options: FACING_FULL_OPTIONS },
      { key: "landApprovedBy", label: "Land Approved By", inputType: "dropdown", options: LAND_APPROVED_BY_OPTIONS },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_STD_OPTIONS }
    ]
  },

  agricultural: {
    land: [
      { key: "totalAcres", label: "Total Land Area (Acres)", inputType: "number", required: true },
      // TODO: Cultivation Crop is open-ended "BOX, BOX, BOX… add box option" — multiselect with custom entry
      { key: "cultivationCrops", label: "Cultivation Crops", inputType: "multiselect", options: CULTIVATION_CROPS_DEFAULT },
      { key: "roadWidth", label: "Width of Road / Approach (ft)", inputType: "number" },
      { key: "facing", label: "Facing Direction (E/W/N/S)", inputType: "dropdown", options: FACING_BASIC_OPTIONS, required: true },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_AGRI_OPTIONS, required: true },
      { key: "ryotPerYear", label: "Ryot Income / Year (₹)", inputType: "number" }
    ],

    "farm-house": [
      { key: "totalAreaSqyd", label: "Total Plot Area (sqyd)", inputType: "number", required: true },
      { key: "totalBuildingArea", label: "Building Area (sqft)", inputType: "number", required: true },
      { key: "measurements", label: "Measurements", inputType: "measurement" },
      { key: "facing", label: "Facing Direction (E/W/N/S)", inputType: "dropdown", options: FACING_BASIC_OPTIONS },
      { key: "totalFloors", label: "Total Floors", inputType: "dropdown", options: generateNumericRange(5) },
      { key: "parking", label: "Parking", inputType: "dropdown", options: generateNumericRange(10) },
      { key: "waterSource", label: "Water Source", inputType: "dropdown", options: WATER_SOURCE_AGRI_OPTIONS },
      { key: "ageOfProperty", label: "Age of Structure", inputType: "dropdown", options: AGE_OF_PROPERTY_OPTIONS }
    ]
  }
};
