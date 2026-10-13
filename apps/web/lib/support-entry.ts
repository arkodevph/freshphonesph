import type { Me } from './api';

export const customerSupportPath = '/portal/support';
const supportTarget = /^\/portal\/support(?:#(?:new-request|request-history|case-(?:[1-9]\d*|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})))?$/;

// Deliberately allow only the existing support page and its known anchors.
// Never forward an arbitrary URL from a login query string.
export function safeSupportReturn(value: string | null): string | null {
  return value && supportTarget.test(value) ? value : null;
}

export function supportSignInHref(pathname: string, hash = '') {
  if (pathname !== customerSupportPath) return '/login';
  const target = safeSupportReturn(`${pathname}${hash}`) ?? customerSupportPath;
  return `/login?next=${encodeURIComponent(target)}`;
}

export function signInDestination(me: Pick<Me, 'account_type' | 'permissions'> | null, requested: string | null) {
  const support = safeSupportReturn(requested);
  if (support) {
    if (!me || me.account_type === 'customer') return support;
    return me.permissions.includes('SUPPORT_MANAGE') ? '/system/support' : '/system';
  }
  return me?.account_type === 'customer' ? '/portal' : '/system';
}
