import { ANDROID_MESSAGES_HOST_PERMISSION } from './common/host-permission';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

browser.runtime.onMessage.addListener(async (_message: unknown) => {
  const message = _message as FoundTwoFactorAuthenticationCodePayload;
  try {
    await browser.notifications.create('copy-2fa-from-android-messages', {
      type: 'basic',
      title: browser.i18n.getMessage('notificationTitle', [message.code]),
      message: `${message.sender}: ${message.fullMessage}`,
      iconUrl: browser.runtime.getURL('icons/logo.svg'),
    });
    await navigator.clipboard.writeText(message.code);
  } catch (e) {
    console.error(e);
  }
});

browser.runtime.onInstalled.addListener(async () => {
  if (!(await browser.permissions.contains(ANDROID_MESSAGES_HOST_PERMISSION))) {
    await browser.tabs.create({
      active: true,
      url: browser.runtime.getURL('welcome.html'),
    });
  }
});
