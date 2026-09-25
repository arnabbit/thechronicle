import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePeriodStory, parseStoryStatus } from '../src/lib/periodStory.ts';

// The period story is LLM output stored on the far side of the backend. The
// screen must show every entry that arrived whole, and lose only the ones that
// did not.

const entry = (over: Record<string, unknown> = {}) => ({
  threadId: 't1',
  kind: 'new',
  headline: 'The land bill passes',
  paragraphs: ['The assembly voted.'],
  articleIds: ['a1'],
  continuesFrom: null,
  ...over,
});

const full = {
  sections: [
    {
      date: '2026-09-15',
      entries: [
        entry({ threadId: 't2', headline: 'Second thread first', articleIds: ['a3', 'a1'] }),
        entry({ threadId: 't1' }),
      ],
    },
    {
      date: '2026-09-16',
      entries: [
        entry({
          threadId: 't2',
          kind: 'update',
          headline: 'Talks resume',
          articleIds: ['a4'],
          continuesFrom: '2026-09-15',
        }),
        entry({ threadId: 't1', kind: 'correction', headline: 'A figure was wrong' }),
      ],
    },
  ],
};

test('a complete story survives intact, sections and entries in wire order', () => {
  const story = parsePeriodStory(full);
  assert.deepEqual(
    story.sections.map((section) => section.date),
    ['2026-09-15', '2026-09-16'],
  );
  assert.deepEqual(
    story.sections[0].entries.map((e) => e.threadId),
    ['t2', 't1'],
  );
  assert.deepEqual(story.sections[1].entries[0], {
    threadId: 't2',
    kind: 'update',
    headline: 'Talks resume',
    paragraphs: ['The assembly voted.'],
    articleIds: ['a4'],
    continuesFrom: '2026-09-15',
  });
  assert.equal(story.sections[1].entries[1].kind, 'correction');
});

test('nothing is re-sorted — a later date served first stays first', () => {
  const story = parsePeriodStory({
    sections: [
      { date: '2026-09-20', entries: [entry()] },
      { date: '2026-09-14', entries: [entry()] },
    ],
  });
  assert.deepEqual(
    story.sections.map((section) => section.date),
    ['2026-09-20', '2026-09-14'],
  );
});

test('anything that is not a story is an empty story, never a throw', () => {
  for (const value of [null, undefined, 'story', 42, true, [], {}, { sections: 'x' }, { sections: {} }]) {
    assert.deepEqual(parsePeriodStory(value), { sections: [] }, String(JSON.stringify(value)));
  }
});

test('a malformed entry drops alone; the rest of its section renders', () => {
  const story = parsePeriodStory({
    sections: [
      {
        date: '2026-09-15',
        entries: [
          entry({ threadId: 'kept-1' }),
          null,
          'not an object',
          entry({ kind: 'opinion' }),
          entry({ headline: '   ' }),
          entry({ headline: 42 }),
          entry({ paragraphs: 'not an array' }),
          entry({ paragraphs: ['  ', 7] }),
          entry({ threadId: 'kept-2' }),
        ],
      },
    ],
  });
  assert.deepEqual(
    story.sections[0].entries.map((e) => e.threadId),
    ['kept-1', 'kept-2'],
  );
});

test('a section left with no entries is dropped, and so is one with no real date', () => {
  const story = parsePeriodStory({
    sections: [
      { date: '2026-09-14', entries: [] },
      { date: '2026-09-15', entries: [null, entry({ kind: 'nope' })] },
      { date: '2026-02-31', entries: [entry()] },
      { date: 'yesterday', entries: [entry()] },
      { entries: [entry()] },
      { date: '2026-09-16', entries: 'x' },
      null,
      { date: '2026-09-17', entries: [entry()] },
    ],
  });
  assert.deepEqual(
    story.sections.map((section) => section.date),
    ['2026-09-17'],
  );
});

test('empty articleIds is still an entry — the text stands without its links', () => {
  const story = parsePeriodStory({ sections: [{ date: '2026-09-15', entries: [entry({ articleIds: [] })] }] });
  assert.equal(story.sections.length, 1);
  assert.deepEqual(story.sections[0].entries[0].articleIds, []);
});

test('bad article ids are dropped one by one; a missing list is empty', () => {
  const [kept, missing] = parsePeriodStory({
    sections: [
      {
        date: '2026-09-15',
        entries: [entry({ articleIds: ['a1', '', 3, null, ' a2 '] }), entry({ articleIds: undefined })],
      },
    ],
  }).sections[0].entries;
  assert.deepEqual(kept.articleIds, ['a1', 'a2']);
  assert.deepEqual(missing.articleIds, []);
});

test('continuesFrom is a date or null, never junk', () => {
  const entries = parsePeriodStory({
    sections: [
      {
        date: '2026-09-16',
        entries: [
          entry({ continuesFrom: '2026-09-15' }),
          entry({ continuesFrom: 'last week' }),
          entry({ continuesFrom: 20260915 }),
          entry({ continuesFrom: undefined }),
        ],
      },
    ],
  }).sections[0].entries;
  assert.deepEqual(
    entries.map((e) => e.continuesFrom),
    ['2026-09-15', null, null, null],
  );
});

test('blank paragraphs are dropped and text is trimmed', () => {
  const [only] = parsePeriodStory({
    sections: [
      {
        date: '2026-09-15',
        entries: [entry({ headline: '  Talks  ', paragraphs: ['  One. ', '', '   ', 'Two.\n'] })],
      },
    ],
  }).sections[0].entries;
  assert.equal(only.headline, 'Talks');
  assert.deepEqual(only.paragraphs, ['One.', 'Two.']);
});

test('a missing threadId is empty rather than a reason to lose the entry', () => {
  const [only] = parsePeriodStory({
    sections: [{ date: '2026-09-15', entries: [entry({ threadId: undefined })] }],
  }).sections[0].entries;
  assert.equal(only.threadId, '');
});

test('parsing is idempotent — the persisted copy re-parses to itself', () => {
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
