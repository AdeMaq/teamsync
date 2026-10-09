const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'projects';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ workspace: 1, status: 1 }, { name: 'workspace_1_status_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['workspace_1_status_1']);
  },
};
