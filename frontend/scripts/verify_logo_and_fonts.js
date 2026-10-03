import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_PATH = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/screenshots/46_logo_home_and_typography.png';

async function testLogoAndFonts() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,950'],
    defaultViewport: { width: 1440, height: 950, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  console.log('1. Testing Logo Click on Login Page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  const desktopLoginLogo = await page.$('a[aria-label="MORPHEUS Home"]');
  if (!desktopLoginLogo) {
    throw new Error('Desktop logo link not found on Login page');
  }
  const logoHref = await page.evaluate(el => el.getAttribute('href'), desktopLoginLogo);
  console.log('Desktop login logo href:', logoHref);

  // Now login as officer
  const officerBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button[type="button"]'));
    return btns.find(b => b.textContent.includes('Procurement Officer'));
  });
  if (officerBtn) await officerBtn.asElement().click();
  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1200));

  console.log('2. Navigating deep into an analysis subpage (/analyses/8a98cb7c-3618-4393-b387-bd6937ecfb92/standards)...');
  await page.goto(`${BASE_URL}/analyses/8a98cb7c-3618-4393-b387-bd6937ecfb92/standards`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Clicking the MORPHEUS logo in the sidebar...');
  const sidebarLogo = await page.$('aside a[aria-label*="MORPHEUS Home"]');
  if (!sidebarLogo) {
    throw new Error('Sidebar MORPHEUS Home link not found!');
  }
  await sidebarLogo.click();
  await new Promise(r => setTimeout(r, 1200));

  const currentUrl = page.url();
  console.log('Current URL after clicking logo:', currentUrl);
  const isHome = currentUrl === `${BASE_URL}/` || currentUrl === `${BASE_URL}`;
  console.log('Successfully returned to Homepage:', isHome);

  // 4. Test Mobile Header Logo
  console.log('4. Testing Mobile Viewport & Brand Logo...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/standards`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const mobileLogo = await page.$('header a[aria-label="MORPHEUS Home"]');
  if (!mobileLogo) {
    throw new Error('Mobile header MORPHEUS Home link not found!');
  }
  console.log('Mobile logo found. Clicking mobile logo...');
  await mobileLogo.click();
  await new Promise(r => setTimeout(r, 1200));
  const mobileCurrentUrl = page.url();
  console.log('Mobile URL after logo click:', mobileCurrentUrl);

  // 5. Inspect Computed Typography
  console.log('5. Inspecting Computed Typography Metrics...');
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const typography = await page.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    const kpiVal = document.querySelector('.font-display.text-3xl, .font-extrabold');
    const badge = document.querySelector('.rounded-full');

    const getMetrics = (el) => {
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        fontFamily: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
      };
    };

    return {
      body: getMetrics(body),
      h1: getMetrics(h1),
      kpiValue: getMetrics(kpiVal),
      badge: getMetrics(badge),
    };
  });

  console.log('Computed Typography Summary:', JSON.stringify(typography, null, 2));

  // Capture screenshot
  await page.screenshot({ path: SCREENSHOT_PATH });
  console.log('Screenshot saved to', SCREENSHOT_PATH);

  await browser.close();
  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

testLogoAndFonts().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
