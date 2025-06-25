import { test, expect } from '@playwright/test';

test.describe('Dynamic Route Navigation', () => {
  test('flat dynamic route ($personId) works on reload', async ({ page }) => {
    // Navigate to a person detail page
    await page.goto('/app/person123');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we're not on a 404 page
    await expect(page.locator('text=Not found!')).not.toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Verify we're still not on a 404 page after reload
    await expect(page.locator('text=Not found!')).not.toBeVisible();
  });

  test('nested dynamic route (device/$deviceId) works on reload', async ({ page }) => {
    // Navigate to a device detail page
    await page.goto('/app/device/device123');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we're not on a 404 page
    await expect(page.locator('text=Not found!')).not.toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Verify we're still not on a 404 page after reload
    await expect(page.locator('text=Not found!')).not.toBeVisible();
    
    // Additionally, check for device-specific content
    await expect(page.locator('text=Device')).toBeVisible();
  });
});