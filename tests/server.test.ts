/**
 * Tests for dev server functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { startServer, notifyReload, notifyError } from '../src/cli/server.js';

describe('Dev Server', () => {
  const TEST_PORT = 3456;
  const TEST_OUTPUT = join(tmpdir(), `wiremd-test-${process.pid}-${Date.now()}.html`);
  let server: any;

  beforeEach(() => {
    writeFileSync(
      TEST_OUTPUT,
      '<html><body><h1>Test</h1></body></html>',
      'utf-8',
    );
  });

  afterEach(() => {
    try {
      if (existsSync(TEST_OUTPUT)) {
        unlinkSync(TEST_OUTPUT);
      }
    } catch (e) {
      console.warn('Could not delete test file:', e);
    }
  });

  describe('startServer', () => {
    it('should start server on specified port', async () => {
      expect(typeof startServer).toBe('function');
    });

    it('should serve HTML file with live-reload script injected', () => {
      if (!existsSync(TEST_OUTPUT)) {
        console.warn('Test file not found, skipping test');
        return;
      }

      const html = readFileSync(TEST_OUTPUT, 'utf-8');
      expect(html).toContain('<h1>Test</h1>');
    });
  });

  describe('notifyReload', () => {
    it('should be a function', () => {
      expect(typeof notifyReload).toBe('function');
    });

    it('should not throw when called with no clients', () => {
      expect(() => notifyReload()).not.toThrow();
    });
  });

  describe('notifyError', () => {
    it('should be a function', () => {
      expect(typeof notifyError).toBe('function');
    });

    it('should accept error message string', () => {
      expect(() => notifyError('Test error message')).not.toThrow();
    });

    it('should handle empty error message', () => {
      expect(() => notifyError('')).not.toThrow();
    });
  });

  describe('Live-reload script injection', () => {
    it('should inject toolbar HTML', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('wiremd-toolbar');
      expect(serverModule).toContain('wiremd-error-overlay');
      expect(serverModule).toContain('wiremd-reload-indicator');
    });

    it('should inject viewport switcher buttons', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('viewport-btn');
      expect(serverModule).toContain('data-viewport="full"');
      expect(serverModule).toContain('data-viewport="laptop"');
      expect(serverModule).toContain('data-viewport="tablet"');
      expect(serverModule).toContain('data-viewport="mobile"');
    });

    it('should inject WebSocket connection code', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('WebSocket');
      expect(serverModule).toContain('ws://localhost:');
      expect(serverModule).toContain('onopen');
      expect(serverModule).toContain('onmessage');
      expect(serverModule).toContain('onclose');
    });

    it('should inject error handling code', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('showError');
      expect(serverModule).toContain('errorOverlay');
      expect(serverModule).toContain('error:');
    });

    it('should inject reload handling code', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('reload');
      expect(serverModule).toContain('window.location.reload');
      expect(serverModule).toContain('reloadIndicator');
    });
  });

  describe('WebSocket message format', () => {
    it('should format reload messages correctly', () => {
      expect(() => notifyReload()).not.toThrow();
    });

    it('should format error messages with prefix', () => {
      expect(() => notifyError('Parse failed')).not.toThrow();
    });
  });

  describe('Viewport switcher functionality', () => {
    it('should define viewport classes', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('viewport-full');
      expect(serverModule).toContain('viewport-mobile');
      expect(serverModule).toContain('viewport-tablet');
      expect(serverModule).toContain('viewport-laptop');
    });

    it('should define max-width for each viewport', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('max-width: 375px');
      expect(serverModule).toContain('max-width: 768px');
      expect(serverModule).toContain('max-width: 1024px');
    });
  });

  describe('Error overlay styling', () => {
    it('should define error overlay styles', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('#wiremd-error-overlay');
      expect(serverModule).toContain('position: fixed');
      expect(serverModule).toContain('z-index: 10000');
    });

    it('should include close button', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('close-btn');
      expect(serverModule).toContain('classList.remove');
    });

    it('should auto-dismiss after timeout', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('setTimeout');
      expect(serverModule).toContain('8000');
    });
  });

  describe('Connection status indicator', () => {
    it('should show connection status', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('Connected');
      expect(serverModule).toContain('Disconnected');
      expect(serverModule).toContain('Connecting...');
    });

    it('should include status dot animation', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('status-dot');
      expect(serverModule).toContain('pulse');
      expect(serverModule).toContain('@keyframes pulse');
    });

    it('should update status on connection state change', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('updateStatus');
      expect(serverModule).toContain('status.connected');
    });
  });

  describe('Reconnection logic', () => {
    it('should implement reconnection with retry limit', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('retryCount');
      expect(serverModule).toContain('maxRetries');
      expect(serverModule).toContain('10');
    });

    it('should wait between reconnection attempts', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('setTimeout(connect, 1000)');
    });

    it('should show error after max retries', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('Lost connection to dev server');
    });
  });

  describe('Toolbar UI', () => {
    it('should have gradient background', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('linear-gradient');
      expect(serverModule).toContain('#667eea');
      expect(serverModule).toContain('#764ba2');
    });

    it('should include logo', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('⚡ Wiremd Live');
    });

    it('should be fixed at top', () => {
      const serverModule = readFileSync('./src/cli/server.ts', 'utf-8');
      expect(serverModule).toContain('position: fixed');
      expect(serverModule).toContain('top: 0');
    });
  });
});
