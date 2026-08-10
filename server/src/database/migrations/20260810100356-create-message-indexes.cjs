module.exports = {
  async up(db) {
    await db.collection('messages').createIndex({ workspace: 1, channel: 1, createdAt: -1 });
  },
  async down(db) {
    await db.collection('messages').dropIndex('workspace_1_channel_1_createdAt_-1');
  },
};