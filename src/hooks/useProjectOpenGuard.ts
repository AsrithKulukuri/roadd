"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ProjectNotificationData } from "@/lib/project-notifications";
import { trackProjectImpression } from "@/lib/project-activity-tracker";


/** Public browsing never requires login or shares contact details. */
export function useProjectOpenGuard() {
  const router = useRouter();
  const { isLoggedIn, isLoading, user, getLoginUrl } = useAuthSession();

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

      void trackProjectImpression({ projectId: project.id, projectSlug: project.slug, projectName: project.name || "Project" });
      router.push(projectUrl);
      return true;
    },
    [isLoggedIn, isLoading, user, getLoginUrl, router]
  );

  return {
    openProject,
    isLoggedIn,
    isLoading,
    user,
    getLoginUrl,
  };
}
