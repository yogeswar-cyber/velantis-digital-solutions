import prisma from '../src/db/prisma.js';
import app from '../src/app.js';

async function testDatabaseConnectivity() {
  console.log('🧪 Starting database connectivity & integrity test...');

  try {
    // 1. Raw query probe
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Raw database probe succeeded.');

    // 2. Verify admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@velantis.in' },
    });
    if (!admin) {
      throw new Error('Admin user was not found in database.');
    }
    console.log(`✅ Admin user verified: ${admin.email} (Role: ${admin.role})`);

    // 3. Verify services count
    const serviceCount = await prisma.service.count();
    if (serviceCount !== 12) {
      throw new Error(`Expected 12 services, found ${serviceCount}`);
    }
    console.log(`✅ Verified ${serviceCount} services in database.`);

    // 4. Verify features count
    const featureCount = await prisma.feature.count();
    if (featureCount < 40) {
      throw new Error(`Expected at least 40 features, found ${featureCount}`);
    }
    console.log(`✅ Verified ${featureCount} structured features across services.`);

    // 5. Verify live health check reports database connected
    const PORT = 5098;
    const server = app.listen(PORT, async () => {
      try {
        const res = await fetch(`http://localhost:${PORT}/api/health`);
        const json = await res.json();
        console.log('Health response:', json);

        if (json.data?.database !== 'connected' || json.data?.status !== 'ok') {
          throw new Error('Health check did not report database as connected.');
        }

        console.log('✅ Health endpoint database connectivity probe verified!');
      } finally {
        server.close();
      }
    });

  } catch (err) {
    console.error('❌ Database test failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnectivity();
