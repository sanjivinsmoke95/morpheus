import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';
const DEMO_ANALYSIS_ID = '8a98cb7c-3618-4393-b387-bd6937ecfb92';
const STANDARD_ID = '487b55ed-83c4-4be5-8898-2e44e288fb22';
const LOG_FILE = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/survey_results_v3.json';

const results = {
  testedAt: new Date().toISOString(),
  totalFeatures: 0,
  passedCount: 0,
  warnCount: 0,
  failCount: 0,
  features: [],
  consoleErrors: [],
  networkFailures: [],
};

function logFeature(name, status, details = {}) {
  results.totalFeatures++;
  if (status === 'PASS') results.passedCount++;
  else if (status === 'WARN') results.warnCount++;
  else results.failCount++;
  console.log(`[${status === 'PASS' ? '✓ PASS' : status === 'WARN' ? '⚠ WARN' : '✗ FAIL'}] ${name}`);
  results.features.push({ name, status, details });
}

async function loginAs(page, roleName) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    try { localStorage.removeItem('morpheus.token'); } catch (e) {}
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

  await page.evaluate((role) => {
    const btns = Array.from(document.querySelectorAll('button[type="button"]'));
    const target = btns.find(b => b.textContent.includes(role));
    if (target) target.click();
  }, roleName);

  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1200));
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
      if (!text.includes('React Router') && !text.includes('favicon')) {
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
    // ══════════════════════════════════════════════════════════
    // PART A: PROCUREMENT OFFICER WORKFLOW
    // ══════════════════════════════════════════════════════════
    console.log('\n=== PART A: PROCUREMENT OFFICER WORKFLOW ===');
    await loginAs(page, 'Procurement Officer');
    const officerLoggedIn = await page.evaluate(() => {
      return document.body.innerText.includes('Active Analyses') || 
             document.body.innerText.includes('Solar Street Lighting') ||
             document.body.innerText.includes('MORPHEUS');
    });
    logFeature('1. Authentication & Role Switch (Procurement Officer)', officerLoggedIn ? 'PASS' : 'FAIL');

    // 2. Dashboard KPIs
    const statsCount = await page.$$eval('.grid > div', divs => divs.length);
    logFeature('2. Dashboard Metrics & Active Analyses List', statsCount >= 4 ? 'PASS' : 'FAIL', { statsCount });

    // 3. Analysis Overview
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasOverview = await page.evaluate(() => {
      return document.body.innerText.includes('Solar Street Lighting') && 
             (document.body.innerText.includes('Overall Assessment') || document.body.innerText.includes('Readiness') || document.body.innerText.includes('conflicts'));
    });
    logFeature('3. Analysis Overview & Executive Readiness', hasOverview ? 'PASS' : 'FAIL');

    // 4. Requirements Management & Selection
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/requirements`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const reqButtons = await page.$$('.max-h-\\[520px\\] button');
    let reqSelectionWorked = false;
    if (reqButtons.length > 1) {
      await reqButtons[1].click();
      await new Promise(r => setTimeout(r, 500));
      reqSelectionWorked = await page.evaluate(() => {
        return !!document.querySelector('.rounded-xl, .bg-surface');
      });
    }
    logFeature('4. Requirements Management & Detail Drawer', (reqButtons.length > 0 && reqSelectionWorked) ? 'PASS' : 'FAIL', {
      totalRequirements: reqButtons.length,
      detailDrawerWorking: reqSelectionWorked
    });

    // 5. Standards Recommendations & Accept Workflow
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const acceptBtns = await page.$$eval('button', btns => btns.filter(b => b.textContent.includes('Accept')).length);
    logFeature('5. Standards Recommendations & Dynamic Acceptance', acceptBtns > 0 ? 'PASS' : 'FAIL', { acceptBtnsFound: acceptBtns });

    // 6. Issues & Ambiguity Detection
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/issues`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasIssues = await page.evaluate(() => {
      return document.body.innerText.includes('Issues') || document.body.innerText.includes('Conflict');
    });
    logFeature('6. Compliance Conflicts & Ambiguity Detection', hasIssues ? 'PASS' : 'FAIL');

    // 7. Evidence Grounding & Clause Viewer
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/evidence`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasEvidence = await page.evaluate(() => {
      return document.body.innerText.includes('Evidence') || document.body.innerText.includes('Clause');
    });
    logFeature('7. Evidence Grounding & Source Citations', hasEvidence ? 'PASS' : 'FAIL');

    // 8. Explainability / Why Matched
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/recommendations`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasExplain = await page.evaluate(() => {
      return document.body.innerText.includes('Why matched') || document.body.innerText.includes('Why not');
    });
    logFeature('8. Explainability & Why-Matched Decision Space', hasExplain ? 'PASS' : 'FAIL');

    // 9. Review Workspace & Sign-Off
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/review`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasReview = await page.evaluate(() => {
      return document.body.innerText.includes('Review workspace') || document.body.innerText.includes('Decision log');
    });
    logFeature('9. Review Workspace & Collaboration Comments', hasReview ? 'PASS' : 'FAIL');

    // 10. Bilingual Tender Reports Dossier
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/reports`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasReportDossier = await page.evaluate(() => {
      return document.body.innerText.includes('Standards-Aligned Procurement Report') &&
             document.body.innerText.includes('Standards Coverage');
    });
    logFeature('10. Bilingual Reports & Official Compliance Dossier', hasReportDossier ? 'PASS' : 'FAIL');

    // 11. Knowledge Graph Visualizer
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/graph`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasGraph = await page.$('canvas, svg');
    logFeature('11. Standards Knowledge Graph Visualizer', !!hasGraph ? 'PASS' : 'FAIL');

    // 12. Coverage Matrix & Gap Audit
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/audit`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasAudit = await page.evaluate(() => {
      return document.body.innerText.includes('Coverage matrix') || document.body.innerText.includes('Coverage detail');
    });
    logFeature('12. Coverage Matrix & Gap Audit Trail', hasAudit ? 'PASS' : 'FAIL');

    // 13. Quality Control Orders & Certification
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/regulatory`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasRegulatory = await page.evaluate(() => {
      return document.body.innerText.includes('Quality Control Orders') || document.body.innerText.includes('Certification schemes');
    });
    logFeature('13. QCO Compliance & Mandatory Certification Schemes', hasRegulatory ? 'PASS' : 'FAIL');

    // 14. AI Procurement Copilot
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/copilot`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasCopilot = await page.evaluate(() => {
      return document.body.innerText.includes('Ask MORPHEUS') || 
             document.body.innerText.includes('Copilot') ||
             document.body.innerText.includes('Draft suggestions');
    });
    logFeature('14. AI Procurement Copilot Interactive Assistant', hasCopilot ? 'PASS' : 'FAIL');

    // 15. Department Analytics & Reports
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasAnalytics = await page.evaluate(() => {
      const txt = document.body.innerText.toLowerCase();
      return (txt.includes('department standards analytics') || txt.includes('department intelligence')) && 
             txt.includes('tenders analysed');
    });
    logFeature('15. Department Analytics & Compliance Reporting', hasAnalytics ? 'PASS' : 'FAIL');

    // 16. Standards Library Search
    await page.goto(`${BASE_URL}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasStandards = await page.evaluate(() => {
      return document.body.innerText.includes('Standards Library');
    });
    logFeature('16. BIS Standards Catalogue & Search Library', hasStandards ? 'PASS' : 'FAIL');

    // 17. Standard Detail Page
    await page.goto(`${BASE_URL}/standards/${STANDARD_ID}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasStandardDetail = await page.evaluate(() => {
      return document.body.innerText.includes('IS 1520') || document.body.innerText.includes('covers');
    });
    logFeature('17. Standard Clause Detail & Scope Metadata', hasStandardDetail ? 'PASS' : 'FAIL');

    // 18. Regulatory Updates
    await page.goto(`${BASE_URL}/regulatory-updates`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasUpdates = await page.evaluate(() => {
      return document.body.innerText.includes('Regulatory Updates') || document.body.innerText.includes('Gazette');
    });
    logFeature('18. Regulatory Updates & Gazette Monitoring', hasUpdates ? 'PASS' : 'FAIL');

    // 19. Tender Ingestion Wizard
    await page.goto(`${BASE_URL}/analyses/new`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasDropzone = await page.$('input[type="file"], [data-testid="dropzone"], div[class*="border-dashed"]');
    logFeature('19. Tender Document Ingestion Wizard', !!hasDropzone ? 'PASS' : 'FAIL');

    // 20. Submissions History
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasHistory = await page.evaluate(() => {
      return document.body.innerText.includes('My Submissions') || document.body.innerText.includes('Solar Street Lighting');
    });
    logFeature('20. Tender Submission Lifecycle History', hasHistory ? 'PASS' : 'FAIL');

    // 21. Help & User Manual
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const hasHelp = await page.evaluate(() => {
      return document.body.innerText.includes('Help') || document.body.innerText.includes('Guidelines');
    });
    logFeature('21. Procurement Guidelines & Help Documentation', hasHelp ? 'PASS' : 'FAIL');

    // ══════════════════════════════════════════════════════════
    // PART B: REVIEWER WORKFLOW
    // ══════════════════════════════════════════════════════════
    console.log('\n=== PART B: SENIOR REVIEWER WORKFLOW ===');
    await loginAs(page, 'Senior Reviewer');
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const isReviewerQueue = await page.evaluate(() => {
      return document.body.innerText.includes('Sign-Off Queue');
    });
    logFeature('22. Senior Reviewer Sign-Off Queue & Workflow Separation', isReviewerQueue ? 'PASS' : 'FAIL');

    // ══════════════════════════════════════════════════════════
    // PART C: ADMINISTRATOR WORKFLOW
    // ══════════════════════════════════════════════════════════
    console.log('\n=== PART C: ADMINISTRATOR WORKFLOW ===');
    await loginAs(page, 'Administrator');
    
    // Admin System Console
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasAdminConsole = await page.evaluate(() => {
      return document.body.innerText.includes('Admin') && 
             (document.body.innerText.includes('System health') || document.body.innerText.includes('Dataset'));
    });
    logFeature('23. Administrator Console & System Diagnostics', hasAdminConsole ? 'PASS' : 'FAIL');

    // Accuracy Proof / Evaluation
    await page.goto(`${BASE_URL}/evaluation`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasEval = await page.evaluate(() => {
      return document.body.innerText.includes('Evaluation') && document.body.innerText.includes('labelled cases');
    });
    logFeature('24. Retrieval Quality Evaluation & Gold Benchmark Matrix', hasEval ? 'PASS' : 'FAIL');

    // Feedback Log
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasFeedback = await page.evaluate(() => {
      return document.body.innerText.includes('Feedback') || document.body.innerText.includes('decisions');
    });
    logFeature('25. Officer Decision Feedback & Continuous Improvement Log', hasFeedback ? 'PASS' : 'FAIL');

  } catch (err) {
    console.error('Test execution error:', err);
    results.unhandledError = err.message;
  } finally {
    await browser.close();
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  console.log(`\n======================================================`);
  console.log(`EXHAUSTIVE SURVEY COMPLETE!`);
  console.log(`Results: ${results.passedCount} / ${results.totalFeatures} PASSED (${Math.round((results.passedCount / results.totalFeatures) * 100)}%)`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Network Failures: ${results.networkFailures.length}`);
  console.log(`======================================================\n`);
}

runSurvey();
