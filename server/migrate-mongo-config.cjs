require('dotenv').config();

const config = {
  mongodb: {
    url: process.env.MONGO_URI,
    databaseName: undefined,
    options: {},
  },
  migrationsDir: 'src/database/migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.cjs',
  useFileHash: false,
};

module.exports = config;