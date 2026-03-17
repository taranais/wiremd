import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/index.js';

describe('Spec 7.1, 10.3, 11.2, and 11.4: AST Contract and Ambiguity', () => {
  it('parses navigation bars as nav structures with brand, nav items, and button children', () => {
    const ast = parse('[[ :logo: Brand | Link 1 | Link 2 | [Buy]* ]]{.nav}');
    const nav = ast.children[0];

    expect(nav).toMatchObject({
      type: 'nav',
      props: {
        classes: ['nav'],
      },
    });
    expect(nav.children.map((child: any) => child.type)).toEqual(['brand', 'nav-item', 'nav-item', 'button']);
    expect(nav.children[0].children[0]).toMatchObject({
      type: 'icon',
      props: {
        name: 'logo',
      },
    });
  });

  it('preserves raw HTML as literal content while ::: remains a wiremd container', () => {
    const ast = parse(`<div class="raw">hello</div>

::: hero
[Submit]
:::`);

    expect(ast.children[0]).toMatchObject({
      type: 'text',
      content: '<div class="raw">hello</div>',
    });
    expect(ast.children[1]).toMatchObject({
      type: 'container',
      containerType: 'hero',
    });
  });

  it('keeps canonical component node fields on representative nodes', () => {
    const ast = parse(`## Hero {.annotation="Needs approval"}

[Submit]{.primary :disabled}

::: mobile
[CTA] <!-- Primary CTA -->
:::`, { position: true });

    const heading = ast.children[0];
    expect(heading.type).toBe('heading');
    expect(typeof heading.content).toBe('string');
    expect(heading.props).toBeTypeOf('object');
    expect(heading.position?.start.line).toBe(1);

    const button = ast.children[1];
    expect(button).toMatchObject({
      type: 'button',
      content: 'Submit',
      props: {
        state: 'disabled',
      },
    });
    expect(button.position?.start.line).toBe(3);

    const container = ast.children[2];
    expect(container).toMatchObject({
      type: 'container',
      containerType: 'section',
    });
    expect(Array.isArray(container.children)).toBe(true);
    expect(container.position?.start.line).toBeGreaterThan(0);
  });

  it('preserves responsive and annotation extension metadata in canonical props shape', () => {
    const ast = parse(`## Features {.grid-3 .md:grid-2 .sm:grid-1}
### One
Fast
### Two
Secure
### Three
Reliable

[Submit] <!-- Primary CTA -->`);

    const grid = ast.children[0];
    expect(grid).toMatchObject({
      type: 'grid',
      columns: 3,
      props: {
        responsive: {
          gridColumns: {
            md: 2,
            sm: 1,
          },
        },
      },
    });

    const button = ast.children[0].children[2].children[2];
    expect(button.props?.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'comment',
          source: 'inline-comment',
          text: 'Primary CTA',
        }),
      ]),
    );
  });
});
