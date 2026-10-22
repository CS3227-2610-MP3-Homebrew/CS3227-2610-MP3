import { expect, test } from '@playwright/test';
import { history } from '../orders/fixtures';
import { setup, login, url, pageUrl, stored, malicious, localSql, q, submit, reviewResponse } from './fixtures';

// Labels are semantic constraints; the form may choose select or radio ratings.
async function enterRating(page: import('@playwright/test').Page, value: string) {
  const select = page.getByRole('combobox', { name: /rating/i });
  if (await select.count()) await select.selectOption(value);
  else {
    const radio = page.getByRole('radio', { name: new RegExp(`^${value}(?:\\s|$)`) });
    if (await radio.count()) await radio.check();
    else await page.getByRole('spinbutton', { name: /rating/i }).fill(value);
  }
}
test('CUS-05.1 CUS-05.8: My orders opens review form and renders submitted markup as inert text with no AI calls', async ({ page }) => {
  const f = setup(); const pending = history(f); const external: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.pathname.includes('/api/ai/')) external.push(r.url()); });
  await login(page.request, f.customer); await page.goto('/customer/orders');
  const link = page.locator(`a[href="${pageUrl(f.orderId)}"]`); await expect(link).toBeVisible();
  await expect(page.locator(`a[href="${pageUrl(pending)}"]`)).toHaveCount(0); await link.click();
  await expect(page.getByRole('heading', { name: /review/i }).first()).toBeVisible();
  await expect(page.getByText(f.orderId, { exact: false }).first()).toBeVisible();
  await enterRating(page, '5'); await page.getByRole('textbox', { name: /review|feedback|text/i }).fill(malicious);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === url(f.orderId) && r.request().method() === 'POST');
  await page.getByRole('button', { name: /submit.*review|post.*review/i }).click(); expect((await response).status()).toBe(201);
  // Reopening must show retained own content and cannot grant a second creation.
  await page.goto(pageUrl(f.orderId));
  await expect(page.getByText(malicious, { exact: false }).first()).toBeVisible();
  await expect(page.locator('img[src=x]')).toHaveCount(0); expect(await page.evaluate(() => Boolean((window as unknown as { reviewExecuted?: boolean }).reviewExecuted))).toBe(false);
  await expect(page.getByRole('button', { name: /submit.*review|post.*review/i })).toHaveCount(0);
  expect(stored(f.orderId)[0]).toMatchObject({ text: malicious, rating: 5 }); expect(external).toEqual([]);
});
test('CUS-05.10: invalid form values remain available for correction with safe accessible feedback', async ({ page }) => {
  const f = setup(); await login(page.request, f.customer); await page.goto(pageUrl(f.orderId));
  const textbox = page.getByRole('textbox', { name: /review|feedback|text/i });
  const input = '  \n \t  '; await enterRating(page, '4'); await textbox.fill(input);
  await page.getByRole('button', { name: /submit.*review|post.*review/i }).click();
  await expect(textbox).toHaveValue(input); await expect(page.getByRole('alert')).toContainText(/text|nonblank|non-blank|whitespace|1.*1,?000/i);
  expect(stored(f.orderId)).toEqual([]);
  await textbox.fill('Corrected feedback'); const response = page.waitForResponse(r => new URL(r.url()).pathname === url(f.orderId) && r.request().method() === 'POST');
  await page.getByRole('button', { name: /submit.*review|post.*review/i }).click(); expect((await response).status()).toBe(201);
  expect(stored(f.orderId)[0]).toMatchObject({ text: 'Corrected feedback', rating: 4 });
});
test('CUS-05.1: review form uses retained collected context after cafe suspension and menu deletion', async ({ page }) => {
  const f = setup(); localSql(`update public.cafes set suspended=true where id=${q(f.cafe)}; delete from public.menu_items where id=${q(f.item)};`);
  await login(page.request, f.customer); await page.goto(pageUrl(f.orderId));
  await expect(page.getByRole('heading', { name: /review/i }).first()).toBeVisible();
  await enterRating(page, '4'); await page.getByRole('textbox', { name: /review|feedback|text/i }).fill('Retained purchase feedback');
  const response = page.waitForResponse(r => new URL(r.url()).pathname === url(f.orderId) && r.request().method() === 'POST');
  await page.getByRole('button', { name: /submit.*review|post.*review/i }).click(); expect((await response).status()).toBe(201);
  expect(stored(f.orderId)).toHaveLength(1);
});
test('CUS-05.4: foreign form cannot disclose purchase or existing private review text', async ({ page }) => {
  const f = setup(); await login(page.request, f.customer); await reviewResponse(await submit(page.request, f.orderId));
  await page.request.post('/api/auth/sign-out', { headers: { origin: 'http://127.0.0.1:3100' }, data: {} });
  await login(page.request, f.reader); await page.goto(pageUrl(f.orderId));
  await expect(page.getByRole('button', { name: /submit.*review|post.*review/i })).toHaveCount(0);
  expect(await page.locator('body').textContent()).not.toContain(malicious); expect(await page.locator('body').textContent()).not.toContain(f.name);
});
