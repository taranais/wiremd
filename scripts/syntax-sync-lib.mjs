import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const MANIFEST_PATH = 'syntax/manifest.json';
export const SPEC_PATH = 'SYNTAX-SPEC-v0.2.md';
export const CONFORMANCE_DIR = 'tests/conformance';

export const DOC_SURFACES = {
  'readme-overview': {
    file: 'README.md',
    title: 'Tracked Syntax Inventory',
    intro: 'This block is generated from `syntax/manifest.json` and `tests/conformance/`.',
  },
  'quick-reference-overview': {
    file: 'QUICK-REFERENCE.md',
    title: 'Tracked Syntax Inventory',
    intro: 'This block is generated from `syntax/manifest.json` and mirrors the maintained v0.2 syntax contract.',
  },
  'syntax-guide-overview': {
    file: 'docs/guide/syntax.md',
    title: 'Tracked Syntax Inventory',
    intro: 'This block is generated from `syntax/manifest.json` and kept in sync with the conformance suites.',
  },
  'faq-overview': {
    file: 'FAQ.md',
    title: 'Tracked Syntax Inventory',
    intro: 'This block is generated from `syntax/manifest.json` so FAQ syntax status stays aligned with the maintained implementation.',
  },
  'showcase-overview': {
    file: 'examples/showcase.md',
    title: 'Tracked Syntax Inventory',
    intro: 'This block is generated from `syntax/manifest.json` so the showcase reflects the current maintained syntax set.',
  },
};

