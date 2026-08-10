module.exports = {
  async up(db) {
    await db.collection('notifications').createIndex({ recipient: 1, isRead: 1, createdAt: -1 });
  },
  async down(db) {
    await db.collection('notifications').dropIndex('recipient_1_isRead_1_createdAt_-1');
  },
};