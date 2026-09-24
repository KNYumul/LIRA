const Learner = require("../models/Learner");

module.exports = async function migrateLearnerIndexes() {
  await Learner.init();
  // Install the replacement constraint before removing the old, stricter one.
  await Learner.createIndexes();
  const indexes = await Learner.collection.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key);
    if (index.unique && keys.length === 3 && keys.every(key => ["sectionId", "lastName", "birthdate"].includes(key))) {
      await Learner.collection.dropIndex(index.name);
    }
  }
};
