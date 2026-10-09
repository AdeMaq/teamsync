const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'refreshtokens';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ tokenHash: 1 }, { unique: true, name: 'tokenHash_unique' });
    await c.createIndex({ user: 1 }, { name: 'user_1' });
    await c.createIndex({ family: 1 }, { name: 'family_1' });
    // TTL: MongoDB removes the document once expiresAt has passed.
    await c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['tokenHash_unique', 'user_1', 'family_1', 'expiresAt_ttl']);
  },
};
