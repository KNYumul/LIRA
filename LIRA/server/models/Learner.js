const mongoose = require("mongoose");
const softDeleteSchema = require("./softDelete");

function formatLastName(value) {
  const lastName = String(value || "").trim().toLocaleLowerCase();
  return lastName
    ? `${lastName.charAt(0).toLocaleUpperCase()}${lastName.slice(1)}`
    : "";
}

const learnerSchema = new mongoose.Schema({
  lastName: {
    type: String,
    required: true,
    trim: true,
    set: formatLastName
  },

  // LRN is the learner's account identifier. Birthdates are intentionally not
  // stored or used for authentication.
  lrn: {
    type: String,
    trim: true,
    match: /^\d{12}$/
  },

  section: {
    type: String,
    required: true,
    trim: true
  },

  // section remains during migration/login compatibility; sectionId is authoritative for ownership.
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    index: true
  }
});

// Keep this sparse while old records are being replaced through a new roster
// upload. All new records are validated by the learner routes.
learnerSchema.index({ lrn: 1 }, { unique: true, sparse: true });

softDeleteSchema(learnerSchema);

module.exports = mongoose.model("Learner", learnerSchema, "Learners");
