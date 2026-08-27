const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro serves classic scripts, not ES modules, so a package whose ESM build
// uses `import.meta` is a hard syntax error in the browser. zustand's
// `middleware` entry does exactly that (`import.meta.env.MODE`, guarding its
// devtools check), and on web Metro picks zustand's `import` condition — which
// took the entire client bundle down with "Cannot use 'import.meta' outside a
// module". The package ships an equivalent CommonJS build beside it, so this
// points at that instead.
//
// Scoped to zustand by path rather than by dropping a resolver condition
// globally: every other package keeps whatever build Metro would have chosen.
const ZUSTAND_ROOT = path.dirname(require.resolve('zustand/package.json'));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    const subpath = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    return { type: 'sourceFile', filePath: path.join(ZUSTAND_ROOT, `${subpath}.js`) };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
