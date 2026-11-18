// Saved UUIDs are existing bearer references, never contact details or options.
export function lookBookProjectReviewHref(homeSlug: string, configurationId?: string) {
  if (configurationId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(configurationId)) {
    return `/lookbook/${configurationId}?projectReview=1#lookbook-property-form`;
  }
  return `/?model=${encodeURIComponent(homeSlug)}#reserve`;
}
