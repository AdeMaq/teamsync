const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'workspaces';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    // Accepting an invitation finds the workspace by the hash of the emailed token.
    await db.collection(COLLECTION).createIndex({ 'invites.tokenHash': 1 }, { sparse: true, name: 'invites_tokenHash_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['invites_tokenHash_1']);
  },
};
