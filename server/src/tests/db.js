import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const require = createRequire(import.meta.url);
const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'migrations');

// Safety guard: these helpers delete data, so they refuse to run against any database
// whose name does not end in "_test" (e.g. never against the development "teamsync" database).
const assertTestDatabase = () => {
  const dbName = new URL(process.env.MONGO_URI).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against database "${dbName}". Its name must end with "_test".`);
  }
};

// Connects and applies the real migrations, so the test database has the same indexes as development
// (e.g. the unique email index).
export async function connectTestDb() {
  assertTestDatabase();
  await mongoose.connect(process.env.MONGO_URI);

  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.cjs')).sort();
  for (const file of files) {
    await require(path.join(migrationsDir, file)).up(mongoose.connection.db);
  }
}

// Empties every collection (indexes stay). Runs after each test so tests cannot affect each other.
export async function clearTestDb() {
  assertTestDatabase();
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function closeTestDb() {
  assertTestDatabase();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
