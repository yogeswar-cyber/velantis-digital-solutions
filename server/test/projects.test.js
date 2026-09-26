import app from '../src/app.js';
import prisma from '../src/db/prisma.js';

async function testProjectsAPI() {
  console.log('🧪 Starting Project Booking API automated test...');

  const PORT = 5096;
  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}/api/projects`;

      // 1. Get a service to attach features to
      const service = await prisma.service.findFirst({
        where: { slug: 'website-development' },
        include: { features: true },
      });
      if (!service) {
        throw new Error('Test service not found in database.');
      }
      const featureIds = service.features.slice(0, 3).map((f) => f.id);

      // 2. Test valid project submission
      const payload1 = {
        clientName: 'Aarav Patel',
        clientEmail: 'aarav@example.com',
        clientPhone: '+91 98765 12345',
        companyName: 'Apex Technologies',
        serviceId: service.slug,
        budgetRange: '₹25,000 – ₹50,000',
        timeline: '2 – 4 weeks',
        description: 'We need a high-performance modern business website with customer accounts and payment processing.',
        selectedFeatureIds: featureIds,
        customRequirements: 'Must integrate seamlessly with our internal inventory webhook.',
      };

      const resCreate1 = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1),
      });
      const jsonCreate1 = await resCreate1.json();

      if (resCreate1.status !== 201 || !jsonCreate1.success || !jsonCreate1.data?.referenceNumber) {
        throw new Error(`Project 1 creation failed: ${JSON.stringify(jsonCreate1)}`);
      }

      const ref1 = jsonCreate1.data.referenceNumber;
      console.log(`✅ Project 1 created successfully with Reference: ${ref1}`);

      // Verify format VL-YYYY-XXXX
      const refRegex = /^VL-\d{4}-\d{4}$/;
      if (!refRegex.test(ref1)) {
        throw new Error(`Reference number '${ref1}' does not match pattern VL-YYYY-XXXX`);
      }

      // Verify database entities
      const dbProject1 = await prisma.project.findUnique({
        where: { referenceNumber: ref1 },
        include: {
          features: true,
          statusHistory: true,
        },
      });

      if (!dbProject1) throw new Error('Database record missing for project 1');
      if (dbProject1.features.length !== 4) {
        // 3 structured + 1 custom
        throw new Error(`Expected 4 attached features (3 structured + 1 custom), found ${dbProject1.features.length}`);
      }
      if (dbProject1.statusHistory.length !== 1) {
        throw new Error(`Expected 1 status history entry, found ${dbProject1.statusHistory.length}`);
      }
      console.log('✅ Database transaction verified (Project, Features, StatusHistory)');

      // 3. Test sequential reference numbering
      const payload2 = {
        clientName: 'Priya Sharma',
        clientEmail: 'priya@example.com',
        serviceId: 'e-commerce-solutions',
        description: 'Complete online apparel store with shopping cart and payment integration.',
      };

      const resCreate2 = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2),
      });
      const jsonCreate2 = await resCreate2.json();

      if (resCreate2.status !== 201 || !jsonCreate2.data?.referenceNumber) {
        throw new Error(`Project 2 creation failed: ${JSON.stringify(jsonCreate2)}`);
      }
      const ref2 = jsonCreate2.data.referenceNumber;
      console.log(`✅ Project 2 created with sequential Reference: ${ref2}`);

      // Verify ref2 is sequence after ref1
      const seq1 = parseInt(ref1.split('-')[2], 10);
      const seq2 = parseInt(ref2.split('-')[2], 10);
      if (seq2 !== seq1 + 1) {
        throw new Error(`Expected sequence ${seq1 + 1}, got ${seq2}`);
      }
      console.log('✅ Sequential reference generation verified');

      // 4. Test validation error (invalid email & short description)
      const invalidPayload = {
        clientName: 'A',
        clientEmail: 'not-an-email',
        serviceId: 'website-development',
        description: 'Short',
      };

      const resInvalid = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });
      const jsonInvalid = await resInvalid.json();

      if (resInvalid.status !== 422 || jsonInvalid.success !== false || jsonInvalid.error?.code !== 'VALIDATION_ERROR') {
        throw new Error(`Expected 422 VALIDATION_ERROR, got ${resInvalid.status}`);
      }
      console.log('✅ Validation error handling verified (422 response with issue list)');

      // 5. Test public lookup by reference
      const resLookup = await fetch(`${baseUrl}/${ref1}`);
      const jsonLookup = await resLookup.json();

      if (resLookup.status !== 200 || !jsonLookup.success || jsonLookup.data.referenceNumber !== ref1) {
        throw new Error(`Project lookup failed for reference ${ref1}`);
      }
      if (jsonLookup.data.internalNotes !== undefined) {
        throw new Error('Security risk: internalNotes exposed on public lookup endpoint');
      }
      console.log('✅ Public reference lookup verified (Safe payload without internal notes)');

      // 6. Test 404 for unknown reference
      const res404 = await fetch(`${baseUrl}/VL-2099-9999`);
      const json404 = await res404.json();
      if (res404.status !== 404 || json404.error?.code !== 'PROJECT_NOT_FOUND') {
        throw new Error(`Expected 404 for unknown reference, got ${res404.status}`);
      }
      console.log('✅ Unknown reference 404 verified');

      console.log('🎉 All Project Booking API tests PASSED!');
    } catch (err) {
      console.error('❌ Project Booking API test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testProjectsAPI();
