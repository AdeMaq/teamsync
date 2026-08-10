module.exports = {
  async up(db) {
    await db.collection('workspaces').createIndex({ slug: 1 }, { unique: true });
    await db.collection('workspaces').createIndex({ 'members.user': 1 });
  },
  async down(db) {
    await db.collection('workspaces').dropIndex('slug_1');
    await db.collection('workspaces').dropIndex('members.user_1');
  },
};