import app from '../src/app.js';
import prisma from '../src/db/prisma.js';

async function testServicesAPI() {
  console.log('🧪 Starting Services & Features API automated test...');

  const PORT = 5097;
  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}/api/services`;

      // 1. Test GET /api/services
      const resAll = await fetch(baseUrl);
      const jsonAll = await resAll.json();

      if (resAll.status !== 200 || !jsonAll.success || !Array.isArray(jsonAll.data)) {
        throw new Error(`GET /api/services failed with status ${resAll.status}`);
      }
      if (jsonAll.data.length !== 12) {
        throw new Error(`Expected 12 services, received ${jsonAll.data.length}`);
      }
      console.log(`✅ GET /api/services passed (Retrieved ${jsonAll.data.length} services)`);

      // 2. Test GET /api/services/:id (using slug)
      const targetSlug = 'website-development';
      const resSingle = await fetch(`${baseUrl}/${targetSlug}`);
      const jsonSingle = await resSingle.json();

      if (resSingle.status !== 200 || !jsonSingle.success || jsonSingle.data.slug !== targetSlug) {
        throw new Error(`GET /api/services/${targetSlug} failed with status ${resSingle.status}`);
      }
      if (!Array.isArray(jsonSingle.data.features) || jsonSingle.data.features.length === 0) {
        throw new Error(`Service '${targetSlug}' has no attached features`);
      }
      console.log(`✅ GET /api/services/:slug passed ('${jsonSingle.data.name}' with ${jsonSingle.data.features.length} features)`);

      // 3. Test GET /api/services/:id/features
      const resFeatures = await fetch(`${baseUrl}/${targetSlug}/features`);
      const jsonFeatures = await resFeatures.json();

      if (resFeatures.status !== 200 || !jsonFeatures.success || !Array.isArray(jsonFeatures.data.features)) {
        throw new Error(`GET /api/services/${targetSlug}/features failed with status ${resFeatures.status}`);
      }
      console.log(`✅ GET /api/services/:slug/features passed (${jsonFeatures.data.features.length} features retrieved)`);

      // 4. Test GET /api/services/non-existent (404 test)
      const resNotFound = await fetch(`${baseUrl}/non-existent-service-slug`);
      const jsonNotFound = await resNotFound.json();

      if (resNotFound.status !== 404 || jsonNotFound.success !== false || jsonNotFound.error?.code !== 'SERVICE_NOT_FOUND') {
        throw new Error(`Expected 404 with code SERVICE_NOT_FOUND, got ${resNotFound.status}`);
      }
      console.log('✅ GET /api/services/non-existent passed (Clean 404 handling verified)');

      console.log('🎉 All Services & Features API tests PASSED!');
    } catch (err) {
      console.error('❌ Services API test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testServicesAPI();
