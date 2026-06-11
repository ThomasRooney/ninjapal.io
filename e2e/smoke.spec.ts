// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';
test('should load the homepage and display the main heading', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('/');

  // 2. Assert the main heading is visible
  // IMPORTANT: You will need to add data-testid="main-heading" to your header element.
  const heading = page.getByTestId('main-heading');
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText('Ninjapal');
});