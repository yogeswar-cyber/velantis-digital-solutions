import app from '../src/app.js';
import prisma from '../src/db/prisma.js';
import bcrypt from 'bcryptjs';

async function testAdminAPI() {
  console.log('🧪 Starting Admin Dashboard & Operations API automated test...');

  const PORT = 5092;
  const baseUrl = `http://localhost:${PORT}/api/admin`;
  const authUrl = `http://localhost:${PORT}/api/auth`;

  // Prepare admin user
  const adminPassword = 'AdminSecret999!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admintest@velantis.in' },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email: 'admintest@velantis.in',
      name: 'Admin Tester',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // Prepare a test project
  const testProject = await prisma.project.create({
    data: {
      referenceNumber: `VL-ADM-${Date.now().toString().slice(-4)}`,
      clientName: 'Admin Test Client',
      clientEmail: 'client@admintest.com',
      description: 'Project created for admin operations testing.',
      status: 'NEW',
    },
  });

  // Prepare a test contact message
  const testMessage = await prisma.contactMessage.create({
    data: {
      name: 'Inquiry Client',
      email: 'inquiry@test.com',
      subject: 'Website Development',
      message: 'Need urgent consultation for web app development.',
      status: 'NEW',
    },
  });

  const server = app.listen(PORT, async () => {
    try {
      // 1. Guard check: Unauthenticated access must return 401
      const resUnauth = await fetch(`${baseUrl}/metrics`);
      if (resUnauth.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated admin access, got ${resUnauth.status}`);
      }
      console.log('✅ Unauthenticated access correctly rejected with 401');

      // 2. Log in as admin to get session cookie
      const resLogin = await fetch(`${authUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admintest@velantis.in', password: adminPassword }),
      });
      const cookieHeader = resLogin.headers.getSetCookie?.() || resLogin.headers.get('set-cookie');
      const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader || '';
      const tokenMatch = cookieStr.match(/token=([^;]+)/);
      if (!tokenMatch) throw new Error('Failed to obtain auth token cookie');
      const authCookie = `token=${tokenMatch[1]}`;

      console.log('✅ Admin authenticated and session established');

      // 3. Test GET /metrics
      const resMetrics = await fetch(`${baseUrl}/metrics`, {
        headers: { Cookie: authCookie },
      });
      const jsonMetrics = await resMetrics.json();

      if (resMetrics.status !== 200 || !jsonMetrics.success || !jsonMetrics.data?.totals) {
        throw new Error(`Metrics API failed: ${JSON.stringify(jsonMetrics)}`);
      }
      console.log(`✅ Metrics verified: ${jsonMetrics.data.totals.projects} projects, ${jsonMetrics.data.totals.totalMessages} inquiries`);

      // 4. Test GET /projects (search & filter)
      const resProjects = await fetch(`${baseUrl}/projects?search=${testProject.referenceNumber}`, {
        headers: { Cookie: authCookie },
      });
      const jsonProjects = await resProjects.json();

      if (resProjects.status !== 200 || jsonProjects.data.projects.length === 0) {
        throw new Error('Project search by reference number failed');
      }
      console.log(`✅ Project search verified (Found: ${jsonProjects.data.projects[0].referenceNumber})`);

      // 5. Test GET /projects/:id (detailed view with audit logging)
      const resDetail = await fetch(`${baseUrl}/projects/${testProject.id}`, {
        headers: { Cookie: authCookie },
      });
      const jsonDetail = await resDetail.json();

      if (resDetail.status !== 200 || jsonDetail.data.id !== testProject.id) {
        throw new Error('Project detail retrieval failed');
      }
      console.log('✅ Project detail view verified with service & relation links');

      // Verify PROJECT_VIEWED audit log
      const viewAudit = await prisma.auditLog.findFirst({
        where: { action: 'PROJECT_VIEWED', resourceId: testProject.id },
      });
      if (!viewAudit) throw new Error('Missing PROJECT_VIEWED audit log');
      console.log('✅ PROJECT_VIEWED audit log verified');

      // 6. Test Status Transition: NEW -> REVIEWING
      const resStatusChange = await fetch(`${baseUrl}/projects/${testProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          status: 'REVIEWING',
          statusNotes: 'Technical review initiated by engineering team.',
        }),
      });
      const jsonStatusChange = await resStatusChange.json();

      if (resStatusChange.status !== 200 || jsonStatusChange.data.status !== 'REVIEWING') {
        throw new Error(`Status change failed: ${JSON.stringify(jsonStatusChange)}`);
      }

      // Verify status history record
      const historyEntry = await prisma.projectStatusHistory.findFirst({
        where: { projectId: testProject.id, newStatus: 'REVIEWING' },
      });
      if (!historyEntry || historyEntry.oldStatus !== 'NEW') {
        throw new Error('Missing or invalid project_status_history record');
      }
      console.log('✅ Status transition verified with project_status_history entry');

      // 7. Test Internal Notes Update
      const resNotes = await fetch(`${baseUrl}/projects/${testProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          internalNotes: 'Staff note: Client requested a detailed milestone timeline.',
        }),
      });
      const jsonNotes = await resNotes.json();

      if (resNotes.status !== 200 || !jsonNotes.data.internalNotes.includes('Client requested')) {
        throw new Error(`Internal notes update failed: ${JSON.stringify(jsonNotes)}`);
      }
      console.log('✅ Internal staff notes update verified');

      // 8. Test Contact Message Triage: Mark as READ
      const resMsgUpdate = await fetch(`${baseUrl}/messages/${testMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ status: 'READ' }),
      });
      const jsonMsgUpdate = await resMsgUpdate.json();

      if (resMsgUpdate.status !== 200 || jsonMsgUpdate.data.status !== 'READ') {
        throw new Error(`Message status update failed: ${JSON.stringify(jsonMsgUpdate)}`);
      }
      console.log('✅ Contact message triage verified (NEW -> READ)');

      // 9. Test Audit Logs Explorer
      const resAudit = await fetch(`${baseUrl}/audit-logs?action=PROJECT_STATUS_UPDATED`, {
        headers: { Cookie: authCookie },
      });
      const jsonAudit = await resAudit.json();

      if (resAudit.status !== 200 || jsonAudit.data.logs.length === 0) {
        throw new Error('Audit logs retrieval failed');
      }
      console.log(`✅ Audit log explorer verified (${jsonAudit.data.logs.length} status change records found)`);

      console.log('🎉 All Admin Dashboard & Operations API tests PASSED!');
    } catch (err) {
      console.error('❌ Admin API test failed:', err);
      process.exitCode = 1;
    } finally {
      // Cleanup
      await prisma.project.delete({ where: { id: testProject.id } }).catch(() => {});
      await prisma.contactMessage.delete({ where: { id: testMessage.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      server.close();
      await prisma.$disconnect();
    }
  });
}

testAdminAPI();
