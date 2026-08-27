import { Pressable, StyleSheet, Text } from 'react-native';
import type { RowStateKind } from '@/src/lib/rowState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// One row of the saved list, in the three shapes it can take.
//
// The degraded shapes are told apart **structurally, not by shade**. Ticket
// 12's dark palette leaves no headroom below `secondary`, so a dimmed row and
// a more-dimmed row would be the same row twice. Instead each state removes a
// different thing:
//
//   dead                 loses its category, its ink and its dek, and gains a
//                        Remove control. The row is a stub of a row.
//   unavailableOffline   keeps category and headline at full ink. Only the dek
//                        is replaced.
//
// One is "this is gone". The other is "this is fine and you are not
// connected". Read at arm's length they are different silhouettes, which is
// the point — the distinction survives both palettes because it was never
// carried by colour.

/** Occupies the kicker slot when the article is gone. It replaces the
 *  category, because a withdrawn article's section is no longer a fact worth
 *  stating. */
const DEAD_KICKER = 'No longer available';

/** Occupies the dek slot when the body is not on this device. Not an error:
 *  the article is fine. */
const OFFLINE_DEK = 'Not saved for offline reading';

export function SavedRow({
  kicker,
  headline,
  dek,
  meta,
  state,
  onPress,
  onRemove,
}: {
  kicker?: string;
  headline?: string;
  dek?: string;
  meta?: string;
  /** `null` renders the row whole. */
  state: RowStateKind | null;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  const { colors } = useTheme();
  const dead = state === 'dead';
  // A dead row keeps its ink out of the headline; every other row keeps it.
  const ink = dead ? colors.secondary : colors.primary;

  return (
    <Pressable
      // A dead row leads nowhere, so it is not a link. Remove is its only act.
      accessibilityRole={onPress && !dead ? 'link' : undefined}
      onPress={dead ? undefined : onPress}
      style={styles.row}
    >
      {dead || kicker ? (
        <Text style={[type.kicker, { color: dead ? colors.secondary : colors.primary }]}>
          {dead ? DEAD_KICKER : kicker}
        </Text>
      ) : null}

      {headline ? (
        <Text style={[type.headline, styles.headline, { color: ink }]}>{headline}</Text>
      ) : null}

      {/* Exactly one of these three, and never two: the dek is the slot the
          offline line takes over. */}
      {dead ? null : state === 'unavailableOffline' ? (
        <Text style={[type.meta, styles.replacedDek, { color: colors.secondary }]}>
          {OFFLINE_DEK}
        </Text>
      ) : dek ? (
        <Text style={[type.dek, { color: colors.dek }]}>{dek}</Text>
      ) : null}

      {!dead && meta ? (
        <Text style={[type.meta, styles.meta, { color: colors.secondary }]}>{meta}</Text>
      ) : null}

      {dead && onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove from saved"
          onPress={onRemove}
          style={styles.removeHit}
        >
          <Text
            style={[type.slug, styles.remove, { color: colors.primary, borderBottomColor: colors.ruleStrong }]}
          >
            Remove
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 22,
  },
  headline: {
    marginTop: 8,
  },
  replacedDek: {
    marginTop: 12,
  },
  meta: {
    marginTop: 12,
  },
  // The control is a ruled word, not a button: the paper's own vocabulary,
  // and the only affordance a dead row carries. Padded to a real touch target
  // without the underline growing with it.
  removeHit: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  remove: {
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
});
