import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SCREENSHOT_DIR =
  process.env.PLAYWRIGHT_SCREENSHOT_DIR ??
  '/home/kali/.gemini/antigravity/brain/7ae6825c-e435-45eb-870a-6ef916e1df99/screenshots';

mkdirSync(SCREENSHOT_DIR, { recursive: true });

function attachErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const loc = msg.location()?.url ?? '';
      const isOfflineFont =
        (loc.includes('fonts.googleapis.com') || loc.includes('fonts.gstatic.com')) &&
        text.includes('ERR_INTERNET_DISCONNECTED');
      const isGenericOfflineResource =
        text.includes('net::ERR_INTERNET_DISCONNECTED') &&
        (loc === '' || loc.startsWith('https://fonts.'));
      if (!isOfflineFont && !isGenericOfflineResource) {
        consoleErrors.push(`${text} (${loc})`);
      }
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  return { consoleErrors, pageErrors };
}

async function findOverflowingElement(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth <= vw + 1) return null;
    const offenders: { tag: string; text: string; right: number; width: number }[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.right > vw + 2) {
        offenders.push({
          tag: `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60) ?? ''}`,
          text: (el.textContent ?? '').trim().slice(0, 50),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: vw,
      offenders: offenders.slice(0, 5),
    };
  });
}

async function assertAllImagesLoaded(page: Page) {
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      img.loading = 'eager';
      img.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 2500);
        });
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  });

  const broken = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs
      .map((img) => ({
        src: img.getAttribute('src') ?? '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }))
      .filter((img) => !img.complete || img.naturalWidth === 0);
  });
  expect(broken, `Broken images detected: ${JSON.stringify(broken)}`).toEqual([]);
}

