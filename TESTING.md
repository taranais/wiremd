# Testing Guide

Wiremd includes parser, renderer, CLI, conformance, playground, and VS Code extension coverage. The integration gate for merge work is broader than the default root `npm test` command.

## Test Overview

Current validated baselines:

- Root suite: 32 files / 635 tests with `WIREMD_TEST_SCOPE=full`
- Conformance suite: 8 files / 79 tests
- Playground suite: 8 files / 24 tests
- VS Code extension suite: 8 files / 64 tests

Important scope note:

- `npm test` runs the default focused Vitest scope from `vitest.config.ts`
- `npm run test:all` runs the full root suite and is the required root gate for merge validation

## Test Surfaces

- Root suite under `tests/`: parser, validation, renderers, CLI, server, integration, conformance, and API examples
- Playground suite under `playground/tests/`: browser playground shell, preview, editor, toolbar, splitter, Monaco integration
- VS Code extension suite under `vscode-extension/tests/`: extension activation, preview provider, language server, TextMate grammar, security coverage

### Suite Breakdown

- `tests/parser.test.ts`, `tests/edge-cases.test.ts`, `tests/error-handling.test.ts`
  Parser behavior, ambiguity handling, malformed input resilience, and regression coverage
- `tests/validation.test.ts`, `tests/validation-enhanced.test.ts`
  AST validation rules and enhanced diagnostics
- `tests/renderer.test.ts`, `tests/react-renderer.test.ts`, `tests/tailwind-renderer.test.ts`, `tests/angular-renderer.test.ts`, `tests/vue-renderer.test.ts`, `tests/svelte-renderer.test.ts`
  Renderer semantics and cross-render parity checks
- `tests/plugins.test.ts`, `tests/plugin-utils.test.ts`, `tests/render-routing.test.ts`, `tests/renderer-branches.test.ts`
  Plugin registration, routing, helper behavior, and renderer branch coverage
- `tests/cli-unit.test.ts`, `tests/cli.test.ts`, `tests/cli-file-not-found.test.ts`, `tests/server.test.ts`, `tests/integration.test.ts`
  CLI behavior, live preview server behavior, and watch/serve integration flow
- `tests/live-preview-client.test.ts`
  Injected live-preview client behavior with mocked DOM, WebSocket, and timer control
- `tests/api-examples.test.ts`, `tests/type-guards.test.ts`
  API contracts, examples, and runtime type checks
- `tests/conformance/*.test.ts`
  Syntax and AST contract coverage against `SYNTAX-SPEC-v0.2.md`

## Running Tests

### Run focused root tests
```bash
npm test
```

### Run full root suite
```bash
npm run test:all
```

### Run focused tests in watch mode
```bash
npm run test:watch
```

### Run full root suite in watch mode
```bash
npm run test:all:watch
```

### Run focused root tests with coverage
```bash
npm run test:coverage
```

### Run full root suite with coverage
```bash
npm run test:all:coverage
```

### Run specific test file
```bash
npm test -- tests/server.test.ts
```

### Run conformance suite (spec contract)
```bash
WIREMD_TEST_SCOPE=full npx vitest run tests/conformance --config vitest.config.ts
```

### Run one conformance file
```bash
WIREMD_TEST_SCOPE=full npx vitest run tests/conformance/03-containers.test.ts --config vitest.config.ts
```

### Run playground suite
```bash
npx vitest run --config playground/vitest.config.ts
```

### Run VS Code extension suite
```bash
cd vscode-extension && npm test
```

## Merge Gate

Use this full gate for merge work and release candidates:

```bash
npx tsc --noEmit
npm run test:all
npx vitest run --config playground/vitest.config.ts
cd vscode-extension && npm test
```

This is the documented integration bar for the merged surfaces tracked in `BRANCH-FEATURE-TRACEABILITY.md`.

## Test Coverage

### Dev Server Tests (server.test.ts)

Tests the enhanced dev server with live preview features:

- ✅ Server startup and configuration
- ✅ HTML file serving with script injection
- ✅ Live-reload script injection
- ✅ WebSocket connection handling
- ✅ Error notification system
- ✅ Reload notification system
- ✅ Viewport switcher UI
- ✅ Error overlay styling and behavior
- ✅ Connection status indicator
- ✅ Reconnection logic
- ✅ Toolbar UI components
- ✅ Preview wrapper functionality

### CLI Tests (cli.test.ts)

Tests the command-line interface:

- ✅ Help command display
- ✅ Version command
- ✅ File generation (HTML/JSON)
- ✅ All style options (sketch, clean, wireframe, material, tailwind, brutal, none)
- ✅ Format options validation
- ✅ Error handling and messages
- ✅ Output path handling
- ✅ Server integration
- ✅ Watch mode functionality
- ✅ Error notification integration
- ✅ Live reload integration
- ✅ Signal handling (SIGINT)
- ✅ Console output formatting

