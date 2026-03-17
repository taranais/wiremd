import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const integrationMocks = vi.hoisted(() => {
  const state = {
    handlers: new Map<string, (path: string) => void>(),
    watchPaths: [] as string[],
    watchOptions: undefined as Record<string, unknown> | undefined,
    watcher: null as {
      on: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    } | null,
  };

  const createWatcher = () => {
    state.handlers = new Map();
    const watcher = {
      on: vi.fn((event: string, handler: (path: string) => void) => {
        state.handlers.set(event, handler);
        return watcher;
      }),
      close: vi.fn(() => Promise.resolve()),
    };
    state.watcher = watcher;
    return watcher;
  };

  return {
    state,
    reset() {
      state.handlers = new Map();
      state.watchPaths = [];
      state.watchOptions = undefined;
      state.watcher = null;
    },
    chokidarWatch: vi.fn((paths: string[], options: Record<string, unknown>) => {
      state.watchPaths = [...paths];
      state.watchOptions = options;
      return createWatcher();
    }),
    startServer: vi.fn(),
    notifyReload: vi.fn(),
    notifyError: vi.fn(),
  };
});

vi.mock('chokidar', () => ({
  default: {
    watch: integrationMocks.chokidarWatch,
  },
}));

vi.mock('../src/cli/server.js', () => ({
  startServer: integrationMocks.startServer,
  notifyReload: integrationMocks.notifyReload,
  notifyError: integrationMocks.notifyError,
}));

import { main } from '../src/cli/index.js';

describe('Live Preview Integration', () => {
  const TEST_DIR = './tests/.artifacts/integration';
  const TEST_INPUT = join(TEST_DIR, 'input.md');
  const TEST_OUTPUT = join(TEST_DIR, 'output.html');
  const DEFAULT_OUTPUT = join(TEST_DIR, 'input.html');

  beforeEach(() => {
    integrationMocks.reset();
    integrationMocks.startServer.mockReset();
    integrationMocks.notifyReload.mockReset();
    integrationMocks.notifyError.mockReset();

    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_INPUT, '# Integration Test\n\n[Submit]*\n', 'utf-8');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('CLI watch/serve behavior', () => {
    it('starts the dev server and watcher from the real CLI flow', async () => {
      const result = await runMain([TEST_INPUT, '--watch', '--serve', '3000', '-o', TEST_OUTPUT]);

      expect(result.exitCode).toBeNull();
      expect(existsSync(TEST_OUTPUT)).toBe(true);
      expect(integrationMocks.startServer).toHaveBeenCalledWith({
        port: 3000,
        outputPath: TEST_OUTPUT,
      });
      expect(integrationMocks.state.watchPaths).toEqual([
        TEST_INPUT,
        join(dirname(TEST_INPUT), '**/*.md'),
      ]);
      expect(integrationMocks.state.watchOptions).toEqual(expect.objectContaining({
        persistent: true,
        ignoreInitial: true,
      }));
    });

    it('uses custom watch and ignore patterns through chokidar', async () => {
      const result = await runMain([
        TEST_INPUT,
        '--watch',
        '--watch-pattern',
        'docs/**/*.md',
        '--ignore',
        '**/*.tmp',
        '-o',
        TEST_OUTPUT,
      ]);

      expect(result.exitCode).toBeNull();
      expect(integrationMocks.state.watchPaths).toEqual(['docs/**/*.md']);
      expect(integrationMocks.state.watchOptions).toEqual(expect.objectContaining({
        ignored: expect.arrayContaining([
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.tmp',
        ]),
      }));
    });

    it('regenerates output and notifies reload on watched changes when serve is enabled', async () => {
      const result = await runMain([TEST_INPUT, '--watch', '--serve', '3000', '-o', TEST_OUTPUT]);

      expect(result.exitCode).toBeNull();
      writeFileSync(TEST_INPUT, '# Changed\n\n[Save]*\n', 'utf-8');

      await triggerWatchEvent('change', TEST_INPUT);

      expect(integrationMocks.notifyReload).toHaveBeenCalledTimes(1);
      expect(readFileSync(TEST_OUTPUT, 'utf-8')).toContain('Changed');
      expect(readFileSync(TEST_OUTPUT, 'utf-8')).toContain('Save');
    });

    it('notifies render errors on watched changes when regeneration fails under serve', async () => {
      const result = await runMain([TEST_INPUT, '--watch', '--serve', '3000', '-o', TEST_OUTPUT]);

      expect(result.exitCode).toBeNull();
      unlinkSync(TEST_INPUT);
      mkdirSync(TEST_INPUT, { recursive: true });

      await triggerWatchEvent('change', TEST_INPUT);

      expect(integrationMocks.notifyError).toHaveBeenCalledTimes(1);
      expect(integrationMocks.notifyError.mock.calls[0][0]).toEqual(expect.any(String));
      expect(integrationMocks.notifyReload).not.toHaveBeenCalled();
    });

    it('supports live preview for tailwind output', async () => {
      const result = await runMain([TEST_INPUT, '--watch', '--serve', '3000', '--format', 'tailwind', '-o', TEST_OUTPUT]);

      expect(result.exitCode).toBeNull();
      expect(integrationMocks.startServer).toHaveBeenCalledWith({
        port: 3000,
        outputPath: TEST_OUTPUT,
      });
      expect(readFileSync(TEST_OUTPUT, 'utf-8')).toContain('tailwindcss');
      expect(readFileSync(TEST_OUTPUT, 'utf-8')).toContain('Submit');
    });

    it('derives a default HTML output path when serving without -o', async () => {
      const result = await runMain([TEST_INPUT, '--watch', '--serve', '3000']);

      expect(result.exitCode).toBeNull();
      expect(existsSync(DEFAULT_OUTPUT)).toBe(true);
      expect(integrationMocks.startServer).toHaveBeenCalledWith({
        port: 3000,
        outputPath: DEFAULT_OUTPUT,
      });
    });

    it('rejects --serve for renderers that do not produce HTML preview output', async () => {
      await expect(
        runMain([TEST_INPUT, '--watch', '--serve', '3000', '--format', 'react', '--output-dir', join(TEST_DIR, 'react-out')]),
      ).rejects.toThrow('--serve currently supports only html and tailwind outputs.');
    });
  });
});

async function runMain(args: string[]) {
  const logs: string[] = [];
  const errors: string[] = [];
  const originalArgv = [...process.argv];

  const logSpy = vi.spyOn(console, 'log').mockImplementation((...values) => {
    logs.push(values.map(String).join(' '));
  });
  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...values) => {
    errors.push(values.map(String).join(' '));
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`__EXIT__${code ?? 0}`);
  }) as never);
  const processOnSpy = vi.spyOn(process, 'on').mockImplementation((() => process) as never);

  process.argv = ['node', 'dist/cli/index.js', ...args];

  try {
    await main();
    return { logs, errors, exitCode: null as number | null };
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('__EXIT__')) {
      return {
        logs,
        errors,
        exitCode: Number(error.message.replace('__EXIT__', '')),
      };
    }
    throw error;
  } finally {
    process.argv = originalArgv;
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    processOnSpy.mockRestore();
  }
}

async function triggerWatchEvent(event: string, filePath: string): Promise<void> {
  const handler = integrationMocks.state.handlers.get(event);
  if (!handler) {
    throw new Error(`Missing watcher handler for ${event}`);
  }

  handler(filePath);
  await new Promise((resolve) => setTimeout(resolve, 50));
}
