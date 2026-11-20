import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beforeEach, mock, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

import { ANDROID_MESSAGES_HOST_PERMISSION } from '../src/common/host-permission.ts';

GlobalRegistrator.register();

const messages = JSON.parse(
  await readFile(
    new URL('../static/_locales/en/messages.json', import.meta.url),
    'utf8',
  ),
) as Partial<Record<string, { message: string }>>;
const page = new DOMParser().parseFromString(
  await readFile(new URL('../static/welcome.html', import.meta.url), 'utf8'),
  'text/html',
);
page.querySelector('script')?.remove();
document.head.innerHTML = page.head.innerHTML;
document.body.innerHTML = page.body.innerHTML;

const requestPermission = mock.fn<(permissions: unknown) => Promise<boolean>>(
  () => Promise.resolve(true),
);
Object.assign(globalThis, {
  browser: {
    i18n: { getMessage: (key: string) => messages[key]?.message ?? '' },
    permissions: { request: requestPermission },
  },
});
const close = mock.method(window, 'close', () => undefined);

await import('../src/welcome.ts');

beforeEach(() => {
  close.mock.resetCalls();
});

void test('fills every translated element', () => {
  const elements = document.querySelectorAll('[data-i18n-id]');

  assert.ok(elements.length > 0);
  for (const element of elements) {
    assert.notEqual(element.textContent, '', element.outerHTML);
  }
});

void test('closes the tab once the permission is granted', async () => {
  document.getElementById('grant')?.click();
  await setImmediate();

  assert.deepEqual(requestPermission.mock.calls.at(-1)?.arguments, [
    ANDROID_MESSAGES_HOST_PERMISSION,
  ]);
  assert.equal(close.mock.callCount(), 1);
});

void test('stays open when the permission is denied', async () => {
  requestPermission.mock.mockImplementationOnce(() => Promise.resolve(false));

  document.getElementById('grant')?.click();
  await setImmediate();

  assert.equal(close.mock.callCount(), 0);
});
