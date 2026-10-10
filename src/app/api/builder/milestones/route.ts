import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDefaultProjectMilestones, ConstructionMilestone } from "@/lib/project-milestones";

const milestonesMemoryCache = new Map<string, ConstructionMilestone[]>();

export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") || access.builder.assignedProjectIds?.[0] || "proj-1789910402436";

    let milestones = milestonesMemoryCache.get(projectId);

    if (!milestones) {
      const { data: logs } = await supabaseAdmin
        .from("builder_activity_logs")
        .select("details")
        .eq("builder_id", access.builder.id)
        .eq("action_type", "milestones_sync")
        .eq("entity_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (logs && logs[0]?.details?.milestones && Array.isArray(logs[0].details.milestones)) {
        milestones = logs[0].details.milestones;
      } else {
        milestones = getDefaultProjectMilestones(projectId);
      }
      milestonesMemoryCache.set(projectId, milestones!);
    }

    // Overall progress calculation
    const totalStages = milestones!.length;
    const completedStages = milestones!.filter(m => m.status === "completed").length;
    const avgPercentage = Math.round(
      milestones!.reduce((sum, m) => sum + (Number(m.completionPercentage) || 0), 0) / (totalStages || 1)
    );

    return NextResponse.json({
      success: true,
      projectId,
      milestones,
      summary: {
        totalStages,
        completedStages,
        overallPercentage: avgPercentage,
        activeStage: milestones!.find(m => m.status === "in_progress")?.stageName || "All On Track",
      },
    });
  } catch (error) {
    return portalError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const { projectId, milestoneId, completionPercentage, status, newPhoto, notes } = body;

    if (!projectId || !milestoneId) {
      throw new PortalError("projectId and milestoneId required.", 400);
    }

    let milestones = milestonesMemoryCache.get(projectId) || getDefaultProjectMilestones(projectId);

    const updated = milestones.map(m => {
      if (m.id === milestoneId) {
        const photos = m.photos ? [...m.photos] : [];
        if (newPhoto && newPhoto.url) {
          photos.unshift({
            id: `ph_${Date.now()}`,
            url: newPhoto.url,
            caption: newPhoto.caption || "Site inspection update",
            date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            geoTag: newPhoto.geoTag || "GPS Verified Active Site",
          });
        }

        return {
          ...m,
          completionPercentage: completionPercentage !== undefined ? Number(completionPercentage) : m.completionPercentage,
          status: status || m.status,
          notes: notes !== undefined ? notes : m.notes,
          photos,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    milestonesMemoryCache.set(projectId, updated);

    // Save snapshot in database
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: access.builder.id,
      builder_name: access.builder.companyName,
      action_type: "milestones_sync",
      entity_id: projectId,
      details: { milestones: updated, updatedMilestoneId: milestoneId },
    });

    return NextResponse.json({ success: true, updated: true, milestoneId });
  } catch (error) {
    return portalError(error);
  }
}
