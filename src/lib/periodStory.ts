// The period story: a ranked list of the period's big stories, each a headline
// and its dated parts.
//
// Parsed at the fetch boundary, so the shape that enters the cache and the
// durable copy on disk is already the one this build renders. The text is LLM
// output stored on the backend, so the parse is defensive: a malformed part
// drops alone, and a story left with no parts, or with no headline, drops too.
//
// Wire order is the reading order: stories by rank, parts by date. Nothing here
// sorts.
//
// Pure: imports only other pure modules, so the bare-Node suite can reach it.

import { isEditionDate } from './date.ts';

const KINDS = ['backstory', 'update', 'correction'] as const;
export type StoryPartKind = (typeof KINDS)[number];

export interface StoryPart {
  /** YYYY-MM-DD, IST. */
  date: string;
  kind: StoryPartKind;
  /** Never empty. */
  paragraphs: string[];
  /** Can be empty: the backend strips hidden articles and still serves the text. */
  articleIds: string[];
}

export interface Story {
  threadId: string;
  headline: string;
  /** Never empty. */
  parts: StoryPart[];
}

export interface PeriodStory {
  /** Most important first. */
  stories: Story[];
}

const STATUSES = ['none', 'writing', 'ready'] as const;
export type StoryStatus = (typeof STATUSES)[number];

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

const isKind = (value: string): value is StoryPartKind => KINDS.some((kind) => kind === value);
const isStatus = (value: unknown): value is StoryStatus => STATUSES.some((status) => status === value);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePart(value: unknown): StoryPart | null {
  if (!isObject(value)) return null;
  const date = cleanString(value.date);
  const kind = cleanString(value.kind);
  const paragraphs = cleanStrings(value.paragraphs);
  // With no real date, no known kind or no text there is nothing to place.
  if (!isEditionDate(date) || !isKind(kind) || paragraphs.length === 0) return null;
  return { date, kind, paragraphs, articleIds: cleanStrings(value.articleIds) };
}

function parseStory(value: unknown): Story | null {
  if (!isObject(value) || !Array.isArray(value.parts)) return null;
  const headline = cleanString(value.headline);
  if (!headline) return null;
  const parts = value.parts
    .map(parsePart)
    .filter((part): part is StoryPart => part !== null);
  return parts.length > 0 ? { threadId: cleanString(value.threadId), headline, parts } : null;
}

/** Always a story. Anything unreadable is a story with no stories in it. */
export function parsePeriodStory(value: unknown): PeriodStory {
  if (!isObject(value) || !Array.isArray(value.stories)) return { stories: [] };
  return {
    stories: value.stories
      .map(parseStory)
      .filter((story): story is Story => story !== null),
  };
}

/**
 * What addresses one story inside its period: the thread id, or its rank when
 * the thread id is missing. The rank can change between runs, so a rank key is
 * the fallback and never the first choice.
 */
export function storyKey(story: Story, index: number): string {
  return story.threadId || `no-${index + 1}`;
}

/** The story a key names, and its rank (0-based), or `null` when the period's
 *  current list no longer holds it. */
export function findStory(
  stories: readonly Story[],
  key: string,
): { story: Story; index: number } | null {
  const index = stories.findIndex((story, i) => storyKey(story, i) === key);
  return index === -1 ? null : { story: stories[index], index };
}

export interface StoryDigest {
  /** The first paragraph of the first part: the story's opening, told short. */
  summary: string;
  updates: number;
  corrections: number;
  /** The first and the last part's dates. Equal when there is one part. */
  from: string;
  latest: string;
}

/** What the ranked list shows of a story before it is opened. */
export function storyDigest(story: Story): StoryDigest {
  const { parts } = story;
  return {
    summary: parts[0].paragraphs[0],
    updates: parts.filter((part) => part.kind === 'update').length,
    corrections: parts.filter((part) => part.kind === 'correction').length,
    from: parts[0].date,
    latest: parts[parts.length - 1].date,
  };
}

/**
 * An unknown status reads as `ready`: the screen then shows what arrived and
 * does not promise more is coming.
 */
export function parseStoryStatus(value: unknown): StoryStatus {
  return isStatus(value) ? value : 'ready';
}
