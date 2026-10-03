import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';
const DEMO_ANALYSIS_ID = '8a98cb7c-3618-4393-b387-bd6937ecfb92';
const LOG_FILE = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/survey_results.json';

const results = {
  testedAt: new Date().toISOString(),
  features: [],
  consoleErrors: [],
  networkFailures: [],
};

function logFeature(name, status, details = {}) {
  console.log(`[${status === 'PASS' ? '✓ PASS' : status === 'WARN' ? '⚠ WARN' : '✗ FAIL'}] ${name}`);
  results.features.push({ name, status, details });
}

async function runSurvey() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,950'],
    defaultViewport: { width: 1440, height: 950, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('React Router')) {
        results.consoleErrors.push({ text, location: msg.location() });
      }
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      results.networkFailures.push({
        url: resp.url(),
        status: resp.status(),
        statusText: resp.statusText(),
      });
    }
  });

  try {
    // 1. Authentication
    console.log('\n--- 1. Testing Authentication ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    const officerBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.textContent.includes('Procurement Officer'));
      if (found) { found.click(); return true; }
      return false;
    });
    if (!officerBtn) throw new Error('Procurement Officer button not found');
    await new Promise(r => setTimeout(r, 400));
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      logFeature('Authentication & Role Login', 'PASS', { url: currentUrl });
    } else {
      logFeature('Authentication & Role Login', 'FAIL', { url: currentUrl });
    }

    // 2. Dashboard Navigation & Metric Cards
    console.log('\n--- 2. Testing Dashboard & Stats ---');
    await page.waitForSelector('main', { timeout: 5000 });
    const statsCount = await page.$$eval('.grid > div', divs => divs.length);
    const hasTenderList = await page.evaluate(() => {
      return document.body.innerText.includes('Solar Street Lighting') || document.body.innerText.includes('Active Analyses') || document.body.innerText.includes('Municipal');
    });
    logFeature('Dashboard KPIs & Recent Analyses', (statsCount > 0 && hasTenderList) ? 'PASS' : 'WARN', {
      statsCount,
      hasTenderList
    });

    // 3. Analysis Detail: Requirements Page
    console.log('\n--- 3. Testing Requirements Management ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/requirements`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    
    // Check requirements rendering
    const reqCount = await page.evaluate(() => {
      const items = document.querySelectorAll('tbody tr, [data-testid="req-item"], .divide-y > div');
      return items.length;
    });
    const filterInput = await page.$('input[placeholder*="Search" i], input[placeholder*="Filter" i]');
    if (filterInput) {
      await filterInput.type('solar');
      await new Promise(r => setTimeout(r, 300));
      await filterInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
    }
    logFeature('Requirements View & Search Filter', reqCount > 0 ? 'PASS' : 'FAIL', {
      itemCount: reqCount,
      hasFilter: !!filterInput
    });

    // 4. Standards Recommendations & Accept Action
    console.log('\n--- 4. Testing Standards Recommendations & Acceptance ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Look for standard cards and Accept buttons
    const acceptButtons = await page.$$eval('button', btns => {
      return btns
        .filter(b => b.textContent.includes('Accept') || b.textContent.includes('Accepted'))
        .map(b => ({ text: b.textContent.trim(), disabled: b.disabled }));
    });

    let acceptClickSuccess = false;
    const buttonToClick = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Accept') && !b.textContent.includes('Accepted'));
    });

    if (buttonToClick && (await buttonToClick.asElement())) {
      await buttonToClick.asElement().click();
      await new Promise(r => setTimeout(r, 1000));
      acceptClickSuccess = true;
    }

    logFeature('Standards Recommendations & Accept Workflow', acceptButtons.length > 0 ? 'PASS' : 'WARN', {
      acceptButtonsCount: acceptButtons.length,
      buttonClicked: acceptClickSuccess,
      buttons: acceptButtons.slice(0, 3)
    });

    // 5. Issues & Compliance Alerts
    console.log('\n--- 5. Testing Issues & Ambiguity Page ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/issues`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasIssuesText = await page.evaluate(() => {
      return document.body.innerText.includes('Conflict') || 
             document.body.innerText.includes('Ambiguity') || 
             document.body.innerText.includes('Risk') ||
             document.body.innerText.includes('Issues') ||
             document.body.innerText.includes('High') ||
             document.body.innerText.includes('Medium');
    });
    logFeature('Compliance Issues & Risk Detection', hasIssuesText ? 'PASS' : 'FAIL', {
      hasIssuesText
    });

    // 6. Evidence & Traceability
    console.log('\n--- 6. Testing Evidence & Traceability ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/evidence`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const evidenceText = await page.evaluate(() => {
      return document.body.innerText.includes('Clause') || 
             document.body.innerText.includes('Document') || 
             document.body.innerText.includes('Page') ||
             document.body.innerText.includes('Snippet') ||
             document.body.innerText.includes('Tender');
    });
    logFeature('Evidence Grounding & Clause Viewer', evidenceText ? 'PASS' : 'FAIL', { evidenceText });

    // 7. Review & Sign-Off Workflow
    console.log('\n--- 7. Testing Review & Sign-off ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/review`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Test comment submission
    const commentInput = await page.$('textarea, input[placeholder*="comment" i], input[placeholder*="feedback" i]');
    let commentSubmitted = false;
    if (commentInput) {
      await commentInput.type('Automated functional check - reviewer signoff verified.');
      const submitBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Post') || b.textContent.includes('Add Comment') || b.textContent.includes('Comment') || b.textContent.includes('Submit'));
      });
      if (submitBtn && (await submitBtn.asElement())) {
        await submitBtn.asElement().click();
        await new Promise(r => setTimeout(r, 1000));
        commentSubmitted = true;
      }
    }

    const exportBtns = await page.$$eval('button, a', els => {
      return els
        .filter(el => el.textContent.toLowerCase().includes('export') || el.textContent.toLowerCase().includes('download'))
        .map(el => el.textContent.trim());
    });

    logFeature('Review Workflow, Comments & Audit Sign-Off', (exportBtns.length > 0) ? 'PASS' : 'WARN', {
      hasCommentBox: !!commentInput,
      commentSubmitted,
      exportButtons: exportBtns
    });

    // 8. AI Copilot Chat
    console.log('\n--- 8. Testing AI Procurement Copilot ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/copilot`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const copilotInput = await page.$('input[placeholder*="Ask" i], textarea[placeholder*="Ask" i], input[type="text"]');
    let copilotResponseReceived = false;
    let copilotResponseText = '';

    if (copilotInput) {
      await copilotInput.type('What are the recommended BIS standards for solar luminaire efficacy?');
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 4500));
      copilotResponseText = await page.evaluate(() => {
        const messages = Array.from(document.querySelectorAll('.rounded-lg, .rounded-2xl, p, [data-testid="message"]'));
        const lastMsg = messages[messages.length - 1];
        return lastMsg ? lastMsg.textContent : '';
      });
      copilotResponseReceived = copilotResponseText.length > 10;
    }

    logFeature('AI Procurement Copilot (Interactive Assistant)', copilotResponseReceived ? 'PASS' : 'WARN', {
      inputFound: !!copilotInput,
      responseReceived: copilotResponseReceived,
      sampleSnippet: copilotResponseText.slice(0, 100)
    });

    // 9. Knowledge Graph
    console.log('\n--- 9. Testing Knowledge Graph View ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/graph`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const canvasOrSvg = await page.$('canvas, svg.recharts-surface, .react-flow, svg');
    logFeature('Knowledge Graph Visualizer', canvasOrSvg ? 'PASS' : 'FAIL', {
      renderedVisualElement: !!canvasOrSvg
    });

    // 10. Standards Library
    console.log('\n--- 10. Testing Global Standards Library ---');
    await page.goto(`${BASE_URL}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const standardCards = await page.$$eval('.bg-white, [data-testid="standard-card"], table tbody tr', els => els.length);
    const searchInput = await page.$('input[placeholder*="Search" i]');
    if (searchInput) {
      await searchInput.type('IS 10322');
      await new Promise(r => setTimeout(r, 500));
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
    }
    logFeature('Standards Library & BIS Database', standardCards > 0 ? 'PASS' : 'FAIL', {
      cardCount: standardCards,
      searchAvailable: !!searchInput
    });

    // 11. Regulatory Updates
    console.log('\n--- 11. Testing Regulatory Updates ---');
    await page.goto(`${BASE_URL}/updates`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const updateItems = await page.$$eval('.border, .bg-white, [data-testid="update-item"]', els => els.length);
    logFeature('Regulatory Updates & Gazette Monitoring', updateItems > 0 ? 'PASS' : 'FAIL', {
      itemCount: updateItems
    });

    // 12. Intake / Tender Upload Wizard
    console.log('\n--- 12. Testing New Analysis Wizard ---');
    await page.goto(`${BASE_URL}/analyses/new`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const uploadInputs = await page.$$eval('input[type="text"], input[type="file"], select, textarea', els => els.length);
    const dropzone = await page.$('input[type="file"], [data-testid="dropzone"], div[class*="border-dashed"]');
    logFeature('Tender Ingestion & Analysis Wizard', (uploadInputs > 0 && !!dropzone) ? 'PASS' : 'FAIL', {
      formInputs: uploadInputs,
      dropzonePresent: !!dropzone
    });

    // 13. Reports & Analytics Page
    console.log('\n--- 13. Testing Department Analytics & Reports ---');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const analyticsHero = await page.$('img[alt*="Banner" i], img[src*="analytics_hero"]');
    const auditShield = await page.$('img[alt*="Audit" i], img[src*="compliance_audit"]');
    const dossierRows = await page.$$eval('table tbody tr', trs => trs.length);
    logFeature('Reports & Compliance Analytics', (analyticsHero && auditShield && dossierRows > 0) ? 'PASS' : 'WARN', {
      hasHero: !!analyticsHero,
      hasShield: !!auditShield,
      dossierRows
    });

  } catch (err) {
    console.error('Test execution error:', err);
    results.unhandledError = err.message;
  } finally {
    await browser.close();
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  console.log(`\nSurvey completed! Results saved to ${LOG_FILE}`);
}

runSurvey();
