import app from '../src/app.js';

async function testHealthEndpoint() {
  const PORT = 5099;
  const server = app.listen(PORT, async () => {
    try {
      console.log(`Test server running on port ${PORT}...`);
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      const data = await response.json();

      console.log('Status code:', response.status);
      console.log('Response body:', JSON.stringify(data, null, 2));

      // Assertions
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      if (!data.success || data.data?.status !== 'ok') {
        throw new Error('Health check returned invalid response structure');
      }

      console.log('✅ Health check test PASSED!');
    } catch (err) {
      console.error('❌ Health check test FAILED:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

testHealthEndpoint();
