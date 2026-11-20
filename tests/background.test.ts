import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

let onMessage: (message: unknown) => Promise<void> = () => Promise.resolve();
let onInstalled: () => Promise<void> = () => Promise.resolve();
const events: string[] = [];

const writeText = mock.fn((text: string) => {
  events.push(`clipboard: ${text}`);
  return Promise.resolve();
});
const createNotification = mock.fn(
  (id: string, options: { title: string; message: string }) => {
    events.push(`notification: ${id} ${options.title} ${options.message}`);
    return Promise.resolve(id);
  },
);
const containsPermission = mock.fn<(permissions: unknown) => Promise<boolean>>(
  () => Promise.resolve(false),
);
const createTab = mock.fn<(options: unknown) => Promise<void>>(() =>
  Promise.resolve(),
);

Object.assign(globalThis, {
  browser: {
    runtime: {
      onMessage: {
        addListener: (listener: typeof onMessage) => {
          onMessage = listener;
        },
      },
      onInstalled: {
        addListener: (listener: typeof onInstalled) => {
          onInstalled = listener;
        },
      },
      getURL: (path: string) => `moz-extension://id/${path}`,
    },
    i18n: {
      getMessage: (key: string, substitutions: string[]) =>
        `${key}(${substitutions.join()})`,
    },
    notifications: { create: createNotification },
    permissions: { contains: containsPermission },
    tabs: { create: createTab },
  },
});
Object.defineProperty(navigator, 'clipboard', { value: { writeText } });
mock.method(console, 'error', () => undefined);

await import('../src/background.ts');

const payload: FoundTwoFactorAuthenticationCodePayload = {
  code: '123456',
  sender: 'Bank',
  fullMessage: 'Your code: 123456',
};

beforeEach(() => {
  events.length = 0;
  createNotification.mock.resetCalls();
  createTab.mock.resetCalls();
});

void test('copies the code, then shows a notification', async () => {
  await onMessage(payload);

  assert.deepEqual(events, [
    'clipboard: 123456',
    'notification: copy-2fa-from-android-messages notificationTitle(123456) Bank: Your code: 123456',
  ]);
});

void test('shows no notification when the clipboard write fails', async () => {
  writeText.mock.mockImplementationOnce(() =>
    Promise.reject(new Error('denied')),
  );

  await onMessage(payload);

  assert.equal(createNotification.mock.callCount(), 0);
});

void test('opens the welcome page when the host permission is missing', async () => {
  containsPermission.mock.mockImplementationOnce(() => Promise.resolve(false));

  await onInstalled();

  assert.deepEqual(createTab.mock.calls[0]?.arguments, [
    { active: true, url: 'moz-extension://id/welcome.html' },
  ]);
});

void test('opens nothing when the host permission is granted', async () => {
  containsPermission.mock.mockImplementationOnce(() => Promise.resolve(true));

  await onInstalled();

  assert.equal(createTab.mock.callCount(), 0);
});
