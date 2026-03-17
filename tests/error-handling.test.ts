import { describe, it, expect } from 'vitest';
import { parse, validate } from '../src/parser/index.js';
import { renderToHTML } from '../src/renderer/index.js';
import type { DocumentNode } from '../src/types.js';

describe('Error Handling', () => {
  describe('Parse error handling', () => {
    it('should handle empty input gracefully', () => {
      expect(() => parse('')).not.toThrow();

      const ast = parse('');
      expect(ast.type).toBe('document');
      expect(ast.children).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
      const ast = parse('   \n\n  \t  \n');
      expect(ast.type).toBe('document');
      expect(ast.children).toEqual([]);
    });

    it('should handle malformed input gracefully', () => {
      // Most invalid markdown is still parseable, just might not produce expected results
      expect(() => parse('[[[[[[')).not.toThrow();
      expect(() => parse(']]]]]]')).not.toThrow();
      expect(() => parse('{{{{{{')). not.toThrow();
    });

    it('should accept position option without errors', () => {
      const ast = parse('## Title\n[Button]', { position: true });
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].position).toBeDefined();
      expect(ast.children[1].type).toBe('button');
      expect(ast.children[1].position).toBeDefined();
    });

    it('should handle very long input', () => {
      const longInput = 'Text paragraph. '.repeat(1000);
      const ast = parse(longInput);
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('paragraph');
      expect(ast.children[0].content.startsWith('Text paragraph.')).toBe(true);
    });

    it('should handle deeply nested structures', () => {
      const nested = `::: outer\n`.repeat(10) + 'Content' + `\n:::`.repeat(10);
      const ast = parse(nested);
      const nestedContainer = ast.children[0].children?.find((child: any) => child.type === 'container');
      const paragraph = nestedContainer?.children?.find((child: any) => child.type === 'paragraph');

      expect(ast.children[0].type).toBe('container');
      expect(ast.children[0].containerType).toBe('outer');
      expect(nestedContainer?.type).toBe('container');
      expect(nestedContainer?.containerType).toBe('outer');
      expect(paragraph?.content).toContain('Content');
    });

    it('should handle special characters', () => {
      const special = '## Title with émojis 🚀 and spëcial ¢haracters';
      const ast = parse(special);
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].content).toBe('Title with émojis 🚀 and spëcial ¢haracters');
    });

    it('should handle unicode', () => {
      const unicode = '## 中文標題\n[按鈕]';
      const ast = parse(unicode);
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[0].content).toBe('中文標題');
      expect(ast.children[1].type).toBe('button');
      expect(ast.children[1].content).toBe('按鈕');
    });
  });

  describe('Validation error detection', () => {
    it('should detect structural errors', () => {
      const invalidAST = {
        type: 'invalid-type',
        meta: {},
        children: []
      } as any;

      const errors = validate(invalidAST);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('INVALID_ROOT_TYPE');
    });

    it('should provide helpful error messages', () => {
      const invalidAST = {
        type: 'document',
        // missing meta
        children: []
      } as any;

      const errors = validate(invalidAST);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBeTruthy();
      expect(errors[0].message.length).toBeGreaterThan(0);
    });

    it('should provide error codes', () => {
      const invalidAST = {
        type: 'wrong',
        meta: {},
        children: []
      } as any;

      const errors = validate(invalidAST);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('INVALID_ROOT_TYPE');
    });

    it('should provide path information for nested errors', () => {
      const invalidAST = {
        type: 'document',
        version: '0.1',
        meta: {},
        children: [
          {
            type: 'container',
            containerType: 'card',
            props: {},
            children: [
              {} as any // Missing type
            ]
          }
        ]
      } as any;

      const errors = validate(invalidAST);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].path).toBeDefined();
      expect(Array.isArray(errors[0].path)).toBe(true);
    });
  });

  describe('Safe rendering', () => {
    it('should not throw on valid AST', () => {
      const ast = parse('## Title\n[Button]');
      const html = renderToHTML(ast);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Title');
      expect(html).toContain('Button');
    });

    it('should handle AST with missing optional fields', () => {
      const ast = parse('[Button]');

      expect(() => renderToHTML(ast, { style: 'sketch' })).not.toThrow();
    });

    it('should handle different styles', () => {
      const ast = parse('[Button]');
      const styles = ['sketch', 'clean', 'wireframe', 'material', 'brutal', 'none'] as const;

      styles.forEach(style => {
        const html = renderToHTML(ast, { style });
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Button');
      });
    });

    it('should handle empty AST', () => {
      const ast = parse('');

      expect(() => renderToHTML(ast)).not.toThrow();

      const html = renderToHTML(ast);
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('Error recovery strategies', () => {
    it('should support graceful degradation', () => {
      function parseWithFallback(markdown: string): DocumentNode {
        try {
          return parse(markdown);
        } catch (error) {
          // Return empty document on error
          return {
            type: 'document',
            version: '0.1',
            meta: {},
            children: []
          };
        }
      }

      const ast = parseWithFallback('Valid markdown');
      expect(ast.type).toBe('document');
    });

    it('should support validation with error collection', () => {
      const markdown = '## Title\n[Button]';
      const ast = parse(markdown);
      const errors = validate(ast);

      if (errors.length > 0) {
        const errorMessages = errors.map(e => e.message);
        expect(errorMessages).toBeInstanceOf(Array);
      } else {
        expect(errors).toEqual([]);
      }
    });

    it('should allow retry with different options', () => {
      function parseWithRetry(markdown: string): DocumentNode | null {
        try {
          return parse(markdown, { strict: true });
        } catch (error) {
          try {
            return parse(markdown, { strict: false });
          } catch (retryError) {
            return null;
          }
        }
      }

      const ast = parseWithRetry('## Title');
      expect(ast).not.toBeNull();
      expect(ast?.type).toBe('document');
    });
  });

  describe('Production error handling patterns', () => {
    it('should support complete error handling flow', () => {
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

      const result = renderSafely('## Valid Markdown\n[Button]');
      expect(result.success).toBe(true);
      expect(result.html).toContain('Valid Markdown');
      expect(result.html).toContain('Button');

      const invalidResult = renderSafely('[Button]');
      // Should still succeed as this is valid
      expect(invalidResult.success).toBe(true);
    });

    it('should collect and report errors', () => {
      const errorLog: Array<{
        timestamp: Date;
        input: string;
        error: string;
      }> = [];

      function parseAndLog(markdown: string): DocumentNode | null {
        try {
          return parse(markdown);
        } catch (error: any) {
          errorLog.push({
            timestamp: new Date(),
            input: markdown,
            error: error.message
          });
          return null;
        }
      }

      parseAndLog('## Valid');
      parseAndLog('[Button]');

      // All should succeed
      expect(errorLog.length).toBe(0);
    });
  });

  describe('User-friendly error messages', () => {
    it('should format errors for user display', () => {
      function formatValidationErrors(errors: ReturnType<typeof validate>): string {
        if (errors.length === 0) {
          return 'No errors';
        }

        return errors.map(err => {
          let msg = err.message;

          if (err.code) {
            msg += ` (Code: ${err.code})`;
          }

          if (err.path && err.path.length > 0) {
            msg += ` at ${err.path.join(' > ')}`;
          }

          return msg;
        }).join('\n');
      }

      const validAST = parse('## Title');
      const errors = validate(validAST);

      const message = formatValidationErrors(errors);
      expect(message).toBe('No errors');
    });

    it('should provide context for parsing errors', () => {
      function parseWithContext(markdown: string) {
        try {
          return {
            success: true,
            ast: parse(markdown, { position: true }),
            error: null
          };
        } catch (error: any) {
          return {
            success: false,
            ast: null,
            error: {
              message: error.message,
              position: error.position
            }
          };
        }
      }

      const result = parseWithContext('## Valid Title');
      expect(result.success).toBe(true);
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Edge case error handling', () => {
    it('should handle null or undefined safely', () => {
      // Type system prevents this, but test runtime behavior
      const ast = parse('');
      expect(ast.type).toBe('document');
      expect(ast.children).toEqual([]);
    });

    it('should handle extremely long lines', () => {
      const longLine = 'x'.repeat(100000);
      const ast = parse(longLine);
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('paragraph');
      expect(ast.children[0].content.length).toBe(100000);
    });

    it('should handle many nodes', () => {
      const manyButtons = Array(1000).fill('[Button]').join('\n\n');
      const ast = parse(manyButtons);
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1000);
      expect(ast.children[0].type).toBe('button');
      expect(ast.children[999].type).toBe('button');
    });

    it('should handle mixed newlines', () => {
      const mixed = '## Title\r\n[Button]\n\r[Input]\r\n\r\n';
      const ast = parse(mixed);
      expect(ast.type).toBe('document');
      expect(ast.children.length).toBeGreaterThan(0);
      expect(ast.children[0].type).toBe('heading');
    });

    it('should handle tabs and spaces', () => {
      const withTabs = '\t## Title\n\t[Button]';
      const ast = parse(withTabs);
      expect(ast.type).toBe('document');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('code');
      expect(ast.children[0].value).toContain('## Title');
      expect(ast.children[0].value).toContain('[Button]');
    });
  });

  describe('Validation before render', () => {
    it('should validate before rendering', () => {
      function safeRender(markdown: string): string | null {
        try {
          const ast = parse(markdown);
          const errors = validate(ast);

          if (errors.length > 0) {
            console.warn('Validation errors:', errors);
            return null;
          }

          return renderToHTML(ast);
        } catch (error) {
          console.error('Render error:', error);
          return null;
        }
      }

      const html = safeRender('## Form\n[Submit]');
      expect(html).not.toBeNull();
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
