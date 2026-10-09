const Learner = require("../models/Learner");

module.exports = async function migrateLearnerIndexes() {
  const indexes = await Learner.collection.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key);
    if (index.name === "lrn_1" || index.name === "lrnLookup_1" || (index.unique && (keys.includes("birthdate") || keys.includes("lastName")))) {
      await Learner.collection.dropIndex(index.name);
    }
  }
  // Do not alter old rosters. A partial index enforces uniqueness only for
  // learner records written after encryption was enabled.
  await Learner.collection.createIndex(
    { lrnLookup: 1 },
    {
      name: "lrnLookup_1",
      unique: true,
      partialFilterExpression: { dataEncryptionVersion: 1 }
    }
  );
};
