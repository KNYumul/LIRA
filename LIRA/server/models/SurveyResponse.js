const mongoose = require('mongoose');
const softDeleteSchema = require("./softDelete");

const schema = new mongoose.Schema({
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Learner', required: true, unique: true },
  answers: { type: [Number], required: true, validate: (values) => values.length === 10 && values.every((v) => Number.isInteger(v) && v >= 1 && v <= 5) },
}, { timestamps: true });

softDeleteSchema(schema);

module.exports = mongoose.model('SurveyResponse', schema);
