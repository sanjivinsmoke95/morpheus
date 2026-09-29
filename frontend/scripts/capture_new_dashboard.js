import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/screenshots';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';

async function captureNewDashboard() {
  console.log('Launching Puppeteer for new dashboard verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,950',
    ],
    defaultViewport: { width: 1440, height: 950, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  // Login as Officer
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  const buttons = await page.$$('button[type="button"]');
  for (const b of buttons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text && text.includes('Officer')) {
      await b.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  // 1. Dashboard Top View
  console.log('Capturing 32_dashboard_top_transformation.png...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '32_dashboard_top_transformation.png') });

  // 2. Scroll to middle/bottom to capture KPIs, Recent Analyses, and Standards Coverage
  console.log('Scrolling down and capturing 33_dashboard_kpis_and_coverage.png...');
  await page.evaluate(() => window.scrollBy(0, 480));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '33_dashboard_kpis_and_coverage.png') });

  console.log('All new dashboard views captured successfully.');
  await browser.close();
}

captureNewDashboard().catch((err) => {
  console.error('Error capturing dashboard:', err);
  process.exit(1);
});
