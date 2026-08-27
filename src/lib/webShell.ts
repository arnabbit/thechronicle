import { darkPalette, lightPalette } from '../theme/tokens.ts';

// The pre-JS web shell.
//
// With `web.output: "single"` there is no per-route pre-render: the browser
// gets one `index.html` and paints it before a line of app code runs. That
// paint is the white flash a dark-mode reader used to get on every cold load,
// because the default Expo template sets no background at all and the browser
// falls back to its own canvas colour (`rgb(242,242,242)` in the shells this
// was seen in).
//
// So the shell carries **its own** `prefers-color-scheme` query. It cannot ask
// the app which theme is active — it is painting before the app exists — and it
// must not guess: ticket 12's two palettes are full seven-role sets in which
// `ruleStrong` inverts rather than mirrors, so a shell that derived one
// background from the other would be re-deriving a palette that was written out
// twice precisely to stop that. It takes both values from the tokens instead,
// and `test/web-shell.test.ts` fails if the committed file drifts from them.
//
// Pure string work: no React, no DOM, nothing to render. `scripts/build-web-shell.mjs`
// writes the result to `public/index.html`, which is where Expo's web template
// resolver looks before falling back on its own copy — the placeholders below
// are that resolver's, filled in at build time with the config's lang and name.

/** Expo's template placeholders, substituted by the web build. */
const LANG = '%LANG_ISO_CODE%';
const TITLE = '%WEB_TITLE%';

export function webShellHtml(): string {
  return `<!DOCTYPE html>
<html lang="${LANG}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>${TITLE}</title>
    <meta name="theme-color" content="${lightPalette.background}" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="${darkPalette.background}" media="(prefers-color-scheme: dark)" />
    <!-- The \`react-native-web\` recommended style reset, unchanged from Expo's
         own template: https://necolas.github.io/react-native-web/docs/setup/ -->
    <style id="expo-reset">
      html,
      body {
        height: 100%;
      }
      body {
        overflow: hidden;
      }
      #root {
        display: flex;
        height: 100%;
        flex: 1;
      }
    </style>
    <!-- The paper, painted before any JavaScript runs. Generated from
         src/theme/tokens.ts — edit the tokens, then \`npm run build:web-shell\`. -->
    <style id="chronicle-shell">
      :root {
        color-scheme: light dark;
      }
      html,
      body,
      #root {
        background-color: ${lightPalette.background};
      }
      @media (prefers-color-scheme: dark) {
        html,
        body,
        #root {
          background-color: ${darkPalette.background};
        }
      }
    </style>
  </head>

  <body>
    <noscript>You need to enable JavaScript to read The Chronicle.</noscript>
    <div id="root"></div>
  </body>
</html>
`;
}
