import app from '../src/app.js';
import prisma from '../src/db/prisma.js';

async function testContactAPI() {
  console.log('🧪 Starting Contact Inquiries API automated test...');

  const PORT = 5095;
  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}/api/contact`;

      // 1. Test valid contact submission
      const validPayload = {
        name: 'Rohan Mehra',
        email: 'rohan@example.com',
        subject: 'Website Development',
        projectType: 'E-Commerce Solutions',
        message: 'Hello VELANTIS team, we need an e-commerce platform with automated invoicing and UPI payment gateway.',
      };

      const resValid = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const jsonValid = await resValid.json();

      if (resValid.status !== 201 || !jsonValid.success || !jsonValid.data?.id) {
        throw new Error(`Valid contact submission failed: ${JSON.stringify(jsonValid)}`);
      }

      console.log(`✅ Valid contact message created with ID: ${jsonValid.data.id}`);

      // Verify database record
      const dbMessage = await prisma.contactMessage.findUnique({
        where: { id: jsonValid.data.id },
      });
      if (!dbMessage || dbMessage.status !== 'NEW' || dbMessage.email !== validPayload.email) {
        throw new Error('Database record missing or has incorrect status/email');
      }
      console.log('✅ Database persistence verified (status: NEW)');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          resourceType: 'MESSAGE',
          resourceId: jsonValid.data.id,
          action: 'CONTACT_MESSAGE_RECEIVED',
        },
      });
      if (!audit) throw new Error('Audit log missing for contact message');
      console.log('✅ Audit log entry verified');

      // 2. Test Honeypot anti-spam protection
      const initialCount = await prisma.contactMessage.count();
      const botPayload = {
        name: 'Spam Bot 3000',
        email: 'bot@spamnetwork.com',
        subject: 'General Inquiry',
        message: 'Check out this suspicious link http://spam.xyz/now for cheap backlinks!',
        hp_website: 'http://spam.xyz', // Bot filled hidden honeypot trap!
      };

      const resBot = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botPayload),
      });
      const jsonBot = await resBot.json();

      const postBotCount = await prisma.contactMessage.count();
      if (postBotCount !== initialCount) {
        throw new Error('Honeypot failure: Spam bot was allowed to write into contact_messages database');
      }
      console.log('✅ Honeypot anti-spam trap verified (Zero spam entered database)');

      // 3. Test validation error (short message & invalid email)
      const invalidPayload = {
        name: 'A',
        email: 'bad-email',
        subject: 'A',
        message: 'Too short',
      };

      const resInvalid = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const jsonInvalid = await resInvalid.json();

      if (resInvalid.status !== 422 || jsonInvalid.error?.code !== 'VALIDATION_ERROR') {
        throw new Error(`Expected 422 VALIDATION_ERROR, got ${resInvalid.status}`);
      }
      console.log('✅ Validation error handling verified (422 status with issue list)');

      console.log('🎉 All Contact API tests PASSED!');
    } catch (err) {
      console.error('❌ Contact API test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testContactAPI();
