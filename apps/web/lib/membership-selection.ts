let customerId: string | null = null;

let membershipId: string | null = null;

export function clearMembershipSelection() {
  customerId = null;

  membershipId = null;
}

export function currentMembership(accountId: string, primary: string | null) {
  customerId = accountId;

  if (typeof window === "undefined") {
    return primary;
  }

  const requested = window.location?.pathname?.startsWith("/portal")
    ? new URLSearchParams(window.location.search).get("membership")
    : null;

  let saved: string | null = null;

  try {
    saved = sessionStorage.getItem(`freshphones-membership:${accountId}`);
  } catch {}

  membershipId = requested ?? saved ?? primary;

  if (membershipId) {
    try {
      sessionStorage.setItem(
        `freshphones-membership:${accountId}`,
        membershipId,
      );
    } catch {}
  }

  return membershipId;
}

export function membershipHeaders(path: string): Record<string, string> {
  return typeof window !== "undefined" &&
    window.location?.pathname?.startsWith("/portal") &&
    customerId &&
    membershipId &&
    !path.startsWith("/auth/") &&
    path !== "/portal/memberships"
    ? { "X-Membership-Id": membershipId }
    : {};
}
