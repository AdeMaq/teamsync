const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'comments';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ task: 1, createdAt: 1 }, { name: 'task_1_createdAt_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['task_1_createdAt_1']);
  },
};
