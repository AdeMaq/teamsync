const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'messages';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ workspace: 1, channel: 1, createdAt: -1 }, { name: 'workspace_channel_createdAt_desc' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['workspace_channel_createdAt_desc']);
  },
};
