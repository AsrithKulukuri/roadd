import { createClient } from "@supabase/supabase-js";
import { fromSupabaseProject } from "@/stores/projects-store";
import type { Project } from "@/types/project";
import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/project/project-detail-view";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getProject(slug: string): Promise<Project | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .single();

    if (!error && data) return fromSupabaseProject(data);
  } catch {
  }

  return null;
}

export async function generateStaticParams() {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("projects").select("slug");
    if (data) {
      return data.filter(p => p.slug).map(p => ({ slug: p.slug }));
    }
  } catch {}
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) return { title: "Project Not Found | Road Facing" };

  const allPrices = project.configurations?.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean) || [];
  const min = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const max = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const priceFormatted = min
    ? min >= 10000000
      ? `₹${(min / 10000000).toFixed(2)} Cr${max && max !== min ? ` – ₹${(max / 10000000).toFixed(2)} Cr` : ""}`
      : `₹${(min / 100000).toFixed(2)} Lakh`
    : "Price on Request";

  const locationFormatted = `${project.location?.locality || ""}, ${project.location?.city || "Andhra Pradesh"}`;
  const coverUrl = project.coverImage || project.images?.[0]?.url || "";

  const ogParams = new URLSearchParams({
    title: project.name,
    price: priceFormatted,
    location: locationFormatted,
    type: (project.projectType || "Project").toUpperCase(),
    badge: project.reraApproved ? "RERA Approved" : "Verified Project",
  });
  if (coverUrl) ogParams.set("image", coverUrl);

  const ogImageUrl = `https://www.roadfacing.com/api/og?${ogParams.toString()}`;
  const canonicalUrl = `https://www.roadfacing.com/projects/${project.slug || slug}`;

  return {
    title: `${project.name} by ${project.builderName || "Builder"} in ${locationFormatted} — ${priceFormatted}`,
    description:
      project.tagline ||
      project.description ||
      `${project.name} in ${locationFormatted}. View floor plans, verified construction updates, and video walkthroughs on Road Facing.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      locale: "en_IN",
      url: canonicalUrl,
      title: `${project.name} — ${priceFormatted}`,
      description:
        project.tagline ||
        project.description ||
        `Verified real estate project in ${locationFormatted}. View details on Road Facing.`,
      siteName: "Road Facing",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: project.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} — ${priceFormatted}`,
      description:
        project.tagline ||
        project.description ||
        `Verified real estate project in ${locationFormatted}. View details on Road Facing.`,
      images: [ogImageUrl],
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProjectDetailView slug={slug} />;
}
