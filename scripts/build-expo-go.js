#!/usr/bin/env node
/**
 * Builds a static Expo Go deployment that is served straight from GitHub.
 *
 * Expo Go can open any HTTPS URL that answers with an Expo manifest; it does
 * not need a running Metro server. This script starts Metro locally, takes the
 * production iOS manifest and bundle from it, rewrites every URL inside them to
 * the raw.githubusercontent.com URL the files will live at, and writes the
 * result into `expo-go/`. Commit that directory and the app opens in Expo Go
 * from `exp://raw.githubusercontent.com/<owner>/<repo>/<branch>/expo-go/ios.json`.
 *
 * Usage: node scripts/build-expo-go.js [--owner X --repo Y --branch main]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'expo-go');
const METRO_PORT = 8081;
const METRO_URL = `http://127.0.0.1:${METRO_PORT}`;
const PLATFORM = 'ios';

function parseArgs(argv) {
  const args = { owner: null, repo: null, branch: 'main' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag.startsWith('--')) {
      const key = flag.slice(2);
      if (!(key in args)) throw new Error(`Unknown argument: ${flag}`);
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  if (!args.owner || !args.repo) {
    throw new Error('Pass --owner and --repo');
  }
  return args;
}

async function metroIsUp() {
  try {
    const response = await fetch(`${METRO_URL}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function startMetro() {
  if (await metroIsUp()) {
    console.log('Metro already running');
    return null;
  }
  console.log('Starting Metro...');
  const child = spawn(
    'npx',
    ['expo', 'start', '--no-dev', '--minify', '--port', String(METRO_PORT), '--offline'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
    },
  );
  child.stdout.on('data', (d) => process.stdout.write(`[metro] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[metro] ${d}`));

  for (let i = 0; i < 90; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await metroIsUp()) {
      console.log('Metro ready');
      return child;
    }
  }
  throw new Error('Metro did not start in time');
}

async function fetchManifest() {
  const response = await fetch(`${METRO_URL}/`, {
    headers: {
      'expo-platform': PLATFORM,
      accept: 'application/expo+json,application/json',
    },
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  return response.json();
}

async function fetchBundle(bundleUrl) {
  const url = new URL(bundleUrl);
  url.searchParams.set('dev', 'false');
  url.searchParams.set('minify', 'true');
  url.searchParams.set('hot', 'false');
  // Hermes bytecode cannot be served as a plain file to Expo Go; force JS.
  url.searchParams.delete('transform.bytecode');
  url.protocol = 'http:';
  url.host = `127.0.0.1:${METRO_PORT}`;

  console.log('Bundling (this takes a minute)...');
  const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok) throw new Error(`Bundle HTTP ${response.status}`);
  return response.text();
}

// Assets are referenced in the bundle as `httpServerLocation:"/assets/?unstable_path=..."`
function collectAssets(bundle) {
  const pattern =
    /httpServerLocation:"([^"]+)"[^}]*hash:"([^"]+)"[^}]*name:"([^"]+)"[^}]*type:"([^"]+)"/g;
  const assets = new Map();
  for (const match of bundle.matchAll(pattern)) {
    const [, serverLocation, hash, name, type] = match;
    const parsed = new URL(`http://x${serverLocation}`);
    const unstablePath = parsed.searchParams.get('unstable_path');
    if (!unstablePath) continue;
    const dir = decodeURIComponent(unstablePath);
    const filename = `${name}.${type}`;
    const key = `${hash}-${filename}`;
    if (!assets.has(key)) {
      assets.set(key, { serverLocation, hash, filename, dir });
    }
  }
  return [...assets.values()];
}

function copyAssets(assets) {
  const assetDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetDir, { recursive: true });
  const copied = new Map();
  const missing = [];

  for (const asset of assets) {
    const source = path.join(projectRoot, asset.dir, asset.filename);
    if (!fs.existsSync(source)) {
      missing.push(path.join(asset.dir, asset.filename));
      continue;
    }
    // Flatten: the hash keeps names unique across packages.
    const flat = `${asset.hash}-${asset.filename}`;
    fs.copyFileSync(source, path.join(assetDir, flat));
    copied.set(asset.serverLocation, `assets/${flat}`);
    copied.set(asset.hash, `assets/${flat}`);
  }

  if (missing.length > 0) {
    throw new Error(`Assets missing on disk:\n  ${missing.join('\n  ')}`);
  }
  return copied;
}

function rewriteBundle(bundle, copied, baseUrl) {
  let out = bundle;
  const locations = [...new Set([...copied.keys()].filter((k) => k.startsWith('/')))];
  // Longest first so no replacement target is a prefix of another.
  locations.sort((a, b) => b.length - a.length);
  for (const location of locations) {
    out = out.split(`httpServerLocation:"${location}"`).join(
      `httpServerLocation:"${baseUrl}/${copied.get(location)}"`,
    );
  }
  return out;
}

function rewriteManifest(manifest, copied, baseUrl) {
  manifest.launchAsset = {
    ...manifest.launchAsset,
    url: `${baseUrl}/bundle-${PLATFORM}.js`,
    key: `bundle-${PLATFORM}`,
    contentType: 'application/javascript',
  };

  if (Array.isArray(manifest.assets)) {
    manifest.assets = manifest.assets.map((asset) => {
      const mapped = asset.hash && copied.get(asset.hash);
      return mapped ? { ...asset, url: `${baseUrl}/${mapped}` } : asset;
    });
  }

  const host = baseUrl.replace(/^https?:\/\//, '');
  if (manifest.extra?.expoClient) {
    manifest.extra.expoClient.hostUri = host;
    manifest.extra.expoClient.bundleUrl = `${baseUrl}/bundle-${PLATFORM}.js`;
  }

  // Expo Go picks its manifest parser from the response headers, and a static
  // host cannot send `expo-protocol-version`. Without it the classic parser can
  // run, and that one reads `sdkVersion`/`bundleUrl` from the top level rather
  // than `launchAsset`. Publish both shapes in one document so either parser
  // finds what it needs.
  const client = manifest.extra?.expoClient ?? {};
  Object.assign(manifest, {
    ...client,
    bundleUrl: `${baseUrl}/bundle-${PLATFORM}.js`,
    hostUri: host,
    platform: PLATFORM,
    developer: undefined,
    packagerOpts: { dev: false, minify: true, hostType: 'url' },
    // Keep the modern fields authoritative — Object.assign must not clobber them.
    id: manifest.id,
    createdAt: manifest.createdAt,
    runtimeVersion: manifest.runtimeVersion,
    launchAsset: manifest.launchAsset,
    assets: manifest.assets,
    metadata: manifest.metadata,
    extra: manifest.extra,
  });
  if (manifest.extra?.expoGo) {
    manifest.extra.expoGo.debuggerHost = host;
    if (manifest.extra.expoGo.packagerOpts) {
      manifest.extra.expoGo.packagerOpts.dev = false;
    }
  }
  return manifest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl =
    `https://raw.githubusercontent.com/${args.owner}/${args.repo}/${args.branch}/expo-go`;

  let metro = null;
  try {
    metro = await startMetro();

    const manifest = await fetchManifest();
    console.log(`Manifest runtimeVersion: ${manifest.runtimeVersion}`);

    const bundle = await fetchBundle(manifest.launchAsset.url);
    console.log(`Bundle: ${(bundle.length / 1e6).toFixed(1)} MB`);

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const assets = collectAssets(bundle);
    console.log(`Assets referenced: ${assets.length}`);
    const copied = copyAssets(assets);

    fs.writeFileSync(
      path.join(outDir, `bundle-${PLATFORM}.js`),
      rewriteBundle(bundle, copied, baseUrl),
    );
    fs.writeFileSync(
      path.join(outDir, `${PLATFORM}.json`),
      JSON.stringify(rewriteManifest(manifest, copied, baseUrl), null, 2),
    );

    console.log(`\nWrote ${outDir}`);
    console.log(`Open in Expo Go: exp://${baseUrl.replace(/^https:\/\//, '')}/${PLATFORM}.json`);
  } finally {
    if (metro) metro.kill();
  }
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
});
