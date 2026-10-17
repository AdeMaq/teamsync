const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'users';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    // Sparse: only users with a pending reset have this field, so the index stays tiny.
    await db
      .collection(COLLECTION)
      .createIndex({ passwordResetTokenHash: 1 }, { sparse: true, name: 'passwordResetTokenHash_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['passwordResetTokenHash_1']);
  },
};
