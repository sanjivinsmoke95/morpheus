import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/screenshots';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';

async function capture() {
  console.log('Starting headless Chrome via puppeteer-core...');
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

  // Helper function to capture screenshot
  async function snap(filename, delay = 1200) {
    await new Promise((r) => setTimeout(r, delay));
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`✓ Saved ${filename}`);
  }

  try {
    // 1. Login Page
    console.log('Navigating to Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await snap('01_login_page.png');

    // Perform Login as Procurement Officer
    console.log('Logging in as Procurement Officer...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in successfully!');

    // 2. Dashboard Overview (The main landing page from Image 2!)
    console.log('Capturing Dashboard Overview...');
    await snap('02_dashboard_overview.png', 1800);

    // 3. New Analysis page
    console.log('Capturing New Analysis...');
    await page.goto(`${BASE_URL}/analyses/new`, { waitUntil: 'networkidle2' });
    await snap('03_new_analysis.png');

    // 4. Submissions / History
    console.log('Capturing Submissions / History...');
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await snap('04_my_submissions.png');

    // 5. Standards Library
    console.log('Capturing Standards Library...');
    await page.goto(`${BASE_URL}/standards`, { waitUntil: 'networkidle2' });
    await snap('05_standards_library.png');

    // Use seeded showcase analysis ID
    const analysisId = '8a98cb7c-3618-4393-b387-bd6937ecfb92';
    const standardId = '487b55ed-83c4-4be5-8898-2e44e288fb22';

    // 6. Analysis Overview
    console.log('Capturing Analysis Overview...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}`, { waitUntil: 'networkidle2' });
    await snap('06_analysis_overview.png', 1500);

    // 7. Analysis Requirements
    console.log('Capturing Analysis Requirements...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/requirements`, { waitUntil: 'networkidle2' });
    await snap('07_analysis_requirements.png');

    // 8. Analysis Standards Alignment
    console.log('Capturing Analysis Standards Alignment...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/standards`, { waitUntil: 'networkidle2' });
    await snap('08_analysis_standards.png');

    // 9. Analysis Issues & Gaps
    console.log('Capturing Analysis Issues & Gaps...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/issues`, { waitUntil: 'networkidle2' });
    await snap('09_analysis_issues_gaps.png', 1500);

    // 10. Analysis Evidence
    console.log('Capturing Analysis Evidence...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/evidence`, { waitUntil: 'networkidle2' });
    await snap('10_analysis_evidence.png', 1500);

    // 11. Reports Page (English Tender Clause)
    console.log('Capturing Analysis Reports (English Clause)...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/reports`, { waitUntil: 'networkidle2' });
    await snap('11_analysis_reports_bilingual_en.png', 1500);

    // 12. Reports Page (Hindi Tender Clause)
    console.log('Switching to Hindi Clause tab...');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('हिन्दी')) {
        await b.click();
        break;
      }
    }
    await snap('12_analysis_reports_bilingual_hi.png', 800);

    // 13. Knowledge Graph
    console.log('Capturing Knowledge Graph...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/graph`, { waitUntil: 'networkidle2' });
    await snap('13_analysis_knowledge_graph.png', 1500);

    // 14. Audit Trail
    console.log('Capturing Audit Trail...');
    await page.goto(`${BASE_URL}/analyses/${analysisId}/audit`, { waitUntil: 'networkidle2' });
    await snap('14_analysis_audit_trail.png', 1200);

    // 15. Standard Detail
    console.log('Capturing Standard Detail...');
    await page.goto(`${BASE_URL}/standards/${standardId}`, { waitUntil: 'networkidle2' });
    await snap('15_standard_detail.png', 1500);

    // 16. Regulatory Updates Page
    console.log('Capturing Regulatory Updates...');
    await page.goto(`${BASE_URL}/regulatory-updates`, { waitUntil: 'networkidle2' });
    await snap('16_regulatory_updates.png', 1200);

    // 17. Analytics Page
    console.log('Capturing Analytics Page...');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
    await snap('17_analytics_overview.png', 1200);

    // 18. Help & Support Page
    console.log('Capturing Help & Support...');
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle2' });
    await snap('18_help_and_support.png', 1200);

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

capture();
