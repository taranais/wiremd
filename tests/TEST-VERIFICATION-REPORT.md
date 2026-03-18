# Test Verification Report

Date: 2026-03-17
Branch: `develop`
Scope: root suite under `tests/`

## Current Baseline

- Root inventory: `32` files
- Executed tests: `635`
- Result: all green when runtime socket tests run outside sandbox

## What Tests Prove

- Parser and validation behavior, including edge/error scenarios.
- Conformance coverage aligned to `SYNTAX-SPEC-v0.2.md`.
- Renderer behavior across HTML/React/Tailwind and framework renderers.
- Runtime dev-server + websocket behavior.
- Injected live-preview client behavior via VM execution.
- CLI integration flow for watch/serve regeneration and notifications.

## Remaining Gaps

- Real browser-engine end-to-end verification of live-preview runtime behavior.
- Ongoing guardrail required to keep docs/spec/tests synchronized as syntax evolves.

## Fixture Assessment

- Fixture dependence has been reduced.
- Framework default artifact coverage is parse-driven.
- Residual handcrafted coverage is focused on:
  - targeted direct-AST seeded-default compatibility
  - low-level renderer alternate branches not representable in canonical markdown

## Verification Commands

```bash
npx tsc --noEmit
npm run test:all
npx vitest run --config playground/vitest.config.ts
cd vscode-extension && npm test
```

