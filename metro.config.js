const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pdf-lib publishes both an ES build (`module`) and a CommonJS one (`main`).
// Metro prefers the ES build, whose `import tslib_1 from 'tslib'` lands on an
// interop shim where the default export is undefined, and the first tool screen
// to touch it dies with "Cannot destructure property '__extends'". The CJS build
// has no such import, so resolve the package to it explicitly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pdf-lib') {
    return context.resolveRequest(context, 'pdf-lib/cjs/index.js', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
