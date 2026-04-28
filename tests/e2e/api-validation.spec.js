import { test, expect } from '@playwright/test';

test('POST /api/portail/{slug}/reserver avec body vide renvoie 400', async ({ request }) => {
  const res = await request.post('/api/portail/studio-test/reserver', {
    data: {},
  });
  expect(res.status()).toBe(400);
});

test('POST /api/portail/{slug}/reserver avec email invalide renvoie 400', async ({ request }) => {
  const res = await request.post('/api/portail/studio-test/reserver', {
    data: {
      coursId: 'not-a-uuid',
      nom: 'Test',
      email: 'pas-un-email',
    },
  });
  expect(res.status()).toBe(400);
});

test('POST /api/portail/{slug}/annuler sans presenceId renvoie 400', async ({ request }) => {
  const res = await request.post('/api/portail/studio-test/annuler', {
    data: {},
  });
  expect(res.status()).toBe(400);
});

test('POST /api/admin/users/update-plan sans auth renvoie 403', async ({ request }) => {
  const res = await request.post('/api/admin/users/update-plan', {
    data: { userId: '00000000-0000-0000-0000-000000000000', plan: 'pro' },
  });
  expect(res.status()).toBe(403);
});
