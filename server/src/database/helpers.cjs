// Shared by migrations. Lives outside migrations/ because migrate-mongo runs every file in that folder.

// Create the collection if it does not exist yet, so it is visible before any data is written.
async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
  }
}

// Drop indexes by name, ignoring ones that are already gone. Collections and data are never dropped.
async function dropIndexes(db, collection, names) {
  for (const name of names) {
    try {
      await db.collection(collection).dropIndex(name);
    } catch (err) {
      if (err.codeName !== 'IndexNotFound' && err.codeName !== 'NamespaceNotFound') throw err;
    }
  }
}

module.exports = { ensureCollection, dropIndexes };
