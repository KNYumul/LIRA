const mongoose = require("mongoose");
const softDeleteSchema = require("./softDelete");
const { decrypt, encrypt, lrnLookup } = require("../utils/learnerEncryption");

function formatLastName(value) {
  const lastName = String(value || "").trim().toLocaleLowerCase();
  return lastName
    ? `${lastName.charAt(0).toLocaleUpperCase()}${lastName.slice(1)}`
    : "";
}

function encryptedLastName(value) {
  return encrypt(formatLastName(value));
}

function encryptedLrn(value) {
  return encrypt(String(value || "").trim());
}

const learnerSchema = new mongoose.Schema({
  lastName: {
    type: String,
    required: true,
    trim: true,
    set: encryptedLastName,
    get: decrypt
  },

  // LRN is the learner's account identifier. Birthdates are intentionally not
  // stored or used for authentication.
  lrn: {
    type: String,
    trim: true,
    get: decrypt,
    set: encryptedLrn
  },

  // A keyed one-way digest supports login and uniqueness without storing a
  // searchable plaintext LRN.
  lrnLookup: { type: String, select: false },
  // Marks records created after learner encryption was enabled. Legacy roster
  // records intentionally remain untouched.
  dataEncryptionVersion: { type: Number, select: false },

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
}, { toJSON: { getters: true }, toObject: { getters: true } });

learnerSchema.pre("validate", function setLrnLookup() {
  const plainLrn = this.get("lrn", null, { getters: true });
  if (plainLrn) {
    if (!/^\d{12}$/.test(plainLrn)) throw new Error("LRN must contain exactly 12 digits.");
    this.lrnLookup = lrnLookup(plainLrn);
    this.dataEncryptionVersion = 1;
  }
});

softDeleteSchema(learnerSchema);

module.exports = mongoose.model("Learner", learnerSchema, "Learners");
