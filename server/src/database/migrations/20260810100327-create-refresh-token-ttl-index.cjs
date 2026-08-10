module.exports = {
  async up(db) {
    await db.collection('refreshtokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('refreshtokens').createIndex({ token: 1 }, { unique: true });
  },
  async down(db) {
    await db.collection('refreshtokens').dropIndex('expiresAt_1');
    await db.collection('refreshtokens').dropIndex('token_1');
  },
};