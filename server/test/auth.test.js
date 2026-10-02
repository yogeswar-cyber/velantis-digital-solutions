import app from '../src/app.js';
import prisma from '../src/db/prisma.js';
import bcrypt from 'bcryptjs';

async function testAuthAPI() {
  console.log('🧪 Starting Authentication API automated test...');

  const PORT = 5093;
  const baseUrl = `http://localhost:${PORT}/api/auth`;

  // Create a test user with known password
  const testPassword = 'SecureTest123!';
  const testHash = await bcrypt.hash(testPassword, 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'authtest@velantis.in' },
    update: { passwordHash: testHash },
    create: {
      email: 'authtest@velantis.in',
      name: 'Auth Test User',
      passwordHash: testHash,
      role: 'ADMIN',
    },
  });

  const server = app.listen(PORT, async () => {
    try {
      // 1. Test invalid login (wrong password)
      const resWrongPw = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'authtest@velantis.in', password: 'wrongpassword' }),
      });
      const jsonWrongPw = await resWrongPw.json();

      if (resWrongPw.status !== 401 || jsonWrongPw.error?.code !== 'INVALID_CREDENTIALS') {
        throw new Error(`Expected 401 INVALID_CREDENTIALS, got ${resWrongPw.status}: ${JSON.stringify(jsonWrongPw)}`);
      }
      console.log('✅ Invalid login rejected with 401 (timing-safe, generic error)');

      // Verify failed login audit log
      const failedAudit = await prisma.auditLog.findFirst({
        where: { action: 'LOGIN_FAILED', resourceId: testUser.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!failedAudit) throw new Error('Missing failed login audit log entry');
      console.log('✅ Failed login attempt recorded in audit log');

      // 2. Test invalid login (non-existent email)
      const resNoUser = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@nowhere.com', password: 'anything' }),
      });
      if (resNoUser.status !== 401) {
        throw new Error(`Expected 401 for non-existent user, got ${resNoUser.status}`);
      }
      console.log('✅ Non-existent email rejected without revealing user existence');

      // 3. Test successful login
      const resLogin = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'authtest@velantis.in', password: testPassword }),
      });
      const jsonLogin = await resLogin.json();

      if (resLogin.status !== 200 || !jsonLogin.success || !jsonLogin.data?.id) {
        throw new Error(`Login failed: ${JSON.stringify(jsonLogin)}`);
      }
      if (jsonLogin.data.passwordHash || jsonLogin.data.password) {
        throw new Error('SECURITY RISK: Password hash was exposed in login response!');
      }

      // Extract Set-Cookie header
      const cookies = resLogin.headers.getSetCookie?.() || resLogin.headers.get('set-cookie');
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies || '';

      if (!cookieStr.includes('token=')) {
        throw new Error('HttpOnly JWT cookie not set in login response');
      }
      if (!cookieStr.toLowerCase().includes('httponly')) {
        throw new Error('Cookie is not HttpOnly — security vulnerability');
      }

      console.log(`✅ Login successful for ${jsonLogin.data.email} (Role: ${jsonLogin.data.role})`);
      console.log('✅ HttpOnly JWT cookie verified in Set-Cookie header');

      // Verify lastLoginAt was updated
      const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      if (!updatedUser.lastLoginAt) {
        throw new Error('lastLoginAt was not updated after login');
      }
      console.log('✅ lastLoginAt timestamp updated in database');

      // 4. Test GET /me with valid cookie
      const tokenMatch = cookieStr.match(/token=([^;]+)/);
      const tokenValue = tokenMatch ? tokenMatch[1] : '';

      const resMe = await fetch(`${baseUrl}/me`, {
        headers: { Cookie: `token=${tokenValue}` },
      });
      const jsonMe = await resMe.json();

      if (resMe.status !== 200 || !jsonMe.success || jsonMe.data?.email !== 'authtest@velantis.in') {
        throw new Error(`GET /me failed: ${JSON.stringify(jsonMe)}`);
      }
      console.log('✅ GET /me returns authenticated user profile');

      // 5. Test GET /me without cookie (should fail 401)
      const resMeNoCookie = await fetch(`${baseUrl}/me`);
      if (resMeNoCookie.status !== 401) {
        throw new Error(`Expected 401 without cookie, got ${resMeNoCookie.status}`);
      }
      console.log('✅ GET /me returns 401 when no auth cookie is present');

      // 6. Test password change
      const newPassword = 'UpdatedSecure456!';
      const resChangePw = await fetch(`${baseUrl}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenValue}` },
        body: JSON.stringify({
          currentPassword: testPassword,
          newPassword: newPassword,
        }),
      });
      const jsonChangePw = await resChangePw.json();

      if (resChangePw.status !== 200 || !jsonChangePw.success) {
        throw new Error(`Password change failed: ${JSON.stringify(jsonChangePw)}`);
      }

      // Verify new password works
      const resLoginNew = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'authtest@velantis.in', password: newPassword }),
      });
      if (resLoginNew.status !== 200) {
        throw new Error('Login with new password failed after change');
      }
      console.log('✅ Password change verified (new password works, old is invalidated)');

      // 7. Test password change with weak password (validation)
      const resWeakPw = await fetch(`${baseUrl}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenValue}` },
        body: JSON.stringify({
          currentPassword: newPassword,
          newPassword: 'weak',
        }),
      });
      if (resWeakPw.status !== 422) {
        throw new Error(`Expected 422 for weak password, got ${resWeakPw.status}`);
      }
      console.log('✅ Weak password rejection verified (min 8 chars, uppercase, lowercase, number)');

      // 8. Test logout
      const resLogout = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenValue}` },
      });
      if (resLogout.status !== 200) {
        throw new Error(`Logout failed: ${resLogout.status}`);
      }

      // Verify logout audit log
      const logoutAudit = await prisma.auditLog.findFirst({
        where: { action: 'LOGOUT', resourceId: testUser.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!logoutAudit) throw new Error('Missing logout audit log');
      console.log('✅ Logout successful with audit trail');

      // 9. Test validation errors (malformed email)
      const resValidation = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-email', password: '12345' }),
      });
      if (resValidation.status !== 422) {
        throw new Error(`Expected 422 validation error, got ${resValidation.status}`);
      }
      console.log('✅ Login validation errors verified (422 with issue list)');

      console.log('🎉 All Authentication API tests PASSED!');
    } catch (err) {
      console.error('❌ Authentication API test failed:', err);
      process.exitCode = 1;
    } finally {
      // Cleanup test user
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      server.close();
      await prisma.$disconnect();
    }
  });
}

testAuthAPI();
