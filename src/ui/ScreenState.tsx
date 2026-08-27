import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Every state is built from the paper's own vocabulary — a short rule, a caps
// slug, one sentence of serif, and where an action exists a bordered caps
// control. There is no spinner anywhere in the app; the centred grey
// ActivityIndicator this replaced is the generic-app answer ticket 18 rejected.

export type ScreenStateKind = 'loading' | 'offline' | 'error' | 'empty' | 'missing';

interface Copy {
  slug: string;
  line: string;
  action?: string;
}

const COPY: Record<Exclude<ScreenStateKind, 'loading' | 'empty'>, Copy> = {
  offline: {
    slug: 'No connection',
    line: 'You are offline, and this device has not kept a copy of this page.',
    action: 'Try again',
  },
  error: {
    slug: 'Could not reach the paper',
    line: 'The request failed. It may be the connection, or the server may be down.',
    action: 'Try again',
  },
  missing: {
    slug: 'Not in the paper',
    line: 'This article is not available. It may have been withdrawn, or the link may be wrong — we cannot tell which.',
    action: "Today's paper",
  },
};

/** A fast load should say nothing at all. Past this, it should say something
 *  true. Six seconds is a tuned constant, not a finding — well short of the
 *  22.9 s cold start actually measured. */
const SLOW_LOAD_MS = 6000;

const SLOW_COPY: Copy = {
  slug: 'Still pressing',
  line: 'The server sleeps when the paper is quiet. Waking it can take up to a minute.',
};

interface Props {
  kind: ScreenStateKind;
  /** `empty` has no default copy — the reason a screen is empty is the
   *  screen's to say, and ticket 18 wrote a different line for each. */
  slug?: string;
  line?: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ScreenState({ kind, slug, line, sub, actionLabel, onAction }: Props) {
  if (kind === 'loading') return <FeedSkeleton />;

  const preset = kind === 'empty' ? undefined : COPY[kind];
  return (
    <Notice
      slug={slug ?? preset?.slug ?? ''}
      line={line ?? preset?.line ?? ''}
      sub={sub}
      actionLabel={actionLabel ?? preset?.action}
      onAction={onAction}
    />
  );
}

function Notice({ slug, line, sub, actionLabel, onAction }: Omit<Props, 'kind'>) {
  const { colors } = useTheme();
  return (
    <View style={styles.notice}>
      <View style={[styles.noticeRule, { borderTopColor: colors.ruleStrong }]} />
      <Text style={[type.slug, styles.slug, { color: colors.primary }]}>{slug}</Text>
      <Text style={[type.sentence, styles.line, { color: colors.onSurface }]}>{line}</Text>
      {sub ? (
        <Text style={[type.meta, styles.sub, { color: colors.secondary }]}>{sub}</Text>
      ) : null}
      {onAction && actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.control, { borderColor: colors.ruleStrong }]}
        >
          <Text style={[type.kicker, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The loading state is the feed's own rhythm with the words removed — kicker,
 * two headline lines, two dek lines, counts — so nothing shifts when the real
 * rows arrive. The slow notice appears above it at six seconds without
 * replacing it.
 */
function FeedSkeleton() {
  const { colors } = useTheme();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.skeleton}>
      {slow ? (
        <View style={styles.slowNotice}>
          <Text style={[type.slug, styles.slug, { color: colors.primary }]}>
            {SLOW_COPY.slug}
          </Text>
          <Text style={[type.sentence, styles.line, { color: colors.onSurface }]}>
            {SLOW_COPY.line}
          </Text>
        </View>
      ) : null}
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={[styles.skeletonRow, { borderTopColor: colors.ruleHair }]}>
          <Bar width="22%" height={9} color={colors.ruleHair} />
          <View style={styles.skeletonHeadline}>
            <Bar width="100%" height={19} color={colors.ruleHair} />
            <Bar width="68%" height={19} color={colors.ruleHair} />
          </View>
          <Bar width="96%" height={12} color={colors.ruleHair} />
          <Bar width="80%" height={12} color={colors.ruleHair} />
          <View style={styles.skeletonCounts}>
            <Bar width="34%" height={8} color={colors.ruleHair} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Bar({
  width,
  height,
  color,
}: {
  width: string;
  height: number;
  color: string;
}) {
  return (
    <View
      style={{
        width: width as unknown as number,
        height,
        backgroundColor: color,
        marginBottom: 8,
      }}
    />
  );
}

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: 24,
    paddingTop: 56,
    alignItems: 'flex-start',
  },
  noticeRule: {
    borderTopWidth: 2,
    width: 48,
    marginBottom: 20,
  },
  slug: {
    marginBottom: 12,
  },
  line: {
    maxWidth: 460,
  },
  sub: {
    marginTop: 12,
  },
  control: {
    marginTop: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  skeleton: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  slowNotice: {
    paddingBottom: 32,
  },
  skeletonRow: {
    borderTopWidth: 1,
    paddingTop: 24,
    paddingBottom: 16,
  },
  skeletonHeadline: {
    marginTop: 4,
    marginBottom: 8,
  },
  skeletonCounts: {
    marginTop: 4,
  },
});
