import { describe, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';
import { specCase } from './spec-case.js';

const buttonCase = (title: string, fn: () => void | Promise<void>) => specCase('buttons-and-links', title, fn);
const inputCase = (title: string, fn: () => void | Promise<void>) => specCase('text-inputs', title, fn);
const textareaCase = (title: string, fn: () => void | Promise<void>) => specCase('textareas', title, fn);
const selectCase = (title: string, fn: () => void | Promise<void>) => specCase('selects', title, fn);
const choiceCase = (title: string, fn: () => void | Promise<void>) => specCase('radios-and-checkboxes', title, fn);
const iconCase = (title: string, fn: () => void | Promise<void>) => specCase('icons', title, fn);

function getRootNode(markdown: string): any {
  const ast = parse(markdown);
  expect(ast.type).toBe('document');
  expect(ast.children.length).toBeGreaterThan(0);
  return ast.children[0];
}

function getFirstInlineNode(markdown: string): any {
  const root = getRootNode(markdown);
  if (root.type === 'paragraph' && Array.isArray(root.children) && root.children.length > 0) {
    return root.children[0];
  }
  return root;
}

describe('Spec 2: Component Syntax', () => {
  describe('2.1 Buttons', () => {
    buttonCase('parses basic button [Text]', () => {
      const btn = getFirstInlineNode('[Button Text]');
      expect(btn.type).toBe('button');
      expect(btn.content).toBe('Button Text');
      expect(btn.props).toBeTypeOf('object');
    });

    buttonCase('parses primary shorthand [Text]*', () => {
      const btn = getFirstInlineNode('[Button Text]*');
      expect(btn.type).toBe('button');
      expect(btn.content).toBe('Button Text');
      expect(btn.props?.classes).toContain('primary');
    });

    buttonCase('parses class attribute [Text]{.primary}', () => {
      const btn = getFirstInlineNode('[Button Text]{.primary}');
      expect(btn.type).toBe('button');
      expect(btn.props?.classes).toContain('primary');
    });

    buttonCase('parses state attribute [Text]{:disabled}', () => {
      const btn = getFirstInlineNode('[Button Text]{:disabled}');
      expect(btn.type).toBe('button');
      expect(btn.props?.state).toBe('disabled');
    });

    buttonCase('treats [Text](url) as link, not button', () => {
      const root = getRootNode('[Link Text](http://example.com)');
      const linkNode = root.type === 'link' ? root : root.children?.find((n: any) => n.type === 'link');

      expect(linkNode).toBeDefined();
      expect(linkNode.type).toBe('link');
      expect(linkNode.type).not.toBe('button');
      expect(linkNode.href).toBe('http://example.com');
    });

    buttonCase('treats [Text]{.class}(url) as link, not button', () => {
      const root = getRootNode('[Link Text]{.cta}(https://example.com)');
      const linkNode = root.type === 'link' ? root : root.children?.find((n: any) => n.type === 'link');

      expect(linkNode).toBeDefined();
      expect(linkNode.type).toBe('link');
      expect(linkNode.type).not.toBe('button');
    });
  });

  describe('2.2 Text Inputs', () => {
    inputCase('parses basic text input [___]', () => {
      const input = getFirstInlineNode('[___]');
      expect(input.type).toBe('input');
      expect(input.props?.type).toBe('text');
    });

    inputCase('parses placeholder [Email___]', () => {
      const input = getFirstInlineNode('[Email___]');
      expect(input.type).toBe('input');
      expect(input.props?.placeholder).toBe('Email');
      expect(input.props?.type).toBe('text');
    });

    inputCase('parses password input [***]', () => {
      const input = getFirstInlineNode('[***]');
      expect(input.type).toBe('input');
      expect(input.props?.type).toBe('password');
    });

    inputCase('parses input attributes [___]{type:email required}', () => {
      const input = getFirstInlineNode('[___]{type:email required}');
      expect(input.type).toBe('input');
      expect(input.props?.type).toBe('email');
      expect(input.props?.required).toBe(true);
    });

    inputCase('preserves supported input attributes like disabled, value, and pattern', () => {
      const input = getFirstInlineNode('[___]{type:email disabled value:"demo" pattern:"alpha"}');
      expect(input.type).toBe('input');
      expect(input.props?.type).toBe('email');
      expect(input.props?.disabled).toBe(true);
      expect(input.props?.value).toBe('demo');
      expect(input.props?.pattern).toBe('alpha');
    });

    inputCase('distinguishes input from code', () => {
      const root = getRootNode('`code`');
      const node = root.type === 'code' ? root : root.children?.find((n: any) => n.type === 'code');
      expect(node).toBeDefined();
      expect(node.type).toBe('code');
      expect(node.type).not.toBe('input');
    });

    inputCase('distinguishes [___] from [text] button syntax', () => {
      const input = getFirstInlineNode('[___]');
      const button = getFirstInlineNode('[text]');
      expect(input.type).toBe('input');
      expect(button.type).toBe('button');
    });
  });

  describe('2.3 Textareas', () => {
    textareaCase('parses compact textarea [Message...]{rows:5}', () => {
      const textarea = getFirstInlineNode('[Message...]{rows:5}');
      expect(textarea.type).toBe('textarea');
      expect(textarea.props?.rows).toBe(5);
      expect(textarea.props?.placeholder).toBe('Message...');
    });

    textareaCase('parses visual multiline textarea block', () => {
      const root = getRootNode('[                             ]\n[                             ]\n[                             ]');
      expect(root.type).toBe('textarea');
    });
  });

  describe('2.4 Select/Dropdown', () => {
    selectCase('parses dropdown trigger [Options___v]', () => {
      const select = getFirstInlineNode('[Options___v]');
      expect(select.type).toBe('select');
      expect(select.props?.placeholder).toBe('Options');
    });

    selectCase('uses following list items as options', () => {
      const root = getRootNode('[Select topic____v]\n- Option 1\n- Option 2\n- Option 3');
      const select = root.type === 'select' ? root : root.children?.find((n: any) => n.type === 'select');

      expect(select).toBeDefined();
      expect(select.type).toBe('select');
      expect(Array.isArray(select.options)).toBe(true);
      expect(select.options).toHaveLength(3);
      expect(select.options[0].label).toBe('Option 1');
    });
  });

  describe('2.5 Radio Buttons', () => {
    choiceCase('parses unselected radio ( )', () => {
      const radio = getFirstInlineNode('( ) Unselected option');
      expect(radio.type).toBe('radio');
      expect(radio.selected).toBe(false);
      expect(radio.label).toBe('Unselected option');
    });

    choiceCase('parses selected radio (•)', () => {
      const radio = getFirstInlineNode('(•) Selected option');
      expect(radio.type).toBe('radio');
      expect(radio.selected).toBe(true);
      expect(radio.label).toBe('Selected option');
    });

    choiceCase('parses selected radio (x)', () => {
      const radio = getFirstInlineNode('(x) Selected alt');
      expect(radio.type).toBe('radio');
      expect(radio.selected).toBe(true);
      expect(radio.label).toBe('Selected alt');
    });

    choiceCase('groups consecutive radio items into a radio-group container', () => {
      const group = getRootNode(`( ) Small
(•) Medium
( ) Large`);

      expect(group.type).toBe('radio-group');
      expect(Array.isArray(group.children)).toBe(true);
      expect(group.children).toHaveLength(3);
      expect(group.children.map((child: any) => child.type)).toEqual(['radio', 'radio', 'radio']);
      expect(group.children.map((child: any) => child.selected)).toEqual([false, true, false]);
    });
  });

  describe('2.6 Checkboxes', () => {
    choiceCase('parses markdown task list checkboxes', () => {
      const root = getRootNode('- [ ] Unchecked\n- [x] Checked');
      expect(root.type).toBe('list');
      expect(root.children[0].type).toBe('checkbox');
      expect(root.children[0].checked).toBe(false);
      expect(root.children[1].type).toBe('checkbox');
      expect(root.children[1].checked).toBe(true);
    });
  });

  describe('2.7 Icons', () => {
    iconCase('parses single icon :icon-name:', () => {
      const icon = getFirstInlineNode(':house:');
      expect(icon.type).toBe('icon');
      expect(icon.props?.name).toBe('house');
    });

    iconCase('parses multiple inline icons', () => {
      const root = getRootNode(':house: :user: :gear: :magnifying-glass:');
      const paragraph = root.type === 'paragraph' ? root : null;
      const iconNames = (paragraph?.children || [])
        .filter((n: any) => n.type === 'icon')
        .map((n: any) => n.props?.name);

      expect(iconNames).toEqual(['house', 'user', 'gear', 'magnifying-glass']);
    });
  });
});
