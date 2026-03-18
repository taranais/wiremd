import { describe, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';
import { specCase } from './spec-case.js';

const markdownCase = (title: string, fn: () => void | Promise<void>) => specCase('native-markdown', title, fn);

function getDocument(markdown: string): any {
  const ast = parse(markdown);
  expect(ast.type).toBe('document');
  return ast;
}

describe('Spec 6: Markdown Native Elements', () => {
  describe('6.1 Headings', () => {
    markdownCase('parses heading levels and heading classes', () => {
      const ast = getDocument(`# Heading 1

## Heading 2 {.hero}

### Heading 3`);

      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        level: 1,
        content: 'Heading 1',
      });
      expect(ast.children[1]).toMatchObject({
        type: 'heading',
        level: 2,
        content: 'Heading 2',
        props: {
          classes: ['hero'],
        },
      });
      expect(ast.children[2]).toMatchObject({
        type: 'heading',
        level: 3,
        content: 'Heading 3',
      });
    });
  });

  describe('6.2 Lists', () => {
    markdownCase('parses unordered and ordered lists with stable list semantics', () => {
      const ast = getDocument(`- Alpha
- Beta

1. One
2. Two`);

      expect(ast.children[0]).toMatchObject({
        type: 'list',
        ordered: false,
      });
      expect(ast.children[0].children.map((child: any) => child.content)).toEqual(['Alpha', 'Beta']);

      expect(ast.children[1]).toMatchObject({
        type: 'list',
        ordered: true,
      });
      expect(ast.children[1].children.map((child: any) => child.content)).toEqual(['One', 'Two']);
    });
  });

  describe('6.3 Tables', () => {
    markdownCase('parses table structure and applies attributes to the table node', () => {
      const ast = getDocument(`| Name | Role |
|------|------|
| Ada | Admin |
| Lin | Editor |
{.data-table}`);

      const table = ast.children[0];
      expect(table).toMatchObject({
        type: 'table',
        props: {
          classes: ['data-table'],
        },
      });
      expect(table.children[0].type).toBe('table-header');
      expect(table.children[1].type).toBe('table-row');
      expect(table.children[2].type).toBe('table-row');
      expect(table.children[0].children[0]).toMatchObject({
        type: 'table-cell',
        content: 'Name',
        header: true,
        align: 'left',
      });
      expect(table.children[1].children[1]).toMatchObject({
        type: 'table-cell',
        content: 'Admin',
        header: false,
      });
    });
  });

  describe('6.4 Blockquotes', () => {
    markdownCase('parses blockquotes and applies standalone attributes to the blockquote node', () => {
      const ast = getDocument(`> Quoted or callout text
> Can be multiple lines
{.callout}`);

      const quote = ast.children[0];
      expect(quote).toMatchObject({
        type: 'blockquote',
        props: {
          classes: ['callout'],
        },
      });
      expect(Array.isArray(quote.children)).toBe(true);
      expect(quote.children[0].type).toBe('paragraph');
      expect(quote.children[0].content).toContain('Quoted or callout text');
    });
  });

  describe('6.5 Horizontal Rules', () => {
    markdownCase('parses thematic breaks as separator nodes', () => {
      const ast = getDocument(`Above

---

Below`);

      expect(ast.children[1]).toMatchObject({
        type: 'separator',
      });
    });
  });

  describe('6.6 Images', () => {
    markdownCase('parses images and applies standalone attributes to the image node', () => {
      const ast = getDocument(`![Alt text](image.png)
{.hero-image}`);

      expect(ast.children[0]).toMatchObject({
        type: 'image',
        src: 'image.png',
        alt: 'Alt text',
        props: {
          classes: ['hero-image'],
        },
      });
    });
  });
});
