import { test, expect } from '@playwright/test';

test('GET /api/cron/expirations sans bearer renvoie 401', async ({ request }) => {
  const res = await request.get('/api/cron/expirations');
  expect(res.status()).toBe(401);
});

test('GET /api/cron/alertes sans bearer renvoie 401', async ({ request }) => {
  const res = await request.get('/api/cron/alertes');
  expect(res.status()).toBe(401);
});

test('GET /api/cron/expirations avec mauvais bearer renvoie 401', async ({ request }) => {
  const res = await request.get('/api/cron/expirations', {
    headers: { Authorization: 'Bearer wrong-secret' },
  });
  expect(res.status()).toBe(401);
});