### Integration Tests (integration.test.ts)

Tests the CLI watch/serve integration path:

- ✅ Real CLI watch flow with mocked watcher and server seams
- ✅ Reload flow (file change → regenerate → notify)
- ✅ Error flow (file change → render failure → notify error)
- ✅ Tailwind live preview serving
- ✅ Default HTML output derivation for `--serve`
- ✅ Rejection of non-HTML preview renderers under `--serve`

### Conformance Tests (`tests/conformance/`)

Conformance tests validate that parser behavior matches `SYNTAX-SPEC-v0.2.md`, not accidental implementation details.

- ✅ Document contract (`01-document-structure.test.ts`)
- ✅ Components and ambiguity rules (`02-components.test.ts`)
- ✅ Containers and nesting (`03-containers.test.ts`)
- ✅ Layout semantics (`04-layouts.test.ts`)
- ✅ Attribute parsing rules (`05-attributes.test.ts`)
- ✅ Special patterns and states (`06-special-patterns.test.ts`)
- ✅ Native markdown semantics (`07-native-markdown.test.ts`)
- ✅ AST contract obligations (`08-ast-contracts.test.ts`)

Use these tests as a release gate for syntax/AST changes:

```bash
WIREMD_TEST_SCOPE=full npx vitest run tests/conformance --config vitest.config.ts
```

## Test Structure

### Unit Tests

Each component is tested in isolation:

```typescript
describe('Component', () => {
  it('should do something', () => {
    // Test implementation
  });
});
```

### Integration Tests

Tests verify that components work together:

```typescript
describe('Feature Integration', () => {
  it('should complete full workflow', () => {
    // Test end-to-end flow
  });
});
```

## Writing Tests

### Test Naming

Use descriptive test names:

```typescript
// ✅ Good
it('should inject viewport switcher buttons', () => {});

// ❌ Bad
it('test viewport', () => {});
```

### Test Structure

Follow Arrange-Act-Assert pattern:

```typescript
it('should handle error messages', () => {
  // Arrange
  const errorMessage = 'Parse failed';

  // Act
  notifyError(errorMessage);

  // Assert
  expect(/* result */).toBe(/* expected */);
});
```

### Async Tests

For async operations, use async/await:

```typescript
it('should start server', async () => {
  const result = await startServer({ port: 3000 });
  expect(result).toBeDefined();
});
```

## Continuous Integration

Tests run automatically on:
- Every commit
- Pull requests
- Before publishing

### CI Configuration

```yaml
# Example GitHub Actions workflow
- name: Type check
  run: npx tsc --noEmit

- name: Run full root suite
  run: npm run test:all

- name: Run playground suite
  run: npx vitest run --config playground/vitest.config.ts

- name: Run VS Code extension suite
  run: cd vscode-extension && npm test
```

## Coverage Goals

Current coverage targets:

- **Overall**: 80%+
- **Critical paths**: 100%
- **UI components**: 90%+
- **Error handling**: 100%

View coverage report:
```bash
npm run test:coverage
```

## Common Test Patterns

### Testing File Operations

```typescript
beforeEach(() => {
  writeFileSync('test.md', '# Test');
});

afterEach(() => {
  unlinkSync('test.md');
});
```

### Testing CLI Commands

```typescript
it('should generate output', () => {
  const result = execSync('node dist/cli/index.js input.md', {
    encoding: 'utf-8'
  });
  expect(result).toContain('Generated');
});
```

### Testing Served Or Generated Output

Prefer behavioral verification of runtime output over source inspection:

```typescript
it('should inject live preview UI into served HTML', async () => {
  const html = await fetchInjectedHtml(outputPath);
  expect(html).toContain('wiremd-toolbar');
});
```

## Debugging Tests

### Run single test

```bash
npm test -- -t "test name"
```

### Run with verbose output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run"],
  "console": "integratedTerminal"
}
```

## Test Utilities

### Mock Server

For testing server functionality without actual network:

```typescript
import { vi } from 'vitest';

vi.mock('http', () => ({
  createServer: vi.fn()
}));
```

### Temporary Files

Always clean up test files:

```typescript
afterEach(() => {
  try {
    unlinkSync(testFile);
  } catch (e) {
    // File may not exist
  }
});
```

## Performance Tests

Monitor test performance:

```bash
npm test -- --reporter=verbose
```

Slow tests (>1s) should be optimized or moved to integration suite.

## Future Test Plans

- [ ] E2E browser tests for live preview UI
- [ ] Performance benchmarks
- [ ] Stress tests for WebSocket connections
- [ ] Visual regression tests for rendered output
- [ ] Accessibility tests
- [ ] Cross-browser testing

## Contributing

When adding features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Add integration tests for new flows
4. Update this document
5. Maintain >80% coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Coverage Guide](https://istanbul.js.org/)

---

Current validated baseline for the root suite: `32 files / 635 tests` with `WIREMD_TEST_SCOPE=full`.
