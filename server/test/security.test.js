import app from '../src/app.js';
import prisma from '../src/db/prisma.js';

async function testSecurityHardening() {
  console.log('🧪 Starting Security Hardening automated test...');

  const PORT = 5091;
  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}/api`;

      // 1. Test Security Headers
      const resHealth = await fetch(`${baseUrl}/health`);
      const headers = resHealth.headers;

      // X-Frame-Options
      const frameOptions = headers.get('x-frame-options');
      if (!frameOptions || frameOptions.toUpperCase() !== 'DENY') {
        throw new Error(`Expected X-Frame-Options: DENY, got '${frameOptions}'`);
      }
      console.log('✅ X-Frame-Options: DENY verified (Clickjacking protection)');

      // X-Content-Type-Options
      const nosniff = headers.get('x-content-type-options');
      if (nosniff !== 'nosniff') {
        throw new Error(`Expected X-Content-Type-Options: nosniff, got '${nosniff}'`);
      }
      console.log('✅ X-Content-Type-Options: nosniff verified (MIME sniffing prevention)');

      // X-Powered-By must be absent
      const poweredBy = headers.get('x-powered-by');
      if (poweredBy) {
        throw new Error(`Security vulnerability: X-Powered-By header is exposed ('${poweredBy}')`);
      }
      console.log('✅ X-Powered-By header completely hidden (Technology obfuscation)');

      // Referrer-Policy
      const referrerPolicy = headers.get('referrer-policy');
      if (!referrerPolicy || !referrerPolicy.includes('strict-origin')) {
        throw new Error(`Expected strict Referrer-Policy, got '${referrerPolicy}'`);
      }
      console.log('✅ Referrer-Policy: strict-origin-when-cross-origin verified');

      // 2. Test CORS Enforcement
      // Valid origin
      const resCorsValid = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'http://localhost:5173' },
      });
      const allowOrigin = resCorsValid.headers.get('access-control-allow-origin');
      const allowCreds = resCorsValid.headers.get('access-control-allow-credentials');

      if (allowOrigin !== 'http://localhost:5173' || allowCreds !== 'true') {
        throw new Error(`CORS validation failed for valid origin: ${allowOrigin}`);
      }
      console.log('✅ CORS allowed origin and credentials verified');

      // Invalid origin
      const resCorsInvalid = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'http://malicious-attacker-domain.xyz' },
      });
      if (resCorsInvalid.status === 200 && resCorsInvalid.headers.get('access-control-allow-origin') === 'http://malicious-attacker-domain.xyz') {
        throw new Error('CORS security vulnerability: Disallowed origin was permitted!');
      }
      console.log('✅ CORS rejection of unauthorized origins verified');

      // 3. Test Payload Limits (1MB cap)
      // Craft a payload > 1MB
      const oversizedPayload = {
        data: 'A'.repeat(1.2 * 1024 * 1024), // 1.2 MB
      };

      const resOversized = await fetch(`${baseUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedPayload),
      });

      if (resOversized.status !== 413) {
        throw new Error(`Expected 413 Payload Too Large for 1.2MB JSON, got ${resOversized.status}`);
      }
      console.log('✅ Payload limit verified (1.2MB request rejected with 413 Payload Too Large)');

      // 4. Test XSS Input Sanitization
      const xssPayload = {
        name: '<script>alert("pwned")</script>Security Tester',
        email: 'security@example.com',
        subject: 'General Inquiry',
        message: 'Normal message with <img src=x onerror=alert(1)> and clean text exceeding ten chars.',
      };

      const resXss = await fetch(`${baseUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload),
      });
      const jsonXss = await resXss.json();

      if (resXss.status !== 201) {
        throw new Error(`Contact creation failed: ${JSON.stringify(jsonXss)}`);
      }

      // Check DB record to ensure script tags were stripped
      const dbSaved = await prisma.contactMessage.findUnique({
        where: { id: jsonXss.data.id },
      });

      if (dbSaved.name.includes('<script>') || dbSaved.message.includes('<img')) {
        throw new Error(`XSS sanitization failed: dangerous HTML tags found in DB record: ${dbSaved.name}`);
      }
      if (!dbSaved.name.includes('Security Tester')) {
        throw new Error('Sanitization corrupted benign content');
      }
      console.log('✅ XSS input sanitization verified (<script> and <img> tags stripped before persistence)');

      // Clean up
      await prisma.contactMessage.delete({ where: { id: jsonXss.data.id } });

      console.log('🎉 All Security Hardening tests PASSED!');
    } catch (err) {
      console.error('❌ Security Hardening test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testSecurityHardening();
