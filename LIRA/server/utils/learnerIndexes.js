const Learner = require("../models/Learner");

module.exports = async function migrateLearnerIndexes() {
  await Learner.init();
  // Install the LRN constraint before removing legacy birthday-based indexes.
  await Learner.createIndexes();
  const indexes = await Learner.collection.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key);
    if (index.unique && index.name !== "lrn_1" && (keys.includes("birthdate") || keys.includes("lastName"))) {
      await Learner.collection.dropIndex(index.name);
    }
  }
};
