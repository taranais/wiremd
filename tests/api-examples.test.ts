import { describe, it, expect } from 'vitest';
import { parse, validate, renderToHTML, renderToJSON, renderToReact, renderToTailwind } from '../src/index.js';
import type { WiremdNode } from '../src/types.js';

/**
 * Tests for API examples from the documentation
 * Ensures all documented examples work correctly
 */
function visitNodes(nodes: WiremdNode[], visitor: (node: WiremdNode) => void): void {
  for (const node of nodes) {
    visitor(node);
    if ('children' in node && Array.isArray(node.children)) {
      visitNodes(node.children, visitor);
    }
  }
}

function collectNodesOfType<T extends WiremdNode['type']>(nodes: WiremdNode[], type: T): Array<Extract<WiremdNode, { type: T }>> {
  const matches: Array<Extract<WiremdNode, { type: T }>> = [];
  visitNodes(nodes, (node) => {
    if (node.type === type) {
      matches.push(node as Extract<WiremdNode, { type: T }>);
    }
  });
  return matches;
}

describe('API Examples from Documentation', () => {
  describe('Parser API Examples', () => {
    it('should parse basic example from docs', () => {
      const ast = parse(`
## Contact Form

Name
[_____________________________]{required}

Email
[_____________________________]{type:email required}

[Submit]{.primary} [Cancel]
      `);

      expect(ast.type).toBe('document');
      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        level: 2,
        content: 'Contact Form',
      });

      const inputs = collectNodesOfType(ast.children, 'input');
      expect(inputs).toHaveLength(2);
      expect(inputs[0].props.required).toBe(true);
      expect(inputs[1].props.type).toBe('email');
      expect(inputs[1].props.required).toBe(true);

      const buttons = collectNodesOfType(ast.children, 'button');
      expect(buttons.map((button) => button.content)).toEqual(['Submit', 'Cancel']);
      expect(buttons[0].props.classes).toContain('primary');
    });

    it('should parse with position information', () => {
      const ast = parse(`
## Login Form
[Button]
      `, { position: true });

      expect(ast.position?.start.line).toBeGreaterThan(0);
      expect(ast.children[0].position?.start.line).toBeGreaterThan(0);
      expect(ast.children[1].position?.start.line).toBeGreaterThan(0);
      ast.children.forEach(node => {
        if (node.position) {
          expect(node.position.start.line).toBeGreaterThan(0);
        }
      });
    });

    it('should parse with validation', () => {
      const ast = parse(`
## My Wireframe
[Button]
        `, { validate: true });

      expect(ast.type).toBe('document');
      expect(validate(ast)).toEqual([]);
    });

    it('should extract metadata', () => {
      const ast = parse(`
## My Wireframe
This is a description
      `);

      expect(ast.meta).toEqual(expect.objectContaining({
        version: '0.2',
        viewport: 'desktop',
        theme: 'sketch',
      }));
      expect(ast.version).toBe('0.2');
      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        content: 'My Wireframe',
      });
      expect(ast.children[1]).toMatchObject({
        type: 'paragraph',
        content: 'This is a description',
      });
    });

    it('should count node types', () => {
      const ast = parse(`
## Dashboard

[Search___]{type:search}

[Card 1]
[Card 2]
[Card 3]
      `);

      function countNodeTypes(nodes: WiremdNode[]): Record<string, number> {
        const counts: Record<string, number> = {};

        function traverse(node: WiremdNode) {
          counts[node.type] = (counts[node.type] || 0) + 1;

          if ('children' in node && Array.isArray(node.children)) {
            node.children.forEach(traverse);
          }
        }

        nodes.forEach(traverse);
        return counts;
      }

      const counts = countNodeTypes(ast.children);
      expect(counts).toEqual(expect.objectContaining({
        heading: 1,
        input: 1,
        button: 3,
      }));
    });
  });

  describe('Validation API Examples', () => {
    it('should validate basic form', () => {
      const ast = parse(`
## Contact Form
[Submit]
      `);

      const errors = validate(ast);
      expect(errors).toEqual([]);
    });

    it('should collect validation errors', () => {
      const invalidAst = {
        type: 'document',
        version: '0.2',
        meta: {},
        children: [{ type: 'invalid-component' }],
      } as any;

      const errors = validate(invalidAst);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toEqual(expect.objectContaining({
        code: 'INVALID_COMPONENT_TYPE',
      }));
      expect(typeof errors[0].message).toBe('string');
    });

    it('should validate before rendering', () => {
      const markdown = `
## Contact Form
[Button]
      `;

      const ast = parse(markdown);
      const errors = validate(ast);

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
      }

      const html = renderToHTML(ast);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<button');
      expect(html).toContain('Contact Form');
    });
  });

  describe('Renderer API Examples', () => {
    it('should render to HTML with different styles', () => {
      const ast = parse(`## Dashboard\n[Login]`);

      const sketch = renderToHTML(ast, { style: 'sketch' });
      expect(sketch).toContain('wmd-sketch');

      const clean = renderToHTML(ast, { style: 'clean' });
      expect(clean).toContain('wmd-clean');

      const wireframe = renderToHTML(ast, { style: 'wireframe' });
      expect(wireframe).toContain('wmd-wireframe');

      const material = renderToHTML(ast, { style: 'material' });
      expect(material).toContain('wmd-material');

      const brutal = renderToHTML(ast, { style: 'brutal' });
      expect(brutal).toContain('wmd-brutal');

      const none = renderToHTML(ast, { style: 'none' });
      expect(none).toContain('wmd-none');
    });

    it('should render with custom class prefix', () => {
      const ast = parse(`## Form\n[Button]`);

      const html = renderToHTML(ast, {
        classPrefix: 'my-app-',
        style: 'clean'
      });

      expect(html).toContain('my-app-h2');
      expect(html).toContain('my-app-button');
      expect(html).not.toContain('class="wmd-button');
    });

    it('should render minified HTML', () => {
      const ast = parse(`## Title\n[Button]`);

      const html = renderToHTML(ast, {
        pretty: false,
        style: 'sketch'
      });

      expect(html).not.toMatch(/\n\s+/);
      expect(html).toContain('<button');
    });

    it('should render to JSON', () => {
      const ast = parse(`## Login\n[Button]`);

      const json = renderToJSON(ast);

      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('document');
      expect(parsed.children[0]).toMatchObject({
        type: 'heading',
        content: 'Login',
      });
      expect(parsed.children[1]).toMatchObject({
        type: 'button',
        content: 'Button',
      });
    });

    it('should render pretty vs minified JSON', () => {
      const ast = parse(`## Form\n[Submit]`);

      const pretty = renderToJSON(ast, { pretty: true });
      expect(pretty).toContain('\n');
      expect(pretty).toContain('  ');

      const minified = renderToJSON(ast, { pretty: false });
      expect(minified).not.toContain('\n  ');
      expect(JSON.parse(pretty)).toEqual(JSON.parse(minified));
    });

    it('should render to React component', () => {
      const ast = parse(`
## Login Form

Username
[_____________________________]

Password
[_____________________________]{type:password}

[Login]{.primary}
      `);

      const component = renderToReact(ast);

      expect(component).toContain('import React from');
      expect(component).toContain('export const');
      expect(component).toContain('return (');
      expect(component).toContain('className');
      expect(component).toContain('Login Form');
      expect(component).toContain('type="password"');
      expect(component).toContain('Login');
    });

    it('should render React TypeScript vs JavaScript', () => {
      const ast = parse(`## Form\n[Button]`);

      const tsComponent = renderToReact(ast, {
        typescript: true,
        componentName: 'LoginForm'
      });
      expect(tsComponent).toContain(': React.FC');

      const jsComponent = renderToReact(ast, {
        typescript: false,
        componentName: 'LoginForm'
      });
      expect(jsComponent).toContain('LoginForm');
    });

    it('should render to Tailwind', () => {
      const ast = parse(`
## Dashboard

> Card
### Analytics
Page views: 1,234
[View Details]
      `);

      const html = renderToTailwind(ast);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('tailwindcss');
      expect(html).toContain('Analytics');
      expect(html).toContain('View Details');
    });
  });

  describe('Complete Workflow Examples', () => {
    it('should complete full parsing and rendering pipeline', () => {
      const markdown = `
## Contact Form

Name
[_____________________________]{required}

Email
[_____________________________]{type:email required}

[Submit]{.primary} [Cancel]
      `;

      // Parse
      const ast = parse(markdown, { position: true });
      expect(ast.type).toBe('document');
      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        content: 'Contact Form',
      });

      // Validate
      const errors = validate(ast);
      expect(errors).toEqual([]);

      // Render
      const html = renderToHTML(ast, {
        style: 'clean',
        pretty: true
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Contact Form');
      expect(html).toContain('required');
      expect(html).toContain('type="email"');
      expect(html).toContain('Submit');
    });

    it('should generate multiple output formats', () => {
      const markdown = '## Login\n[Submit]{.primary}';
      const ast = parse(markdown);

      const html = renderToHTML(ast, { style: 'sketch' });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Submit');

      const react = renderToReact(ast, { typescript: true });
      expect(react).toContain('import React');
      expect(react).toContain('Submit');

      const json = renderToJSON(ast, { pretty: true });
      expect(JSON.parse(json).children[1]).toMatchObject({
        type: 'button',
        content: 'Submit',
      });
    });

    it('should manipulate AST', () => {
      const ast = parse('## Form\n[Button]');

      // Modify the AST
      ast.children.push({
        type: 'paragraph',
        content: 'Added programmatically',
        props: {}
      });

      expect(ast.children).toHaveLength(3);

      const html = renderToHTML(ast);
      expect(html).toContain('Added programmatically');
      expect(html).toContain('Form');
    });

    it('should traverse and modify AST', () => {
      const ast = parse('## Form\n[Button]\n[Submit]');

      function addClassToButtons(node: WiremdNode) {
        if (node.type === 'button') {
          node.props.classes = [...(node.props.classes || []), 'custom-class'];
        }

        if ('children' in node && node.children) {
          node.children.forEach(addClassToButtons);
        }
      }

      ast.children.forEach(addClassToButtons);

      // Check that buttons have the custom class (traverse recursively)
      let buttonCount = 0;
      function countButtons(node: WiremdNode) {
        if (node.type === 'button') {
          buttonCount++;
          expect(node.props.classes).toContain('custom-class');
        }
        if ('children' in node && node.children) {
          node.children.forEach(countButtons);
        }
      }

      ast.children.forEach(countButtons);

      expect(buttonCount).toBe(2);
    });
  });

  describe('Performance Examples', () => {
    it('should cache parsed ASTs', () => {
      const astCache = new Map<string, ReturnType<typeof parse>>();

      function getCachedAST(markdown: string) {
        if (!astCache.has(markdown)) {
          astCache.set(markdown, parse(markdown));
        }
        return astCache.get(markdown)!;
      }

      const ast1 = getCachedAST('## Form\n[Button]');
      const ast2 = getCachedAST('## Form\n[Button]');

      expect(ast1).toBe(ast2); // Same reference
    });

    it('should reuse parsed ASTs for multiple renderers', () => {
      const markdown = `## Dashboard\n[Button]`;
      const ast = parse(markdown); // Parse once

      // Render multiple times
      const html = renderToHTML(ast, { style: 'sketch' });
      const json = renderToJSON(ast);
      const react = renderToReact(ast);

      expect(html).toContain('<!DOCTYPE html>');
      expect(json).toContain('"type"');
      expect(react).toContain('import React');
    });
  });

  describe('Error Handling Examples', () => {
    it('should handle parse errors gracefully', () => {
      function parseUserInput(input: string) {
        try {
          return {
            success: true,
            ast: parse(input, { position: true }),
            error: null
          };
        } catch (error: any) {
          return {
            success: false,
            ast: null,
            error: error.message
          };
        }
      }

      const result = parseUserInput('## Valid');
      expect(result.success).toBe(true);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.children[0]).toMatchObject({
        type: 'heading',
        content: 'Valid',
      });

      const invalid = parseUserInput('## Welcome {{user.phone}}');
      expect(invalid.success).toBe(true);
    });

    it('should use comprehensive error handler', () => {
      interface RenderResult {
        success: boolean;
        html?: string;
        error?: {
          type: 'parse' | 'validation' | 'render';
          message: string;
          code?: string;
        };
      }

      function renderSafely(markdown: string): RenderResult {
        try {
          const ast = parse(markdown, { position: true });

          const errors = validate(ast);
          if (errors.length > 0) {
            return {
              success: false,
              error: {
                type: 'validation',
                message: errors.map(e => e.message).join('; '),
                code: errors[0].code
              }
            };
          }

          const html = renderToHTML(ast);

          return {
            success: true,
            html
          };
        } catch (error: any) {
          return {
            success: false,
            error: {
              type: 'parse',
              message: error.message
            }
          };
        }
      }

      const result = renderSafely('## Title\n[Button]');
      expect(result.success).toBe(true);
      expect(result.html).toContain('<button');
    });
  });

  describe('Type-safe AST Traversal Examples', () => {
    it('should traverse AST type-safely', () => {
      const ast = parse(`
## Dashboard

[Search...]{type:search}

[Submit]{.primary} [Cancel]
      `);

      const buttonContents: string[] = [];

      function traverse(node: WiremdNode) {
        if (node.type === 'button') {
          if (node.content) {
            buttonContents.push(node.content);
          }
        }

        if ('children' in node && node.children) {
          node.children.forEach(traverse);
        }
      }

      ast.children.forEach(traverse);

      expect(buttonContents).toContain('Submit');
      expect(buttonContents).toContain('Cancel');
    });

    it('should process nodes by type', () => {
      const ast = parse(`
## Form

Name
[_____]{required}

[Submit]*
      `);

      const requiredFields: string[] = [];
      const primaryButtons: string[] = [];

      function process(node: WiremdNode) {
        if (node.type === 'input' && node.props.required) {
          requiredFields.push('input');
        }

        if (node.type === 'button' && node.props.variant === 'primary') {
          primaryButtons.push(node.content || 'unnamed');
        }

        if ('children' in node && node.children) {
          node.children.forEach(process);
        }
      }

      ast.children.forEach(process);

      expect(requiredFields).toEqual(['input']);
      expect(primaryButtons).toEqual(['Submit']);
    });
  });
});
