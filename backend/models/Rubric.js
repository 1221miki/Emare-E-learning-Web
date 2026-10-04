const mongoose = require('mongoose');

const CriterionSchema = new mongoose.Schema({ title: String, description: String, weight: Number, maxScore: Number }, { _id: false });

const RubricSchema = new mongoose.Schema({
    projectRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, default: 'Default Rubric' },
    criteria: [CriterionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Rubric', RubricSchema);
