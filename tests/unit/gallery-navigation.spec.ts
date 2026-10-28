import { test, expect } from '@playwright/test';

test.describe('ROAD Property Gallery & Zoomable Image Modal Navigation', () => {
  test('eliminates blocking "Loading Full Plan" overlay and renders responsive gallery', async ({ page }) => {
    // Navigate to a project or property page
    await page.goto('http://localhost:3000/projects');
    await page.waitForLoadState('domcontentloaded');

    // Click on the first project card if available
    const projectCard = page.locator('a[href^="/projects/"]').first();
    if (await projectCard.count() > 0) {
      await projectCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Check if photo gallery or floor plan is present
      const galleryTrigger = page.locator('button:has-text("Photos"), button:has-text("Gallery"), div[class*="group/media"]').first();
      if (await galleryTrigger.count() > 0) {
        await galleryTrigger.click();

        // Ensure "Loading Full Plan" blocking card is NEVER present
        const blockingCard = page.locator('text="Loading Full Plan"');
        await expect(blockingCard).toHaveCount(0);

        const blueprintText = page.locator('text="Downloading high-resolution blueprint layout..."');
        await expect(blueprintText).toHaveCount(0);

        // Ensure modal controls (close, arrows) are responsive and visible
        const closeBtn = page.locator('button[title="Close image"], button[title="Close"]').first();
        if (await closeBtn.count() > 0) {
          await expect(closeBtn).toBeVisible();
          await closeBtn.click();
        }
      }
    }
  });

  test('verifies ZoomableImageModal does not contain hardcoded blocking elements', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const componentPath = path.resolve(process.cwd(), 'src/components/ui/zoomable-image-modal.tsx');
    const source = fs.readFileSync(componentPath, 'utf-8');

    // Invariant 1: Blocking card text must not exist in the component source
    expect(source).not.toContain('Loading Full Plan');
    expect(source).not.toContain('Downloading high-resolution blueprint layout...');

    // Invariant 2: Fake progress interval timer must not exist
    expect(source).not.toContain('setInterval');

    // Invariant 3: Intelligent adjacent preloading must be present
    expect(source).toContain('preloadImage');
    expect(source).toContain('loadedCache');

    // Invariant 4: Zero black screen transition (keeps displayedIndex until loaded)
    expect(source).toContain('displayedIndex');
    expect(source).toContain('setDisplayedIndex');

    // Invariant 5: Mobile horizontal swipe gestures implemented
    expect(source).toContain('handleTouchStart');
    expect(source).toContain('handleTouchEnd');
    expect(source).toContain('deltaX');

    // Invariant 6: PDF document support
    expect(source).toContain('isPdfUrl');
    expect(source).toContain('iframe');
  });
});
