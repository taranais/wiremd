import { describe, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';
import { specCase } from './spec-case.js';

const patternCase = (title: string, fn: () => void | Promise<void>) => specCase('special-patterns', title, fn);
const stateCase = (title: string, fn: () => void | Promise<void>) => specCase('states', title, fn);

function getRoot(markdown: string): any {
  const ast = parse(markdown);
  expect(ast.type).toBe('document');
  expect(ast.children.length).toBeGreaterThan(0);
  return ast.children[0];
}

describe('Spec 7 & 8: Special Patterns & States', () => {
  describe('7.2 Breadcrumbs', () => {
    patternCase('parses >-separated breadcrumb pattern into breadcrumbs node', () => {
      const node = getRoot('Home > Products > Details');
      expect(node.type).toBe('breadcrumbs');
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.children).toHaveLength(3);
    });

    patternCase('parses breadcrumbs with icons and class marker', () => {
      const ast = parse(':house: Home > :folder: Products > Category\n{.breadcrumbs}');
      const node = ast.children[0];
      expect(node.type).toBe('breadcrumbs');
      expect(node.props?.classes).toContain('breadcrumbs');
    });
  });

  describe('7.3 Tabs', () => {
    patternCase('parses tabs and marks active tab via * suffix', () => {
      const node = getRoot('[Overview]* | Details | Reviews | FAQ');
      expect(node.type).toBe('tabs');
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.children).toHaveLength(4);

      const activeTabs = node.children.filter((t: any) => t.type === 'tab' && t.active === true);
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].label).toBe('Overview');
    });

    patternCase('associates following content with active tab section', () => {
      const ast = parse('[Overview]* | Details\n\nContent for Overview tab...');
      const tabs = ast.children[0];
      expect(tabs.type).toBe('tabs');
      const overview = tabs.children.find((t: any) => t.label === 'Overview');
      expect(overview).toBeDefined();
      expect(Array.isArray(overview.children)).toBe(true);
      expect(overview.children.length).toBeGreaterThan(0);
    });
  });

  describe('7.4 Badges/Pills', () => {
    patternCase('parses inline code in badge contexts as badge nodes', () => {
      const first = getRoot('Status `active`');
      const second = getRoot('Notifications `3`');

      expect(first.type).toBe('badge');
      expect(first.content).toBe('active');
      expect(second.type).toBe('badge');
      expect(second.content).toBe('3');
    });
  });

  describe('8.x Component States', () => {
    patternCase('parses canonical loading-state container as loading-state node', () => {
      const node = getRoot('::: loading-state\n:spinner: Loading...\nPlease wait while we process your request.\n:::');
      expect(node.type).toBe('loading-state');
      expect(node.message).toBe('Loading...');
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.children).toHaveLength(1);
      expect(node.children[0]).toMatchObject({
        type: 'paragraph',
        content: 'Please wait while we process your request.',
      });
    });

    patternCase('parses empty state container as empty-state node', () => {
      const node = getRoot('::: empty-state\n:empty-box:\n## No items found\nGet started by creating your first item\n[Create Item]{.primary}\n:::');
      expect(node.type).toBe('empty-state');
      expect(node.icon).toBe('empty-box');
      expect(node.title).toBe('No items found');
      expect(
        node.children.some((child: any) =>
          child.type === 'container'
          && child.children?.some((nested: any) => nested.type === 'button' && nested.content === 'Create Item'),
        ),
      ).toBe(true);
    });

    patternCase('parses error state container as error-state node', () => {
      const node = getRoot('::: error-state\n:warning:\n## Something went wrong\nWe could not load this page\n[Retry]{.primary}\n:::');
      expect(node.type).toBe('error-state');
      expect(node.icon).toBe('warning');
      expect(node.title).toBe('Something went wrong');
      expect(
        node.children.some((child: any) =>
          child.type === 'container'
          && child.children?.some((nested: any) => nested.type === 'button' && nested.content === 'Retry'),
        ),
      ).toBe(true);
    });

    stateCase('parses state attributes on components', () => {
      const loadingBtn = getRoot('[Submit]{:loading}');
      const errorBtn = getRoot('[Retry]{:error}');
      const successBtn = getRoot('[Done]{:success}');
      expect(loadingBtn.type).toBe('button');
      expect(loadingBtn.props?.state).toBe('loading');
      expect(errorBtn.type).toBe('button');
      expect(errorBtn.props?.state).toBe('error');
      expect(successBtn.type).toBe('button');
      expect(successBtn.props?.state).toBe('success');
    });

    stateCase('preserves multiple component states while keeping the latest state as primary', () => {
      const button = getRoot('[Submit]{:hover :active :focus :warning}');

      expect(button.type).toBe('button');
      expect(button.props?.state).toBe('warning');
      expect(button.props?.states).toEqual(['hover', 'active', 'focus', 'warning']);
    });

    stateCase('parses state blocks and applies state to child components', () => {
      const node = getRoot('::: state=hover\n[Submit]\n:::');

      expect(node).toMatchObject({
        type: 'container',
        containerType: 'section',
        props: {
          state: 'hover',
        },
      });
      expect(node.children?.[0]).toMatchObject({
        type: 'button',
        props: {
          state: 'hover',
        },
      });
    });
  });
});
