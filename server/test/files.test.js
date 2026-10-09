import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/db/prisma.js';
import { config } from '../src/config/env.js';
import { UPLOAD_BASE_DIR } from '../src/middleware/upload.js';

async function testFilesAPI() {
  console.log('🧪 Starting Secure File Uploads API automated test...');

  const PORT = 5094;
  const server = app.listen(PORT, async () => {
    try {
      // 1. Create a project to attach files to
      const project = await prisma.project.create({
        data: {
          referenceNumber: `VL-TEST-${Date.now().toString().slice(-4)}`,
          clientName: 'File Test User',
          clientEmail: 'filetest@example.com',
          description: 'Testing secure file upload attachments and streaming downloads.',
          status: 'NEW',
        },
      });

      console.log(`Created test project: ${project.referenceNumber}`);
      const uploadUrl = `http://localhost:${PORT}/api/projects/${project.id}/files`;

      // 2. Prepare real valid test files (valid magic bytes)
      // Real minimal PDF (%PDF-1.4 ...)
      const validPdfBytes = Buffer.from('%PDF-1.4\n%Minimal valid PDF header for test\n%%EOF');
      const validPdfBlob = new Blob([validPdfBytes], { type: 'application/pdf' });

      // Real minimal PNG (0x89 50 4E 47 0D 0A 1A 0A ...)
      const validPngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);
      const validPngBlob = new Blob([validPngBytes], { type: 'image/png' });

      const formDataValid = new FormData();
      formDataValid.append('files', validPdfBlob, 'architecture_plan.pdf');
      formDataValid.append('files', validPngBlob, 'mockup_wireframe.png');

      const resUpload = await fetch(uploadUrl, {
        method: 'POST',
        body: formDataValid,
      });
      const jsonUpload = await resUpload.json();

      if (resUpload.status !== 201 || !jsonUpload.success || jsonUpload.data.count !== 2) {
        throw new Error(`File upload failed: ${JSON.stringify(jsonUpload)}`);
      }

      console.log(`✅ Uploaded 2 valid files to project (IDs: ${jsonUpload.data.files.map((f) => f.id).join(', ')})`);

      // Verify records in database
      const dbFiles = await prisma.projectFile.findMany({
        where: { projectId: project.id },
      });
      if (dbFiles.length !== 2) {
        throw new Error(`Expected 2 files in database, found ${dbFiles.length}`);
      }
      console.log('✅ Database metadata verified in project_files table');

      // 3. Test Controlled Download Endpoint
      const fileToDownload = dbFiles[0];
      const downloadUrl = `http://localhost:${PORT}/api/projects/${project.id}/files/${fileToDownload.id}`;

      // Verify unauthenticated download is rejected with 401
      const unauthDownload = await fetch(downloadUrl);
      if (unauthDownload.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated download, got ${unauthDownload.status}`);
      }
      console.log('✅ Unauthenticated file download blocked with 401 as expected');

      // Create admin auth token
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const token = jwt.sign(
        { userId: admin ? admin.id : 'test-admin', email: admin ? admin.email : 'admin@velantis.in', role: 'ADMIN' },
        config.jwtSecret
      );
      const authCookie = `token=${token}`;

      // Test authenticated download
      const resDownload = await fetch(downloadUrl, {
        headers: { Cookie: authCookie },
      });
      if (resDownload.status !== 200) {
        throw new Error(`Authenticated download failed with status ${resDownload.status}`);
      }

      const contentDisp = resDownload.headers.get('content-disposition');
      const nosniff = resDownload.headers.get('x-content-type-options');

      if (!contentDisp || !contentDisp.includes('attachment')) {
        throw new Error('Missing Content-Disposition: attachment header on download');
      }
      if (nosniff !== 'nosniff') {
        throw new Error('Missing X-Content-Type-Options: nosniff header on download');
      }

      const downloadedBuffer = Buffer.from(await resDownload.arrayBuffer());
      if (downloadedBuffer.length !== fileToDownload.size) {
        throw new Error('Downloaded file size does not match stored file size');
      }
      console.log('✅ Secure authenticated download verified with protected headers and matching content');

      // 4. Test Magic Bytes Spoofing Attack Rejection
      // A fake PDF file containing script code instead of %PDF magic bytes
      const spoofedBytes = Buffer.from('console.log("malicious executable content");');
      const spoofedBlob = new Blob([spoofedBytes], { type: 'application/pdf' });

      const formDataSpoof = new FormData();
      formDataSpoof.append('files', spoofedBlob, 'trojan_disguised.pdf');

      const resSpoof = await fetch(uploadUrl, {
        method: 'POST',
        body: formDataSpoof,
      });
      const jsonSpoof = await resSpoof.json();

      if (resSpoof.status !== 422 || jsonSpoof.error?.code !== 'INVALID_FILE_SIGNATURE') {
        throw new Error(`Expected 422 INVALID_FILE_SIGNATURE, got ${resSpoof.status}: ${JSON.stringify(jsonSpoof)}`);
      }
      console.log('✅ Extension spoofing attack successfully caught and rejected by magic bytes inspection');

      // Clean up test files from disk & DB
      for (const f of dbFiles) {
        const diskPath = path.resolve(UPLOAD_BASE_DIR, f.storedFilename);
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      }
      await prisma.project.delete({ where: { id: project.id } });

      console.log('🎉 All Secure File Upload tests PASSED!');
    } catch (err) {
      console.error('❌ File upload test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testFilesAPI();
