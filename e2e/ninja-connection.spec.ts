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
    await page.waitForURL('**/app/**', { timeout: 10000 });
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

  test('should allow creating and then editing a ninja connection', async ({ page }) => {
    await page.goto('/app/ninja-connection');

    // Step 1: Create initial connection
    const usernameInput = page.getByTestId('ninja-connection-form--username-input');
    const passwordInput = page.getByTestId('ninja-connection-form--password-input');
    const submitButton = page.getByTestId('ninja-connection-form--submit-button');

    await usernameInput.fill('initial.user@example.com');
    await passwordInput.fill('initialpassword123');
    await submitButton.click();

    // Wait for success message
    await expect(page.locator('text=Ninja account credentials saved successfully!')).toBeVisible();

    // Step 2: Verify fields are now read-only and Edit button is visible
    await expect(usernameInput).toBeDisabled();
    await expect(passwordInput).toBeDisabled();
    const editButton = page.getByTestId('ninja-connection-form--edit-button');
    await expect(editButton).toBeVisible();

    // Let the Zero-synced connection row land before interacting — the form
    // re-renders when it arrives, which can detach the button mid-click.
    await expect(usernameInput).toHaveValue('initial.user@example.com');

    // Step 3: Click Edit Credentials to enter edit mode
    await editButton.click();

    // Step 4: Verify fields are now editable
    await expect(usernameInput).not.toBeDisabled();
    await expect(passwordInput).not.toBeDisabled();

    // Update credentials
    await usernameInput.fill('updated.user@example.com');
    await passwordInput.fill('updatedpassword456');

    // Step 5: Submit the update
    const updateButton = page.getByRole('button', { name: 'Update Account' });
    await updateButton.click();

    // Step 6: Verify success and fields are updated
    await expect(page.locator('text=Ninja account credentials saved successfully!')).toBeVisible();
    
    // Wait for the form to switch back to view mode (edit button reappears)
    await expect(editButton).toBeVisible();
    
    // Now verify fields are disabled and have updated values
    await expect(usernameInput).toBeDisabled();
    await expect(passwordInput).toBeDisabled();
    await expect(usernameInput).toHaveValue('updated.user@example.com', { timeout: 10000 });
    await expect(passwordInput).toHaveValue('updatedpassword456', { timeout: 10000 });
  });

  test('should cancel edit mode and revert to original values', async ({ page }) => {
    await page.goto('/app/ninja-connection');

    // Step 1: Create initial connection
    const usernameInput = page.getByTestId('ninja-connection-form--username-input');
    const passwordInput = page.getByTestId('ninja-connection-form--password-input');
    const submitButton = page.getByTestId('ninja-connection-form--submit-button');

    await usernameInput.fill('original.user@example.com');
    await passwordInput.fill('originalpassword123');
    await submitButton.click();

    // Wait for success
    await expect(page.locator('text=Ninja account credentials saved successfully!')).toBeVisible();

    // Step 2: Enter edit mode
    const editButton = page.getByTestId('ninja-connection-form--edit-button');
    await editButton.click();

    // Step 3: Modify fields but don't save
    await usernameInput.fill('temporary.user@example.com');
    await passwordInput.fill('temporarypassword456');

    // Step 4: Click Cancel
    const cancelButton = page.getByTestId('ninja-connection-form--cancel-button');
    await cancelButton.click();

    // Step 5: Verify form reverted to read-only with original values
    await expect(usernameInput).toBeDisabled();
    await expect(passwordInput).toBeDisabled();
    await expect(editButton).toBeVisible();
    await expect(usernameInput).toHaveValue('original.user@example.com');
    await expect(passwordInput).toHaveValue('originalpassword123');
  });

  test('should show Test Credentials button and handle test results', async ({ page }) => {
    await page.goto('/app/ninja-connection');

    // Step 1: Create initial connection
    const usernameInput = page.getByTestId('ninja-connection-form--username-input');
    const passwordInput = page.getByTestId('ninja-connection-form--password-input');
    const submitButton = page.getByTestId('ninja-connection-form--submit-button');

    await usernameInput.fill('test.ninja@example.com');
    await passwordInput.fill('testninjapassword123');
    await submitButton.click();

    // Wait for success
    await expect(page.locator('text=Ninja account credentials saved successfully!')).toBeVisible();

    // Step 2: Verify Test Credentials button is visible
    const testButton = page.getByTestId('ninja-connection-form--test-button');
    await expect(testButton).toBeVisible();
    await expect(testButton).toContainText('Test Credentials');

    // Step 3: Click Test Credentials
    await testButton.click();

    // Step 4: Verify button shows loading state
    await expect(testButton).toContainText('Testing...');
    await expect(testButton).toBeDisabled();

    // Step 5: Wait for test result (either success or failure)
    // The test will likely fail since we're using fake credentials
    const resultAlert = page.locator('[role="alert"]').filter({ hasText: /Connection test/ });
    await expect(resultAlert).toBeVisible({ timeout: 30000 });

    // Step 6: Verify button returns to normal state
    await expect(testButton).toContainText('Test Credentials');
    await expect(testButton).not.toBeDisabled();
  });
});