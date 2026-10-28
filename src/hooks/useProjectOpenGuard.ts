"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ProjectNotificationData } from "@/lib/project-notifications";
import { trackProjectImpression } from "@/lib/project-activity-tracker";
import { seedProjectCache, prewarmProjectMedia } from "@/lib/project-preload";
import type { Project } from "@/types/project";

/** Public browsing never requires login or shares contact details. */
export function useProjectOpenGuard() {
  const router = useRouter();
  const { isLoggedIn, isLoading, user, getLoginUrl } = useAuthSession();

  const prewarmProject = useCallback((project: Partial<Project> | null | undefined) => {
    if (!project) return;
    seedProjectCache(project as Project);
    const targetSlugOrId = project.slug || project.id;
    if (targetSlugOrId) {
      router.prefetch(`/projects/${targetSlugOrId}`);
    }
  }, [router]);

  const openProject = useCallback(
    (project: ProjectNotificationData | null | undefined, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!project) return false;
      const targetSlugOrId = project.slug || project.id;
      if (!targetSlugOrId) return false;

      const projectUrl = `/projects/${targetSlugOrId}`;

      // Immediately seed project cache & pre-warm media before route transition
      seedProjectCache(project as unknown as Project);
      router.prefetch(projectUrl);

      void trackProjectImpression({ projectId: project.id, projectSlug: project.slug, projectName: project.name || "Project" });
      router.push(projectUrl);
      return true;
    },
    [router]
  );

  return {
    openProject,
    prewarmProject,
    isLoggedIn,
    isLoading,
    user,
    getLoginUrl,
  };
}
