const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'notifications';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ recipient: 1, isRead: 1, createdAt: -1 }, { name: 'recipient_isRead_createdAt_desc' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['recipient_isRead_createdAt_desc']);
  },
};
