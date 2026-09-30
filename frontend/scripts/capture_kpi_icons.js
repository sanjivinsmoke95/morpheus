import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/screenshots';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome for Retina vector asset verification...');
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

  async function snap(filename, delay = 1500) {
    await new Promise((r) => setTimeout(r, delay));
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`✓ Saved ${filename}`);
  }

  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    // Choose Procurement Officer
    const buttons = await page.$$('button[type="button"]');
    for (const b of buttons) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Procurement Officer')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 400));
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // Discover first analysis
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const targetUrl = `${BASE_URL}/analyses/8a98cb7c-3618-4393-b387-bd6937ecfb92`;
    console.log(`Navigating to Analysis: ${targetUrl}`);

    // 1. Overview Page
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await snap('34_overview_kpis_vector.png', 2000);

    // 2. Requirements Page
    await page.goto(`${targetUrl}/requirements`, { waitUntil: 'networkidle2' });
    await snap('35_requirements_kpis_vector.png', 1500);

    // 3. Reports Page
    await page.goto(`${targetUrl}/reports`, { waitUntil: 'networkidle2' });
    await snap('36_reports_kpis_vector.png', 1500);

    // 4. Issues & Gaps Page
    await page.goto(`${targetUrl}/issues`, { waitUntil: 'networkidle2' });
    await snap('37_issues_gaps_kpis_vector.png', 1500);

    console.log('All Retina vector screenshots successfully captured!');
  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    await browser.close();
  }
}

run();
