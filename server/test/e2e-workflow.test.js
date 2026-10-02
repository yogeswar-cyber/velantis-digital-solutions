import app from '../src/app.js';
import prisma from '../src/db/prisma.js';
import bcrypt from 'bcryptjs';

async function testEndToEndWorkflow() {
  console.log('🧪 Starting End-to-End Client & Admin Business Lifecycle Test...');

  const PORT = 5090;
  const baseUrl = `http://localhost:${PORT}/api`;

  // Prepare admin user
  const adminPassword = 'WorkflowAdmin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'workflow_admin@velantis.in' },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email: 'workflow_admin@velantis.in',
      name: 'Workflow Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  let createdProjectId = null;
  let referenceNumber = null;
  let attachedFileId = null;

  const server = app.listen(PORT, async () => {
    try {
      // Step 1: Client browses active services
      console.log('  Step 1: Client browses services and features...');
      const resServices = await fetch(`${baseUrl}/services`);
      const jsonServices = await resServices.json();
      if (resServices.status !== 200 || jsonServices.data.length === 0) {
        throw new Error('Step 1 Failed: Cannot fetch services');
      }
      const targetService = jsonServices.data.find((s) => s.slug === 'website-development') || jsonServices.data[0];
      const selectedFeatureIds = targetService.features?.slice(0, 2).map((f) => f.id) || [];
      console.log(`  ✅ Selected service: "${targetService.name}" with ${selectedFeatureIds.length} features`);

      // Step 2: Client books a project
      console.log('  Step 2: Client submits project request...');
      const bookingPayload = {
        clientName: 'Siddharth Nair',
        clientEmail: 'siddharth@nairtech.com',
        clientPhone: '+91 98765 11223',
        companyName: 'Nair Technologies',
        serviceId: targetService.slug,
        budgetRange: '₹25,000 – ₹50,000',
        timeline: '2 – 4 weeks',
        description: 'Complete redesign of enterprise web portal with custom API integrations and audit logs.',
        selectedFeatureIds,
        customRequirements: 'Must include custom Stripe payment gateway webhook.',
      };

      const resCreate = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      const jsonCreate = await resCreate.json();

      if (resCreate.status !== 201 || !jsonCreate.data?.referenceNumber) {
        throw new Error(`Step 2 Failed: Project creation failed: ${JSON.stringify(jsonCreate)}`);
      }
      createdProjectId = jsonCreate.data.id;
      referenceNumber = jsonCreate.data.referenceNumber;
      console.log(`  ✅ Project created successfully! Reference Number: ${referenceNumber}`);

      // Step 3: Client attaches reference files
      console.log('  Step 3: Client attaches architecture diagram file...');
      const validPdfBytes = Buffer.from('%PDF-1.4\n%Minimal valid architecture diagram\n%%EOF');
      const validPdfBlob = new Blob([validPdfBytes], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('files', validPdfBlob, 'system_architecture.pdf');

      const resUpload = await fetch(`${baseUrl}/projects/${createdProjectId}/files`, {
        method: 'POST',
        body: formData,
      });
      const jsonUpload = await resUpload.json();

      if (resUpload.status !== 201 || jsonUpload.data.count !== 1) {
        throw new Error(`Step 3 Failed: File upload failed: ${JSON.stringify(jsonUpload)}`);
      }
      attachedFileId = jsonUpload.data.files[0].id;
      console.log(`  ✅ Attached file: system_architecture.pdf (ID: ${attachedFileId})`);

      // Step 4: Client checks public reference lookup
      console.log('  Step 4: Client verifies public reference tracking...');
      const resLookup = await fetch(`${baseUrl}/projects/${referenceNumber}`);
      const jsonLookup = await resLookup.json();

      if (resLookup.status !== 200 || jsonLookup.data.referenceNumber !== referenceNumber) {
        throw new Error('Step 4 Failed: Public reference lookup failed');
      }
      if (jsonLookup.data.internalNotes !== undefined) {
        throw new Error('Step 4 Security Failure: Internal notes leaked on public endpoint');
      }
      console.log(`  ✅ Public reference verified (Status: ${jsonLookup.data.status}, No private notes leaked)`);

      // Step 5: Admin signs into Operations Portal
      console.log('  Step 5: Admin signs into dashboard...');
      const resLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'workflow_admin@velantis.in', password: adminPassword }),
      });
      const cookies = resLogin.headers.getSetCookie?.() || resLogin.headers.get('set-cookie');
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies || '';
      const tokenMatch = cookieStr.match(/token=([^;]+)/);
      if (!tokenMatch) throw new Error('Step 5 Failed: Login cookie missing');
      const authCookie = `token=${tokenMatch[1]}`;
      console.log('  ✅ Admin authenticated with secure HttpOnly session');

      // Step 6: Admin inspects dashboard metrics
      console.log('  Step 6: Admin views operational metrics...');
      const resMetrics = await fetch(`${baseUrl}/admin/metrics`, {
        headers: { Cookie: authCookie },
      });
      const jsonMetrics = await resMetrics.json();
      if (resMetrics.status !== 200 || jsonMetrics.data.totals.projects === 0) {
        throw new Error('Step 6 Failed: Metrics retrieval failed');
      }
      console.log(`  ✅ Metrics verified (${jsonMetrics.data.totals.projects} total projects, ${jsonMetrics.data.totals.newProjects} new)`);

      // Step 7: Admin reviews project details and downloads client file
      console.log('  Step 7: Admin retrieves project details and downloads attachment...');
      const resAdminDetail = await fetch(`${baseUrl}/admin/projects/${createdProjectId}`, {
        headers: { Cookie: authCookie },
      });
      const jsonAdminDetail = await resAdminDetail.json();
      if (resAdminDetail.status !== 200 || jsonAdminDetail.data.files.length !== 1) {
        throw new Error('Step 7 Failed: Project details missing files');
      }

      const resDownload = await fetch(`${baseUrl}/projects/${createdProjectId}/files/${attachedFileId}`);
      if (resDownload.status !== 200 || !resDownload.headers.get('content-disposition')?.includes('attachment')) {
        throw new Error('Step 7 Failed: Secure file download failed');
      }
      console.log('  ✅ Admin inspected scope and successfully downloaded attached client architecture document');

      // Step 8: Admin updates status to REVIEWING
      console.log('  Step 8: Admin transitions status to REVIEWING...');
      const resStatus1 = await fetch(`${baseUrl}/admin/projects/${createdProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          status: 'REVIEWING',
          statusNotes: 'Technical feasibility and infrastructure review started.',
        }),
      });
      const jsonStatus1 = await resStatus1.json();
      if (resStatus1.status !== 200 || jsonStatus1.data.status !== 'REVIEWING') {
        throw new Error('Step 8 Failed: Status transition failed');
      }
      console.log('  ✅ Status successfully updated to REVIEWING with history entry');

      // Step 9: Admin saves private internal engineering notes
      console.log('  Step 9: Admin saves private internal staff notes...');
      const resNotes = await fetch(`${baseUrl}/admin/projects/${createdProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          internalNotes: 'Internal: Estimated effort is 60 engineering hours. Assigned to lead backend developer.',
        }),
      });
      const jsonNotes = await resNotes.json();
      if (resNotes.status !== 200 || !jsonNotes.data.internalNotes.includes('60 engineering hours')) {
        throw new Error('Step 9 Failed: Internal notes update failed');
      }
      console.log('  ✅ Private staff notes saved securely');

      // Step 10: Admin approves project and verifies audit trail
      console.log('  Step 10: Admin approves project and verifies audit trail...');
      await fetch(`${baseUrl}/admin/projects/${createdProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          status: 'APPROVED',
          statusNotes: 'Contract and quote approved by both parties.',
        }),
      });

      // Verify status history
      const history = await prisma.projectStatusHistory.findMany({
        where: { projectId: createdProjectId },
        orderBy: { createdAt: 'asc' },
      });
      if (history.length < 3) {
        throw new Error(`Expected at least 3 status transitions, found ${history.length}`);
      }

      // Verify audit logs
      const auditCount = await prisma.auditLog.count({
        where: { resourceId: createdProjectId },
      });
      if (auditCount < 3) {
        throw new Error(`Expected at least 3 audit log entries for project, found ${auditCount}`);
      }

      console.log(`  ✅ Complete lifecycle verified: ${history.length} status history entries and ${auditCount} audit log records!`);
      console.log('🎉 End-to-End Workflow Test PASSED 100%!');
    } catch (err) {
      console.error('❌ End-to-End Workflow Test failed:', err);
      process.exitCode = 1;
    } finally {
      // Clean up test data
      if (createdProjectId) {
        await prisma.project.delete({ where: { id: createdProjectId } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      server.close();
      await prisma.$disconnect();
    }
  });
}

testEndToEndWorkflow();
