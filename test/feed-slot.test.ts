import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_CANDIDATES, feedSlot, type SlotInput } from '../src/lib/feedSlot.ts';

// The invariant is "at most one". Ticket 16 predicted this being got wrong by
// two components racing for one position, so it is asserted exhaustively
// rather than by example.

const none: SlotInput = { notificationOffer: false, updateNotice: false };

test('nothing eligible renders nothing, and the feed ends as it always did', () => {
  assert.equal(feedSlot(none), null);
});

test('the permission offer takes the slot when it is eligible', () => {
  assert.equal(feedSlot({ ...none, notificationOffer: true }), 'notificationOffer');
});

test('the update notice takes the slot when it is the only candidate', () => {
  assert.equal(feedSlot({ ...none, updateNotice: true }), 'updateNotice');
});

test('with both eligible, exactly one renders and it is the permission offer', () => {
  assert.equal(feedSlot({ notificationOffer: true, updateNotice: true }), 'notificationOffer');
});

test('once the permission offer is out of the way the update notice takes the slot', () => {
  // The sequence a real reader walks: offered, dismissed, then told.
  assert.equal(feedSlot({ notificationOffer: true, updateNotice: true }), 'notificationOffer');
  assert.equal(feedSlot({ notificationOffer: false, updateNotice: true }), 'updateNotice');
});

test('at most one candidate is returned for every combination of eligibility', () => {
  // Exhaustive over the whole input space, so adding a third candidate
  // without extending this test is a failing build rather than a notice board.
  const combinations = 1 << SLOT_CANDIDATES.length;
  for (let mask = 0; mask < combinations; mask += 1) {
    const input = Object.fromEntries(
      SLOT_CANDIDATES.map((candidate, index) => [candidate, Boolean(mask & (1 << index))]),
    ) as unknown as SlotInput;

    const chosen = feedSlot(input);
    if (chosen === null) {
      assert.ok(
        SLOT_CANDIDATES.every((candidate) => !input[candidate]),
        `nothing rendered while ${JSON.stringify(input)} had a candidate`,
      );
      continue;
    }
    assert.ok(input[chosen], `${chosen} rendered while ineligible`);
    // And it is the first eligible one, which is what "ordered" means.
    const first = SLOT_CANDIDATES.find((candidate) => input[candidate]);
    assert.equal(chosen, first, `order broken for ${JSON.stringify(input)}`);
  }
});

test('the ordering is the declared array, and the offer is declared first', () => {
  assert.deepEqual([...SLOT_CANDIDATES], ['notificationOffer', 'updateNotice']);
});
