import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { validateMagicBytes } from '../src/utils/magicBytes.js';
import { sanitizeInputs } from '../src/middleware/sanitizer.js';
import { createProjectSchema } from '../src/validators/project.validator.js';
import { createContactSchema } from '../src/validators/contact.validator.js';
import { loginSchema, changePasswordSchema } from '../src/validators/auth.validator.js';
import { UPLOAD_BASE_DIR } from '../src/middleware/upload.js';

async function runUnitTests() {
  console.log('🧪 Starting Unit Tests (Validators, Utilities, Middleware)...');

  // 1. Test Project Validator Schema
  console.log('  Testing createProjectSchema...');
  const validProject = {
    clientName: 'Rahul Mehta',
    clientEmail: 'rahul@example.com',
    serviceId: 'website-development',
    description: 'A full-stack business portal with modern UI and authentication.',
  };
  const parseProject = createProjectSchema.safeParse(validProject);
  assert.strictEqual(parseProject.success, true, 'Valid project payload should pass schema');

  const invalidProject = {
    clientName: 'R', // too short
    clientEmail: 'not-email',
    serviceId: '',
    description: 'short', // < 10 chars
  };
  const failProject = createProjectSchema.safeParse(invalidProject);
  assert.strictEqual(failProject.success, false, 'Invalid project payload should fail');
  assert.strictEqual(failProject.error.issues.length >= 4, true, 'Should catch all field errors');
  console.log('  ✅ createProjectSchema validation verified');

  // 2. Test Contact Validator Schema
  console.log('  Testing createContactSchema...');
  const validContact = {
    name: 'Ananya Roy',
    email: 'ananya@roy.com',
    subject: 'General Inquiry',
    message: 'Hello VELANTIS, I would like to inquire about project pricing.',
  };
  const parseContact = createContactSchema.safeParse(validContact);
  assert.strictEqual(parseContact.success, true, 'Valid contact payload should pass schema');

  const invalidContact = {
    name: '',
    email: 'bad-email',
    subject: '',
    message: 'hi',
  };
  const failContact = createContactSchema.safeParse(invalidContact);
  assert.strictEqual(failContact.success, false, 'Invalid contact payload should fail');
  console.log('  ✅ createContactSchema validation verified');

  // 3. Test Auth Validator Schemas
  console.log('  Testing auth schemas...');
  const validLogin = { email: 'admin@velantis.in', password: 'password123' };
  assert.strictEqual(loginSchema.safeParse(validLogin).success, true, 'Valid login should pass');
  assert.strictEqual(loginSchema.safeParse({ email: 'bad', password: '1' }).success, false, 'Invalid login should fail');

  const strongPw = { currentPassword: 'old', newPassword: 'StrongPassword123!' };
  assert.strictEqual(changePasswordSchema.safeParse(strongPw).success, true, 'Strong password should pass');
  const weakPw = { currentPassword: 'old', newPassword: 'lowercaseonly' };
  assert.strictEqual(changePasswordSchema.safeParse(weakPw).success, false, 'Weak password without uppercase/digit should fail');
  console.log('  ✅ Auth schemas verified');

  // 4. Test Magic Bytes Validator
  console.log('  Testing validateMagicBytes file signature detector...');
  const testDir = path.resolve(UPLOAD_BASE_DIR, 'test_temp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // PDF
  const testPdfPath = path.resolve(testDir, 'test.pdf');
  fs.writeFileSync(testPdfPath, Buffer.from('%PDF-1.7\nSample content'));
  const isPdf = await validateMagicBytes(testPdfPath, '.pdf');
  assert.strictEqual(isPdf, true, 'Valid PDF header should pass magic bytes');

  // PNG
  const testPngPath = path.resolve(testDir, 'test.png');
  fs.writeFileSync(testPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isPng = await validateMagicBytes(testPngPath, '.png');
  assert.strictEqual(isPng, true, 'Valid PNG header should pass magic bytes');

  // Spoofed file (executable script with .pdf extension)
  const spoofedPath = path.resolve(testDir, 'fake.pdf');
  fs.writeFileSync(spoofedPath, Buffer.from('malicious payload disguised as pdf'));
  const isFakePdf = await validateMagicBytes(spoofedPath, '.pdf');
  assert.strictEqual(isFakePdf, false, 'Spoofed file should be rejected by magic bytes');

  // Clean up temp test files
  fs.unlinkSync(testPdfPath);
  fs.unlinkSync(testPngPath);
  fs.unlinkSync(spoofedPath);
  fs.rmdirSync(testDir);
  console.log('  ✅ Magic bytes signature detector verified');

  // 5. Test Input Sanitization Middleware
  console.log('  Testing sanitizeInputs middleware...');
  const mockReq = {
    body: {
      name: '  <script>evil()</script>John Doe  ',
      description: 'Text with <img src=x onerror=alert(1)> and clean paragraph.',
      nested: {
        field: 'Safe text with <iframe src="..."></iframe> ending.',
      },
      tags: ['<b>Bold</b>', 'Clean Tag'],
    },
    query: {
      search: 'javascript:alert(1)',
    },
    params: {},
  };

  sanitizeInputs(mockReq, {}, () => {});
  assert.strictEqual(mockReq.body.name, 'John Doe', 'Script tags should be removed and trimmed');
  assert.strictEqual(mockReq.body.description.includes('<img'), false, 'img tags should be stripped');
  assert.strictEqual(mockReq.body.nested.field, 'Safe text with  ending.', 'Nested iframe tags should be stripped');
  assert.strictEqual(mockReq.body.tags[0], 'Bold', 'Array items should be sanitized');
  assert.strictEqual(mockReq.query.search, 'alert(1)', 'javascript: pseudo-protocol should be stripped');
  console.log('  ✅ sanitizeInputs middleware verified');

  console.log('🎉 All Unit Tests PASSED!');
}

runUnitTests().catch((err) => {
  console.error('❌ Unit test failed:', err);
  process.exit(1);
});
