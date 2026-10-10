/**
 * ROAD FACING - Construction Milestone & RERA Journey Library
 */

export interface ConstructionMilestone {
  id: string;
  projectId: string;
  stageName: string;
  order: number;
  status: "completed" | "in_progress" | "upcoming";
  completionPercentage: number; // 0-100
  targetDate: string; // e.g. "Completed Aug 2026", "Dec 2026"
  notes?: string;
  inspectionStatus: "CRDA Verified" | "Site Engineer Approved" | "Under Review";
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    date: string;
    geoTag?: string;
  }>;
  updatedAt: string;
}

export function getDefaultProjectMilestones(projectId: string): ConstructionMilestone[] {
  return [
    {
      id: `ms_${projectId}_1`,
      projectId,
      stageName: "Foundation, Deep Piling & Substructure",
      order: 1,
      status: "completed",
      completionPercentage: 100,
      targetDate: "Jul 2026",
      inspectionStatus: "CRDA Verified",
      notes: "Heavy load testing complete. Raft foundation and piling certified by structural engineer.",
      photos: [
        {
          id: "ph_1",
          url: "https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?auto=format&fit=crop&w=600&q=80",
          caption: "Deep piling & basement raft concrete pour completed",
          date: "15 Jul 2026",
          geoTag: "Site Block A (16.5062° N, 80.6480° E)",
        },
      ],
      updatedAt: "2026-07-20T10:00:00Z",
    },
    {
      id: `ms_${projectId}_2`,
      projectId,
      stageName: "Podium & Multi-Level Parking RCC Slabs",
      order: 2,
      status: "completed",
      completionPercentage: 100,
      targetDate: "Sep 2026",
      inspectionStatus: "Site Engineer Approved",
      notes: "Two levels of basement parking and podium slab cured for 28 days with certified cube strength.",
      photos: [
        {
          id: "ph_2",
          url: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80",
          caption: "Podium level shuttering and post-tensioned cable tensioning",
          date: "18 Sep 2026",
          geoTag: "Podium Deck (16.5065° N, 80.6482° E)",
        },
      ],
      updatedAt: "2026-09-22T14:30:00Z",
    },
    {
      id: `ms_${projectId}_3`,
      projectId,
      stageName: "Superstructure RCC Floor Slabs (Floors 1 - 14)",
      order: 3,
      status: "in_progress",
      completionPercentage: 65,
      targetDate: "Feb 2027",
      inspectionStatus: "Site Engineer Approved",
      notes: "Currently casting 8th floor slab on Tower A. Columns rebar tying active on Tower B.",
      photos: [
        {
          id: "ph_3",
          url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80",
          caption: "Tower A 8th floor slab rebar mesh placement",
          date: "08 Oct 2026",
          geoTag: "Tower A Level 8 (16.5064° N, 80.6481° E)",
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: `ms_${projectId}_4`,
      projectId,
      stageName: "External Brickwork, AAC Blocks & Internal Plastering",
      order: 4,
      status: "upcoming",
      completionPercentage: 20,
      targetDate: "May 2027",
      inspectionStatus: "Under Review",
      notes: "AAC block masonry commenced on floors 1 through 4. High thermal insulation grade.",
      photos: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: `ms_${projectId}_5`,
      projectId,
      stageName: "Concealed Electrical, CPVC Plumbing & High-Speed Elevators",
      order: 5,
      status: "upcoming",
      completionPercentage: 0,
      targetDate: "Aug 2027",
      inspectionStatus: "Under Review",
      notes: "Materials procured from Finolex & Astral. Shaft ducting ready.",
      photos: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: `ms_${projectId}_6`,
      projectId,
      stageName: "Premium Finishing, Clubhouse Landscaping & Handover",
      order: 6,
      status: "upcoming",
      completionPercentage: 0,
      targetDate: "Dec 2027",
      inspectionStatus: "Under Review",
      notes: "Final finishing, double-glazed windows, landscape water bodies, and RERA Occupancy Certificate.",
      photos: [],
      updatedAt: new Date().toISOString(),
    },
  ];
}
