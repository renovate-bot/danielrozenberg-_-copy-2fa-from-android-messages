import { extractCode } from './common/extract-code.ts';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

function initMessageObserver() {
  console.log('Initializing MutationObserver to process incoming messages');
  // Stays undefined until the conversation list first renders, so a code
  // already on screen when the page loads is not copied.
  let lastFoundCode: string | undefined;

  const checkTopConversation = async () => {
    const topConversation = document.querySelector(
      'mws-conversations-list mws-conversation-list-item:first-of-type',
    );
    if (!topConversation) {
      return;
    }
    const unreadMessage = topConversation.querySelector('.text-content.unread');
    const sender = unreadMessage?.querySelector('.name')?.textContent;
    const fullMessage =
      unreadMessage?.querySelector('.snippet-text')?.textContent;
    const code = extractCode(fullMessage ?? '');

    if (lastFoundCode === undefined) {
      lastFoundCode = code ?? '';
      return;
    }
    // Prevent repeats because `document` changes a lot.
    if (!sender || !fullMessage || !code || code === lastFoundCode) {
      return;
    }
    lastFoundCode = code;

    const payload: FoundTwoFactorAuthenticationCodePayload = {
      code,
      sender,
      fullMessage,
    };
    console.log('Found possible 2FA code. Payload:', payload);
    await browser.runtime.sendMessage(payload);
  };

  new MutationObserver(checkTopConversation).observe(document, {
    childList: true,
    subtree: true,
  });
  void checkTopConversation();
}

console.log('Copy 2FA from Android Messages starting');
initMessageObserver();
