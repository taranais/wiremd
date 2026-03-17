import { describe, expect, it } from 'vitest';
import vm from 'vm';
import { buildLiveReloadClientScript } from '../src/cli/server.js';

class FakeElement {
  id = '';
  className = '';
  dataset: Record<string, string> = {};
  textContent = '';
  innerHTML = '';
  parentElement: FakeElement | null = null;
  children: FakeElement[] = [];
  private listeners = new Map<string, Array<() => void>>();

  constructor(public readonly tagName: string) {}

  get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  get classList() {
    return {
      add: (...classes: string[]) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        classes.forEach((className) => current.add(className));
        this.className = Array.from(current).join(' ');
      },
      remove: (...classes: string[]) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        classes.forEach((className) => current.delete(className));
        this.className = Array.from(current).join(' ');
      },
      contains: (className: string) => this.className.split(/\s+/).filter(Boolean).includes(className),
    };
  }

  appendChild(child: FakeElement): FakeElement {
    if (child.parentElement) {
      const index = child.parentElement.children.indexOf(child);
      if (index >= 0) {
        child.parentElement.children.splice(index, 1);
      }
    }

    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type: string, handler: () => void): void {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  click(): void {
    for (const handler of this.listeners.get('click') ?? []) {
      handler();
    }
  }
}

interface TimerTask {
  delay: number;
  callback: () => void;
}

function createClientTestEnv() {
  const body = new FakeElement('body');
  const content = new FakeElement('main');
  content.id = 'wiremd-content';
  body.appendChild(content);

  const toolbar = new FakeElement('div');
  toolbar.id = 'wiremd-toolbar';

  const status = new FakeElement('div');
  status.id = 'wiremd-status';
  status.className = 'status';
  toolbar.appendChild(status);

  const fullButton = createViewportButton('full', true);
  const laptopButton = createViewportButton('laptop');
  const tabletButton = createViewportButton('tablet');
  const mobileButton = createViewportButton('mobile');
  toolbar.appendChild(fullButton);
  toolbar.appendChild(laptopButton);
  toolbar.appendChild(tabletButton);
  toolbar.appendChild(mobileButton);
  body.appendChild(toolbar);

  const errorOverlay = new FakeElement('div');
  errorOverlay.id = 'wiremd-error-overlay';
  const errorMessage = new FakeElement('div');
  errorMessage.id = 'wiremd-error-message';
  errorOverlay.appendChild(errorMessage);
  body.appendChild(errorOverlay);

  const reloadIndicator = new FakeElement('div');
  reloadIndicator.id = 'wiremd-reload-indicator';
  body.appendChild(reloadIndicator);

  const timers: TimerTask[] = [];
  const websocketInstances: FakeWebSocket[] = [];
  const windowErrorHandlers: Array<(event: any) => void> = [];
  let reloadCalls = 0;

  class FakeWebSocket {
    onopen?: () => void;
    onmessage?: (event: { data: string }) => void;
    onclose?: () => void;
    onerror?: () => void;

    constructor(public readonly url: string) {
      websocketInstances.push(this);
    }

    close(): void {
      this.onclose?.();
    }
  }

  const document = {
    body,
    createElement: (tagName: string) => new FakeElement(tagName),
    getElementById: (id: string) => findById(body, id),
    querySelectorAll: (selector: string) => {
      if (!selector.startsWith('.')) {
        return [];
      }

      return findByClass(body, selector.slice(1));
    },
  };

  const window = {
    location: {
      reload: () => {
        reloadCalls += 1;
      },
    },
    addEventListener: (type: string, handler: (event: any) => void) => {
      if (type === 'error') {
        windowErrorHandlers.push(handler);
      }
    },
  };

  const context = {
    document,
    window,
    WebSocket: FakeWebSocket,
    setTimeout: (callback: () => void, delay: number) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    console: {
      log: () => undefined,
      error: () => undefined,
    },
  };

  return {
    context,
    body,
    content,
    status,
    errorOverlay,
    errorMessage,
    reloadIndicator,
    buttons: {
      fullButton,
      laptopButton,
      tabletButton,
      mobileButton,
    },
    websocketInstances,
    windowErrorHandlers,
    get wrapper() {
      return findById(body, 'wiremd-preview-wrapper');
    },
    get reloadCalls() {
      return reloadCalls;
    },
    runTimers(delay: number) {
      const matching = timers.filter((task) => task.delay === delay);
      for (const task of matching) {
        task.callback();
      }

      for (let index = timers.length - 1; index >= 0; index -= 1) {
        if (timers[index].delay === delay) {
          timers.splice(index, 1);
        }
      }
    },
  };
}

