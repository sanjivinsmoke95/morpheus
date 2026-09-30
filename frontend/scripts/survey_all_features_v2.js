import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5174';
const DEMO_ANALYSIS_ID = '8a98cb7c-3618-4393-b387-bd6937ecfb92';
const LOG_FILE = '/Users/sanjivinsmoke/.gemini/antigravity/brain/1293488c-33ef-4f67-9556-adba1e3b5f7b/survey_results_v2.json';

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
      if (!text.includes('React Router')) {
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
    // 1. Authentication (Officer)
    console.log('\n--- 1. Testing Authentication (Procurement Officer) ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.textContent.includes('Procurement Officer'));
      if (found) found.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const currentUrl = page.url();
    const hasDashboardContent = await page.evaluate(() => {
      return document.body.innerText.includes('Active Analyses') || document.body.innerText.includes('Solar Street Lighting');
    });
    logFeature('Authentication & Role Login', hasDashboardContent ? 'PASS' : 'FAIL', { url: currentUrl, hasDashboardContent });

    // 2. Dashboard KPIs & Tender Dossiers
    console.log('\n--- 2. Testing Dashboard & Stats ---');
    const statsCount = await page.$$eval('.grid > div', divs => divs.length);
    logFeature('Dashboard KPIs & Recent Analyses', (statsCount >= 4 && hasDashboardContent) ? 'PASS' : 'WARN', {
      statsCount,
      hasDashboardContent
    });

    // 3. Overview Page
    console.log('\n--- 3. Testing Analysis Overview ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasOverviewContent = await page.evaluate(() => {
      return document.body.innerText.includes('Solar Street Lighting') && 
             (document.body.innerText.includes('Readiness') || document.body.innerText.includes('Summary') || document.body.innerText.includes('Confidence'));
    });
    logFeature('Analysis Overview & Executive Summary', hasOverviewContent ? 'PASS' : 'FAIL', { hasOverviewContent });

    // 4. Requirements Management
    console.log('\n--- 4. Testing Requirements Management ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/requirements`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const reqButtons = await page.$$eval('.max-h-\\[520px\\] button', btns => btns.length);
    const hasFilter = await page.$('input[placeholder*="Search" i]');
    logFeature('Requirements View & Search Filter', reqButtons > 0 ? 'PASS' : 'FAIL', {
      requirementCount: reqButtons,
      hasFilter: !!hasFilter
    });

    // 5. Standards Recommendations & Acceptance
    console.log('\n--- 5. Testing Standards Recommendations & Acceptance ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const acceptBtns = await page.$$eval('button', btns => btns.filter(b => b.textContent.includes('Accept')).length);
    logFeature('Standards Recommendations & Acceptance Workflow', acceptBtns > 0 ? 'PASS' : 'FAIL', {
      acceptButtonsFound: acceptBtns
    });

    // 6. Issues & Ambiguity
    console.log('\n--- 6. Testing Issues & Ambiguity ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/issues`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasIssues = await page.evaluate(() => {
      return document.body.innerText.includes('Issues') || document.body.innerText.includes('Conflict') || document.body.innerText.includes('Risk');
    });
    logFeature('Compliance Issues & Risk Detection', hasIssues ? 'PASS' : 'FAIL', { hasIssues });

    // 7. Evidence Grounding
    console.log('\n--- 7. Testing Evidence & Clause Grounding ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/evidence`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasEvidence = await page.evaluate(() => {
      return document.body.innerText.includes('Evidence') || document.body.innerText.includes('Clause') || document.body.innerText.includes('Snippet');
    });
    logFeature('Evidence Grounding & Clause Traceability', hasEvidence ? 'PASS' : 'FAIL', { hasEvidence });

    // 8. Explainability / Why Matched
    console.log('\n--- 8. Testing Recommendations Explainability ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/recommendations`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasExplainability = await page.evaluate(() => {
      return document.body.innerText.includes('Why matched') || document.body.innerText.includes('Why not');
    });
    logFeature('Explainability & Why-Matched Decision Space', hasExplainability ? 'PASS' : 'FAIL', { hasExplainability });

    // 9. Review Workspace & Sign-Off
    console.log('\n--- 9. Testing Review & Sign-Off ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/review`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasReviewWorkspace = await page.evaluate(() => {
      return document.body.innerText.includes('Review workspace') || document.body.innerText.includes('Decision log');
    });
    logFeature('Review Workspace & Collaboration Comments', hasReviewWorkspace ? 'PASS' : 'FAIL', { hasReviewWorkspace });

    // 10. Reports Dossier
    console.log('\n--- 10. Testing Tender Reports & Exports ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/reports`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasReportDossier = await page.evaluate(() => {
      return document.body.innerText.includes('Standards-Aligned Procurement Report') || document.body.innerText.includes('Compliance Dossier');
    });
    logFeature('Bilingual Tender Reports & Export Dossier', hasReportDossier ? 'PASS' : 'FAIL', { hasReportDossier });

    // 11. Knowledge Graph
    console.log('\n--- 11. Testing Knowledge Graph Visualizer ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/graph`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const hasGraphCanvas = await page.$('canvas, svg');
    logFeature('Knowledge Graph Visualizer', !!hasGraphCanvas ? 'PASS' : 'FAIL', { hasGraphCanvas: !!hasGraphCanvas });

    // 12. Coverage Matrix & Audit
    console.log('\n--- 12. Testing Coverage & Audit Trail ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/audit`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasAuditMatrix = await page.evaluate(() => {
      return document.body.innerText.includes('Coverage matrix') || document.body.innerText.includes('Coverage detail');
    });
    logFeature('Coverage Matrix & Gap Audit', hasAuditMatrix ? 'PASS' : 'FAIL', { hasAuditMatrix });

    // 13. Regulatory & QCO
    console.log('\n--- 13. Testing Regulatory & QCO Schemes ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/regulatory`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasQcoSchemes = await page.evaluate(() => {
      return document.body.innerText.includes('Quality Control Orders') || document.body.innerText.includes('Certification schemes');
    });
    logFeature('QCO Orders & Mandatory Certification Schemes', hasQcoSchemes ? 'PASS' : 'FAIL', { hasQcoSchemes });

    // 14. AI Copilot
    console.log('\n--- 14. Testing AI Procurement Copilot ---');
    await page.goto(`${BASE_URL}/analyses/${DEMO_ANALYSIS_ID}/copilot`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const copilotFound = await page.evaluate(() => {
      return document.body.innerText.includes('Procurement Copilot') || document.body.innerText.includes('Ask');
    });
    logFeature('AI Procurement Copilot Assistant', copilotFound ? 'PASS' : 'FAIL', { copilotFound });

    // 15. Department Analytics & Reports Page
    console.log('\n--- 15. Testing Department Analytics & Reports ---');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasAnalyticsContent = await page.evaluate(() => {
      return document.body.innerText.includes('Portfolio Compliance Rate') && 
             document.body.innerText.includes('Sector Compliance Breakdown') &&
             document.body.innerText.includes('Recent Tender Dossiers');
    });
    logFeature('Department Analytics & Compliance Reports', hasAnalyticsContent ? 'PASS' : 'FAIL', { hasAnalyticsContent });

    // 16. Standards Library
    console.log('\n--- 16. Testing Global Standards Library ---');
    await page.goto(`${BASE_URL}/standards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasStandardsLibrary = await page.evaluate(() => {
      return document.body.innerText.includes('Standards Library') || document.body.innerText.includes('IS 10322');
    });
    logFeature('Global Standards Catalogue & Search', hasStandardsLibrary ? 'PASS' : 'FAIL', { hasStandardsLibrary });

    // 17. Standard Detail View
    console.log('\n--- 17. Testing Standard Detail View ---');
    await page.goto(`${BASE_URL}/standards/IS_10322_PART_5_SEC_3_2012`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasDetailView = await page.evaluate(() => {
      return document.body.innerText.includes('Luminaires') || document.body.innerText.includes('IS 10322');
    });
    logFeature('Authoritative Standard Clause Detail', hasDetailView ? 'PASS' : 'FAIL', { hasDetailView });

    // 18. Regulatory Updates Feed
    console.log('\n--- 18. Testing Regulatory Updates Feed ---');
    await page.goto(`${BASE_URL}/regulatory-updates`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasUpdates = await page.evaluate(() => {
      return document.body.innerText.includes('Regulatory Updates') || document.body.innerText.includes('Gazette') || document.body.innerText.includes('Order');
    });
    logFeature('Regulatory Updates & Gazette Monitoring', hasUpdates ? 'PASS' : 'FAIL', { hasUpdates });

    // 19. Tender Ingestion Wizard
    console.log('\n--- 19. Testing Tender Ingestion Wizard ---');
    await page.goto(`${BASE_URL}/analyses/new`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasDropzone = await page.$('input[type="file"], [data-testid="dropzone"], div[class*="border-dashed"]');
    logFeature('Tender Document Ingestion & Wizard', !!hasDropzone ? 'PASS' : 'FAIL', { hasDropzone: !!hasDropzone });

    // 20. Case History / My Submissions
    console.log('\n--- 20. Testing Submissions & Sign-Off History ---');
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasHistoryContent = await page.evaluate(() => {
      return document.body.innerText.includes('Submissions') || document.body.innerText.includes('Queue');
    });
    logFeature('Tender Lifecycle & Audit History', hasHistoryContent ? 'PASS' : 'FAIL', { hasHistoryContent });

    // 21. Help & User Manual
    console.log('\n--- 21. Testing Help & Guidance Manual ---');
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const hasHelpContent = await page.evaluate(() => {
      return document.body.innerText.includes('Help') || document.body.innerText.includes('User Guide') || document.body.innerText.includes('How MORPHEUS Works');
    });
    logFeature('Help & Procurement Guidelines Manual', hasHelpContent ? 'PASS' : 'FAIL', { hasHelpContent });

    // 22. Switch to Admin and test Admin Console & Evaluation
    console.log('\n--- 22. Testing Admin Role Switch & System Console ---');
    // Logout and login as admin
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.textContent.includes('Administrator'));
      if (adminBtn) adminBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Now visit /admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasAdminConsole = await page.evaluate(() => {
      return document.body.innerText.includes('Admin') && (document.body.innerText.includes('System health') || document.body.innerText.includes('Dataset'));
    });
    logFeature('Administrator Console & System Diagnostics', hasAdminConsole ? 'PASS' : 'FAIL', { hasAdminConsole });

    // Visit /evaluation
    await page.goto(`${BASE_URL}/evaluation`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    const hasEvaluationMetrics = await page.evaluate(() => {
      return document.body.innerText.includes('Evaluation') && 
             (document.body.innerText.includes('Precision') || document.body.innerText.includes('Recall') || document.body.innerText.includes('labelled cases'));
    });
    logFeature('Retrieval Evaluation & Gold Benchmark Harness', hasEvaluationMetrics ? 'PASS' : 'FAIL', { hasEvaluationMetrics });

  } catch (err) {
    console.error('Test execution error:', err);
    results.unhandledError = err.message;
  } finally {
    await browser.close();
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  console.log(`\nSurvey completed! Results saved to ${LOG_FILE}`);
  console.log(`Summary: Total=${results.totalFeatures}, Passed=${results.passedCount}, Warn=${results.warnCount}, Fail=${results.failCount}`);
  console.log(`Console Errors: ${results.consoleErrors.length}, Network Failures: ${results.networkFailures.length}`);
}

runSurvey();
