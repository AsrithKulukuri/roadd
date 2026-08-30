"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { triggerProjectViewNotification, ProjectNotificationData } from "@/lib/project-notifications";
import { toast } from "sonner";

/**
 * Universal project click & open guard for ROAD FACING.
 * Enforces:
 * 1. Logged-out users cannot open projects directly -> redirected to /login?redirect=/projects/{slug} with friendly toast.
 * 2. Logged-in users immediately trigger Wasender lead notification to builder, then navigate to /projects/{slug}.
 * 3. Property cards and views are completely unaffected.
 */
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

      // 1. If user is logged out, block navigation and prompt login
      if (!isLoggedIn && !isLoading) {
        toast.info("Please sign in to view project details", {
          description: "Sign in with WhatsApp to access floor plans and builder specifications.",
        });
        const loginUrl = getLoginUrl(projectUrl);
        router.push(loginUrl);
        return false;
      }

      // 2. If user is logged in, immediately trigger WhatsApp lead notification and navigate
      if (isLoggedIn) {
        triggerProjectViewNotification(project, user);
        router.push(projectUrl);
        return true;
      }

      // 3. If auth state is still loading, navigate to login with return URL safely
      const loginUrl = getLoginUrl(projectUrl);
      router.push(loginUrl);
      return false;
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
