const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'notifications';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    // Cleaning up when a workspace is deleted or someone leaves it.
    await c.createIndex({ workspace: 1, recipient: 1 }, { name: 'workspace_recipient_1' });
    // Cleaning up when tasks are deleted (their notifications would link to nothing).
    await c.createIndex({ 'meta.taskId': 1 }, { name: 'meta_taskId_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['workspace_recipient_1', 'meta_taskId_1']);
  },
};
