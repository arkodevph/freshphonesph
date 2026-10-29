type Origins = {
  WEB_ORIGIN: string;
  PUBLIC_SITE_ORIGIN?: string;
};

export function browserOrigins(config: Origins) {
  return config.PUBLIC_SITE_ORIGIN
    ? [config.WEB_ORIGIN, config.PUBLIC_SITE_ORIGIN]
    : config.WEB_ORIGIN;
}

export function allowsBrowserWrite(
  config: Origins,
  origin: string | undefined,
  hasCookie: boolean,
  method: string,
  path: string,
) {
  if (!origin) {
    return !hasCookie;
  }

  return (
    origin === config.WEB_ORIGIN ||
    (origin === config.PUBLIC_SITE_ORIGIN &&
      method === "POST" &&
      (path === "/api/careers/apply" || /^\/api\/inquiries\/?$/.test(path)))
  );
}
