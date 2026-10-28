const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'projects';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    // The project list of a workspace, newest changes first.
    await c.createIndex({ workspace: 1, updatedAt: -1 }, { name: 'workspace_updatedAt_desc' });
    // Cleaning up after a user (account deleted, left a workspace).
    await c.createIndex({ 'members.user': 1 }, { name: 'members_user_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['workspace_updatedAt_desc', 'members_user_1']);
  },
};
