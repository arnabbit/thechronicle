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
  sansBold: 'PublicSans_700Bold',
} as const;

export const type = {
  masthead: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 32,
    letterSpacing: -1.5,
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
