import { describe, it, expect } from 'vitest';
import { parse, validate, renderToHTML, renderToJSON } from '../src/index.js';

/**
 * Edge case tests to ensure robustness
 */
describe('Edge Cases', () => {
  function getNestedContainerDepth(node: any): number {
    let depth = 0;
    let current = node;

    while (current?.type === 'container') {
      depth += 1;
      current = current.children?.find((child: any) => child.type === 'container');
    }

    return depth;
  }

  function expectNestedContainerShape(
    ast: any,
    parentType: string,
    nestedType: string,
    nestedParagraph: string
  ): void {
    expect(ast.children).toHaveLength(1);

    const parent = ast.children[0] as any;
    expect(parent.type).toBe('container');
    expect(parent.containerType).toBe(parentType);

    const nested = (parent.children || []).find(
      (node: any) => node.type === 'container' && node.containerType === nestedType
    );

    expect(nested).toBeDefined();
    expect(Array.isArray(nested.children)).toBe(true);
    expect(nested.children[0].type).toBe('paragraph');
    expect(nested.children[0].content).toBe(nestedParagraph);

    const topLevelNested = (ast.children || []).filter(
      (node: any) => node.type === 'container' && node.containerType === nestedType
    );
    expect(topLevelNested).toHaveLength(0);
  }

  describe('Empty and whitespace inputs', () => {
    it('should handle empty string', () => {
      const ast = parse('');

      expect(ast.type).toBe('document');
      expect(ast.children).toEqual([]);
      expect(validate(ast)).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
      const inputs = [
        '   ',
        '\n\n\n',
        '\t\t\t',
        '  \n  \t  \n  ',
        '\r\n\r\n'
      ];

      inputs.forEach(input => {
        const ast = parse(input);
        expect(ast.type).toBe('document');
        expect(ast.children).toEqual([]);
      });
    });

    it('should handle single newline', () => {
      const ast = parse('\n');
      expect(ast.type).toBe('document');
    });
  });

  describe('Very long inputs', () => {
    it('should handle very long single line', () => {
      const longLine = 'a'.repeat(100000);
      const ast = parse(longLine);

      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle many paragraphs', () => {
      const manyParagraphs = Array(1000).fill('Paragraph text.').join('\n\n');
      const ast = parse(manyParagraphs);

      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1000);
      expect(ast.children[0].type).toBe('paragraph');
      expect(ast.children[999].content).toBe('Paragraph text.');
    });

    it('should handle many buttons', () => {
      const manyButtons = Array(500).fill('[Button]').join('\n\n');
      const ast = parse(manyButtons);

      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(500);
      expect(ast.children.every((node: any) => node.type === 'button')).toBe(true);
    });

    it('should handle very deep nesting', () => {
      const depth = 20;
      const opening = Array(depth).fill('::: section').join('\n');
      const closing = Array(depth).fill(':::').join('\n');
      const nested = `${opening}\nContent\n${closing}`;
      const ast = parse(nested);
      const nestedContainer = ast.children[0].children?.find((child: any) => child.type === 'container');

      expect(ast.children[0].type).toBe('container');
      expect(ast.children[0].containerType).toBe('section');
      expect(getNestedContainerDepth(ast.children[0])).toBeGreaterThan(1);
      expect(nestedContainer?.type).toBe('container');
    });
  });

  describe('Special characters and unicode', () => {
    it('should handle emoji', () => {
      const ast = parse('## 🚀 Rocket\n[Click Me 👍]');

      const heading = ast.children[0];
      expect(heading.type).toBe('heading');
      expect(heading.content).toBe('🚀 Rocket');
      expect(ast.children[1].type).toBe('button');
      expect(ast.children[1].content).toBe('Click Me 👍');
    });

    it('should handle Chinese characters', () => {
      const ast = parse('## 标题\n[按钮]');

      expect(ast.children[0].content).toBe('标题');
      expect(ast.children[1].content).toBe('按钮');
    });

    it('should handle Arabic characters', () => {
      const ast = parse('## عنوان\n[زر]');

      expect(ast.children[0].content).toBe('عنوان');
      expect(ast.children[1].content).toBe('زر');
    });

    it('should handle Cyrillic characters', () => {
      const ast = parse('## Заголовок\n[Кнопка]');

      expect(ast.children[0].content).toBe('Заголовок');
      expect(ast.children[1].content).toBe('Кнопка');
    });

    it('should handle mixed unicode', () => {
      const ast = parse('## Title 标题 عنوان 🌍\n[Button 按钮 زر 🔘]');

      expect(ast.children[0].content).toBe('Title 标题 عنوان 🌍');
      expect(ast.children[1].content).toBe('Button 按钮 زر 🔘');
    });

    it('should handle special markdown characters', () => {
      const ast = parse('## Title with *asterisks* and _underscores_');

      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].content).toContain('Title with');
    });

    it('should handle HTML special characters', () => {
      const ast = parse('## Title <with> &tags& "quotes"');

      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].content).toBe('Title <with> &tags& "quotes"');
    });
  });

  describe('Malformed syntax', () => {
    it('should handle unclosed brackets', () => {
      const missingClose = parse('[Button');
      const missingOpen = parse('Button]');

      expect(missingClose.type).toBe('document');
      expect(missingOpen.type).toBe('document');
      expect(missingClose.children.length).toBeGreaterThan(0);
      expect(missingOpen.children.length).toBeGreaterThan(0);
    });

    it('should handle unclosed containers', () => {
      const ast = parse('::: hero\nContent');
      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle invalid attributes', () => {
      const malformedObject = parse('[Button]{{{}');
      const malformedAttrs = parse('[Button]{....}');

      expect(malformedObject.type).toBe('document');
      expect(malformedAttrs.type).toBe('document');
      expect(malformedObject.children.length).toBeGreaterThan(0);
      expect(malformedAttrs.children.length).toBeGreaterThan(0);
    });

    it('should handle nested brackets', () => {
      const ast = parse('[[[[Button]]]]');
      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle mixed delimiters', () => {
      const leftMismatch = parse('[Button}');
      const rightMismatch = parse('{Button]');

      expect(leftMismatch.type).toBe('document');
      expect(rightMismatch.type).toBe('document');
      expect(leftMismatch.children.length).toBeGreaterThan(0);
      expect(rightMismatch.children.length).toBeGreaterThan(0);
    });

    it.each([
      {
        name: 'hero > card baseline',
        input: `::: hero
## Welcome

::: card
Feature content
:::

:::`,
        parentType: 'hero',
        nestedType: 'card',
        nestedParagraph: 'Feature content',
      },
      {
        name: 'layout > sidebar with heading and text',
        input: `::: layout
## Dashboard

::: sidebar
Menu items
:::

:::`,
        parentType: 'layout',
        nestedType: 'sidebar',
        nestedParagraph: 'Menu items',
      },
      {
        name: 'card with attributes > button-group',
        input: `::: card {.elevated data-id:"main-card"}
Title text

::: button-group
[Save]
:::

:::`,
        parentType: 'card',
        nestedType: 'button-group',
        nestedParagraph: '[Save]',
      },
      {
        name: 'section > alert after blank lines',
        input: `::: section
Intro paragraph


::: alert
Important notice
:::

:::`,
        parentType: 'section',
        nestedType: 'alert',
        nestedParagraph: 'Important notice',
      },
      {
        name: 'modal > footer with plain text',
        input: `::: modal
Modal title

::: footer
Footer actions
:::

:::`,
        parentType: 'modal',
        nestedType: 'footer',
        nestedParagraph: 'Footer actions',
      },
      {
        name: 'grid > section with multiline body',
        input: `::: grid
Grid intro

::: section
Line one
Line two
:::

:::`,
        parentType: 'grid',
        nestedType: 'section',
        nestedParagraph: 'Line one\nLine two',
      },
      {
        name: 'sidebar with attrs > card',
        input: `::: sidebar {.sticky data-pos:"left"}
Sidebar text

::: card
Quick links
:::

:::`,
        parentType: 'sidebar',
        nestedType: 'card',
        nestedParagraph: 'Quick links',
      },
      {
        name: 'hero > modal after heading',
        input: `::: hero
## Landing

::: modal
Dialog body
:::

:::`,
        parentType: 'hero',
        nestedType: 'modal',
        nestedParagraph: 'Dialog body',
      },
      {
        name: 'layout > grid with extra spacing',
        input: `::: layout
Layout copy


::: grid
Cells here
:::

:::`,
        parentType: 'layout',
        nestedType: 'grid',
        nestedParagraph: 'Cells here',
      },
      {
        name: 'section > form-group preserving text content',
        input: `::: section
Form section

::: form-group
Username field
:::

:::`,
        parentType: 'section',
        nestedType: 'form-group',
        nestedParagraph: 'Username field',
      },
    ])('should preserve nested ::: container structure: $name', ({ input, parentType, nestedType, nestedParagraph }) => {
      const ast = parse(input);
      expectNestedContainerShape(ast, parentType, nestedType, nestedParagraph);
    });
  });

  describe('Mixed line endings', () => {
    it('should handle CRLF line endings', () => {
      const ast = parse('## Title\r\n[Button]\r\n');

      expect(ast.children.map((node: any) => node.type)).toEqual(['heading', 'button']);
    });

    it('should handle mixed line endings', () => {
      const ast = parse('## Title\r\n[Button]\n[Input]\r\n\n[Submit]');

      expect(ast.children.map((node: any) => node.type)).toEqual(['heading', 'container', 'button']);
      expect(ast.children[2].content).toBe('Submit');
    });

    it('should handle CR-only line endings', () => {
      const ast = parse('## Title\r[Button]\r');

      expect(ast.children.map((node: any) => node.type)).toEqual(['heading', 'button']);
    });
  });

  describe('Tabs and indentation', () => {
    it('should handle tab characters', () => {
      const ast = parse('\t## Title\n\t[Button]');

      expect(ast.children.map((node: any) => node.type)).toEqual(['code']);
      expect(ast.children[0].value).toContain('## Title');
      expect(ast.children[0].value).toContain('[Button]');
    });

    it('should handle mixed tabs and spaces', () => {
      const ast = parse('  \t## Title\n\t  [Button]');

      expect(ast.children.map((node: any) => node.type)).toEqual(['code']);
      expect(ast.children[0].value).toContain('## Title');
      expect(ast.children[0].value).toContain('[Button]');
    });

    it('should handle deep indentation', () => {
      const ast = parse('            ## Title\n            [Button]');

      expect(ast.children.map((node: any) => node.type)).toEqual(['code']);
      expect(ast.children[0].value).toContain('## Title');
      expect(ast.children[0].value).toContain('[Button]');
    });
  });

  describe('Boundary conditions', () => {
    it('should handle single character input', () => {
      const ast = parse('a');
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('paragraph');
      expect(ast.children[0].content).toBe('a');
    });

    it('should handle two character input', () => {
      const ast = parse('ab');
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('paragraph');
      expect(ast.children[0].content).toBe('ab');
    });

    it('should handle input with only punctuation', () => {
      const exclam = parse('!!!');
      const hashes = parse('###');
      const stars = parse('***');

      expect(exclam.type).toBe('document');
      expect(hashes.type).toBe('document');
      expect(stars.type).toBe('document');
      expect(exclam.children.length).toBeGreaterThan(0);
      expect(hashes.children.length).toBeGreaterThan(0);
      expect(stars.children.length).toBeGreaterThan(0);
    });

    it('should handle input with only numbers', () => {
      const ast = parse('123456789');

      expect(ast.type).toBe('document');
    });

    it('should handle input with only symbols', () => {
      const ast = parse('!@#$%^&*()');
      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });

  describe('Render edge cases', () => {
    it('should render empty AST', () => {
      const ast = parse('');
      const html = renderToHTML(ast);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<body');
    });

    it('should render with all styles', () => {
      const ast = parse('[Button]');
      const styles = ['sketch', 'clean', 'wireframe', 'material', 'brutal', 'none'] as const;

      styles.forEach(style => {
        const html = renderToHTML(ast, { style });
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('wmd-');
      });
    });

    it('should handle very long class names', () => {
      const longClass = 'class-' + 'x'.repeat(1000);
      const ast = parse(`[Button]{.${longClass}}`);
      const html = renderToHTML(ast);
      expect(html).toContain(longClass);
    });

    it('should handle many classes', () => {
      const classes = Array(100).fill(0).map((_, i) => `.class${i}`).join(' ');
      const ast = parse(`[Button]{${classes}}`);
      const html = renderToHTML(ast);
      expect(html).toContain('class0');
      expect(html).toContain('class99');
    });
  });

  describe('JSON rendering edge cases', () => {
    it('should render empty AST to JSON', () => {
      const ast = parse('');
      const json = renderToJSON(ast);

      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('document');
      expect(parsed.children).toEqual([]);
    });

    it('should handle special characters in JSON', () => {
      const ast = parse('## Title with "quotes" and \\backslashes\\');
      const json = renderToJSON(ast);
      const parsed = JSON.parse(json);
      expect(parsed.children[0].content).toBe('Title with "quotes" and \\backslashes\\');
    });

    it('should handle unicode in JSON', () => {
      const ast = parse('## 🚀 Unicode 中文');
      const json = renderToJSON(ast);

      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('document');
      expect(parsed.children[0].content).toBe('🚀 Unicode 中文');
    });
  });

  describe('Position tracking edge cases', () => {
    it('should accept position option on empty document', () => {
      // Position tracking not yet implemented, but should not error
      expect(() => parse('', { position: true })).not.toThrow();
      const ast = parse('', { position: true });
      expect(ast.type).toBe('document');
    });

    it('should accept position option with unicode', () => {
      const ast = parse('## 🚀 Emoji', { position: true });
      expect(ast.children[0].position).toBeDefined();
      expect(ast.children[0].content).toBe('🚀 Emoji');
    });

    it('should accept position option with mixed line endings', () => {
      const ast = parse('## Title\r\n[Button]\n', { position: true });
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].position).toBeDefined();
      expect(ast.children[1].position).toBeDefined();
    });
  });

  describe('Validation edge cases', () => {
    it('should validate empty document', () => {
      const ast = parse('');
      const errors = validate(ast);

      expect(errors).toEqual([]);
    });

    it('should validate very large document', () => {
      const large = Array(1000).fill('[Button]').join('\n\n');
      const ast = parse(large);
      const errors = validate(ast);

      expect(Array.isArray(errors)).toBe(true);
    });

    it('should validate deeply nested structure', () => {
      const nested = '::: a\n::: b\n::: c\n::: d\nContent\n:::\n:::\n:::\n:::';
      const ast = parse(nested);
      const errors = validate(ast);

      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Memory and performance', () => {
    it('should handle rapid parsing', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        parse('[Button]');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle rapid rendering', () => {
      const ast = parse('[Button]');
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        renderToHTML(ast);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    it('should not leak memory with repeated parsing', () => {
      // Simple test - just ensure it completes
      for (let i = 0; i < 1000; i++) {
        const ast = parse('[Button]');
        expect(ast.type).toBe('document');
      }
    });
  });

  describe('Concurrent operations', () => {
    it('should handle parsing multiple inputs simultaneously', () => {
      const inputs = [
        '## Title 1',
        '## Title 2',
        '[Button]',
        '[Input]',
        '::: hero\nContent\n:::'
      ];

      const results = inputs.map(input => parse(input));

      results.forEach(ast => {
        expect(ast.type).toBe('document');
      });
    });

    it('should handle rendering multiple ASTs simultaneously', () => {
      const asts = [
        parse('## Title'),
        parse('[Button]'),
        parse('[Input]')
      ];

      const htmls = asts.map(ast => renderToHTML(ast));

      htmls.forEach(html => {
        expect(html).toContain('<!DOCTYPE html>');
      });
    });
  });

  describe('Edge cases with options', () => {
    it('should handle all options combinations', () => {
      const markdown = '## Title\n[Button]';

      const variants = [
        parse(markdown, {}),
        parse(markdown, { position: true }),
        parse(markdown, { validate: true }),
        parse(markdown, { strict: true }),
        parse(markdown, {
        position: true,
        validate: true,
        strict: false
      }),
      ];

      variants.forEach((ast) => {
        expect(ast.type).toBe('document');
        expect(ast.children).toHaveLength(2);
        expect(ast.children[0].type).toBe('heading');
        expect(ast.children[1].type).toBe('button');
      });
    });

    it('should handle all render options combinations', () => {
      const ast = parse('[Button]');

      const variants = [
        renderToHTML(ast, {}),
        renderToHTML(ast, { style: 'sketch' }),
        renderToHTML(ast, { pretty: false }),
        renderToHTML(ast, { inlineStyles: false }),
        renderToHTML(ast, { classPrefix: 'custom-' }),
        renderToHTML(ast, {
        style: 'clean',
        pretty: true,
        inlineStyles: true,
        classPrefix: 'app-'
      }),
      ];

      variants.forEach((html) => {
        expect(html).toContain('<!DOCTYPE html>');
        expect(html.toLowerCase()).toContain('button');
      });
    });
  });

  describe('Stress testing', () => {
    it('should handle extremely nested containers', () => {
      const depth = 50;
      let markdown = '';

      for (let i = 0; i < depth; i++) {
        markdown += '::: section\n';
      }

      markdown += 'Content\n';

      for (let i = 0; i < depth; i++) {
        markdown += ':::\n';
      }

      const ast = parse(markdown);
      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
      expect(ast.children[0].type).toBe('container');
    });

    it('should handle very wide tree', () => {
      const buttons = Array(500).fill('[Button]').join(' ');
      const ast = parse(buttons);
      const html = renderToHTML(ast);

      expect(ast.children).toHaveLength(1);
      expect((html.match(/<button/g) || [])).toHaveLength(500);
    });

    it('should handle mixed complexity', () => {
      let markdown = '';

      for (let i = 0; i < 10; i++) {
        markdown += `## Section ${i}\n`;
        markdown += `::: card\n`;

        for (let j = 0; j < 5; j++) {
          markdown += `[Button ${j}]`;
        }

        markdown += `\n[_____]\n`;
        markdown += `:::\n\n`;
      }

      const ast = parse(markdown);
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });
});
