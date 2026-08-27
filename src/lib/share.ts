// What a shared article says, and where it points.
//
// Pure string work, so the wording and the URL shape are under test without a
// share sheet, a clipboard or a renderer behind them. The platform call and
// its clipboard fallback live in the screen; what is worth pinning down is
// that the link is the *web* link and that the message names what it is.

/**
 * The canonical public origin. Deliberately not the API base: a shared link
 * has to open in a stranger's browser, so it points at the web build rather
 * than at whatever host this install happens to read from.
 */
export const WEB_ORIGIN = 'https://readthechronicle.netlify.app';

/** The article's own URL — the same path the web build routes on. */
export function articleUrl(id: string): string {
  return `${WEB_ORIGIN}/article/${encodeURIComponent(id)}`;
}

/**
 * Headline, then link, on two lines.
 *
 * A bare URL in a chat window is a guess about whether it is worth opening.
 * The headline is the whole reason to send it, and every share target that
 * renders a preview still shows the text it was given.
 */
export function shareMessage(headline: string, id: string): string {
  const line = headline.trim();
  return line ? `${line}\n${articleUrl(id)}` : articleUrl(id);
}
