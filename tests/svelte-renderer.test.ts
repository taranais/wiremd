import { describe, expect, it } from 'vitest';
import { render, renderToSvelte } from '../src/index.js';
import { parse } from '../src/parser/index.js';
import { createFrameworkRendererMarkdown, createFrameworkSeededAst } from './fixtures/render-fixtures.js';

describe('Svelte Renderer', () => {
  it('renders a TypeScript component with bindings and dispatchers by default', () => {
    const output = renderToSvelte(parse(createFrameworkRendererMarkdown()), {
      componentName: 'ProfileForm',
    });

    expect(output).toContain('<script lang="ts">');
    expect(output).toContain('import { createEventDispatcher } from \'svelte\';');
    expect(output).toContain('const dispatch = createEventDispatcher();');
    expect(output).toContain('let email = \'\';');
    expect(output).toContain('let acceptTerms = true;');
    expect(output).toMatch(/let radiogroup\d+ = 'Email';/);
    expect(output).toContain('$: formState = {');
    expect(output).toContain('bind:value={email}');
    expect(output).toContain('bind:value={message}');
    expect(output).toContain('bind:value={selectTopic}');
    expect(output).toContain('bind:checked={acceptTerms}');
    expect(output).toMatch(/bind:group=\{radiogroup\d+\}/);
    expect(output).toContain(`on:click={() => handleButtonClick('Cancel')}`);
    expect(output).toContain('<nav class="wmd-nav">');
    expect(output).toContain('style="--grid-columns: 2"');
    expect(output).toContain('<table class="wmd-table">');
  });

  it('supports non-canonical seeded form defaults from direct AST input', () => {
    const output = renderToSvelte(createFrameworkSeededAst(), {
      componentName: 'SeededSvelte',
    });

    expect(output).toContain('let message = \'Hello from wiremd\';');
    expect(output).toContain('let topic = \'support\';');
    expect(output).toContain('let contactMethod = \'email\';');
    expect(output).toContain('bind:group={contactMethod}');
  });

  it('supports plain JavaScript output through the universal renderer', () => {
    const output = render(parse(createFrameworkRendererMarkdown()), {
      format: 'svelte',
      rendererOptions: {
        typescript: false,
      },
    });

    expect(output).toContain('<script>');
    expect(output).not.toContain('<script lang="ts">');
    expect(output).not.toContain('label: string');
    expect(output).toContain('const dispatch = createEventDispatcher();');
    expect(output).toContain('function handleSubmit() {');
  });

  it('derives Svelte bindings from parsed markdown instead of only fixture ASTs', () => {
    const ast = parse(`
## Profile settings

[Email___]{type:email required}
- [x] Accept terms

[Submit]*
    `.trim());

    const output = renderToSvelte(ast, {
      componentName: 'ParsedSvelte',
    });

    expect(output).toContain("let email = '';");
    expect(output).toContain('let acceptTerms = true;');
    expect(output).toContain('bind:value={email}');
    expect(output).toContain('type="email"');
    expect(output).toContain('bind:checked={acceptTerms}');
    expect(output).toContain('type="submit"');
  });

  it('renders complex parsed markdown into Svelte bindings across nav, form, table, and grid surfaces', () => {
    const ast = parse(createFrameworkRendererMarkdown());

    const output = renderToSvelte(ast, {
      componentName: 'ParsedComplexSvelte',
    });

    expect(output).toContain('<nav class="wmd-nav">');
    expect(output).toContain('let acceptTerms = true;');
    expect(output).toMatch(/let radiogroup\d+ = 'Email';/);
    expect(output).toContain('type="email"');
    expect(output).toContain('<textarea');
    expect(output).toContain('<select');
    expect(output).toContain('bind:checked={acceptTerms}');
    expect(output).toMatch(/bind:group=\{radiogroup\d+\}/);
    expect(output).toContain('<option value="Sales">Sales</option>');
    expect(output).toContain('<option value="Support">Support</option>');
    expect(output).toContain('style="--grid-columns: 2"');
    expect(output).toContain('<table class="wmd-table">');
    expect(output).toContain('type="submit"');
    expect(output).toContain(`on:click={() => handleButtonClick('Cancel')}`);
  });

  it('supports state blocks, placeholders, responsive classes, and annotations', () => {
    const ast = parse(`
## Welcome {{user.name}}

## Features {.grid-3 .md:grid-2}
### A
### B
### C

::: loading
Syncing data
:::

::: mobile
[Submit] <!-- SVELTE-ANNOTATION-XYZ -->
:::

::: note
SVELTE-NOTE-XYZ
:::
    `.trim());

    const hidden = renderToSvelte(ast, { componentName: 'AuditSvelte', placeholderSeed: 'svelte-seed' });
    const visible = renderToSvelte(ast, {
      componentName: 'AuditSvelte',
      placeholderSeed: 'svelte-seed',
      showAnnotations: true,
    });
    const preserved = renderToSvelte(ast, {
      componentName: 'AuditSvelte',
      resolvePlaceholders: false,
    });

    expect(hidden).toContain('wmd-state-block');
    expect(hidden).toContain('wmd-container-loading-state');
    expect(hidden).toContain('Syncing data');
    expect(hidden).toContain('wmd-grid-md-2');
    expect(hidden).toContain('wmd-viewport-mobile');
    expect(hidden).not.toContain('{{user.name}}');
    expect(hidden).not.toContain('SVELTE-ANNOTATION-XYZ');
    expect(hidden).not.toContain('SVELTE-NOTE-XYZ');

    expect(visible).toContain('SVELTE-ANNOTATION-XYZ');
    expect(visible).toContain('wmd-annotation-callout');
    expect(visible).toContain('SVELTE-NOTE-XYZ');

    expect(preserved).toContain('{{user.name}}');
  });
});
