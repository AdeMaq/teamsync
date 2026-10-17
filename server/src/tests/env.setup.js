// Runs before every test file, before any app code is imported.
// Variables set here win over server/.env (dotenv never overwrites existing variables), so the tests
// never touch the development database and never send real email.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST ?? 'mongodb://localhost:27017/teamsync_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SMTP_HOST = '';
