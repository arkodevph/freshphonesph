"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, type Me } from "./api";
import { supportSignInHref } from "./support-entry";

/** Current user's identity and permissions, checked against the session cookie. */
export function useMe() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;

    let retry: ReturnType<typeof setTimeout> | undefined;

    const expire = () => {
      setMe(null);

      router.replace(
        supportSignInHref(window.location.pathname, window.location.hash),
      );
    };

    window.addEventListener("fp-session-expired", expire);

    const requireMfa = () => {
      return router.replace("/security");
    };

    window.addEventListener("fp-mfa-required", requireMfa);

    const refresh = () => {
      clearTimeout(retry);

      void fetchMe()
        .then((m) => {
          if (!active) {
            return;
          }

          setMe(m);
        })
        .catch(() => {
          if (active) {
            retry = setTimeout(refresh, 5000);
          }
        });
    };

    refresh();

    return () => {
      active = false;

      clearTimeout(retry);

      window.removeEventListener("fp-session-expired", expire);

      window.removeEventListener("fp-mfa-required", requireMfa);
    };
  }, [router]);

  return me;
}

export function can(me: Me | null, ...perms: string[]): boolean {
  if (!me) {
    return false;
  }

  return perms.some((p) => {
    return me.permissions.includes(p);
  });
}
