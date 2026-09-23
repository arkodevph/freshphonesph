"use client";

import { useEffect, useState } from "react";
import { fetchMe, type Me } from "./api";
import { getStoredMe, saveMe } from "./auth";
import { TYPESCRIPT_API } from "./backend";
import { clearTokens } from "./auth";
import { useRouter } from "next/navigation";

/** Current user's identity + permissions, from cache or a fresh fetch. */
export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(() => TYPESCRIPT_API ? null : getStoredMe());

  useEffect(() => {
    if (me && !TYPESCRIPT_API) return;
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const expire = () => { clearTokens(); setMe(null); router.replace("/login"); };
    window.addEventListener("fp-session-expired", expire);
    const refresh = () => { clearTimeout(retry); void fetchMe()
      .then((m) => {
        if (!active) return;
        saveMe(m);
        setMe(m);
      })
      .catch(() => { if (active && TYPESCRIPT_API) retry = setTimeout(refresh, 5000); }); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; clearTimeout(retry); window.removeEventListener("focus", refresh); window.removeEventListener("fp-session-expired", expire); };
  }, [router]);

  return me;
}

export function can(me: Me | null, ...perms: string[]): boolean {
  if (!me) return false;
  return perms.some((p) => me.permissions.includes(p));
}
