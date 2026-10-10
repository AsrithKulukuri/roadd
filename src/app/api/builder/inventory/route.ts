import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateDefaultProjectInventory, InventoryUnit } from "@/lib/project-inventory";

// In-memory runtime cache keyed by projectId
const inventoryMemoryCache = new Map<string, InventoryUnit[]>();

export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") || access.builder.assignedProjectIds?.[0] || "proj-1789910402436";

    // Check memory cache first
    let units = inventoryMemoryCache.get(projectId);

    if (!units) {
      // Try to load latest snapshot from builder_activity_logs
      const { data: logs } = await supabaseAdmin
        .from("builder_activity_logs")
        .select("details")
        .eq("builder_id", access.builder.id)
        .eq("action_type", "inventory_sync")
        .eq("entity_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (logs && logs[0]?.details?.units && Array.isArray(logs[0].details.units)) {
        units = logs[0].details.units;
      } else {
        units = generateDefaultProjectInventory(projectId);
      }
      inventoryMemoryCache.set(projectId, units!);
    }

    // Summary calculations
    const totalUnits = units!.length;
    const availableCount = units!.filter(u => u.status === "available").length;
    const tokenCount = units!.filter(u => u.status === "under_token").length;
    const soldCount = units!.filter(u => u.status === "sold").length;
    const totalPotentialValue = units!.reduce((acc, u) => acc + (Number(u.priceTotal) || 0), 0);
    const totalRealizedValue = units!.filter(u => u.status === "sold").reduce((acc, u) => acc + (Number(u.priceTotal) || 0), 0);

    return NextResponse.json({
      success: true,
      projectId,
      units,
      summary: {
        totalUnits,
        availableCount,
        tokenCount,
        soldCount,
        occupancyRate: totalUnits > 0 ? Math.round(((soldCount + tokenCount) / totalUnits) * 100) : 0,
        totalPotentialValue,
        totalRealizedValue,
      },
    });
  } catch (error) {
    return portalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const { projectId, unit } = body;

    if (!projectId || !unit || !unit.unitNumber) {
      throw new PortalError("Valid projectId and unit details required.", 400);
    }

    let existing = inventoryMemoryCache.get(projectId) || generateDefaultProjectInventory(projectId);

    const newUnit: InventoryUnit = {
      id: `unit_${projectId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      unitNumber: unit.unitNumber,
      blockOrTower: unit.blockOrTower || "Tower A",
      floorNumber: Number(unit.floorNumber) || 1,
      unitType: unit.unitType || "3 BHK",
      facing: unit.facing || "East",
      sizeSqFt: Number(unit.sizeSqFt) || 1650,
      priceTotal: Number(unit.priceTotal) || 6500000,
      status: unit.status || "available",
      tokenHolderName: unit.tokenHolderName,
      tokenNotes: unit.tokenNotes,
      updatedAt: new Date().toISOString(),
    };

    const updated = [newUnit, ...existing];
    inventoryMemoryCache.set(projectId, updated);

    // Save snapshot in database
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: access.builder.id,
      builder_name: access.builder.companyName,
      action_type: "inventory_sync",
      entity_id: projectId,
      details: { units: updated, change: "unit_added", unitId: newUnit.id },
    });

    return NextResponse.json({ success: true, unit: newUnit, total: updated.length });
  } catch (error) {
    return portalError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const { projectId, unitId, status, tokenHolderName, tokenNotes, priceTotal } = body;

    if (!projectId || !unitId) {
      throw new PortalError("projectId and unitId are required.", 400);
    }

    let existing = inventoryMemoryCache.get(projectId) || generateDefaultProjectInventory(projectId);

    const updated = existing.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          status: status || u.status,
          tokenHolderName: tokenHolderName !== undefined ? tokenHolderName : u.tokenHolderName,
          tokenNotes: tokenNotes !== undefined ? tokenNotes : u.tokenNotes,
          priceTotal: priceTotal !== undefined ? Number(priceTotal) : u.priceTotal,
          updatedAt: new Date().toISOString(),
        };
      }
      return u;
    });

    inventoryMemoryCache.set(projectId, updated);

    // Save snapshot in database
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: access.builder.id,
      builder_name: access.builder.companyName,
      action_type: "inventory_sync",
      entity_id: projectId,
      details: { units: updated, change: "status_updated", unitId, newStatus: status },
    });

    return NextResponse.json({ success: true, updated: true, unitId, status });
  } catch (error) {
    return portalError(error);
  }
}
