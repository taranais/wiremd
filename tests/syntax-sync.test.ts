import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRepo, generateRepo } from '../scripts/syntax-sync-lib.mjs';

function createTempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'wiremd-syntax-sync-'));

  mkdirSync(join(root, 'syntax'), { recursive: true });
  mkdirSync(join(root, 'tests/conformance'), { recursive: true });

  writeFileSync(join(root, 'syntax/manifest.json'), JSON.stringify([
    {
      id: 'buttons-and-links',
      title: 'Buttons and link ambiguity',
      status: 'implemented',
      introducedIn: 'v0.2',
      specSections: ['2.1', '10.1'],
      docSurfaces: ['readme-overview'],
      conformanceTargets: ['tests/conformance/02-components.test.ts'],
      canonicalExample: '[Submit]{.primary}',
    },
  ], null, 2));

  writeFileSync(join(root, 'SYNTAX-SPEC-v0.2.md'), '<!-- syntax-sync:spec buttons-and-links sections=2.1,10.1 -->\n### 2.1 Buttons\n');
  writeFileSync(join(root, 'tests/conformance/02-components.test.ts'), "import { specCase } from './spec-case';\nconst buttonCase = (title, fn) => specCase('buttons-and-links', title, fn);\nbuttonCase('parses buttons', () => {});\n");
  writeFileSync(join(root, 'README.md'), '# README\n\n<!-- syntax-sync:begin readme-overview -->\nplaceholder\n<!-- syntax-sync:end readme-overview -->\n');

  return root;
}

describe('syntax-sync tooling', () => {
  it('fails when a manifest feature is missing spec markers', () => {
    const root = createTempRepo();
    writeFileSync(join(root, 'SYNTAX-SPEC-v0.2.md'), '### 2.1 Buttons\n');

    const { errors } = checkRepo(root);
    expect(errors).toContain('Feature `buttons-and-links` is missing spec markers in SYNTAX-SPEC-v0.2.md.');
  });

  it('fails when a manifest feature is missing conformance markers', () => {
    const root = createTempRepo();
    writeFileSync(join(root, 'tests/conformance/02-components.test.ts'), 'describe(\'components\', () => {});\n');

    const { errors } = checkRepo(root);
    expect(errors).toContain('Feature `buttons-and-links` is missing conformance coverage markers.');
  });

  it('fails when a managed doc block is stale or manually edited', () => {
    const root = createTempRepo();
    generateRepo(root);
    writeFileSync(join(root, 'README.md'), '# README\n\n<!-- syntax-sync:begin readme-overview -->\nmanual edit\n<!-- syntax-sync:end readme-overview -->\n');

    const { errors } = checkRepo(root);
    expect(errors).toContain('Managed doc block `readme-overview` in README.md is stale. Run npm run syntax:generate.');
  });

  it('rejects duplicate manifest ids', () => {
    const root = createTempRepo();
    writeFileSync(join(root, 'syntax/manifest.json'), JSON.stringify([
      {
        id: 'buttons-and-links',
        title: 'Buttons and link ambiguity',
        status: 'implemented',
        introducedIn: 'v0.2',
        specSections: ['2.1'],
        docSurfaces: ['readme-overview'],
        conformanceTargets: ['tests/conformance/02-components.test.ts'],
        canonicalExample: '[Submit]{.primary}',
      },
      {
        id: 'buttons-and-links',
        title: 'Duplicate',
        status: 'implemented',
        introducedIn: 'v0.2',
        specSections: ['10.1'],
        docSurfaces: ['readme-overview'],
        conformanceTargets: ['tests/conformance/02-components.test.ts'],
        canonicalExample: '[Submit]',
      },
    ], null, 2));

    expect(() => checkRepo(root)).toThrow(/Duplicate syntax manifest id: buttons-and-links/);
  });

  it('rejects unknown feature ids referenced by conformance markers', () => {
    const root = createTempRepo();
    writeFileSync(join(root, 'tests/conformance/02-components.test.ts'), "import { specCase } from './spec-case';\nspecCase('unknown-feature', 'parses buttons', () => {});\n");

    const { errors } = checkRepo(root);
    expect(errors).toContain('Conformance file tests/conformance/02-components.test.ts references unknown feature id `unknown-feature`.');
  });

  it('generates managed blocks from the manifest', () => {
    const root = createTempRepo();
    generateRepo(root);

    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toContain('| `buttons-and-links` | implemented | 2.1, 10.1 |');
    expect(readme).toContain('Managed by `scripts/syntax-sync.mjs`.');
  });
});
