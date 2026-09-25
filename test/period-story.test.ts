import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePeriodStory, parseStoryStatus } from '../src/lib/periodStory.ts';

// The period story is LLM output stored on the far side of the backend. The
// screen must show every part that arrived whole, and lose only the ones that
// did not.

const part = (over: Record<string, unknown> = {}) => ({
  date: '2026-09-02',
  kind: 'backstory',
  paragraphs: ['The assembly voted.'],
  articleIds: ['a1'],
  ...over,
});

const story = (over: Record<string, unknown> = {}) => ({
  threadId: 't1',
  headline: 'The land bill passes',
  parts: [part()],
  ...over,
});

const full = {
  stories: [
    story({
      threadId: 't1',
      headline: 'Ceasefire talks collapse, then a deal is signed',
      parts: [
        part({ articleIds: ['a1', 'a2'] }),
        part({ date: '2026-09-09', kind: 'update', paragraphs: ['Talks resume.'], articleIds: ['a7'] }),
        part({ date: '2026-09-12', kind: 'correction', paragraphs: ['A figure was wrong.'], articleIds: [] }),
      ],
    }),
    story({ threadId: 't2', headline: 'The land bill passes' }),
  ],
};

test('a complete story survives intact, stories and parts in wire order', () => {
  const parsed = parsePeriodStory(full);
  assert.deepEqual(
    parsed.stories.map((s) => s.threadId),
    ['t1', 't2'],
  );
  assert.deepEqual(parsed.stories[0], {
    threadId: 't1',
    headline: 'Ceasefire talks collapse, then a deal is signed',
    parts: [
      { date: '2026-09-02', kind: 'backstory', paragraphs: ['The assembly voted.'], articleIds: ['a1', 'a2'] },
      { date: '2026-09-09', kind: 'update', paragraphs: ['Talks resume.'], articleIds: ['a7'] },
      { date: '2026-09-12', kind: 'correction', paragraphs: ['A figure was wrong.'], articleIds: [] },
    ],
  });
});

test('nothing is re-sorted: the rank order and the part order are kept as served', () => {
  const parsed = parsePeriodStory({
    stories: [
      story({ threadId: 'ranked-1', headline: 'Zebra crossing' }),
      story({ threadId: 'ranked-2', headline: 'Aardvark' }),
      story({
        threadId: 'ranked-3',
        parts: [part({ date: '2026-09-20', kind: 'update' }), part({ date: '2026-09-14' })],
      }),
    ],
  });
  assert.deepEqual(
    parsed.stories.map((s) => s.threadId),
    ['ranked-1', 'ranked-2', 'ranked-3'],
  );
  assert.deepEqual(
    parsed.stories[2].parts.map((p) => p.date),
    ['2026-09-20', '2026-09-14'],
  );
});

test('anything that is not a story is an empty story, never a throw', () => {
  for (const value of [null, undefined, 'story', 42, true, [], {}, { stories: 'x' }, { stories: {} }, { sections: [] }]) {
    assert.deepEqual(parsePeriodStory(value), { stories: [] }, String(JSON.stringify(value)));
  }
});

test('a malformed part drops alone; the rest of its story renders', () => {
  const [only] = parsePeriodStory({
    stories: [
      story({
        parts: [
          part({ paragraphs: ['kept-1'] }),
          null,
          'not an object',
          part({ kind: 'opinion' }),
          part({ kind: 'new' }),
          part({ date: '2026-02-31' }),
          part({ date: 'yesterday' }),
          part({ date: undefined }),
          part({ paragraphs: 'not an array' }),
          part({ paragraphs: ['  ', 7] }),
          part({ paragraphs: ['kept-2'], kind: 'update' }),
        ],
      }),
    ],
  }).stories;
  assert.deepEqual(
    only.parts.map((p) => p.paragraphs[0]),
    ['kept-1', 'kept-2'],
  );
});

test('a story with no headline or no surviving part is dropped; the others keep their rank', () => {
  const parsed = parsePeriodStory({
    stories: [
      story({ threadId: 'kept-1' }),
      story({ threadId: 'no-parts', parts: [] }),
      story({ threadId: 'all-bad', parts: [null, part({ kind: 'nope' })] }),
      story({ threadId: 'parts-not-a-list', parts: 'x' }),
      story({ threadId: 'no-parts-field', parts: undefined }),
      story({ threadId: 'blank-headline', headline: '   ' }),
      story({ threadId: 'numeric-headline', headline: 42 }),
      null,
      story({ threadId: 'kept-2' }),
    ],
  });
  assert.deepEqual(
    parsed.stories.map((s) => s.threadId),
    ['kept-1', 'kept-2'],
  );
});

test('empty articleIds is still a part: the text stands without its links', () => {
  const parsed = parsePeriodStory({ stories: [story({ parts: [part({ articleIds: [] })] })] });
  assert.equal(parsed.stories.length, 1);
  assert.deepEqual(parsed.stories[0].parts[0].articleIds, []);
});

test('bad article ids are dropped one by one; a missing list is empty', () => {
  const [kept, missing] = parsePeriodStory({
    stories: [story({ parts: [part({ articleIds: ['a1', '', 3, null, ' a2 '] }), part({ articleIds: undefined })] })],
  }).stories[0].parts;
  assert.deepEqual(kept.articleIds, ['a1', 'a2']);
  assert.deepEqual(missing.articleIds, []);
});

test('blank paragraphs are dropped and text is trimmed', () => {
  const [only] = parsePeriodStory({
    stories: [story({ headline: '  Talks  ', parts: [part({ paragraphs: ['  One. ', '', '   ', 'Two.\n'] })] })],
  }).stories;
  assert.equal(only.headline, 'Talks');
  assert.deepEqual(only.parts[0].paragraphs, ['One.', 'Two.']);
});

test('a missing threadId is empty rather than a reason to lose the story', () => {
  const [only] = parsePeriodStory({ stories: [story({ threadId: undefined })] }).stories;
  assert.equal(only.threadId, '');
});

test('only the named fields are kept', () => {
  const [only] = parsePeriodStory({
    stories: [story({ rank: 1, parts: [part({ continuesFrom: '2026-09-01', headline: 'old' })] })],
  }).stories;
  assert.deepEqual(Object.keys(only).sort(), ['headline', 'parts', 'threadId']);
  assert.deepEqual(Object.keys(only.parts[0]).sort(), ['articleIds', 'date', 'kind', 'paragraphs']);
});

test('parsing is idempotent: the persisted copy re-parses to itself', () => {
  const once = parsePeriodStory(full);
  assert.deepEqual(parsePeriodStory(once), once);
});

test('the story status is one of three words; anything else promises nothing', () => {
  assert.equal(parseStoryStatus('none'), 'none');
  assert.equal(parseStoryStatus('writing'), 'writing');
  assert.equal(parseStoryStatus('ready'), 'ready');
  for (const value of [undefined, null, 'pending', 'READY', 1]) {
    assert.equal(parseStoryStatus(value), 'ready', String(value));
  }
});
