// Webpack config for NestJS production build.
// Bundles @dsx/* workspace packages inline so Docker production image
// doesn't need workspace symlinks at runtime.
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Bundle @dsx/* packages (workspace symlinks) — everything else stays external
        allowlist: [/^@dsx\//],
      }),
    ],
  };
};
