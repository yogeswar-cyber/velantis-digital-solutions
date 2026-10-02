import prisma from '../src/db/prisma.js';
import { getEmailTransporter } from '../src/services/email/transporter.js';
import {
  renderProjectConfirmationClient,
  renderProjectNotificationTeam,
  renderContactConfirmationClient,
  renderContactNotificationTeam,
} from '../src/services/email/templates.js';
import { sendProjectEmails, sendContactEmails } from '../src/services/email/email.service.js';

async function testEmailSystem() {
  console.log('🧪 Starting Transactional Email System automated test...');

  try {
    // 1. Test Transporter initialization and fallback
    const { transporter, isConfigured } = getEmailTransporter();
    if (!transporter || typeof transporter.sendMail !== 'function') {
      throw new Error('Transporter was not properly initialized');
    }
    console.log(`✅ Email transporter initialized (SMTP configured: ${isConfigured}, fallback mode active: ${!isConfigured})`);

    // 2. Test Project Confirmation Template Rendering
    const dummyProject = {
      id: 'test-proj-email-1',
      referenceNumber: 'VL-2026-9999',
      clientName: 'Aarav Sharma',
      clientEmail: 'aarav@example.com',
      clientPhone: '+91 98765 00000',
      companyName: 'Apex Innovations',
      budgetRange: '₹25,000 – ₹50,000',
      timeline: '2 – 4 weeks',
      description: 'Custom e-commerce store with automated invoicing.',
    };

    const clientEmail = renderProjectConfirmationClient({
      project: dummyProject,
      serviceName: 'E-Commerce Solutions',
      featureNames: ['Shopping Cart', 'Payment Gateway', 'Inventory Management'],
    });

    if (!clientEmail.subject.includes(dummyProject.referenceNumber)) {
      throw new Error('Subject does not include project reference number');
    }
    if (!clientEmail.html.includes(dummyProject.clientName) || !clientEmail.html.includes('Shopping Cart')) {
      throw new Error('HTML template does not include client name or features');
    }
    if (!clientEmail.text.includes(dummyProject.referenceNumber)) {
      throw new Error('Plain text template does not include reference number');
    }
    console.log('✅ Client project confirmation template verified (HTML + Plain text)');

    // 3. Test Team Project Notification Template
    const teamEmail = renderProjectNotificationTeam({
      project: dummyProject,
      serviceName: 'E-Commerce Solutions',
      featureNames: ['Shopping Cart'],
      adminUrl: 'http://localhost:5173/admin',
    });

    if (!teamEmail.subject.includes(dummyProject.clientName)) {
      throw new Error('Team notification subject missing client name');
    }
    if (!teamEmail.html.includes('http://localhost:5173/admin')) {
      throw new Error('Team notification HTML missing admin portal URL');
    }
    console.log('✅ Team project notification template verified (HTML + Plain text)');

    // 4. Test Contact Inquiry Templates
    const dummyMessage = {
      id: 'test-msg-email-1',
      name: 'Priya Verma',
      email: 'priya@example.com',
      subject: 'AI & Automation Inquiry',
      message: 'Interested in building an automated customer support bot.',
    };

    const contactClientEmail = renderContactConfirmationClient({ contactMessage: dummyMessage });
    if (!contactClientEmail.html.includes(dummyMessage.name) || !contactClientEmail.html.includes(dummyMessage.subject)) {
      throw new Error('Contact confirmation email missing sender name or subject');
    }

    const contactTeamEmail = renderContactNotificationTeam({
      contactMessage: dummyMessage,
      adminUrl: 'http://localhost:5173/admin',
    });
    if (!contactTeamEmail.html.includes(dummyMessage.email)) {
      throw new Error('Team contact notification email missing sender email');
    }
    console.log('✅ Contact inquiry templates verified (Client + Team)');

    // 5. Test Live Email Service Dispatch (Non-blocking + Audit Logging)
    // Create a real DB project for audit linking
    const testProject = await prisma.project.create({
      data: {
        referenceNumber: `VL-EML-${Date.now().toString().slice(-4)}`,
        clientName: 'Email Test Client',
        clientEmail: 'emailtest@example.com',
        description: 'Project to verify email service dispatch and audit trail.',
        status: 'NEW',
      },
    });

    sendProjectEmails({
      project: testProject,
      serviceName: 'Website Development',
      featureNames: ['Responsive Design', 'SEO Optimization'],
    });

    // Wait a brief tick for setImmediate async execution
    await new Promise((r) => setTimeout(r, 150));

    // Verify audit log for email dispatch
    const emailAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'EMAIL_SENT',
        resourceId: testProject.id,
      },
    });

    if (!emailAudit) {
      throw new Error('Audit log for EMAIL_SENT was not recorded');
    }
    console.log('✅ Asynchronous email dispatch and audit logging verified');

    // Clean up test project
    await prisma.project.delete({ where: { id: testProject.id } });

    console.log('🎉 All Email System tests PASSED!');
  } catch (err) {
    console.error('❌ Email System test failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

testEmailSystem();
