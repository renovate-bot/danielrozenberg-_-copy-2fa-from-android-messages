import { extractCode } from './common/extract-code.ts';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

/**
 * Pinned conversations stay at the top of the list, and new messages land in
 * the first unpinned one below them. Older conversations further down are
 * skipped, since scrolling loads them in with unread codes that are stale.
 */
function findNewestConversations(): Element[] {
  const conversation = 'mws-conversations-list mws-conversation-list-item';
  const pinned = ':has([data-e2e-is-pinned="true"])';
  return [
    ...document.querySelectorAll(`${conversation}${pinned}`),
    document.querySelector(`${conversation}:not(${pinned})`),
  ].filter((element) => element !== null);
}

function readUnreadCode(
  conversation: Element,
): FoundTwoFactorAuthenticationCodePayload[] {
  const unreadMessage = conversation.querySelector('.text-content.unread');
  const sender = unreadMessage?.querySelector('.name')?.textContent;
  const fullMessage =
    unreadMessage?.querySelector('.snippet-text')?.textContent;
  const code = extractCode(fullMessage ?? '');
  return sender && fullMessage && code ? [{ code, sender, fullMessage }] : [];
}

function initMessageObserver() {
  console.log('Initializing MutationObserver to process incoming messages');
  // Stays undefined until the conversation list first renders, so codes
  // already on screen when the page loads are not copied.
  // shortcut: grows by one entry per new code, fine for a page session.
  let seenCodes: Set<string> | undefined;

  const checkNewestConversations = async () => {
    const conversations = findNewestConversations();
    if (conversations.length === 0) {
      return;
    }
    const payloads = conversations.flatMap(readUnreadCode);

    if (seenCodes === undefined) {
      seenCodes = new Set(payloads.map((payload) => payload.code));
      return;
    }
    for (const payload of payloads) {
      // Prevent repeats because `document` changes a lot.
      if (seenCodes.has(payload.code)) {
        continue;
      }
      seenCodes.add(payload.code);
      console.log('Found possible 2FA code. Payload:', payload);
      await browser.runtime.sendMessage(payload);
    }
  };

  new MutationObserver(checkNewestConversations).observe(document, {
    childList: true,
    subtree: true,
  });
  void checkNewestConversations();
}

console.log('Copy 2FA from Android Messages starting');
initMessageObserver();
