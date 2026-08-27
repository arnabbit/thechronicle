// Per-route document titles, so a browser tab and a history entry name what
// they hold. Set on the stack screen, never by the masthead (spec: route tree).

export const PAPER = 'The Chronicle';

/**
 * The article route's title. It takes whatever the screen currently has to
 * say — the headline once loaded, the state slug when the article is missing,
 * nothing at all while it loads — so one function covers every branch.
 */
export function routeTitle(subject?: string | null): string {
  const subjectText = subject?.trim();
  return subjectText ? `${subjectText} — ${PAPER}` : PAPER;
}
