import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/screenshots';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';

async function testShareAndMore() {
  console.log('Launching Puppeteer to test Share and More Actions...');
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

  // 1. Login as Officer
  console.log('Logging in as Procurement Officer...');
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

  await new Promise((r) => setTimeout(r, 1000));
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));

  // 2. Go to Analysis Overview
  const targetUrl = `${BASE_URL}/analyses/c0ffee01-0000-0000-0000-000000000001`;
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));

  // 3. Test Share Button
  console.log('Clicking Share button...');
  const shareButton = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => b.textContent && b.textContent.includes('Share'));
  });

  if (shareButton) {
    await shareButton.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '28_share_modal_open.png') });
    console.log('✓ Saved 28_share_modal_open.png');

    // Type email into invite form
    console.log('Interacting with share invite form...');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.type('procurement.auditor@bis.gov.in');
      await new Promise((r) => setTimeout(r, 300));
      const inviteSubmit = await page.$('button[type="submit"]');
      if (inviteSubmit) {
        await inviteSubmit.click();
        await new Promise((r) => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '29_share_invite_sent.png') });
        console.log('✓ Saved 29_share_invite_sent.png');
      }
    }

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 600));
  } else {
    console.error('Could not find Share button!');
  }

  // 4. Test More Actions Button (⋯)
  console.log('Clicking More Actions (⋯) button...');
  const moreButton = await page.$('button[aria-label="More actions"]');
  if (moreButton) {
    await moreButton.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30_more_actions_menu_open.png') });
    console.log('✓ Saved 30_more_actions_menu_open.png');

    // Click "Copy Analysis UUID"
    const copyIdBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent && b.textContent.includes('Copy Analysis UUID'));
    });
    if (copyIdBtn) {
      await copyIdBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '31_toast_feedback_visible.png') });
      console.log('✓ Saved 31_toast_feedback_visible.png');
    }
  } else {
    console.error('Could not find More Actions button!');
  }

  console.log('Completed testing Share and More Actions.');
  await browser.close();
}

testShareAndMore().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
