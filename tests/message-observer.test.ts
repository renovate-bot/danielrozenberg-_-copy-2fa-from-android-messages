import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

function conversation(sender: string, text: string, unread: boolean) {
  return `
    <mws-conversation-list-item>
      <div class="text-content${unread ? ' unread' : ''}">
        <span class="name">${sender}</span>
        <span class="snippet-text">${text}</span>
      </div>
    </mws-conversation-list-item>`;
}

async function receive(html: string) {
  document
    .querySelector('mws-conversations-list')
    ?.insertAdjacentHTML('afterbegin', html);
  await setImmediate();
}

document.body.innerHTML = `
  <mws-conversations-list>
    ${conversation('Bank', 'Your code: 111111', true)}
  </mws-conversations-list>`;

const sendMessage = mock.fn<
  (payload: FoundTwoFactorAuthenticationCodePayload) => Promise<void>
>(() => Promise.resolve());
Object.assign(globalThis, { browser: { runtime: { sendMessage } } });
mock.method(console, 'log', () => undefined);

await import('../src/message-observer.ts');

// These tests share one page and run in order, like a real session.
void test('ignores a code already on screen when the page loads', async () => {
  await setImmediate();

  assert.equal(sendMessage.mock.callCount(), 0);
});

void test('sends a newly received code', async () => {
  await receive(conversation('Shop', 'Your code is: 222222', true));

  assert.deepEqual(
    sendMessage.mock.calls.map((call) => call.arguments),
    [[{ code: '222222', sender: 'Shop', fullMessage: 'Your code is: 222222' }]],
  );
});

void test('does not resend the code on unrelated page changes', async () => {
  document.body.append(document.createElement('div'));
  await setImmediate();

  assert.equal(sendMessage.mock.callCount(), 1);
});

void test('ignores read messages', async () => {
  await receive(conversation('Friend', 'Door code: 333333', false));

  assert.equal(sendMessage.mock.callCount(), 1);
});

void test('ignores messages without a code', async () => {
  await receive(conversation('Friend', 'See you: soon', true));

  assert.equal(sendMessage.mock.callCount(), 1);
});
