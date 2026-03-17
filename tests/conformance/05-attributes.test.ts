import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';

function getFirstNode(markdown: string): any {
  const ast = parse(markdown);
  expect(ast.type).toBe('document');
  expect(ast.children.length).toBeGreaterThan(0);
  return ast.children[0];
}

function getFirstInline(markdown: string): any {
  const node = getFirstNode(markdown);
  if (node.type === 'paragraph' && Array.isArray(node.children) && node.children.length > 0) {
    return node.children[0];
  }
  return node;
}

describe('Spec 5: Attributes Syntax', () => {
  describe('5.1 Class Attributes', () => {
    it('parses single class on element [Button]{.class-name}', () => {
      const btn = getFirstInline('[Button]{.class-name}');
      expect(btn.type).toBe('button');
      expect(btn.props?.classes).toEqual(['class-name']);
    });

    it('parses multiple classes {.one .two}', () => {
      const btn = getFirstInline('[Button]{.one .two}');
      expect(btn.type).toBe('button');
      expect(btn.props?.classes).toEqual(['one', 'two']);
    });
  });

  describe('5.2 Key-Value Attributes', () => {
    it('parses key:value attribute {type:email}', () => {
      const input = getFirstInline('[___]{type:email}');
      expect(input.type).toBe('input');
      expect(input.props?.type).toBe('email');
    });

    it('parses quoted values {placeholder:"Enter email"}', () => {
      const input = getFirstInline('[___]{placeholder:"Enter email"}');
      expect(input.type).toBe('input');
      expect(input.props?.placeholder).toBe('Enter email');
    });

    it('parses boolean attribute {required}', () => {
      const input = getFirstInline('[___]{required}');
      expect(input.type).toBe('input');
      expect(input.props?.required).toBe(true);
    });
  });

  describe('5.3 State Attributes', () => {
    it('parses state attribute {:disabled}', () => {
      const btn = getFirstInline('[Button]{:disabled}');
      expect(btn.type).toBe('button');
      expect(btn.props?.state).toBe('disabled');
    });

    it('parses loading/error states', () => {
      const loadingBtn = getFirstInline('[Save]{:loading}');
      const errorBtn = getFirstInline('[Save]{:error}');
      expect(loadingBtn.props?.state).toBe('loading');
      expect(errorBtn.props?.state).toBe('error');
    });
  });

  describe('5.4 Combined Attributes', () => {
    it('parses combined attributes regardless of order', () => {
      const first = getFirstInline('[Submit]{.primary type:submit :disabled}');
      const second = getFirstInline('[Submit]{:disabled .primary type:submit}');

      expect(first.props?.classes).toContain('primary');
      expect(first.props?.type).toBe('submit');
      expect(first.props?.state).toBe('disabled');

      expect(second.props?.classes).toContain('primary');
      expect(second.props?.type).toBe('submit');
      expect(second.props?.state).toBe('disabled');
    });
  });

  describe('5.5 Annotation and Comment Attributes', () => {
    it('normalizes annotation-style attributes into props.annotations metadata', () => {
      const ast = parse('## Hero {.annotation="Needs approval" todo="Update copy" version-note="v2"}');
      const heading = ast.children[0];

      expect(heading.type).toBe('heading');
      expect(heading.props?.annotations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'annotation', text: 'Needs approval' }),
          expect.objectContaining({ kind: 'todo', todo: 'Update copy' }),
          expect.objectContaining({ kind: 'version', version: 'v2' }),
        ]),
      );
    });

    it('attaches inline HTML comments to the preceding component as annotations', () => {
      const button = getFirstNode('[Submit] <!-- Primary CTA -->');

      expect(button.type).toBe('button');
      expect(button.props?.annotations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'comment',
            text: 'Primary CTA',
          }),
        ]),
      );
    });

    it('parses ::: note blocks as annotation-oriented section containers', () => {
      const note = getFirstNode('::: note\nPending final copy from marketing.\n:::');

      expect(note).toMatchObject({
        type: 'container',
        containerType: 'section',
        props: {
          annotationRole: 'note',
        },
      });
      expect(note.props?.classes).toContain('annotation-note');
      expect(note.props?.annotations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'note' }),
        ]),
      );
    });
  });

  describe('5.6 Data Placeholder Syntax', () => {
    it('preserves supported placeholders in AST text fields', () => {
      const ast = parse('## Welcome {{user.name}}\n\n{{number:1000-9999}}');

      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        content: 'Welcome {{user.name}}',
      });
      expect(ast.children[1]).toMatchObject({
        type: 'paragraph',
        content: '{{number:1000-9999}}',
      });
    });

    it('accepts valid placeholders in strict mode', () => {
      expect(() => parse('## Welcome {{user.name}}', { strict: true })).not.toThrow();
    });

    it('rejects invalid placeholder syntax in strict mode', () => {
      expect(() => parse('## Welcome {{user.phone}}', { strict: true })).toThrow(/Validation failed/);
      expect(() => parse('## Welcome {{user.name', { strict: true })).toThrow(/Validation failed/);
    });
  });

  describe('10.4 Attribute Placement', () => {
    it('accepts immediate and space-separated placement', () => {
      const immediate = getFirstInline('[Button]{.cta}');
      const spaced = getFirstInline('[Button] {.cta}');

      expect(immediate.type).toBe('button');
      expect(spaced.type).toBe('button');
      expect(immediate.props?.classes).toContain('cta');
      expect(spaced.props?.classes).toContain('cta');
    });

    it('applies standalone attribute block to preceding block element', () => {
      const ast = parse('## Heading\n{.hero}');
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].props?.classes).toContain('hero');
    });
  });
});
