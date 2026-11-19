export function parseProjectLookBookAccess(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value)
    ? value
    : undefined;
}

export function savedLookBookPaths(configurationId: string, projectAccess?: string) {
  const path = `/lookbook/${configurationId}`;
  const access = parseProjectLookBookAccess(projectAccess);
  const query = access ? `projectAccess=${access}` : "";
  return {
    viewHref: query ? `${path}?${query}` : path,
    pdfHref: `${path}/pdf?disposition=attachment${query ? `&${query}` : ""}`,
  };
}
