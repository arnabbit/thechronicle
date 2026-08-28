// The type scale. Two families: Newsreader for anything the reader reads as
// prose, Public Sans for furniture (kickers, datelines, counts, controls).
//
// Sizes and letter-spacing are lifted from the shipping feed screen so the
// refactor is eyeball-verifiable against what it replaced.

export const fonts = {
  serif: 'Newsreader_400Regular',
  serifBold: 'Newsreader_700Bold',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifBoldItalic: 'Newsreader_700Bold_Italic',
  sansLight: 'PublicSans_300Light',
  sans: 'PublicSans_400Regular',
  sansMedium: 'PublicSans_500Medium',
  sansSemiBold: 'PublicSans_600SemiBold',
  sansBold: 'PublicSans_700Bold',
} as const;

export const type = {
  /** 30px, not 32: `THE CHRONICLE` measures 276px at 32 and a 320px phone
   *  leaves 272 between the 24pt insets, so the old size overflowed its own
   *  block on a small screen. 30 measures 264 and clears it. design-17 drew 30
   *  and was right for a reason nobody had written down. */
  masthead: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  /** The dateline, which is a control and not furniture — so it carries the
   *  paper's ink rather than the meta grey, at a weight nothing else uses. */
  dateline: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  /** The utility row above the masthead: the two destinations that are not the
   *  paper. Quieter than the dateline on purpose — they lead away from it. */
  utility: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  /** Feed row headline. Smaller than the old body-inline card: ticket 03 made
   *  the feed a uniform dek list, so no row is a front-page splash. */
  headline: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  /** The period screen's title — "August 2026" as a statement rather than a
   *  headline. The one place the paper says a thing bigger than an article's
   *  own headline, because a month is bigger than a story. */
  display: {
    fontFamily: fonts.serifBold,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
  },
  /** Article detail headline. */
  headlineLarge: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  dek: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 25,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
  },
  /** Standing letterspaced caps — the paper's furniture voice. */
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  slug: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sentence: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
  },
} as const;
