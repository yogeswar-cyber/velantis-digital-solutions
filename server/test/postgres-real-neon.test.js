import app from '../src/app.js';
import prisma from '../src/db/prisma.js';

async function testRealNeonPostgresWorkflow() {
  console.log('🧪 Starting REAL Neon PostgreSQL Integration Test...');
  const PORT = 5088;
  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}/api`;

      // 1. Health Probe
      console.log('Step 1: Testing health probe against Neon PostgreSQL...');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthJson = await healthRes.json();
      console.log('Health probe response:', healthJson);
      if (healthRes.status !== 200 || healthJson.data?.database !== 'connected') {
        throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
      }
      console.log('✅ Neon PostgreSQL health probe connected!');

      // 2. Services & Features Retrieval
      console.log('Step 2: Fetching services & features from Neon PostgreSQL...');
      const servicesRes = await fetch(`${baseUrl}/services`);
      const servicesJson = await servicesRes.json();
      if (servicesRes.status !== 200 || !Array.isArray(servicesJson.data) || servicesJson.data.length !== 12) {
        throw new Error(`Expected 12 services, got ${servicesJson.data?.length}`);
      }
      const webDevService = servicesJson.data.find(s => s.slug === 'website-development');
      if (!webDevService || webDevService.features.length === 0) {
        throw new Error('Website Development service or features missing in Neon');
      }
      console.log(`✅ Verified 12 services and ${webDevService.features.length} features for ${webDevService.name} in Neon!`);

      // 3. Project Submission (Workflow B)
      console.log('Step 3: Submitting project request to Neon PostgreSQL...');
      const testFeatureIds = webDevService.features.slice(0, 2).map(f => f.id);
      const projectPayload = {
        clientName: 'Neon Verification Test',
        clientEmail: 'neon.verify@velantis.in',
        clientPhone: '+91 99999 11111',
        companyName: 'Neon Test Labs',
        serviceId: webDevService.slug,
        budgetRange: '₹25,000 – ₹50,000',
        timeline: '2 – 4 weeks',
        description: 'End-to-end production verification test against Neon PostgreSQL.',
        selectedFeatureIds: testFeatureIds,
        customRequirements: 'Dedicated PostgreSQL connection pooler and automated backups',
      };

      const createRes = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });
      const createJson = await createRes.json();
      console.log('Create Project response status:', createRes.status);
      console.log('Create Project response body:', createJson);

      if (createRes.status !== 201 || !createJson.data?.referenceNumber) {
        throw new Error(`Project creation failed: ${JSON.stringify(createJson)}`);
      }
      const refNumber = createJson.data.referenceNumber;
      const projectId = createJson.data.id;
      console.log(`✅ Project created in Neon with Reference: ${refNumber} (ID: ${projectId})`);

      // 4. Verify Record in Neon PostgreSQL Directly via Prisma
      console.log('Step 4: Verifying database record directly in Neon PostgreSQL tables...');
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          features: true,
          statusHistory: true,
        },
      });

      if (!dbProject) {
        throw new Error(`Project ${projectId} not found in Neon database!`);
      }
      if (dbProject.referenceNumber !== refNumber || dbProject.clientEmail !== 'neon.verify@velantis.in') {
        throw new Error('Data mismatch between API response and Neon database record');
      }
      if (dbProject.features.length < 3) { // 2 structured + 1 custom
        throw new Error(`Expected at least 3 features in Neon, found ${dbProject.features.length}`);
      }
      console.log(`✅ Neon PostgreSQL persistence verified! (${dbProject.features.length} features, status: ${dbProject.status})`);

      // 5. Public Retrieval by Reference
      console.log('Step 5: Retrieving project via public reference endpoint...');
      const getRes = await fetch(`${baseUrl}/projects/${refNumber}`);
      const getJson = await getRes.json();
      if (getRes.status !== 200 || getJson.data?.clientName !== 'Neon Verification Test') {
        throw new Error(`Public retrieval failed: ${JSON.stringify(getJson)}`);
      }
      console.log('✅ Public project retrieval verified!');

      // 6. Clean Up Test Record
      console.log('Step 6: Cleaning up test record from Neon PostgreSQL...');
      await prisma.project.delete({ where: { id: projectId } });
      await prisma.auditLog.deleteMany({ where: { resourceId: projectId } });
      console.log('✅ Test record cleaned up safely.');

      console.log('🎉 REAL NEON POSTGRESQL WORKFLOW TEST PASSED 100%!');
    } catch (err) {
      console.error('❌ Neon PostgreSQL test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testRealNeonPostgresWorkflow();
