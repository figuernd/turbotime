const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const commonConfig = {
  bundle: true,
  format: 'cjs',
  target: ['es2020'],
  sourcemap: !minify,
  minify: minify,
  tsconfig: './tsconfig.json',
};

const extensionConfig = {
  ...commonConfig,
  entryPoints: ['./src/extension.ts'],
  platform: 'node',
  external: ['vscode'],
  outfile: './out/extension.js',
};

const webviewConfig = {
  ...commonConfig,
  entryPoints: ['./webview-ui/index.tsx'],
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
  },
  outfile: './out/webview-ui.js',
};

async function build() {
  try {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ]);
    console.log('Build complete');

    if (watch) {
      console.log('Watching for changes...');
      const extensionCtx = await esbuild.context(extensionConfig);
      const webviewCtx = await esbuild.context(webviewConfig);
      await Promise.all([
        extensionCtx.watch(),
        webviewCtx.watch(),
      ]);
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();