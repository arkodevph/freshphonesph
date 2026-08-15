"use client";

import { useEffect, useState } from "react";
import { fetchMe, type Me } from "./api";
import { getStoredMe, saveMe } from "./auth";

/** Current user's identity + permissions, from cache or a fresh fetch. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(() => getStoredMe());

  useEffect(() => {
    if (me) return;
    fetchMe()
      .then((m) => {
        saveMe(m);
        setMe(m);
      })
      .catch(() => {});
  }, [me]);

  return me;
}

export function can(me: Me | null, ...perms: string[]): boolean {
  if (!me) return false;
  return perms.some((p) => me.permissions.includes(p));
}
