"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, type Me } from "./api";
import { supportSignInHref } from "./support-entry";

export const CurrentUserContext = createContext<Me | null>(null);

/** Current user's identity and permissions, checked against the session cookie. */
export function useMe() {
  const router = useRouter();

  const inherited = useContext(CurrentUserContext);

  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (inherited) {
      return;
    }

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
  }, [router, inherited]);

  return inherited ?? me;
}

export function can(me: Me | null, ...perms: string[]): boolean {
  if (!me) {
    return false;
  }

  return perms.some((p) => {
    return me.permissions.includes(p);
  });
}
