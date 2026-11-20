import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

function conversation(
  sender: string,
  text: string,
  { unread = false, pinned = false } = {},
) {
  return `
    <div class="conv-container">
      <mws-conversation-list-item>
        <a class="list-item" data-e2e-is-pinned="${String(pinned)}">
          <div class="text-content${unread ? ' unread' : ''}">
            <span class="name">${sender}</span>
            <span class="snippet-text">${text}</span>
          </div>
        </a>
      </mws-conversation-list-item>
    </div>`;
}

function containers() {
  return [...document.querySelectorAll('.conv-container')];
}

async function settle() {
  await setImmediate();
}

/** Adds a conversation below the pinned ones, where new messages land. */
async function receive(html: string) {
  containers()
    .find(
      (container) => !container.querySelector('[data-e2e-is-pinned="true"]'),
    )
    ?.insertAdjacentHTML('beforebegin', html);
  await settle();
}

function sentCodes() {
  return sendMessage.mock.calls.map((call) => call.arguments[0].code);
}

document.body.innerHTML = `
  <mws-conversations-list>
    ${conversation('Mom', 'Dinner at: 1900', { pinned: true })}
    ${conversation('Work', 'Badge: 4321', { unread: true, pinned: true })}
    ${conversation('Bank', 'Your code: 111111', { unread: true })}
    ${conversation('Shop', 'Your code: 999999', { unread: true })}
  </mws-conversations-list>`;

const sendMessage = mock.fn<
  (payload: FoundTwoFactorAuthenticationCodePayload) => Promise<void>
>(() => Promise.resolve());
Object.assign(globalThis, { browser: { runtime: { sendMessage } } });
mock.method(console, 'log', () => undefined);

await import('../src/message-observer.ts');

// These tests share one page and run in order, like a real session.
void test('ignores codes already on screen when the page loads', async () => {
  await settle();

  assert.deepEqual(sentCodes(), []);
});

void test('sends a newly received code below pinned conversations', async () => {
  await receive(conversation('Shop', 'Your code is: 222222', { unread: true }));

  assert.deepEqual(
    sendMessage.mock.calls.map((call) => call.arguments),
    [[{ code: '222222', sender: 'Shop', fullMessage: 'Your code is: 222222' }]],
  );
});

void test('does not resend codes on unrelated page changes', async () => {
  document.body.append(document.createElement('div'));
  await settle();

  assert.deepEqual(sentCodes(), ['222222']);
});

void test('ignores read messages', async () => {
  await receive(conversation('Friend', 'Door code: 333333'));

  assert.deepEqual(sentCodes(), ['222222']);
});

void test('ignores messages without a code', async () => {
  await receive(conversation('Friend', 'See you: soon', { unread: true }));

  assert.deepEqual(sentCodes(), ['222222']);
});

void test('sends a code received in a pinned conversation', async () => {
  containers()[0]?.insertAdjacentHTML(
    'afterend',
    conversation('Mom', 'Your code: 444444', {
      unread: true,
      pinned: true,
    }),
  );
  await settle();

  assert.deepEqual(sentCodes(), ['222222', '444444']);
});

void test('ignores older conversations loaded by scrolling', async () => {
  document
    .querySelector('mws-conversations-list')
    ?.insertAdjacentHTML(
      'beforeend',
      conversation('Old', 'Your code: 555555', { unread: true }),
    );
  await settle();

  assert.deepEqual(sentCodes(), ['222222', '444444']);
});
