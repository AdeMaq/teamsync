module.exports = {
  async up(db) {
    await db.collection('tasks').createIndex({ project: 1, status: 1, position: 1 });
    await db.collection('tasks').createIndex({ workspace: 1 });
  },
  async down(db) {
    await db.collection('tasks').dropIndex('project_1_status_1_position_1');
    await db.collection('tasks').dropIndex('workspace_1');
  },
};