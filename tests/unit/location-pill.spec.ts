import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('mobile location pill is fully clickable and opens location modal', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 1. Locate the location pill button in mobile navbar
  const locationPill = page.locator('header button[aria-label^="Choose location"]').first();
  await expect(locationPill).toBeVisible();
  await expect(locationPill).toContainText('Vijayawada');

  // 2. Perform a normal click (NO force: true) - this verifies no element intercepts pointer events
  await locationPill.click();

  // 3. Verify dialog is open and visible
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Areas in Vijayawada');

  // 4. Check that sublocation options or "All of Vijayawada" are selectable
  const allCityOption = dialog.locator('button:has-text("All of Vijayawada")');
  await expect(allCityOption).toBeVisible();

  // Verify no count badge like "1 Home • 1 Project" or "Whole City" appears beside sublocations
  const dialogText = await dialog.innerText();
  expect(dialogText).not.toContain('Home');
  expect(dialogText).not.toContain('Project');
  expect(dialogText).not.toContain('Whole City');

  // 5. Click "Apply" to close dialog
  const applyBtn = dialog.locator('button:has-text("Apply")');
  await applyBtn.click();
  await expect(dialog).not.toBeVisible();
});
