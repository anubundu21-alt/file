#!/usr/bin/env node
/**
 * Turns `expo export --platform web` output into a bundle that can be hosted
 * from any directory, including a sub-path, without a server rewrite rule.
 *
 * `expo export` emits root-absolute URLs (`/_expo/...`, `/assets/...`) and nests
 * assets under their on-disk `node_modules/.pnpm/...` path. Static hosts that
 * serve the app from a sub-path return 404s for those, so this script:
 *
 *   1. flattens every asset to `a/<content-hashed-basename>` (the hashes Expo
 *      already puts in the filenames keep these unique),
 *   2. moves `_expo/` to `s/`, because some static hosts reserve paths that
 *      start with an underscore,
 *   3. rewrites the absolute URLs in index.html, the JS bundle and the CSS to
 *      document-relative ones,
 *   4. injects a bootstrap that pins relative URLs to the hosting directory and
 *      normalizes the route path, so Expo Router resolves routes correctly even
 *      when the app is served from a sub-path,
 *   5. writes the result to a separate output directory, leaving `dist/` alone.
 *
 * Usage: node scripts/prepare-web-preview.js [--in dist] [--out web-preview]
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { in: 'dist', out: 'web-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--in' || flag === '--out') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`Missing value for ${flag}`);
      }
      args[flag.slice(2)] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  return args;
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// Longest path first so that no rewrite target is a prefix of another.
function rewriteUrls(text, mapping) {
  let out = text;
  for (const [from, to] of mapping) {
    out = out.split(from).join(to);
  }
  return out;
}

const BOOTSTRAP = `<script>
      // Injected by scripts/prepare-web-preview.js.
      // Pin relative asset URLs to the directory the app is served from, then
      // rewrite the visible path to the app root so Expo Router's web linking
      // resolves "/" instead of the hosting sub-path.
      (function () {
        try {
          var dir = new URL('.', document.baseURI);
          var base = document.createElement('base');
          base.href = dir.href;
          document.head.appendChild(base);

          var rest = location.pathname.startsWith(dir.pathname)
            ? location.pathname.slice(dir.pathname.length)
            : '';
          if (rest === 'index.html') rest = '';
          if (dir.pathname !== '/' || location.pathname !== '/' + rest) {
            history.replaceState(null, '', '/' + rest + location.search + location.hash);
          }
        } catch (error) {
          console.warn('preview bootstrap skipped:', error);
        }
      })();
    </script>`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inDir = path.resolve(projectRoot, args.in);
  const outDir = path.resolve(projectRoot, args.out);

  if (!fs.existsSync(path.join(inDir, 'index.html'))) {
    console.error(
      `No index.html in ${inDir}. Run \`pnpm exec expo export --platform web --output-dir ${args.in}\` first.`,
    );
    process.exit(1);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const files = listFiles(inDir).map((full) => ({
    full,
    rel: path.relative(inDir, full).split(path.sep).join('/'),
  }));

  // `/assets/<deep/pnpm/path>/<name>` -> `a/<name>`
  const assetMapping = [];
  const seen = new Map();
  for (const file of files) {
    if (!file.rel.startsWith('assets/')) continue;
    const base = path.posix.basename(file.rel);
    const previous = seen.get(base);
    if (previous) {
      console.error(
        `Asset basename collision: ${base}\n  ${previous}\n  ${file.rel}`,
      );
      process.exit(1);
    }
    seen.set(base, file.rel);
    file.out = `a/${base}`;
    assetMapping.push([`/${file.rel}`, `a/${base}`]);
  }
  assetMapping.sort((a, b) => b[0].length - a[0].length);

  // `_expo/` -> `s/`: hosts that reserve underscore-prefixed paths 404 on it.
  for (const file of files) {
    if (file.rel.startsWith('_expo/')) {
      file.out = `s/${file.rel.slice('_expo/'.length)}`;
    }
  }

  const rootMapping = [
    ['/_expo/', 's/'],
    ['"_expo/', '"s/'],
    ['/favicon.ico', 'favicon.ico'],
  ];
  const mapping = [...assetMapping, ...rootMapping];

  const rewritable = new Set(['.html', '.js', '.css']);
  let rewritten = 0;

  for (const file of files) {
    const outRel = file.out || file.rel;
    const dest = path.join(outDir, outRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (rewritable.has(path.extname(file.rel))) {
      const source = fs.readFileSync(file.full, 'utf8');
      let updated = rewriteUrls(source, mapping);
      if (file.rel === 'index.html') {
        if (!updated.includes('<body>')) {
          console.error('index.html has no <body> to inject the bootstrap into');
          process.exit(1);
        }
        updated = updated.replace('<body>', `<body>\n    ${BOOTSTRAP}`);
      }
      if (updated !== source) rewritten += 1;
      fs.writeFileSync(dest, updated);
    } else {
      fs.copyFileSync(file.full, dest);
    }
  }

  const leftover = [];
  for (const file of listFiles(outDir)) {
    if (!rewritable.has(path.extname(file))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (
      text.includes('"/assets/') ||
      text.includes('/_expo/') ||
      text.includes('"_expo/')
    ) {
      leftover.push(path.relative(outDir, file));
    }
  }
  if (leftover.length > 0) {
    console.error(
      `Absolute URLs still present in: ${leftover.join(', ')}`,
    );
    process.exit(1);
  }

  console.log(`Prepared ${files.length} files in ${args.out}`);
  console.log(`Flattened ${assetMapping.length} assets, rewrote ${rewritten} files`);
}

main();