function createViewportButton(viewport: string, active = false): FakeElement {
  const button = new FakeElement('button');
  button.className = active ? 'viewport-btn active' : 'viewport-btn';
  button.dataset.viewport = viewport;
  return button;
}

function findById(root: FakeElement, id: string): FakeElement | null {
  if (root.id === id) {
    return root;
  }

  for (const child of root.children) {
    const match = findById(child, id);
    if (match) {
      return match;
    }
  }

  return null;
}

function findByClass(root: FakeElement, className: string): FakeElement[] {
  const matches: FakeElement[] = [];

  if (root.className.split(/\s+/).filter(Boolean).includes(className)) {
    matches.push(root);
  }

  for (const child of root.children) {
    matches.push(...findByClass(child, className));
  }

  return matches;
}

describe('Live Preview Client', () => {
  it('wraps existing content and switches viewport classes through toolbar buttons', () => {
    const env = createClientTestEnv();
    vm.runInNewContext(buildLiveReloadClientScript(4321), env.context);

    expect(env.wrapper).not.toBeNull();
    expect(env.wrapper?.className).toBe('viewport-full');
    expect(env.wrapper?.children).toEqual([env.content]);
    expect(env.body.children.at(-1)).toBe(env.wrapper);

    env.buttons.mobileButton.click();

    expect(env.wrapper?.className).toBe('viewport-mobile');
    expect(env.buttons.mobileButton.classList.contains('active')).toBe(true);
    expect(env.buttons.fullButton.classList.contains('active')).toBe(false);
  });

  it('connects to the websocket endpoint, updates status, and reloads on reload messages', () => {
    const env = createClientTestEnv();
    vm.runInNewContext(buildLiveReloadClientScript(4321), env.context);

    expect(env.websocketInstances).toHaveLength(1);
    expect(env.websocketInstances[0].url).toBe('ws://localhost:4321/__ws');

    env.websocketInstances[0].onopen?.();
    expect(env.status.className).toBe('status connected');
    expect(env.status.innerHTML).toContain('Connected');

    env.websocketInstances[0].onmessage?.({ data: 'reload' });
    expect(env.reloadIndicator.classList.contains('show')).toBe(true);
    env.runTimers(300);
    expect(env.reloadCalls).toBe(1);
  });

  it('shows and later clears render errors from websocket error messages', () => {
    const env = createClientTestEnv();
    vm.runInNewContext(buildLiveReloadClientScript(4321), env.context);

    env.websocketInstances[0].onmessage?.({ data: 'error:Parse failed' });

    expect(env.errorMessage.textContent).toBe('Parse failed');
    expect(env.errorOverlay.classList.contains('show')).toBe(true);

    env.runTimers(8000);
    expect(env.errorOverlay.classList.contains('show')).toBe(false);
  });

  it('retries reconnects and eventually surfaces a fatal disconnect error', () => {
    const env = createClientTestEnv();
    vm.runInNewContext(buildLiveReloadClientScript(4321), env.context);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      env.websocketInstances.at(-1)?.onclose?.();
      env.runTimers(1000);
    }

    expect(env.websocketInstances).toHaveLength(11);

    env.websocketInstances.at(-1)?.onclose?.();

    expect(env.errorMessage.textContent).toBe('Lost connection to dev server. Please restart the server.');
    expect(env.errorOverlay.classList.contains('show')).toBe(true);
  });
});
