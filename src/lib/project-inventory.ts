/**
 * ROAD FACING - Project Unit Inventory & Availability Matrix Library
 */

export interface InventoryUnit {
  id: string;
  projectId: string;
  unitNumber: string; // e.g. "Flat 101", "Plot 42", "Villa 7"
  blockOrTower: string; // e.g. "Tower A", "Phase 1"
  floorNumber: number;
  unitType: "2 BHK" | "3 BHK" | "4 BHK" | "Plot" | "Duplex Villa" | "Commercial";
  facing: "East" | "West" | "North" | "South" | "North-East" | "North-West" | "South-East" | "South-West";
  sizeSqFt: number; // or sq.yds
  priceTotal: number;
  status: "available" | "under_token" | "sold";
  tokenHolderName?: string;
  tokenNotes?: string;
  updatedAt: string;
}

// Default initial inventory generator for any project that has no units seeded yet
export function generateDefaultProjectInventory(projectId: string): InventoryUnit[] {
  const units: InventoryUnit[] = [];
  const facings: Array<InventoryUnit["facing"]> = ["East", "West", "North", "East", "North", "West"];
  const types: Array<InventoryUnit["unitType"]> = ["3 BHK", "3 BHK", "2 BHK", "3 BHK", "4 BHK", "3 BHK"];
  const sizes = [1650, 1850, 1350, 1720, 2450, 1680];
  const prices = [6800000, 7600000, 5600000, 7100000, 11000000, 6900000];

  const towers = ["Tower A", "Tower B"];

  let count = 1;
  for (const tower of towers) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let unitIdx = 1; unitIdx <= 3; unitIdx++) {
        const uNum = `${floor}0${unitIdx}`;
        const templateIdx = (floor * 3 + unitIdx) % 6;
        
        let status: InventoryUnit["status"] = "available";
        let tokenHolderName: string | undefined = undefined;
        let tokenNotes: string | undefined = undefined;

        if (count === 3 || count === 8 || count === 14) {
          status = "under_token";
          tokenHolderName = count === 3 ? "Dr. Rao (Token: ₹2L)" : count === 8 ? "S. Narayana (Bank NOC Pending)" : "V. Lakshmi (Under Hold)";
          tokenNotes = "Cheque received at site desk";
        } else if (count === 1 || count === 2 || count === 7 || count === 11 || count === 15) {
          status = "sold";
          tokenHolderName = "Registered Buyer";
          tokenNotes = "Agreement registered with CRDA sub-registrar";
        }

        units.push({
          id: `unit_${projectId}_${tower.replace(/\s+/g, "")}_${uNum}`,
          projectId,
          unitNumber: `${tower} - ${uNum}`,
          blockOrTower: tower,
          floorNumber: floor,
          unitType: types[templateIdx],
          facing: facings[templateIdx],
          sizeSqFt: sizes[templateIdx],
          priceTotal: prices[templateIdx],
          status,
          tokenHolderName,
          tokenNotes,
          updatedAt: new Date(Date.now() - count * 3600000).toISOString(),
        });

        count++;
      }
    }
  }

  return units;
}
