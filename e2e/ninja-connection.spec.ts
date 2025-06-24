import { test, expect } from '@playwright/test';

test.describe('Ninja Connection Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user first
    const uniqueEmail = `test-${Date.now()}-${Math.floor(Math.random()*100000)}@example.com`;
    const password = 'testpassword123';

    // Sign up
    await page.goto('/auth/signup');
    await page.getByTestId('signup-email').fill(uniqueEmail);
    await page.getByTestId('signup-password').fill(password);
    await page.getByTestId('signup-submit').click();
    await expect(page.getByTestId('signup-submit')).not.toBeVisible();

    // Login
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(uniqueEmail);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('/app', { timeout: 10000 });
  });

  test('should render ninja connection page with form and debug components', async ({ page }) => {
    // Navigate to ninja connection page
    await page.goto('/app/ninja-connection');

    // Check page title is rendered in the NavApp component
    await expect(page.getByTestId('ninja-connection--page-title')).toBeVisible();

    // Check form card is rendered with its title
    await expect(page.getByTestId('ninja-connection-form--card-title')).toBeVisible();

    // Check form is rendered - look for form elements by their test IDs
    await expect(page.getByTestId('ninja-connection-form--username-input')).toBeVisible();
    await expect(page.getByTestId('ninja-connection-form--password-input')).toBeVisible();

    // Check for submit button
    await expect(page.getByTestId('ninja-connection-form--submit-button')).toBeVisible();

    // Check debug component is rendered - it should show connection data
    // The debug component shows "Debug Information" as its title
    await expect(page.getByTestId('ninja-connection-debug--card-title')).toBeVisible();
  });

  test('should allow entering ninja credentials', async ({ page }) => {
    await page.goto('/app/ninja-connection');

    // Fill in the form using test IDs
    const usernameInput = page.getByTestId('ninja-connection-form--username-input');
    const passwordInput = page.getByTestId('ninja-connection-form--password-input');

    await usernameInput.fill('testuser@example.com');
    await passwordInput.fill('testpassword');

    // Verify values are entered
    await expect(usernameInput).toHaveValue('testuser@example.com');
    await expect(passwordInput).toHaveValue('testpassword');
  });
});