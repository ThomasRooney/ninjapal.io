import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should create a new account', async ({ page }) => {
    // Generate unique email for this test
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'testpassword123';

    // Navigate to signup page
    await page.goto('/auth/signup');

    // Fill in the signup form
    await page.getByTestId('signup-email').fill(uniqueEmail);
    await page.getByTestId('signup-password').fill(password);

    // Submit the form
    await page.getByTestId('signup-submit').click();

    // Wait for the form to be replaced with success message
    // The form should disappear and success message should appear
    await expect(page.getByTestId('signup-submit')).not.toBeVisible();
    await expect(page.getByText('Check your email for the confirmation link.')).toBeVisible();
  });

  test('should login with existing account', async ({ page }) => {
    // First create a user by signing up
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'testpassword123';

    // Sign up first
    await page.goto('/auth/signup');
    
    await page.getByTestId('signup-email').fill(uniqueEmail);
    await page.getByTestId('signup-password').fill(password);
    await page.getByTestId('signup-submit').click();
    
    // Wait for success message - form should be hidden
    await expect(page.getByTestId('signup-submit')).not.toBeVisible();
    await expect(page.getByText('Check your email for the confirmation link.')).toBeVisible();

    // Now go to login page
    await page.goto('/auth/login');

    // Fill in the login form
    await page.getByTestId('login-email').fill(uniqueEmail);
    await page.getByTestId('login-password').fill(password);

    // Submit the form
    await page.getByTestId('login-submit').click();

    // Should redirect to /app
    await page.waitForURL('/app', { timeout: 10000 });
    expect(page.url()).toContain('/app');
  });
});