/**
 * Tests for dev server functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { once } from 'events';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createConnection, type AddressInfo, type Socket } from 'net';
import { startServer, notifyReload, notifyError } from '../src/cli/server.js';

describe('Dev Server', () => {
  const TEST_OUTPUT = join(tmpdir(), `wiremd-test-${process.pid}-${Date.now()}.html`);
  let runtimeServer: ReturnType<typeof startServer> | null = null;
  let runtimeSocket: Socket | null = null;

  beforeEach(() => {
    writeFileSync(
      TEST_OUTPUT,
      '<html><body><h1>Test</h1></body></html>',
      'utf-8',
    );
  });

  afterEach(async () => {
    if (runtimeSocket) {
      const closePromise = once(runtimeSocket, 'close').catch(() => []);
      runtimeSocket.destroy();
      await Promise.race([
        closePromise,
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
      runtimeSocket = null;
    }

    if (runtimeServer?.listening) {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          runtimeServer?.close((error?: Error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 250)),
      ]);
    }
    runtimeServer = null;

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

    it('serves HTML with the live-reload client injected at runtime', async () => {
      const url = await startRuntimeServer(TEST_OUTPUT);
      const response = await fetch(url);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('<h1>Test</h1>');
      expect(html).toContain('wiremd-toolbar');
      expect(html).toContain('wiremd-error-overlay');
      expect(html).toContain('wiremd-reload-indicator');
      expect(html).toContain('wiremd-preview-wrapper');
      expect(html).toContain(`ws://localhost:${new URL(url).port}/__ws`);
    });

    it('returns 426 when the websocket endpoint is requested without upgrade', async () => {
      const url = await startRuntimeServer(TEST_OUTPUT);
      const response = await fetch(`${url}/__ws`);
      const body = await response.text();

      expect(response.status).toBe(426);
      expect(body).toContain('requires WebSocket upgrade');
    });

    it('returns 500 when the output file cannot be read', async () => {
      const missingOutput = join(tmpdir(), `wiremd-missing-${process.pid}-${Date.now()}.html`);
      const url = await startRuntimeServer(missingOutput);
      const response = await fetch(url);
      const body = await response.text();

      expect(response.status).toBe(500);
      expect(body).toContain(`Error reading file: ${missingOutput}`);
    });
  });

  describe('notifyReload', () => {
    it('should be a function', () => {
      expect(typeof notifyReload).toBe('function');
    });

    it('should not throw when called with no clients', () => {
      expect(() => notifyReload()).not.toThrow();
    });

    it('pushes a reload frame to connected websocket clients', async () => {
      await startRuntimeServer(TEST_OUTPUT);
      const socket = await openRuntimeWebSocket();
      const messagePromise = readTextFrame(socket);

      notifyReload();

      await expect(messagePromise).resolves.toBe('reload');
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

    it('pushes prefixed error frames to connected websocket clients', async () => {
      await startRuntimeServer(TEST_OUTPUT);
      const socket = await openRuntimeWebSocket();
      const messagePromise = readTextFrame(socket);

      notifyError('Parse failed');

      await expect(messagePromise).resolves.toBe('error:Parse failed');
    });
  });

  describe('Live-reload script injection', () => {
    it('injects toolbar, overlay, reload indicator, and viewport controls into served HTML', async () => {
      const html = await fetchInjectedHtml(TEST_OUTPUT);

      expect(html).toContain('wiremd-toolbar');
      expect(html).toContain('wiremd-error-overlay');
      expect(html).toContain('wiremd-reload-indicator');
      expect(html).toContain('wiremd-preview-wrapper');
      expect(html).toContain('data-viewport="full"');
      expect(html).toContain('data-viewport="laptop"');
      expect(html).toContain('data-viewport="tablet"');
      expect(html).toContain('data-viewport="mobile"');
      expect(html).toContain('⚡ Wiremd Live');
      expect(html).toContain('Connecting...');
    });

    it('injects runtime websocket, reload, error, and reconnection behavior into served HTML', async () => {
      const html = await fetchInjectedHtml(TEST_OUTPUT);

      expect(html).toContain('new WebSocket(');
      expect(html).toContain('onopen');
      expect(html).toContain('onmessage');
      expect(html).toContain('onclose');
      expect(html).toContain('showError');
      expect(html).toContain('reloadIndicator');
      expect(html).toContain('window.location.reload');
      expect(html).toContain('retryCount');
      expect(html).toContain('maxRetries');
      expect(html).toContain('setTimeout(connect, 1000)');
      expect(html).toContain('Lost connection to dev server');
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

  describe('Injected preview styling', () => {
    it('includes viewport, overlay, toolbar, and status styles in served HTML', async () => {
      const html = await fetchInjectedHtml(TEST_OUTPUT);

      expect(html).toContain('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
      expect(html).toContain('#wiremd-error-overlay');
      expect(html).toContain('position: fixed');
      expect(html).toContain('z-index: 10000');
      expect(html).toContain('status-dot');
      expect(html).toContain('@keyframes pulse');
      expect(html).toContain('viewport-mobile');
      expect(html).toContain('viewport-tablet');
      expect(html).toContain('viewport-laptop');
      expect(html).toContain('max-width: 375px');
      expect(html).toContain('max-width: 768px');
      expect(html).toContain('max-width: 1024px');
      expect(html).toContain('close-btn');
      expect(html).toContain('8000');
    });
  });

  async function startRuntimeServer(outputPath: string): Promise<string> {
    runtimeServer = startServer({
      port: 0,
      outputPath,
    });

    if (!runtimeServer.listening) {
      await once(runtimeServer, 'listening');
    }

    const address = runtimeServer.address() as AddressInfo | null;
    if (!address || typeof address !== 'object') {
      throw new Error('Runtime server did not expose an address');
    }

    return `http://127.0.0.1:${address.port}`;
  }

  async function fetchInjectedHtml(outputPath: string): Promise<string> {
    const url = await startRuntimeServer(outputPath);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    return response.text();
  }

  async function openRuntimeWebSocket(): Promise<Socket> {
    if (!runtimeServer) {
      throw new Error('Runtime server is not running');
    }

    const address = runtimeServer.address() as AddressInfo | null;
    if (!address || typeof address !== 'object') {
      throw new Error('Runtime server did not expose an address');
    }

    runtimeSocket = createConnection({
      host: '127.0.0.1',
      port: address.port,
    });

    await once(runtimeSocket, 'connect');

    runtimeSocket.write(
      `GET /__ws HTTP/1.1\r\n` +
      `Host: 127.0.0.1:${address.port}\r\n` +
      `Upgrade: websocket\r\n` +
      `Connection: Upgrade\r\n` +
      `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n` +
      `Sec-WebSocket-Version: 13\r\n\r\n`,
    );

    const [handshake] = await once(runtimeSocket, 'data');
    expect(Buffer.from(handshake).toString('utf-8')).toContain('101 Switching Protocols');

    return runtimeSocket;
  }

  async function readTextFrame(socket: Socket): Promise<string> {
    const [chunk] = await once(socket, 'data');
    const frame = Buffer.from(chunk);
    const payloadLength = frame[1] & 0x7f;
    return frame.subarray(2, 2 + payloadLength).toString('utf-8');
  }
});
