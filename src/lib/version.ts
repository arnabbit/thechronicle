// Is that build newer than this one.
//
// Pure, and deliberately narrow: this compares the app's own version strings,
// which are set by hand in `app.json` and tagged by hand on a release. It is
// not a semver library and must not become one — no ranges, no pre-release
// precedence, no build metadata. The one question is whether to show a reader
// a notice, and the honest answer to anything ambiguous is "no".
//
// Getting this wrong in the permissive direction nags every reader on every
// launch about a build that is not newer. Getting it wrong in the strict
// direction means one release goes unannounced. The second is much cheaper,
// so every uncertain case returns false.

/** `v1.2.3` and `1.2.3` are the same version. Tags carry the v; `app.json`
 *  does not. */
function digits(version: string): number[] | null {
  const cleaned = version.trim().replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(cleaned)) return null;
  return cleaned.split('.').map(Number);
}

/**
 * Whether `candidate` is a strictly later version than `current`.
 *
 * Compares part by part, padding the shorter with zeros — `1.2` and `1.2.0`
 * are the same version, and `1.2.1` is later than both. Anything that is not
 * a plain dotted number on either side is not a comparison this can make, and
 * it says so by returning false rather than guessing.
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = digits(candidate);
  const b = digits(current);
  if (!a || !b) return false;

  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

/** The notice's one sentence. Named here so the copy sits beside the rule that
 *  decides whether it is shown. */
export function updateLine(version: string): string {
  return `Version ${version.trim().replace(/^v/i, '')} is available. This build is installed by hand, so it does not update itself.`;
}
