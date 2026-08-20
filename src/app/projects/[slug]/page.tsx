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

  if (!project) return { title: "Project Not Found | ROAD" };

  const allPrices = project.configurations?.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean) || [];
  const min = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const max = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const priceFormatted = min
    ? min >= 10000000
      ? `₹${(min / 10000000).toFixed(2)} Cr${max && max !== min ? ` – ₹${(max / 10000000).toFixed(2)} Cr` : ""}`
      : `₹${(min / 100000).toFixed(2)} Lakh`
    : "Price on Request";

  const locationFormatted = `${project.location?.locality || ""}, ${project.location?.city || "Andhra Pradesh"}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
  const canonicalUrl = `${siteUrl}/projects/${project.slug || slug}`;

  // Resolve direct publicly accessible primary photo
  let photoUrl = project.coverImage || project.images?.[0]?.url || "";
  let finalImageUrl = "";
  if (photoUrl && !photoUrl.startsWith("blob:") && !photoUrl.startsWith("data:")) {
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      finalImageUrl = photoUrl;
    } else if (photoUrl.startsWith("/")) {
      finalImageUrl = `${siteUrl}${photoUrl}`;
    } else {
      finalImageUrl = `${siteUrl}/api/media/${photoUrl}`;
    }
  } else {
    finalImageUrl = `${siteUrl}/images/property-placeholder.jpg`;
  }

  const pageTitle = `${project.name} — ${priceFormatted} | ROAD`;
  const pageDescription =
    project.tagline ||
    project.description?.slice(0, 160) ||
    `Verified project in ${locationFormatted}. View floor plans, verified construction updates, and walkthrough on ROAD.`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: canonicalUrl,
      title: pageTitle,
      description: pageDescription,
      siteName: "ROAD",
      images: [
        {
          url: finalImageUrl,
          width: 1200,
          height: 800,
          alt: project.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [finalImageUrl],
    },
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  return <ProjectDetailView slug={slug} initialProject={project} />;
}
