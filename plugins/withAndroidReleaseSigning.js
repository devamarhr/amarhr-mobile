const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING_BLOCK =
  `    release {\n` +
  `            storeFile file('../../upload.keystore')\n` +
  `            storePassword 'Mongolia123'\n` +
  `            keyAlias 'upload'\n` +
  `            keyPassword 'Mongolia123'\n` +
  `        }\n    `;

function endOfBlock(text, openBraceIdx) {
  let depth = 1;
  let i = openBraceIdx + 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return depth === 0 ? i : -1;
}

function findBlock(text, headerRegex, fromIdx = 0) {
  const re = new RegExp(headerRegex.source, 'g');
  re.lastIndex = fromIdx;
  const m = re.exec(text);
  if (!m) return null;
  const braceStart = m.index + m[0].length - 1;
  const end = endOfBlock(text, braceStart);
  if (end === -1) return null;
  return { headerStart: m.index, braceStart, end };
}

function patchBuildGradle(src) {
  const signingConfigs = findBlock(src, /signingConfigs\s*\{/);
  if (!signingConfigs) {
    throw new Error('[withAndroidReleaseSigning] signingConfigs block not found in app/build.gradle');
  }
  const signingBody = src.slice(signingConfigs.braceStart + 1, signingConfigs.end - 1);
  if (!/\brelease\s*\{/.test(signingBody)) {
    src = src.slice(0, signingConfigs.end - 1) + RELEASE_SIGNING_BLOCK + src.slice(signingConfigs.end - 1);
  }

  const buildTypes = findBlock(src, /buildTypes\s*\{/);
  if (!buildTypes) {
    throw new Error('[withAndroidReleaseSigning] buildTypes block not found in app/build.gradle');
  }
  const releaseInBT = findBlock(src, /\brelease\s*\{/, buildTypes.braceStart);
  if (!releaseInBT || releaseInBT.end > buildTypes.end) {
    throw new Error('[withAndroidReleaseSigning] buildTypes.release block not found');
  }
  const before = src.slice(0, releaseInBT.braceStart + 1);
  const body = src.slice(releaseInBT.braceStart + 1, releaseInBT.end - 1);
  const after = src.slice(releaseInBT.end - 1);
  const newBody = body.replace(/signingConfig\s+signingConfigs\.debug/, 'signingConfig signingConfigs.release');
  return before + newBody + after;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
