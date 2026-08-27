// A source link shows the outlet's own headline. `sourceHeadline` is optional
// on the wire (ticket 04), so the fallback has to be something a reader can
// read — the host, not the whole URL, which on these posts runs to query
// strings and tracking parameters.
//
// No `new URL(...)`: a malformed postUrl would throw, and a source link is not
// worth a crashed screen. String work only, so this stays in the pure suite.

export interface SourcePost {
  postUrl: string;
  sourceHeadline?: string;
}

/** The label for one source link. Never empty unless the post has no URL. */
export function sourceLabel(post: SourcePost): string {
  const headline = post.sourceHeadline?.trim();
  if (headline) return headline;
  return sourceHost(post.postUrl);
}

/** "example.com" from a URL, or the input trimmed if it does not look like one. */
export function sourceHost(url: string): string {
  const trimmed = url.trim();
  const match = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]+)/i.exec(trimmed);
  const authority = match ? match[1] : trimmed.split(/[/?#]/)[0];
  const host = authority.split('@').pop() ?? '';
  return host.replace(/:\d+$/, '').replace(/^www\./i, '');
}
