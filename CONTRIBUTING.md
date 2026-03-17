# Contributing to wiremd

Thank you for your interest in contributing to wiremd! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Code samples** or markdown examples
- **Environment details** (Node version, OS, etc.)
- **Error messages** or screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why would this be useful?
- **Proposed solution** if you have one
- **Examples** of how it would work

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the development setup** below
3. **Make your changes** following our coding standards
4. **Add tests** for any new functionality
5. **Update documentation** as needed
6. **Ensure the full validation gate passes**
7. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/wiremd.git
cd wiremd

# Install dependencies
npm install

# Run the full root suite
npm run test:all

# Run focused tests in watch mode
npm run test:watch

# Build the project
npm run build

# Type check
npm run typecheck

# Run linter
npm run lint
```

### Project Structure

```
wiremd/
├── src/
│   ├── parser/              # Markdown + wiremd syntax parser
│   │   ├── index.ts         # Main parser entry
│   │   ├── transformer.ts   # MDAST to wiremd AST
│   │   ├── remark-containers.ts        # ::: syntax plugin
│   │   └── remark-inline-containers.ts # [[...]] syntax plugin
│   ├── renderer/            # HTML/JSON renderer
│   │   ├── index.ts         # Main renderer entry
│   │   ├── html-renderer.ts # Component HTML generation
│   │   └── styles.ts        # Visual styles
│   ├── cli/                 # CLI tool
│   ├── types.ts             # TypeScript types
│   └── index.ts             # Library entry point
├── tests/                   # Test suite
└── examples/                # Example wireframes
```

## Coding Standards

### TypeScript

- Use **TypeScript strict mode**
- Add **JSDoc comments** for all exported functions
- Use **discriminated unions** for type safety
- Prefer **named exports** over default exports

### Testing

- Write **unit tests** for new functions
- Maintain or improve **test coverage**
- Use **descriptive test names**
- Test edge cases and error conditions

### Code Style

- Use **Prettier** for formatting (if configured)
- Follow existing code patterns
- Keep functions **small and focused**
- Use **meaningful variable names**

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build process or tooling changes

Examples:
```
feat(parser): add support for table components
fix(renderer): correct button style rendering
docs(readme): update installation instructions
test(parser): add tests for nested containers
```

## Testing Guidelines

### Running Tests

```bash
# Focused root suite
npm test

# Full root suite
npm run test:all

# Focused root suite with coverage
npm run test:coverage

# Full root suite with coverage
npm run test:all:coverage

# Run specific test file
npm test -- tests/parser.test.ts

# Watch mode
npm run test:watch

# Conformance suite
WIREMD_TEST_SCOPE=full npx vitest run tests/conformance --config vitest.config.ts

# Playground suite
npx vitest run --config playground/vitest.config.ts

# VS Code extension suite
cd vscode-extension && npm test
```

### Integration Gate

`npm test` is not the merge gate. It runs the default focused root scope from `vitest.config.ts`.

For merge work, syntax changes, parser/render changes, or release candidates, use:

```bash
npx tsc --noEmit
npm run test:all
npx vitest run --config playground/vitest.config.ts
cd vscode-extension && npm test
```

Keep [BRANCH-FEATURE-TRACEABILITY.md](./BRANCH-FEATURE-TRACEABILITY.md) current when merged feature surfaces, owning files, or mandatory validation changes.

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';

describe('Feature Name', () => {
  it('should handle basic case', () => {
    const input = '## Heading';
    const result = parse(input);
    expect(result).toBeDefined();
  });

  it('should handle edge case', () => {
    // Test edge cases
  });

  it('should throw error for invalid input', () => {
    expect(() => parse('')).toThrow();
  });
});
```

## Release Process

Releases are managed by project maintainers following semantic versioning (semver):

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes

### Release Checklist (Maintainers)

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Run `npm run build` and verify
4. Run the full validation gate and verify:
   `npx tsc --noEmit`
   `npm run test:all`
   `npx vitest run --config playground/vitest.config.ts`
   `cd vscode-extension && npm test`
5. Commit: `chore: release v0.x.x`
6. Create git tag: `git tag v0.x.x`
7. Push: `git push && git push --tags`
8. Publish to npm: `npm publish`
9. Create GitHub release with changelog

## Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Update SYNTAX-SPEC-v0.2.md for current syntax changes and keep `SYNTAX-SPEC-v0.1.md` as the historical baseline
- Add JSDoc comments for API changes
- Update examples/ for new features
- Create docs/ pages for major features
- Update [BRANCH-FEATURE-TRACEABILITY.md](./BRANCH-FEATURE-TRACEABILITY.md) when merged feature surfaces, owning files, or mandatory validation change

### Documentation Standards

- Use **clear, concise language**
- Include **code examples**
- Show **input and output** for parsers/renderers
- Link to related documentation
- Keep documentation **up-to-date** with code

### Rollback Guidance

For post-merge regressions:

- Revert only the stabilization commit or follow-up commit that introduced the regression when the scope is isolated
- Prefer a targeted patch for one renderer, parser rule, or integration surface over unwinding the merge sequence
- Do not revert the full branch merge history unless the regression cannot be isolated
- Re-run the full validation gate after any rollback or hotfix candidate

## Getting Help

- **Documentation**: Check README.md, `SYNTAX-SPEC-v0.2.md`, [BRANCH-FEATURE-TRACEABILITY.md](./BRANCH-FEATURE-TRACEABILITY.md), and any historical compatibility notes in `SYNTAX-SPEC-v0.1.md`
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Chat**: (Add Discord/Slack link if available)

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- CHANGELOG.md for significant contributions
- README.md credits section (for major contributions)

## License

By contributing to wiremd, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to wiremd! 🎉
