import { describe, expect, it } from 'vitest';
import { render, renderArtifacts, renderToAngular } from '../src/index.js';
import { parse } from '../src/parser/index.js';
import { createFrameworkRendererMarkdown, createFrameworkSeededAst } from './fixtures/render-fixtures.js';

describe('Angular Renderer', () => {
  it('renders split component artifacts with reactive forms by default', () => {
    const result = renderToAngular(parse(createFrameworkRendererMarkdown()), {
      componentName: 'ProfileForm',
    });
    const tsArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.ts'));
    const htmlArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.html'));
    const cssArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.css'));

    expect(result.artifacts).toHaveLength(3);
    expect(tsArtifact?.filename).toBe('profile-form.component.ts');
    expect(tsArtifact?.content).toContain("selector: 'app-profile-form'");
    expect(tsArtifact?.content).toContain('standalone: true,');
    expect(tsArtifact?.content).toContain('imports: [CommonModule, ReactiveFormsModule],');
    expect(tsArtifact?.content).toContain('export class ProfileForm');
    expect(tsArtifact?.content).toContain('@Output() submitted = new EventEmitter<Record<string, unknown>>();');
    expect(tsArtifact?.content).toContain('@Output() buttonClick = new EventEmitter<string>();');
    expect(tsArtifact?.content).toContain('email: this.fb.control(\'\'),');
    expect(tsArtifact?.content).toContain('acceptTerms: this.fb.control(true),');

    expect(htmlArtifact?.content).toContain('<div class="wmd-root wmd-sketch">');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.email"');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.message"');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.selectTopic"');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.acceptTerms"');
    expect(htmlArtifact?.content).toMatch(/\[formControl\]=\"form\.controls\.radiogroup\d+\"/);
    expect(htmlArtifact?.content).toContain(`(click)="handleButtonClick('Cancel')"`);
    expect(htmlArtifact?.content).toContain('<nav class="wmd-nav">');
    expect(htmlArtifact?.content).toContain('style="--grid-columns: 2"');
    expect(htmlArtifact?.content).toContain('<table class="wmd-table">');

    expect(cssArtifact?.filename).toBe('profile-form.component.css');
    expect(cssArtifact?.content).toContain('.wmd-root');
  });

  it('supports non-canonical seeded form defaults from direct AST input', () => {
    const result = renderToAngular(createFrameworkSeededAst(), {
      componentName: 'SeededAngular',
    });
    const tsArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.ts'));
    const htmlArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.html'));

    expect(tsArtifact?.content).toContain('message: this.fb.control(\'Hello from wiremd\'),');
    expect(tsArtifact?.content).toContain('topic: this.fb.control(\'support\'),');
    expect(tsArtifact?.content).toContain('contactMethod: this.fb.control(\'email\'),');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.contactMethod"');
  });

  it('supports inline styles and selector overrides through renderArtifacts()', () => {
    const result = renderArtifacts(parse(createFrameworkRendererMarkdown()), {
      format: 'angular',
      rendererOptions: {
        componentName: 'AdminPanel',
        selector: 'admin-panel',
        standalone: false,
        inlineStyles: true,
      },
    });
    const tsArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.ts'));
    const htmlArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.html'));

    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts.some((artifact) => artifact.filename.endsWith('.css'))).toBe(false);
    expect(tsArtifact?.filename).toBe('admin-panel.component.ts');
    expect(tsArtifact?.content).toContain("selector: 'admin-panel'");
    expect(tsArtifact?.content).toContain('styles: [`');
    expect(tsArtifact?.content).not.toContain('styleUrls:');
    expect(tsArtifact?.content).not.toContain('standalone: true,');
    expect(tsArtifact?.content).not.toContain('imports: [CommonModule, ReactiveFormsModule],');
    expect(htmlArtifact?.filename).toBe('admin-panel.component.html');
  });

  it('derives Angular bindings from parsed markdown instead of only fixture ASTs', () => {
    const ast = parse(`
## Profile settings

[Email___]{type:email required}
- [x] Accept terms

[Submit]*
    `.trim());

    const result = renderToAngular(ast, {
      componentName: 'ParsedAngular',
    });
    const tsArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.ts'));
    const htmlArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.html'));

    expect(tsArtifact?.content).toContain("email: this.fb.control(''),");
    expect(tsArtifact?.content).toContain('acceptTerms: this.fb.control(true),');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.email"');
    expect(htmlArtifact?.content).toContain('type="email"');
    expect(htmlArtifact?.content).toContain('[formControl]="form.controls.acceptTerms"');
    expect(htmlArtifact?.content).toContain('type="submit"');
  });

  it('renders complex parsed markdown into Angular artifacts across nav, form, table, and grid surfaces', () => {
    const ast = parse(createFrameworkRendererMarkdown());

    const result = renderToAngular(ast, {
      componentName: 'ParsedComplexAngular',
    });
    const tsArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.ts'));
    const htmlArtifact = result.artifacts.find((artifact) => artifact.filename.endsWith('.html'));
    const html = htmlArtifact?.content || '';

    expect(tsArtifact?.content || '').toMatch(/acceptTerms: this\.fb\.control\(true\),/);
    expect(tsArtifact?.content || '').toMatch(/this\.fb\.control\('Email'\)/);

    expect(html).toContain('<nav class="wmd-nav">');
    expect(html).toContain('type="email"');
    expect(html).toContain('<textarea');
    expect(html).toContain('<select');
    expect(html).toContain('[formControl]="form.controls.acceptTerms"');
    expect(html).toMatch(/\[formControl\]=\"form\.controls\.radiogroup\d+\"/);
    expect(html).toContain('<option value="Sales">Sales</option>');
    expect(html).toContain('<option value="Support">Support</option>');
    expect(html).toContain('style="--grid-columns: 2"');
    expect(html).toContain('<table class="wmd-table">');
    expect(html).toContain('type="submit"');
    expect(html).toContain(`(click)="handleButtonClick('Cancel')"`);
  });

  it('rejects multi-artifact renderers through render()', () => {
    expect(() => {
      render(parse(createFrameworkRendererMarkdown()), {
        format: 'angular',
      });
    }).toThrow(/Use renderArtifacts\(\) instead/);
  });

  it('supports state blocks, placeholders, responsive classes, and annotations in Angular artifacts', () => {
    const ast = parse(`
## Welcome {{user.name}}

## Features {.grid-3 .md:grid-2}
### A
### B
### C

::: error-state
Retry later
:::

::: mobile
[Submit] <!-- ANGULAR-ANNOTATION-XYZ -->
:::

::: note
ANGULAR-NOTE-XYZ
:::
    `.trim());

    const hidden = renderToAngular(ast, {
      componentName: 'AuditAngular',
      placeholderSeed: 'angular-seed',
    });
    const visible = renderToAngular(ast, {
      componentName: 'AuditAngular',
      placeholderSeed: 'angular-seed',
      showAnnotations: true,
    });
    const preserved = renderToAngular(ast, {
      componentName: 'AuditAngular',
      resolvePlaceholders: false,
    });

    const hiddenHtml = hidden.artifacts.find((artifact) => artifact.filename.endsWith('.html'))?.content || '';
    const visibleHtml = visible.artifacts.find((artifact) => artifact.filename.endsWith('.html'))?.content || '';
    const preservedHtml = preserved.artifacts.find((artifact) => artifact.filename.endsWith('.html'))?.content || '';

    expect(hiddenHtml).toContain('wmd-state-block');
    expect(hiddenHtml).toContain('wmd-container-error-state');
    expect(hiddenHtml).toContain('Retry later');
    expect(hiddenHtml).toContain('wmd-grid-md-2');
    expect(hiddenHtml).toContain('wmd-viewport-mobile');
    expect(hiddenHtml).not.toContain('{{user.name}}');
    expect(hiddenHtml).not.toContain('ANGULAR-ANNOTATION-XYZ');
    expect(hiddenHtml).not.toContain('ANGULAR-NOTE-XYZ');

    expect(visibleHtml).toContain('ANGULAR-ANNOTATION-XYZ');
    expect(visibleHtml).toContain('wmd-annotation-callout');
    expect(visibleHtml).toContain('ANGULAR-NOTE-XYZ');

    expect(preservedHtml).toContain('{{user.name}}');
  });
});
