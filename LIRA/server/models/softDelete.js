const mongoose = require("mongoose");

function softDeleteSchema(schema) {
  if (!schema.path("deletedAt")) schema.add({ deletedAt: { type: Date, default: null, index: true } });
  schema.pre(["find", "findOne", "countDocuments", "distinct", "updateOne", "updateMany", "findOneAndUpdate", "findOneAndDelete"], function () {
    this.where({ deletedAt: null });
  });
}

module.exports = softDeleteSchema;
