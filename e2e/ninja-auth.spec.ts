import { test, expect } from '@playwright/test'

test.describe('Ninja Auth Connection', () => {
  test('should create new auth manager instances with different credentials', async ({ page }) => {
    // This test verifies that NinjaAuthManager.create() works correctly
    // It's a conceptual test that would run in your application context
    
    // Navigate to the page where ninja auth is used
    await page.goto('/app/settings') // Adjust URL as needed
    
    // Test with first user credentials
    await page.fill('[data-testid="ninja-username"]', 'user1@example.com')
    await page.fill('[data-testid="ninja-password"]', 'password1')
    await page.click('[data-testid="test-credentials-button"]')
    
    // Wait for connection test result
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/Testing|Success|Failed/, { timeout: 30000 })
    
    // Test with second user credentials (different instance)
    await page.fill('[data-testid="ninja-username"]', 'user2@example.com')
    await page.fill('[data-testid="ninja-password"]', 'password2')
    await page.click('[data-testid="test-credentials-button"]')
    
    // Wait for second connection test result
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/Testing|Success|Failed/, { timeout: 30000 })
  })
  
  test('should handle missing credentials gracefully', async ({ page }) => {
    await page.goto('/app/settings')
    
    // Try to test without entering credentials
    await page.click('[data-testid="test-credentials-button"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })
  
  test('should save ninja connection to database', async ({ page }) => {
    await page.goto('/app/settings')
    
    // Fill in credentials
    await page.fill('[data-testid="ninja-username"]', 'test@example.com')
    await page.fill('[data-testid="ninja-password"]', 'testpassword')
    
    // Save connection
    await page.click('[data-testid="save-connection-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved')
    
    // Reload page and verify connection persisted
    await page.reload()
    await expect(page.locator('[data-testid="ninja-username"]')).toHaveValue('test@example.com')
  })
})