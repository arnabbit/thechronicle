// The period story: one growing article per period, a dated section per run.
//
// Parsed at the fetch boundary, so the shape that enters the cache and the
// durable copy on disk is already the one this build renders. The text is LLM
// output stored on the backend, so the parse is defensive: a malformed entry
// drops alone, and a section left with no entries drops too.
//
// Wire order is the reading order. Nothing here sorts.
//
// Pure: imports only other pure modules, so the bare-Node suite can reach it.

import { isEditionDate } from './date.ts';

const KINDS = ['new', 'update', 'correction'] as const;
export type StoryEntryKind = (typeof KINDS)[number];

export interface StoryEntry {
  threadId: string;
  kind: StoryEntryKind;
  headline: string;
  /** Never empty. */
  paragraphs: string[];
  /** Can be empty: the backend strips hidden articles and still serves the text. */
  articleIds: string[];
  /** The earlier section this entry continues, as YYYY-MM-DD, or null. */
  continuesFrom: string | null;
}

export interface StorySection {
  /** YYYY-MM-DD, IST. */
  date: string;
  /** Never empty. */
  entries: StoryEntry[];
}

export interface PeriodStory {
  sections: StorySection[];
}

const STATUSES = ['none', 'writing', 'ready'] as const;
export type StoryStatus = (typeof STATUSES)[number];

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

const isKind = (value: string): value is StoryEntryKind => KINDS.some((kind) => kind === value);
const isStatus = (value: unknown): value is StoryStatus => STATUSES.some((status) => status === value);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntry(value: unknown): StoryEntry | null {
  if (!isObject(value)) return null;
  const kind = cleanString(value.kind);
  const headline = cleanString(value.headline);
  const paragraphs = cleanStrings(value.paragraphs);
  // With no headline or no text there is nothing to read.
  if (!isKind(kind) || !headline || paragraphs.length === 0) return null;
  const continuesFrom = cleanString(value.continuesFrom);
  return {
    threadId: cleanString(value.threadId),
    kind,
    headline,
    paragraphs,
    articleIds: cleanStrings(value.articleIds),
    continuesFrom: isEditionDate(continuesFrom) ? continuesFrom : null,
  };
}

function parseSection(value: unknown): StorySection | null {
  if (!isObject(value)) return null;
  const date = cleanString(value.date);
  if (!isEditionDate(date) || !Array.isArray(value.entries)) return null;
  const entries = value.entries
    .map(parseEntry)
    .filter((entry): entry is StoryEntry => entry !== null);
  return entries.length > 0 ? { date, entries } : null;
}

/** Always a story. Anything unreadable is a story with no sections. */
export function parsePeriodStory(value: unknown): PeriodStory {
  if (!isObject(value) || !Array.isArray(value.sections)) return { sections: [] };
  return {
    sections: value.sections
      .map(parseSection)
      .filter((section): section is StorySection => section !== null),
  };
}

/**
 * An unknown status reads as `ready`: the screen then shows what arrived and
 * does not promise more is coming.
 */
export function parseStoryStatus(value: unknown): StoryStatus {
  return isStatus(value) ? value : 'ready';
}
