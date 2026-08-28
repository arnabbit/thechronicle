import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { latestRelease } from '@/src/api/releases';
import { canPush } from '@/src/capabilities';
import { isNewerVersion, updateLine } from '@/src/lib/version';
import { usePrompts } from '@/src/store/prompts';

// Two ways a fix reaches a reader on a hand-installed build.
//
// **JS changes arrive on their own.** The check runs on launch and applies on
// the *next* one, and startup never waits on it — blocking boot on a network
// round trip, on top of a cold server already measured at 22.9 s, would make
// every launch worse to fix something that happens a handful of times a year.
//
// **Native changes need a new APK**, so the app asks the releases API what the
// newest published build is and, when one is newer than this one, offers the
// second candidate in the end-of-feed slot. Never a modal, never a block: the
// web build is always current and is the alternative if a reader would rather
// not install anything.

/**
 * Fetch a JS update in the background, for next launch.
 *
 * Nothing awaits this and nothing reports it. `Updates.isEnabled` is false in
 * Expo Go and in development, where there is no update channel to check.
 */
export function useBackgroundUpdateCheck(): void {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled || !check.isAvailable) return;
        // Fetched, not reloaded. Reloading under a reader mid-article to
        // deliver a fix is worse than the fix arriving tomorrow.
        await Updates.fetchUpdateAsync();
      } catch {
        // Silent: no error state, and no retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export interface UpdateNotice {
  line: string;
  action: string;
  onAction: () => void;
}

/**
 * The end-of-feed slot's second candidate, or nothing.
 *
 * Android only: the web build is always current, so there is nothing to
 * announce and no APK to send anyone to. The same capability that gates push
 * gates this, because both are facts about being a hand-installed native
 * build.
 *
 * Checked once per mount of the feed rather than on a timer. A release lands a
 * handful of times a year and the reader will open the app again.
 */
export function useUpdateNotice(): UpdateNotice | undefined {
  const dismissed = usePrompts((state) => state.updateDismissed);
  const [notice, setNotice] = useState<UpdateNotice | undefined>(undefined);

  useEffect(() => {
    if (!canPush || dismissed) return;
    let cancelled = false;

    void (async () => {
      const release = await latestRelease();
      if (cancelled || !release) return;
      const current = Constants.expoConfig?.version ?? '';
      if (!isNewerVersion(release.version, current)) return;
      setNotice({
        line: updateLine(release.version),
        action: 'Get it',
        onAction: () => {
          void Linking.openURL(release.url);
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [dismissed]);

  return dismissed ? undefined : notice;
}
