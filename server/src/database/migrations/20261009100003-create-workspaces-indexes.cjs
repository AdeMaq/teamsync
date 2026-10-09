const { ensureCollection, dropIndexes } = require('../helpers.cjs');

const COLLECTION = 'workspaces';

module.exports = {
  async up(db) {
    await ensureCollection(db, COLLECTION);
    const c = db.collection(COLLECTION);
    await c.createIndex({ slug: 1 }, { unique: true, name: 'slug_unique' });
    await c.createIndex({ 'members.user': 1 }, { name: 'members_user_1' });
  },

  async down(db) {
    await dropIndexes(db, COLLECTION, ['slug_unique', 'members_user_1']);
  },
};
