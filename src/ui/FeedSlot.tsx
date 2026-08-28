import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canPush } from '@/src/capabilities';
import { feedSlot } from '@/src/lib/feedSlot';
import { requestAndRegister } from '@/src/store/notifications';
import { usePrompts } from '@/src/store/prompts';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The end of the feed: the paper's own closing marker, and above it at most
// one prompt.
//
// A *slot*, not a component that happens to sit here. Which prompt — if any —
// is chosen by `feedSlot`, which is pure and under test with the "at most one"
// invariant asserted exhaustively. This file renders whichever it names.
//
// No copy here is from ticket 18's approved table, because that table has no
// line for either prompt. It is written in the paper's voice and flagged in
// decisions.md as needing a copy pass.

export function FeedSlot({
  label,
  updateNotice,
}: {
  /** The closing marker's words — the feed and the archive end differently. */
  label: string;
  /** Ticket 12 supplies this candidate's eligibility. */
  updateNotice?: { line: string; action: string; onAction: () => void };
}) {
  const { colors } = useTheme();
  const launches = usePrompts((state) => state.launches);
  const offer = usePrompts((state) => state.offer);
  const setOffer = usePrompts((state) => state.setOffer);
  const dismissUpdate = usePrompts((state) => state.dismissUpdate);

  // Never on the first launch. The reader has to have seen what the app is
  // before it asks them for anything — and reaching the end of the feed is
  // most of that on its own.
  const chosen = feedSlot({
    notificationOffer: canPush && launches > 1 && offer !== 'done',
    updateNotice: Boolean(updateNotice),
  });

  const accept = useCallback(async () => {
    const granted = await requestAndRegister();
    // Either way the conversation is over: granted is silent, and refused at
    // the OS prompt is still a no.
    setOffer(granted ? 'done' : 'declined');
  }, [setOffer]);

  return (
    <View style={styles.end}>
      {chosen === 'notificationOffer' ? (
        offer === 'unseen' ? (
          <Prompt
            slug="When the paper lands"
            line="The Chronicle can tell you when a new edition is published. One notification a day at most, and never for a paper you are already reading."
            actions={[
              { label: 'Notify me', onPress: accept },
              { label: 'Not now', onPress: () => setOffer('done') },
            ]}
          />
        ) : (
          // Declined: told once where the setting lives, then never again.
          // Marking it done on render is deliberate — this line is a receipt,
          // not a question, and it does not need answering.
          <Prompt
            slug="Notifications are off"
            line="You can turn them on later in Android settings, under Apps, The Chronicle, Notifications."
            actions={[{ label: 'Understood', onPress: () => setOffer('done') }]}
          />
        )
      ) : null}

      {chosen === 'updateNotice' && updateNotice ? (
        <Prompt
          slug="A newer build"
          line={updateNotice.line}
          actions={[
            { label: updateNotice.action, onPress: updateNotice.onAction },
            { label: 'Not now', onPress: dismissUpdate },
          ]}
        />
      ) : null}

      <View style={[styles.endRule, { borderTopColor: colors.ruleStrong }]} />
      <Text style={[type.slug, styles.endText, { color: colors.secondary }]}>{label}</Text>
    </View>
  );
}

/**
 * The paper's notice vocabulary again — a caps slug, one sentence, ruled caps
 * controls — but inline in the feed rather than filling a screen, so it is
 * left-aligned with the rows above it and carries no rule of its own.
 */
function Prompt({
  slug,
  line,
  actions,
}: {
  slug: string;
  line: string;
  actions: { label: string; onPress: () => void }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.prompt, { borderTopColor: colors.ruleHair }]}>
      <Text style={[type.slug, styles.promptSlug, { color: colors.primary }]}>{slug}</Text>
      <Text style={[type.sentence, styles.promptLine, { color: colors.onSurface }]}>{line}</Text>
      <View style={styles.promptActions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={action.onPress}
            style={styles.actionHit}
          >
            <Text
              style={[
                type.kicker,
                styles.action,
                { color: colors.primary, borderBottomColor: colors.ruleStrong },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  end: {
    marginTop: 40,
    alignItems: 'center',
  },
  endRule: {
    borderTopWidth: 2,
    width: 48,
    marginBottom: 18,
  },
  endText: {
    textAlign: 'center',
  },
  prompt: {
    alignSelf: 'stretch',
    borderTopWidth: 1,
    paddingTop: 24,
    paddingBottom: 40,
  },
  promptSlug: {
    marginBottom: 12,
  },
  promptLine: {
    maxWidth: 460,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
  },
  actionHit: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  action: {
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
});
