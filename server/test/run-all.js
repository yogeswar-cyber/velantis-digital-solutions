import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_SUITES = [
  { name: 'Unit Tests (Validators & Utilities)', file: 'unit.test.js' },
  { name: 'Health Check & DB Probe', file: 'health.test.js' },
  { name: 'Database Integrity & Relations', file: 'database.test.js' },
  { name: 'Services & Features API', file: 'services.test.js' },
  { name: 'Transactional Project Booking API', file: 'projects.test.js' },
  { name: 'Contact Inquiries & Honeypot Anti-Spam', file: 'contact.test.js' },
  { name: 'Secure File Uploads & Magic Bytes', file: 'files.test.js' },
  { name: 'HttpOnly JWT Auth & RBAC', file: 'auth.test.js' },
  { name: 'Admin Dashboard & Status Transitions', file: 'admin.test.js' },
  { name: 'Transactional Email & Templates', file: 'email.test.js' },
  { name: 'Security Hardening, Headers & Sanitization', file: 'security.test.js' },
  { name: 'End-to-End Client to Admin Lifecycle', file: 'e2e-workflow.test.js' },
];

function runSuite(test) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const filePath = path.resolve(__dirname, test.file);

    const child = fork(filePath, { stdio: 'inherit' });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        name: test.name,
        file: test.file,
        passed: code === 0,
        durationMs,
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      resolve({
        name: test.name,
        file: test.file,
        passed: false,
        error: err.message,
        durationMs,
      });
    });
  });
}

async function runAllSuites() {
  console.log('===========================================================');
  console.log('   VELANTIS DIGITAL SOLUTIONS — FULL TEST SUITE RUNNER');
  console.log('===========================================================\n');

  const overallStart = Date.now();
  const results = [];

  for (const test of TEST_SUITES) {
    console.log(`\n▶ Running: ${test.name} (${test.file})...`);
    const res = await runSuite(test);
    results.push(res);
  }

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n===========================================================');
  console.log('                    TEST EXECUTION SUMMARY');
  console.log('===========================================================');

  for (const r of results) {
    const statusSymbol = r.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${(r.durationMs / 1000).toFixed(2)}s`;
    console.log(`  ${statusSymbol.padEnd(8)} | ${r.name.padEnd(46)} | ${duration.padStart(6)}`);
  }

  console.log('-----------------------------------------------------------');
  console.log(`Total Suites : ${results.length}`);
  console.log(`Passed       : ${passedCount}`);
  console.log(`Failed       : ${failedCount}`);
  console.log(`Total Time   : ${overallDuration}s`);
  console.log('===========================================================\n');

  if (failedCount > 0) {
    console.error('❌ One or more test suites failed.');
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 TEST SUITES PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
}

runAllSuites();
