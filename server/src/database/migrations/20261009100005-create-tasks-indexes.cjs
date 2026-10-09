const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'tasks';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ project: 1, status: 1, position: 1 }, { name: 'project_status_position' });
    await c.createIndex({ workspace: 1 }, { name: 'workspace_1' });
    await c.createIndex({ assignees: 1 }, { name: 'assignees_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['project_status_position', 'workspace_1', 'assignees_1']);
  },
};