const UNKNOWN_BLOCK_PATTERN = /<!-- syntax-sync:begin ([a-z0-9-]+) -->/g;
const SPEC_MARKER_PATTERN = /<!-- syntax-sync:spec ([a-z0-9-]+) sections=([^>]+) -->/g;
const CONFORMANCE_ID_PATTERN = /specCase\(\s*['"]([a-z0-9-]+)['"]/g;

function blockPattern(surfaceId) {
  return new RegExp(
    `<!-- syntax-sync:begin ${escapeRegExp(surfaceId)} -->\\n([\\s\\S]*?)\\n<!-- syntax-sync:end ${escapeRegExp(surfaceId)} -->`,
    'm',
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeInlineCode(value) {
  return value.replace(/`/g, '\\`').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function normalizeStrings(values) {
  return [...values].sort();
}

function validateStringArray(fieldName, value, featureId) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`Feature \`${featureId}\` must define a non-empty string array for ${fieldName}.`);
  }
}

export function loadManifestFromFile(manifestPath = MANIFEST_PATH, rootDir = process.cwd()) {
  const manifest = JSON.parse(readFileSync(resolve(rootDir, manifestPath), 'utf8'));

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error(`Manifest at ${manifestPath} must be a non-empty array.`);
  }

  const seenIds = new Set();

  for (const feature of manifest) {
    if (!feature || typeof feature !== 'object') {
      throw new Error('Every syntax manifest entry must be an object.');
    }

    const requiredFields = [
      'id',
      'title',
      'status',
      'introducedIn',
      'specSections',
      'docSurfaces',
      'conformanceTargets',
      'canonicalExample',
    ];

    for (const field of requiredFields) {
      if (!(field in feature)) {
        throw new Error(`Syntax manifest entry is missing required field \`${field}\`.`);
      }
    }

    if (typeof feature.id !== 'string' || feature.id.length === 0) {
      throw new Error('Every syntax manifest entry requires a non-empty string id.');
    }

    if (seenIds.has(feature.id)) {
      throw new Error(`Duplicate syntax manifest id: ${feature.id}`);
    }
    seenIds.add(feature.id);

    if (typeof feature.title !== 'string' || feature.title.length === 0) {
      throw new Error(`Feature \`${feature.id}\` must define a non-empty title.`);
    }

    if (typeof feature.status !== 'string' || feature.status.length === 0) {
      throw new Error(`Feature \`${feature.id}\` must define a non-empty status.`);
    }

    if (typeof feature.introducedIn !== 'string' || feature.introducedIn.length === 0) {
      throw new Error(`Feature \`${feature.id}\` must define a non-empty introducedIn value.`);
    }

    if (typeof feature.canonicalExample !== 'string' || feature.canonicalExample.length === 0) {
      throw new Error(`Feature \`${feature.id}\` must define a non-empty canonicalExample.`);
    }

    validateStringArray('specSections', feature.specSections, feature.id);
    validateStringArray('docSurfaces', feature.docSurfaces, feature.id);
    validateStringArray('conformanceTargets', feature.conformanceTargets, feature.id);

    for (const surfaceId of feature.docSurfaces) {
      if (!DOC_SURFACES[surfaceId]) {
        throw new Error(`Feature \`${feature.id}\` references unknown doc surface \`${surfaceId}\`.`);
      }
    }
  }

  return manifest;
}

export function parseSpecMarkersFromText(text) {
  const featureToSections = new Map();

  for (const match of text.matchAll(SPEC_MARKER_PATTERN)) {
    const [, featureId, rawSections] = match;
    const currentSections = featureToSections.get(featureId) ?? new Set();

    for (const section of rawSections.split(',').map((item) => item.trim()).filter(Boolean)) {
      currentSections.add(section);
    }

    featureToSections.set(featureId, currentSections);
  }

  return featureToSections;
}

export function parseConformanceFeatureIdsFromText(text) {
  const ids = new Set();

  for (const match of text.matchAll(CONFORMANCE_ID_PATTERN)) {
    ids.add(match[1]);
  }

  return ids;
}

export function renderSurfaceBlock(surfaceId, manifest) {
  const surface = DOC_SURFACES[surfaceId];

  if (!surface) {
    throw new Error(`Unknown doc surface: ${surfaceId}`);
  }

  const features = manifest.filter((feature) => feature.docSurfaces.includes(surfaceId));
  const lines = [
    `### ${surface.title}`,
    '',
    `${surface.intro} Run \`npm run syntax:generate\` after manifest or conformance changes.`,
    '',
    '| Feature | Status | Spec | Conformance | Canonical Example |',
    '|---|---|---|---|---|',
  ];

  for (const feature of features) {
    lines.push(
      `| \`${feature.id}\` | ${feature.status} | ${feature.specSections.join(', ')} | ${feature.conformanceTargets
        .map((target) => `\`${target.replace(/^tests\/conformance\//, '')}\``)
        .join('<br>')} | \`${escapeInlineCode(feature.canonicalExample)}\` |`,
    );
  }

  lines.push('', '> Managed by `scripts/syntax-sync.mjs`. Manual edits inside this block will be overwritten.');

  return lines.join('\n');
}

export function replaceManagedBlock(text, surfaceId, nextBlock) {
  const pattern = blockPattern(surfaceId);

  if (!pattern.test(text)) {
    throw new Error(`Managed block markers for surface \`${surfaceId}\` were not found.`);
  }

  return text.replace(pattern, `<!-- syntax-sync:begin ${surfaceId} -->\n${nextBlock}\n<!-- syntax-sync:end ${surfaceId} -->`);
}

export function generateRepo(rootDir = process.cwd(), manifestPath = MANIFEST_PATH) {
  const manifest = loadManifestFromFile(manifestPath, rootDir);

  for (const [surfaceId, surface] of Object.entries(DOC_SURFACES)) {
    const filePath = resolve(rootDir, surface.file);

    if (!existsSync(filePath)) {
      continue;
    }

    const currentText = readFileSync(filePath, 'utf8');
    if (!currentText.includes(`<!-- syntax-sync:begin ${surfaceId} -->`)) {
      continue;
    }

    writeFileSync(filePath, replaceManagedBlock(currentText, surfaceId, renderSurfaceBlock(surfaceId, manifest)));
  }

  return manifest;
}

