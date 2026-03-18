import { describe, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';
import { specCase } from './spec-case.js';

const gridCase = (title: string, fn: () => void | Promise<void>) => specCase('grid-layouts', title, fn);
const viewportCase = (title: string, fn: () => void | Promise<void>) => specCase('viewport-blocks', title, fn);
const sidebarCase = (title: string, fn: () => void | Promise<void>) => specCase('sidebar-main-layout', title, fn);

function getDocument(markdown: string): any {
  const ast = parse(markdown);
  expect(ast.type).toBe('document');
  return ast;
}

describe('Spec 4: Layout Syntax', () => {
  describe('4.1 Grid Layouts', () => {
    gridCase('maps heading with .grid-3 into a grid structure with 3 grid items', () => {
      const ast = getDocument(`## Features {.grid-3}
### Feature 1
Content 1
### Feature 2
Content 2
### Feature 3
Content 3`);

      const grid = ast.children.find((n: any) => n.type === 'grid');
      expect(grid).toBeDefined();
      expect(grid.columns).toBe(3);
      expect(Array.isArray(grid.children)).toBe(true);
      expect(grid.children).toHaveLength(3);

      for (const item of grid.children) {
        expect(item.type).toBe('grid-item');
        const itemHeading = (item.children || []).find((n: any) => n.type === 'heading');
        expect(itemHeading).toBeDefined();
        expect(itemHeading.level).toBe(3);
      }
    });

    gridCase('supports grid-auto class', () => {
      const ast = getDocument(`## Cards {.grid-auto}
### One
Text
### Two
Text`);

      const grid = ast.children.find((n: any) => n.type === 'grid');
      expect(grid).toBeDefined();
    });

    gridCase('captures breakpoint-specific responsive grid metadata', () => {
      const ast = getDocument(`## Features {.grid-3 .xs:grid-1 .md:grid-2}
### Feature 1
Content 1
### Feature 2
Content 2
### Feature 3
Content 3`);

      const grid = ast.children.find((n: any) => n.type === 'grid');
      expect(grid).toBeDefined();
      expect(grid.props?.responsive?.gridColumns).toEqual({
        xs: 1,
        md: 2,
      });
      expect(grid.props?.classes).toEqual(expect.arrayContaining(['grid-3', 'xs:grid-1', 'md:grid-2']));
    });
  });

  describe('4.2 Viewport Blocks', () => {
    viewportCase('parses mobile viewport blocks into responsive visibleIn metadata', () => {
      const ast = getDocument(`::: mobile
## Features {.grid-1}
:::`);

      const section = ast.children[0];
      expect(section).toMatchObject({
        type: 'container',
        containerType: 'section',
      });
      expect(section.props?.responsive?.visibleIn).toEqual(['mobile']);
      expect(section.props?.classes).toContain('viewport-mobile');
    });

    viewportCase('parses desktop viewport blocks into responsive visibleIn metadata', () => {
      const ast = getDocument(`::: desktop
## Features {.grid-3}
:::`);

      const section = ast.children[0];
      expect(section.props?.responsive?.visibleIn).toEqual(['desktop']);
      expect(section.props?.classes).toContain('viewport-desktop');
    });
  });

  describe('4.3 Sidebar + Main Layout', () => {
    sidebarCase('parses layout container with .sidebar-main and sidebar/main child regions', () => {
      const ast = getDocument(`::: layout {.sidebar-main}
## Sidebar {.sidebar}
Sidebar content

## Main {.main}
Main content
:::`);

      const layout = ast.children[0];
      expect(layout.type).toBe('container');
      expect(layout.containerType).toBe('layout');
      expect(layout.props?.classes).toContain('sidebar-main');

      const headings = (layout.children || []).filter((n: any) => n.type === 'heading');
      expect(headings.length).toBeGreaterThanOrEqual(2);

      const sidebarHeading = headings.find((h: any) => h.props?.classes?.includes('sidebar'));
      const mainHeading = headings.find((h: any) => h.props?.classes?.includes('main'));

      expect(sidebarHeading).toBeDefined();
      expect(mainHeading).toBeDefined();
    });

    sidebarCase('does not infer sidebar-main layout when marker class is absent', () => {
      const ast = getDocument(`::: layout
## Sidebar {.sidebar}
Nav
## Main {.main}
Body
:::`);

      const layout = ast.children[0];
      expect(layout.type).toBe('container');
      expect(layout.containerType).toBe('layout');
      expect(layout.props?.classes || []).not.toContain('sidebar-main');
    });
  });
});
