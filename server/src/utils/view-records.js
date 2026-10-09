import prisma from '../db/prisma.js';

async function showDbRecords() {
  const userCount = await prisma.user.count();
  const serviceCount = await prisma.service.count();
  const featureCount = await prisma.feature.count();
  const projectCount = await prisma.project.count();
  const fileCount = await prisma.projectFile.count();
  const messageCount = await prisma.contactMessage.count();
  const historyCount = await prisma.projectStatusHistory.count();
  const auditCount = await prisma.auditLog.count();

  console.log('===========================================================');
  console.log('             VELANTIS DATABASE RECORD REPORT');
  console.log('===========================================================');
  console.log(`Users (Admin/Staff)  : ${userCount}`);
  console.log(`Services             : ${serviceCount}`);
  console.log(`Features             : ${featureCount}`);
  console.log(`Projects             : ${projectCount}`);
  console.log(`Attached Files       : ${fileCount}`);
  console.log(`Contact Inquiries    : ${messageCount}`);
  console.log(`Status History Logs  : ${historyCount}`);
  console.log(`Audit Logs           : ${auditCount}`);
  console.log('===========================================================\n');

  console.log('--- RECENT PROJECTS ---');
  const recentProjects = await prisma.project.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      referenceNumber: true,
      clientName: true,
      clientEmail: true,
      budgetRange: true,
      timeline: true,
      status: true,
      createdAt: true,
    },
  });
  console.table(recentProjects);

  console.log('\n--- RECENT CONTACT INQUIRIES ---');
  const recentMessages = await prisma.contactMessage.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      email: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  });
  console.table(recentMessages);

  console.log('\n--- RECENT AUDIT TRAIL LOGS ---');
  const recentAudits = await prisma.auditLog.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      resourceType: true,
      resourceId: true,
      ipAddress: true,
      createdAt: true,
    },
  });
  console.table(recentAudits);

  console.log('\n--- REGISTERED USERS ---');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  console.table(users);

  await prisma.$disconnect();
}

showDbRecords().catch((err) => {
  console.error('Error fetching records:', err);
  process.exit(1);
});