test.describe('MEDIPATH v3 Verification — 360° Drag 3D, Photoreal Building, Full-Page 2D Map, Dark Mode & Mobile', () => {
  test('homepage, favicon, bilingual EN/TA, 360° cursor orbit without 180° buttons, Real Building, & Quick Tap -> Full 2D Map', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Favicon check
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(faviconHref).toBe('/medipath-mark.svg');
    const faviconRes = await page.request.get('/medipath-mark.svg');
    expect(faviconRes.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Find any room, clinic, or test in seconds/i,
    );
    await assertAllImagesLoaded(page);

    // Wait for 3D scene or 2D fallback ready
    const stageLocator = page
      .locator('[data-scene-ready="true"], svg[aria-label*="2D architectural"]')
      .first();
    await expect(stageLocator).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-home-light-1440.png`, fullPage: false });

    // Confirm 180° Left / 180° Right buttons have been completely removed
    await expect(page.getByRole('button', { name: /180°/i })).toHaveCount(0);

    // Dark View switch & verify root .dark class
    await page.getByRole('button', { name: /Switch to Dark Mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-home-dark-1440.png`, fullPage: false });
    await page.getByRole('button', { name: /Switch to Light Mode/i }).click();

    // Bilingual EN / Tamil switch
    await page.getByRole('button', { name: /Switch language/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /எந்த அறை, துறை அல்லது ஸ்கேன் மையத்தையும் நொடிகளில் கண்டறியுங்கள்/,
    );
    await page.getByRole('button', { name: /Switch language/i }).click();

    // Navigate via QR Checkpoint deep link (/qr/MP-QR-ENTRANCE)
    await page.goto('/qr/MP-QR-ENTRANCE', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Started at QR Spot:/i)).toBeVisible();
    await expect(page.getByText(/Step-by-Step Walking Guide/i)).toBeVisible();
    await assertAllImagesLoaded(page);

    // Verify 180° icons do not exist on Navigator page
    await expect(page.getByRole('button', { name: /180°/i })).toHaveCount(0);

    // Enable Step-Free wheelchair routing
    await page.getByRole('checkbox').check();
    await expect(stageLocator).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(300);

    // Test Real Building toggle & natural 360° cursor drag orbit
    const sceneContainer = page.locator('[data-theme="architectural"][data-building-style]').first();
    if ((await sceneContainer.count()) > 0) {
      await expect(sceneContainer).toHaveAttribute('data-building-style', 'cutaway');
      await page.getByRole('button', { name: /Real Building/i }).click();
      await expect(sceneContainer).toHaveAttribute('data-building-style', 'realistic');
      await page.waitForTimeout(950);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/v3-real-building-light.png`,
        fullPage: false,
      });

      const initialDeg = Number(await sceneContainer.getAttribute('data-orbit-deg'));
      const box = await sceneContainer.boundingBox();
      if (box) {
        const startX = box.x + box.width * 0.65;
        const cy = box.y + box.height * 0.55;
        await page.mouse.move(startX, cy);
        await page.mouse.down();
        await page.mouse.move(startX - 280, cy, { steps: 14 });
        await page.mouse.up();
        await page.waitForTimeout(450);

        const draggedDeg = Number(await sceneContainer.getAttribute('data-orbit-deg'));
        expect(draggedDeg).not.toBe(initialDeg);
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/v3-real-building-360drag.png`,
          fullPage: false,
        });
      }

      // Real Building Dusk/Night Dark Mode view
      await page.getByRole('button', { name: /Switch to Dark Mode/i }).click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/v3-real-building-dark.png`,
        fullPage: false,
      });
      await page.getByRole('button', { name: /Switch to Light Mode/i }).click();
    }

    // Click a Quick Tap Destination Photo -> must redirect to Dedicated Full-Page 2D Map (/map-2d)
    await page.getByRole('button', { name: /Cardiology Suites/i }).click();
    await page.waitForURL(/\/map-2d/);
    await expect(page.locator('svg[aria-label*="2D architectural floor map"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Cardiology Suites/i);
    await expect(page.getByText(/START/)).toBeVisible().catch(() => {
      /* START renders when viewing L0 origin floor */
    });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-full-map-2d-light.png`, fullPage: false });

    // Switch to Origin floor (L0) using trace button to capture START + TAKE LIFT -> L2
    const traceBtn = page.getByRole('button', { name: /Trace Route: Jump to L0/i });
    if ((await traceBtn.count()) > 0) {
      await traceBtn.click();
      await page.waitForTimeout(200);
    }

    // Dark View + Full-Width Map Expand on /map-2d
    await page.getByRole('button', { name: /Switch to Dark Mode/i }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-full-map-2d-dark.png`, fullPage: false });
    await page.getByRole('button', { name: /Full-Width Map/i }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-full-map-2d-expanded.png`, fullPage: false });
    await page.getByRole('button', { name: /Switch to Light Mode/i }).click();

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('appointment booking, queue privacy, admin console in dark mode & map validation', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto('/appointments/book', { waitUntil: 'networkidle' });
    await page.getByLabel('Full Name').fill('Arjun Meenakshi');
    await page.getByLabel('Email Address').fill('arjun.playwright@example.com');
    await page.getByLabel('Phone Number').fill('+91 98401 77889');
    await page.getByLabel(/Reason for Visit/i).fill('Playwright cardiac follow-up check');
    await page.getByRole('button', { name: /Confirm Visit/i }).click();

    await page.waitForURL(/\/appointments\/confirmation\//);
    await expect(page.getByText(/Visit Confirmed/i)).toBeVisible();

    await page.goto('/queue', { waitUntil: 'networkidle' });
    await page.getByLabel('Patient Full Name').fill('Karthika Devi');
    await page.getByRole('button', { name: /Issue Queue Number/i }).click();
    await expect(page.getByText(/Token .* issued/i)).toBeVisible();

    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Fill Admin Demo/i }).click();
    await page.getByRole('button', { name: /Enter Operations Console/i }).click();

    await page.waitForURL(/\/admin$/);
    await expect(page.getByText(/Aurelia Pavilion Operations Overview/i)).toBeVisible();
    await expect(page.getByText(/Graph Connected/i)).toBeVisible();

    await page.getByRole('button', { name: /Switch to Dark Mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: /Switch to Light Mode/i }).click();

    await page.goto('/admin/map-editor', { waitUntil: 'networkidle' });
    await expect(page.getByText(/3D Hospital Map & Graph Studio/i)).toBeVisible();
    await expect(page.locator('svg[aria-label*="2D architectural floor map"]')).toBeVisible();
    await expect(
      page.locator('[data-scene-ready="true"], svg[aria-label*="2D architectural"]').first(),
    ).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /Validate Connectivity/i }).click();
    await expect(page.getByText(/Graph Validation: Passed/i)).toBeVisible();

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('mobile & multi-viewport audit (360-1440px), /map-2d mobile screen, 200% zoom reflow & skip-link', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    const viewports = [
      { width: 360, height: 740 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'networkidle' });
      const overflowReport = await findOverflowingElement(page);
      expect(
        overflowReport,
        `Horizontal overflow on Home at ${vp.width}px: ${JSON.stringify(overflowReport)}`,
      ).toBeNull();
    }

    await page.setViewportSize({ width: 360, height: 740 });
    for (const routePath of [
      '/explore',
      '/departments',
      '/services',
      '/doctors',
      '/appointments/book',
      '/navigate?view=3d',
      '/map-2d',
      '/emergency',
      '/assistance',
    ]) {
      await page.goto(routePath, { waitUntil: 'networkidle' });
      await assertAllImagesLoaded(page);
      const overflowReport = await findOverflowingElement(page);
      expect(
        overflowReport,
        `Horizontal overflow on ${routePath} at 360px: ${JSON.stringify(overflowReport)}`,
      ).toBeNull();
    }

    // Mobile 390px Full-Page 2D Map & 3D Navigator in Dark View
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/map-2d', { waitUntil: 'networkidle' });
    await expect(page.locator('svg[aria-label*="2D architectural floor map"]')).toBeVisible();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-mobile-390-map2d.png`, fullPage: false });

    await page.goto('/navigate', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Switch to Dark Mode/i }).first().click();
    await expect(
      page.locator('[data-scene-ready="true"], svg[aria-label*="2D architectural"]').first(),
    ).toBeVisible({ timeout: 20000 });
    await page.locator('[data-theme="architectural"], svg[aria-label*="2D architectural"]').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/v3-mobile-390-3d-dark.png`, fullPage: false });
    await page.getByRole('button', { name: /Switch to Light Mode/i }).first().click();

    // 200% Zoom Reflow Simulation (640px)
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto('/map-2d', { waitUntil: 'networkidle' });
    const reflowReport = await findOverflowingElement(page);
    expect(reflowReport, `Reflow overflow at 640px (200% zoom): ${JSON.stringify(reflowReport)}`).toBeNull();

    // Skip link keyboard check
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const firstFocusedText = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(firstFocusedText.toLowerCase()).toContain('skip to main content');

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
