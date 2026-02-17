/**
 * Take UI screenshots from datacubeai.space for Seedance 2.0 video generation.
 * Uses normal Chrome UA + visited cookie to bypass login gate.
 * Waits for actual feed card content to load (not skeleton screens).
 *
 * Usage: node scripts/take-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'out', 'screenshots');
const BASE_URL = 'https://www.datacubeai.space';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, options = {}) {
  const path = join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false, ...options });
  console.log(`  [OK] ${name}.png`);
  return path;
}

/**
 * Wait for actual feed card content to load.
 * Feed cards have real text (article titles) while skeletons are just colored divs.
 * We specifically check the center feed area, ignoring sidebar.
 */
async function waitForFeedContent(page, maxWaitMs = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const hasCards = await page.evaluate(() => {
      // Look for feed card elements with actual text content
      // Cards typically have links with long text (article titles)
      const feedArea = document.querySelector('[id="main-content"]') ||
                       document.querySelector('main') ||
                       document.body;

      // Strategy 1: Look for card-like elements with titles
      const links = feedArea.querySelectorAll('a[href]');
      const titleLinks = Array.from(links).filter(a => {
        const text = a.textContent?.trim() || '';
        return text.length > 20 && !text.includes('Subscribe') && !text.includes('Ko-fi');
      });
      if (titleLinks.length >= 2) return true;

      // Strategy 2: Look for elements that are NOT skeleton divs
      // Skeleton divs typically have animate-shimmer class and no text
      const cards = feedArea.querySelectorAll('[class*="cursor-pointer"], [class*="rounded"]');
      const realCards = Array.from(cards).filter(card => {
        const text = card.textContent?.trim() || '';
        return text.length > 50; // Real cards have substantial text
      });
      if (realCards.length >= 2) return true;

      // Strategy 3: Check if shimmer elements are still present
      const shimmers = feedArea.querySelectorAll('[class*="shimmer"], [class*="animate-pulse"]');
      if (shimmers.length === 0) {
        // No skeletons and page has loaded - content might be there
        const bodyText = feedArea.innerText;
        if (bodyText.length > 500) return true;
      }

      return false;
    });

    if (hasCards) {
      console.log(`  Feed content loaded in ${Date.now() - startTime}ms`);
      return true;
    }
    await sleep(1000);
  }
  console.log(`  [WARN] Feed content not loaded after ${maxWaitMs}ms`);
  return false;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 120000,
  });

  const page = await browser.newPage();
  // Use normal Chrome UA so the SPA loads properly
  // (Googlebot UA might cause SSR-only rendering without client hydration)

  // Dark mode
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  // Set visited cookie BEFORE navigation to bypass login gate
  await page.setCookie({
    name: 'visited',
    value: 'true',
    domain: 'www.datacubeai.space',
    path: '/',
  });

  // Monitor network requests for debugging
  let apiCallCount = 0;
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('api-production') || url.includes('/api/')) {
      apiCallCount++;
      const status = response.status();
      console.log(`  [API] ${status} ${url.substring(0, 100)}`);
    }
  });

  try {
    // ======================================================
    // 1. Main page — Tech Feed (default tab)
    // ======================================================
    console.log('\n[1/8] Loading main page (Tech Feed)...');
    apiCallCount = 0;
    await page.goto(`${BASE_URL}/en`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    console.log(`  Page loaded, waiting for feed content...`);
    await waitForFeedContent(page, 30000);
    await sleep(2000); // Extra buffer for animations

    // Hide any FAB buttons that might overlap content
    await page.evaluate(() => {
      document.body.style.overflow = 'auto';
    });

    await takeScreenshot(page, '01_tech_feed_full');

    // ======================================================
    // 2. Investment tab
    // ======================================================
    console.log('\n[2/8] Switching to Investment tab...');
    await page.evaluate(() => {
      // Click the Investments sidebar nav item
      const allClickable = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const investItem = allClickable.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text.includes('invest');
      });
      if (investItem) {
        investItem.click();
        return true;
      }
      return false;
    });
    await waitForFeedContent(page, 20000);
    await sleep(1500);
    await takeScreenshot(page, '02_investment_full');

    // ======================================================
    // 3. Tips tab
    // ======================================================
    console.log('\n[3/8] Switching to Tips tab...');
    await page.evaluate(() => {
      const allClickable = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const tipsItem = allClickable.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text.includes('practical') || text.includes('tip') || text.includes('praxis');
      });
      if (tipsItem) tipsItem.click();
    });
    await waitForFeedContent(page, 20000);
    await sleep(1500);
    await takeScreenshot(page, '03_tips_feed_full');

    // ======================================================
    // 4. AI Chat widget
    // ======================================================
    console.log('\n[4/8] Opening AI Chat widget...');
    // Switch back to tech tab first
    await page.evaluate(() => {
      const allClickable = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const techItem = allClickable.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text.includes('ai technology') || text.includes('technolog');
      });
      if (techItem) techItem.click();
    });
    await sleep(2000);

    // Click chat FAB
    const chatOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const chatBtn = buttons.find(b => {
        const text = (b.textContent || '').toLowerCase();
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        return text.includes('chat') || label.includes('chat');
      });
      if (chatBtn) { chatBtn.click(); return true; }
      return false;
    });
    if (chatOpened) {
      await sleep(2000);
      await takeScreenshot(page, '04_ai_chat_panel');
    } else {
      console.log('  [WARN] Chat FAB not found');
      await takeScreenshot(page, '04_ai_chat_panel_fallback');
    }

    // Close chat
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const close = btns.find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('close'));
      if (close) close.click();
      document.body.style.overflow = 'auto';
    });
    await sleep(500);

    // ======================================================
    // 5. AI Report overlay
    // ======================================================
    console.log('\n[5/8] Opening AI Report generator...');
    const reportOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => {
        const text = (b.textContent || '').toLowerCase();
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        return text.includes('report') || text.includes('bericht') ||
               label.includes('report') || label.includes('bericht');
      });
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (reportOpened) {
      // Wait for report to start generating and show some content
      await sleep(8000);
      await takeScreenshot(page, '05_ai_report_overlay');
    } else {
      console.log('  [WARN] Report FAB not found');
      await takeScreenshot(page, '05_ai_report_overlay_fallback');
    }

    // Close report
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      const btns = Array.from(document.querySelectorAll('button'));
      const close = btns.find(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        return label.includes('close') || label.includes('schließen');
      });
      if (close) close.click();
      document.body.style.overflow = 'auto';
    });
    await sleep(500);

    // ======================================================
    // 6. SSR Week page
    // ======================================================
    console.log('\n[6/8] Loading SSR week page...');
    await page.goto(`${BASE_URL}/en/week/2026-kw07`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await sleep(5000);
    await takeScreenshot(page, '06_week_page_full');

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(500);
    await takeScreenshot(page, '06b_week_page_scrolled');

    // ======================================================
    // 7. German version
    // ======================================================
    console.log('\n[7/8] Loading German version...');
    await page.goto(`${BASE_URL}/de`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await waitForFeedContent(page, 30000);
    await sleep(2000);
    await takeScreenshot(page, '07_german_tech_feed');

    // ======================================================
    // 8. Mobile view
    // ======================================================
    console.log('\n[8/8] Taking mobile screenshots...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await page.goto(`${BASE_URL}/en`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await waitForFeedContent(page, 30000);
    await sleep(2000);
    await takeScreenshot(page, '08_mobile_view');

    console.log('\n=== Done! All screenshots saved to out/screenshots/ ===');
    console.log(`Total API calls observed: ${apiCallCount}`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
