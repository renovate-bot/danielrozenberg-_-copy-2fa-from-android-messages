import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { ANDROID_MESSAGES_HOST_PERMISSION } from '../src/common/host-permission.ts';

const manifest = JSON.parse(
  await readFile(new URL('../static/manifest.json', import.meta.url), 'utf8'),
) as { host_permissions: string[]; content_scripts: { matches: string[] }[] };

void test('matches the manifest host permissions', () => {
  assert.deepEqual(
    ANDROID_MESSAGES_HOST_PERMISSION.origins,
    manifest.host_permissions,
  );
});

void test('covers every page the content script runs on', () => {
  assert.deepEqual(
    ANDROID_MESSAGES_HOST_PERMISSION.origins,
    manifest.content_scripts.flatMap((script) => script.matches),
  );
});
