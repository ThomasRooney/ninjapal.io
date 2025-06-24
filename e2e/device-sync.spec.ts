import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Device Sync Property Deduplication', () => {
  let uniqueEmail: string;
  const password = 'testpassword123';

  test.beforeEach(async ({ page }) => {
    // Create unique test user
    uniqueEmail = `test-${Date.now()}-${Math.floor(Math.random()*100000)}@example.com`;

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

  test('should not duplicate mapped properties in additionalDeviceProperties', async ({ page }) => {
    // Navigate to device status page
    await page.goto('/app/status');
    
    // Wait for the page to load
    await expect(page.getByTestId('app-nav')).toBeVisible();
    
    // Mock the Ninja API responses to ensure consistent test data
    await page.route('**/apiv1/devices.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            device: {
              dsn: 'TEST-DEVICE-001',
              product_name: 'Test Grill',
              model: 'TG-100',
              mac: '00:11:22:33:44:55',
              lan_ip: '192.168.1.100',
              connection_status: 'online'
            }
          }
        ])
      });
    });

    // Mock device properties response with mapped properties
    await page.route('**/apiv1/dsns/TEST-DEVICE-001/properties.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            property: {
              name: 'GET_RSSI',
              value: -45,
              type: 'integer',
              base_type: 'integer',
              data_updated_at: new Date().toISOString()
            }
          },
          {
            property: {
              name: 'GET_Temp_Air',
              value: 72.5,
              type: 'float',
              base_type: 'float',
              data_updated_at: new Date().toISOString()
            }
          },
          {
            property: {
              name: 'unmapped_property',
              value: 'should_be_in_properties',
              type: 'string',
              base_type: 'string',
              data_updated_at: new Date().toISOString()
            }
          }
        ])
      });
    });

    // Click refresh button to trigger sync
    const refreshButton = page.getByRole('button', { name: /Refresh Status/i });
    await refreshButton.click();
    
    // Wait for sync to complete
    await expect(refreshButton).not.toHaveClass(/animate-spin/, { timeout: 10000 });
    
    // Click on the device row to open details dialog
    await page.getByText('TEST-DEVICE-001').click();
    
    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Get the JSON content from the dialog
    const jsonContent = await page.locator('pre').textContent();
    const deviceData = JSON.parse(jsonContent!);
    
    // Verify mapped properties are NOT in additionalDeviceProperties.properties
    expect(deviceData.properties?.GET_RSSI).toBeUndefined();
    expect(deviceData.properties?.GET_Temp_Air).toBeUndefined();
    
    // Verify unmapped property IS in additionalDeviceProperties.properties
    expect(deviceData.properties?.unmapped_property).toBeDefined();
    expect(deviceData.properties?.unmapped_property?.value).toBe('should_be_in_properties');
    
    // Verify mapped properties are in the flattened structure
    expect(deviceData.rssi).toBe(-45);
    expect(deviceData.temp_air).toBe(72.5);
  });
});