function scanManagedBlocks(rootDir) {
  const errors = [];

  for (const surface of Object.values(DOC_SURFACES)) {
    const filePath = resolve(rootDir, surface.file);
    if (!existsSync(filePath)) {
      continue;
    }

    const text = readFileSync(filePath, 'utf8');
    for (const match of text.matchAll(UNKNOWN_BLOCK_PATTERN)) {
      if (!DOC_SURFACES[match[1]]) {
        errors.push(`Unknown managed doc block \`${match[1]}\` found in ${surface.file}.`);
      }
    }
  }

  return errors;
}

export function checkRepo(rootDir = process.cwd(), manifestPath = MANIFEST_PATH) {
  const manifest = loadManifestFromFile(manifestPath, rootDir);
  const errors = [...scanManagedBlocks(rootDir)];
  const manifestIds = new Set(manifest.map((feature) => feature.id));

  const specMarkers = parseSpecMarkersFromText(readFileSync(resolve(rootDir, SPEC_PATH), 'utf8'));
  for (const featureId of specMarkers.keys()) {
    if (!manifestIds.has(featureId)) {
      errors.push(`Spec marker references unknown feature id \`${featureId}\`.`);
    }
  }

  for (const feature of manifest) {
    const actualSections = normalizeStrings(specMarkers.get(feature.id) ?? []);
    const expectedSections = [...feature.specSections].sort();

    if (actualSections.length === 0) {
      errors.push(`Feature \`${feature.id}\` is missing spec markers in ${SPEC_PATH}.`);
      continue;
    }

    if (JSON.stringify(actualSections) !== JSON.stringify(expectedSections)) {
      errors.push(`Feature \`${feature.id}\` has spec sections ${actualSections.join(', ')} but manifest expects ${expectedSections.join(', ')}.`);
    }
  }

  const conformanceFiles = readdirSync(resolve(rootDir, CONFORMANCE_DIR))
    .filter((file) => file.endsWith('.test.ts'))
    .map((file) => `${CONFORMANCE_DIR}/${file}`)
    .sort();

  const featureToFiles = new Map();
  for (const file of conformanceFiles) {
    const ids = parseConformanceFeatureIdsFromText(readFileSync(resolve(rootDir, file), 'utf8'));

    for (const id of ids) {
      if (!manifestIds.has(id)) {
        errors.push(`Conformance file ${file} references unknown feature id \`${id}\`.`);
        continue;
      }

      const files = featureToFiles.get(id) ?? new Set();
      files.add(file);
      featureToFiles.set(id, files);
    }
  }

  for (const feature of manifest) {
    const actualFiles = normalizeStrings(featureToFiles.get(feature.id) ?? []);
    const expectedFiles = [...feature.conformanceTargets].sort();

    if (actualFiles.length === 0) {
      errors.push(`Feature \`${feature.id}\` is missing conformance coverage markers.`);
      continue;
    }

    if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
      errors.push(`Feature \`${feature.id}\` has conformance targets ${actualFiles.join(', ')} but manifest expects ${expectedFiles.join(', ')}.`);
    }
  }

  for (const [surfaceId, surface] of Object.entries(DOC_SURFACES)) {
    const filePath = resolve(rootDir, surface.file);
    if (!existsSync(filePath)) {
      continue;
    }

    const currentText = readFileSync(filePath, 'utf8');
    const usedByManifest = manifest.some((feature) => feature.docSurfaces.includes(surfaceId));

    if (!usedByManifest) {
      continue;
    }

    if (!currentText.includes(`<!-- syntax-sync:begin ${surfaceId} -->`)) {
      errors.push(`Doc surface \`${surfaceId}\` is missing managed block markers in ${surface.file}.`);
      continue;
    }

    const expectedText = replaceManagedBlock(currentText, surfaceId, renderSurfaceBlock(surfaceId, manifest));
    if (expectedText !== currentText) {
      errors.push(`Managed doc block \`${surfaceId}\` in ${surface.file} is stale. Run npm run syntax:generate.`);
    }
  }

  return { manifest, errors };
}
