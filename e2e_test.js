const assert = require('assert');

async function isServerRunning(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function runE2ETests() {
  console.log('=== STARTING END-TO-END SYSTEM INTEGRATION TESTS ===\n');
  const port = process.env.TEST_PORT || 5000;
  const baseUrl = `http://localhost:${port}/api/v1`;
  let serverInstance = null;

  const alreadyRunning = await isServerRunning(`${baseUrl}/health`);
  if (!alreadyRunning) {
    console.log(`No active server found on port ${port}. Starting internal test server...`);
    process.env.NODE_ENV = 'test';
    process.env.PORT = String(port);
    const { app, connectDatabase } = require('./server');
    await connectDatabase();
    await new Promise((resolve) => {
      serverInstance = app.listen(port, () => {
        console.log(`✔ Internal test server listening on ${baseUrl}\n`);
        resolve();
      });
    });
  } else {
    console.log(`✔ Connected to existing server on ${baseUrl}\n`);
  }

  try {
    // 1. Health Check
    console.log('Test 1: Health check endpoint...');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
    const healthData = await healthRes.json();
    console.log('✔ Health Status:', healthData.status);

  // 2. Templates Catalog
  console.log('\nTest 2: Templates catalog...');
  const tmplRes = await fetch(`${baseUrl}/templates`);
  assert.strictEqual(tmplRes.status, 200);
  const tmplData = await tmplRes.json();
  console.log(`✔ Found ${tmplData.templates.length} templates:`, tmplData.templates.map(t => t.name).join(', '));
  assert.strictEqual(tmplData.templates.length, 5, 'Should return all 5 required templates');

  // 3. Demo User Login
  console.log('\nTest 3: Authentication & Login...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@resume.dev', password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login should succeed');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(token, 'Must receive JWT token');
  console.log('✔ User Authenticated:', loginData.user.username);
  console.log('✔ User Profile Loaded:', loginData.profile.name, `(${loginData.profile.title})`);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 4. Fetch Profile & Resumes
  console.log('\nTest 4: Resumes listing & Active resume...');
  const resumesRes = await fetch(`${baseUrl}/resumes`, { headers });
  assert.strictEqual(resumesRes.status, 200);
  const resumesData = await resumesRes.json();
  const activeResume = resumesData.resumes[0];
  const resumeId = activeResume.id || activeResume._id;
  console.log(`✔ Active Resume: "${activeResume.name}" (ID: ${resumeId})`);

  // 5. AI Content Generation (Grounding & Explanation Check)
  console.log('\nTest 5: AI Content Generation (US-003, US-006)...');
  const aiGenRes = await fetch(`${baseUrl}/resumes/${resumeId}/ai/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ section: 'summary' }),
  });
  assert.strictEqual(aiGenRes.status, 200);
  const aiGenData = await aiGenRes.json();
  console.log('✔ AI Suggested Content Preview:', aiGenData.suggestion.suggestedContent.slice(0, 100) + '...');
  console.log('✔ AI Explanation:', aiGenData.suggestion.explanation);
  console.log('✔ AI Confidence Score:', aiGenData.suggestion.confidence);
  console.log('✔ Source Grounding Fields:', aiGenData.suggestion.sourceFields);
  assert(aiGenData.suggestion.confidence >= 0.8, 'Confidence should be >= 0.8');
  assert(aiGenData.suggestion.explanation.length > 10, 'Must include explanation');

  // 6. AI Content Improvement
  console.log('\nTest 6: AI Content Improvement...');
  const aiImpRes = await fetch(`${baseUrl}/resumes/${resumeId}/ai/improve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      section: 'summary',
      content: 'I worked on UI design and helped with design systems for teams.',
    }),
  });
  assert.strictEqual(aiImpRes.status, 200);
  const aiImpData = await aiImpRes.json();
  console.log('✔ Improved Content:', aiImpData.suggestedContent);
  console.log('✔ AI Improvement Explanation:', aiImpData.explanation);
  assert(!aiImpData.suggestedContent.includes('worked on'), 'Should replace weak phrases with strong action verbs');

  // 7. Job Description Analysis & Keyword Extraction (US-004)
  console.log('\nTest 7: Job Description Analysis & Keywords Extraction (US-004)...');
  const sampleJd = `We need a Senior Product Designer with deep expertise in Figma, Design Systems, UX Research, A/B Testing, Prototyping, and Enterprise SaaS. Experience with WCAG 2.1 AA accessibility standards required.`;
  const jdRes = await fetch(`${baseUrl}/resumes/${resumeId}/job-description`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobDescription: sampleJd }),
  });
  assert.strictEqual(jdRes.status, 200);
  const jdData = await jdRes.json();
  console.log('✔ Extracted Keywords Count:', jdData.analysis.extractedKeywords.length);
  console.log('✔ Extracted Keywords Sample:', jdData.analysis.extractedKeywords.slice(0, 6).join(', '));
  assert(jdData.analysis.extractedKeywords.length >= 5, 'Should extract role keywords');

  // 8. Resume-Job Matching
  console.log('\nTest 8: Resume <-> Job Matching...');
  const matchRes = await fetch(`${baseUrl}/resumes/${resumeId}/match`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobDescription: sampleJd }),
  });
  assert.strictEqual(matchRes.status, 200);
  const matchData = await matchRes.json();
  console.log('✔ Match Score:', matchData.match.score + '%');
  console.log('✔ Matched Skills Sample:', matchData.match.matchedSkills.slice(0, 4).join(', '));
  console.log('✔ Missing Skills Sample:', matchData.match.missingSkills.slice(0, 4).join(', '));
  assert(matchData.match.score >= 50, 'Match score should reflect strong overlap');

  // 9. ATS Compatibility Analysis (US-005)
  console.log('\nTest 9: ATS Compatibility Scoring & Audit (US-005)...');
  const atsRes = await fetch(`${baseUrl}/resumes/${resumeId}/ats-analysis`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobDescription: sampleJd }),
  });
  assert.strictEqual(atsRes.status, 200);
  const atsData = await atsRes.json();
  console.log('✔ ATS Score:', atsData.ats.score, '/ 100');
  console.log('✔ ATS Status Summary:', atsData.ats.summary);
  console.log('✔ ATS 4 Core Checks:', atsData.ats.checks.map(c => `${c.label}: ${c.value} (${c.status})`).join(' | '));
  console.log('✔ ATS Suggestions Count:', atsData.ats.suggestions.length);
  console.log('✔ ATS Disclaimer:', atsData.ats.disclaimer);
  assert(atsData.ats.score >= 70, 'ATS score should be high for rich profile');
  assert(atsData.ats.checks.length === 4, 'Must evaluate all 4 core checks');
  assert(atsData.ats.disclaimer.includes('ATS score is an estimate'), 'Must provide required ATS disclaimer');

  // 10. Cover Letter Generation
  console.log('\nTest 10: Cover Letter Studio Generation...');
  const clRes = await fetch(`${baseUrl}/resumes/${resumeId}/cover-letter`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ company: 'Linear', role: 'Staff Product Designer' }),
  });
  assert.strictEqual(clRes.status, 200);
  const clData = await clRes.json();
  console.log('✔ Tailored Cover Letter Preview:\n', clData.coverLetter.slice(0, 140) + '...\n');
  assert(clData.coverLetter.includes('Linear'), 'Cover letter must mention company');

  // 11. PDF Export Preparation (US-009)
  console.log('Test 11: PDF Export Preparation (US-009)...');
  const exportRes = await fetch(`${baseUrl}/resumes/${resumeId}/export`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(exportRes.status, 200);
  const exportData = await exportRes.json();
  console.log('✔ Export ID:', exportData.exportId);
  console.log('✔ File Name:', exportData.fileName);
  assert(exportData.exportId && exportData.fileName, 'Must provide export metadata');

  // 12. Application Tracker CRUD
  console.log('\nTest 12: Job Application Tracker...');
  const createAppRes = await fetch(`${baseUrl}/applications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      company: 'Linear',
      role: 'Staff Product Designer',
      location: 'Remote',
      status: 'Applied',
      matchScore: 88,
      notes: 'Applied via team referral',
    }),
  });
  assert.strictEqual(createAppRes.status, 201);
  const createdApp = await createAppRes.json();
  const appId = createdApp.application.id || createdApp.application._id;
  console.log('✔ Created Application:', createdApp.application.company, `(ID: ${appId})`);

  const listAppsRes = await fetch(`${baseUrl}/applications`, { headers });
  const listAppsData = await listAppsRes.json();
  console.log(`✔ Tracked Applications Count: ${listAppsData.applications.length}`);
  assert(listAppsData.applications.some(a => (a.id || a._id) === appId), 'Should list created application');

  // Clean up test application
  await fetch(`${baseUrl}/applications/${appId}`, { method: 'DELETE', headers });
  console.log('✔ Cleaned up test application');

  // 13. Resume Duplication (US-010)
  console.log('\nTest 13: Resume Version Duplication (US-010)...');
  const dupRes = await fetch(`${baseUrl}/resumes/${resumeId}/duplicate`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(dupRes.status, 201);
  const dupData = await dupRes.json();
  const dupId = dupData.resume.id || dupData.resume._id;
  console.log(`✔ Duplicated Version Created: "${dupData.resume.name}" (ID: ${dupId})`);

  // Delete duplicate to restore state
  await fetch(`${baseUrl}/resumes/${dupId}`, { method: 'DELETE', headers });
  console.log('✔ Cleaned up duplicated test resume');

  // 14. SaaS Subscription & Plans Catalog
  console.log('\nTest 14: SaaS Subscription & Plans Catalog...');
  const subRes = await fetch(`${baseUrl}/subscription`, { headers });
  assert.strictEqual(subRes.status, 200, 'Subscription endpoint should return 200');
  const subData = await subRes.json();
  console.log('✔ Active Plan:', subData.subscription.plan.toUpperCase());
  console.log('✔ AI Credits Available:', subData.subscription.aiCreditsRemaining);
  console.log(`✔ Plans Catalog Loaded (${subData.plansCatalog.length} tiers):`, subData.plansCatalog.map(p => p.name).join(' | '));
  assert(subData.plansCatalog.length >= 3, 'Must have at least 3 SaaS tiers');

  // 15. SaaS Plan Upgrade
  console.log('\nTest 15: SaaS Plan Upgrade Flow...');
  const upgradeRes = await fetch(`${baseUrl}/subscription/upgrade`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan: 'pro', cycle: 'annual', paymentMethod: { last4: '4242' } }),
  });
  assert.strictEqual(upgradeRes.status, 200, 'Upgrade should succeed');
  const upgradeData = await upgradeRes.json();
  console.log('✔ Upgrade Success Message:', upgradeData.message);
  console.log('✔ Generated Invoice:', upgradeData.invoice.id, `(${upgradeData.invoice.amount})`);
  assert.strictEqual(upgradeData.user.plan, 'pro');

  // 16. Credit Top-Up
  console.log('\nTest 16: SaaS Credit Top-Up...');
  const topUpRes = await fetch(`${baseUrl}/subscription/add-credits`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(topUpRes.status, 200);
  const topUpData = await topUpRes.json();
  console.log('✔ Added Credits. New Balance:', topUpData.creditsRemaining);

  // 17. User Settings & BYOK API Keys
  console.log('\nTest 17: User Settings & BYOK Custom Key Provisioning...');
  const settingsRes = await fetch(`${baseUrl}/user/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ customOpenAiKey: 'sk-proj-testsamplekey12345' }),
  });
  assert.strictEqual(settingsRes.status, 200);
  const settingsData = await settingsRes.json();
  console.log('✔ Custom Key Configured:', settingsData.user.hasCustomKeys ? 'Active (BYOK Mode)' : 'Inactive');

  // 18. GDPR Data Export
  console.log('\nTest 18: GDPR Compliant Data Export Bundle...');
  const exportDataRes = await fetch(`${baseUrl}/user/export-data`, { headers });
  assert.strictEqual(exportDataRes.status, 200);
  const gdprExportBundle = await exportDataRes.json();
  console.log('✔ GDPR Bundle Version:', gdprExportBundle.exportVersion);
  console.log('✔ User Exported:', gdprExportBundle.user.username);
  console.log(`✔ Attached Resumes: ${gdprExportBundle.resumes.length}, Applications: ${gdprExportBundle.applications.length}`);

  // 19. Google OAuth Configuration & Sign-In Verification
  console.log('\nTest 19: Google OAuth Configuration & Lifecycle Verification...');
  const gConfigRes = await fetch(`${baseUrl}/auth/google/config`);
  assert.strictEqual(gConfigRes.status, 200);
  const gConfig = await gConfigRes.json();
  console.log('✔ Google Auth Config Loaded:', `Mode: ${gConfig.mode}`);

  // Test Google User Authentication
  const googleAuthRes = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockUser: {
        email: 'alex.rivers@gmail.com',
        name: 'Alex Rivers',
        googleId: 'google_test_12345',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      },
    }),
  });
  assert.strictEqual(googleAuthRes.status, 200, 'Google sign-in should return 200');
  const googleAuthData = await googleAuthRes.json();
  assert(googleAuthData.token, 'Must return JWT token');
  assert.strictEqual(googleAuthData.user.email, 'alex.rivers@gmail.com');
  assert.strictEqual(googleAuthData.user.authProvider, 'google');
  console.log('✔ Google User Authenticated:', googleAuthData.user.username, `(${googleAuthData.user.authProvider})`);
  console.log('✔ Google User Profile Auto-Created:', googleAuthData.profile.name, `(${googleAuthData.profile.email})`);
  console.log('✔ Google User Free Credits Granted:', googleAuthData.user.aiCreditsRemaining);

  console.log('\n======================================================');
  console.log('🎉 ALL 19 END-TO-END SAAS SYSTEM TESTS PASSED (100%)');
  console.log('======================================================');
  } finally {
    if (serverInstance) {
      console.log('Shutting down internal test server...');
      await new Promise((resolve) => serverInstance.close(resolve));
      process.exit(0);
    }
  }
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E TEST FAILURE:', err);
  process.exit(1);
});
