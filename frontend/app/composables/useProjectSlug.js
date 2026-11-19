// Projects have no slug field in Strapi, so the URL segment is derived from
// the name — same function on both sides, so /projects/<slug> always round
// trips back to the right project.
export function projectSlug(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
