const forwardedCookieNames = new Set(["_vercel_jwt"]);

export function getPreviewAuthCookies(
  cookieHeader: string | null,
  origin: string,
) {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((segment) => {
      const separator = segment.indexOf("=");
      if (separator <= 0) return null;

      const name = segment.slice(0, separator).trim();
      if (!forwardedCookieNames.has(name)) return null;

      return {
        name,
        value: segment.slice(separator + 1).trim(),
        url: origin,
      };
    })
    .filter((cookie): cookie is NonNullable<typeof cookie> => Boolean(cookie));
}
