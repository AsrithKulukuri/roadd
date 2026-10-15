"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { WhatsAppAuthModal } from "./whatsapp-auth-modal";
import { readActionSession, requireActionSession } from "@/lib/action-auth";
import type { SessionUser } from "@/hooks/use-auth-session";
import { toast } from "sonner";

export function ActionAuthProvider() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((user: SessionUser | null) => void) | null>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      // When on admin dashboard, auto-resolve immediately without OTP prompt
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        const res = (event as CustomEvent).detail?.resolve;
        if (res) res({ id: "admin", role: "admin", phone: "", name: "Administrator", email: "admin@road.com" } as any);
        return;
      }
      resolver.current = (event as CustomEvent).detail.resolve;
      setOpen(true);
    };
    window.addEventListener("road_request_action_auth", listener);
    return () => {
      window.removeEventListener("road_request_action_auth", listener);
      resolver.current?.(null);
    };
  }, []);

  // Never render the WhatsApp Auth Modal while on any admin route
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <WhatsAppAuthModal
      isOpen={open}
      onClose={() => {
        setOpen(false);
        resolver.current?.(null);
        resolver.current = null;
      }}
      onSuccess={async () => {
        try {
          const user = await readActionSession();
          resolver.current?.(user);
        } catch {
          resolver.current?.(null);
          toast.error("Could not confirm your session. Please retry.");
        } finally {
          resolver.current = null;
          setOpen(false);
        }
      }}
    />
  );
}

export function ActionAuthGate({
  action,
  onVerified,
  children,
}: {
  action: string;
  onVerified: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const busy = useRef(false);

  return (
    <span
      onClickCapture={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy.current) return;
        busy.current = true;
        try {
          // If already on admin dashboard, bypass OTP requirement immediately
          if (pathname?.startsWith("/admin")) {
            await onVerified();
            return;
          }
          if (await requireActionSession(action)) await onVerified();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Please retry.");
        } finally {
          busy.current = false;
        }
      }}
    >
      {children}
    </span>
  );
}
