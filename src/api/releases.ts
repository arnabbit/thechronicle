// The one outbound request in the app that does not go through the API client.
//
// Different host, different error semantics, and it must never inherit the
// client's retry policy or its 404 handling: a repository with no releases
// answers 404, and that is a normal answer meaning "nothing to announce", not
// a missing page to render a notice about. Routing this through `request`
// would turn a quiet fact into a typed `NotFoundError` and give it two retries
// on the way.
//
// It also never touches the app's own server, which is why it can run on
// launch at all — there is no cold dyno behind it to wake.
//
// Everything here is silent on failure. A reader has no use for "the update
// check failed", and a retry storm against a rate-limited public API is worse
// than not knowing.

const RELEASES_URL = 'https://api.github.com/repos/arnabbit/thechronicle/releases/latest';

export interface Release {
  /** The tag, as published. `v1.2.0` and `1.2.0` are both expected. */
  version: string;
  /** Where a reader goes to get it. */
  url: string;
}

/**
 * The newest published release, or `null` for every other outcome —
 * unreachable, rate-limited, no releases yet, a draft, a malformed body.
 *
 * `null` is not an error state anywhere in this app. It means the end of the
 * feed says nothing about updates, which is what it said before this ticket.
 */
export async function latestRelease(): Promise<Release | null> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
      draft?: unknown;
      prerelease?: unknown;
    };

    // A draft is not published and a pre-release is not the build a reader
    // installing by hand should be sent to.
    if (body.draft === true || body.prerelease === true) return null;
    if (typeof body.tag_name !== 'string' || !body.tag_name) return null;

    return {
      version: body.tag_name,
      url: typeof body.html_url === 'string' ? body.html_url : RELEASES_URL,
    };
  } catch {
    return null;
  }
}
