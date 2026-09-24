const mongoose = require("mongoose");

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

  firstName: { type: String, trim: true, default: "", set: formatLastName },

  birthdate: {
    type: String,
    required: true
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

// First names distinguish learners with the same surname, birthdate, and section.
learnerSchema.index(
  { sectionId: 1, lastName: 1, birthdate: 1, firstName: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Learner", learnerSchema, "Learners");
