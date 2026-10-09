const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'users';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['email_unique']);
  },
};
