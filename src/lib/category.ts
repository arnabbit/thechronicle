// `category` is a lowercase slug on the wire. The display name comes from the
// edition's category list where one is loaded; this is the fallback for a row
// rendered before (or without) that list — and it is what ticket 04 does
// server-side for an unknown slug, rather than dropping it.
export function categoryLabel(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
