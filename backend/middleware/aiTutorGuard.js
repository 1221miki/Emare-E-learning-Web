const AssessmentAiBlock = require('../models/AssessmentAiBlock');

// Blocks any Emare AI Tutor request while the student has an AI-Tutor-disabled
// assessment (quiz / assignment) open. The block record is created by the
// server when the student opens the restricted assessment, so students cannot
// bypass it by calling the AI endpoints directly from browser tools.
const assertAiTutorAllowed = async (req, res, next) => {
    try {
        // Instructors/Admins are never restricted
        if (req.user?.assignedRole && req.user.assignedRole !== 'Student') return next();

        const activeBlock = await AssessmentAiBlock.findOne({
            studentRef: req.user.id || req.user._id,
            expiresAt: { $gt: new Date() }
        }).select('_id reason').lean();

        if (activeBlock) {
            return res.status(403).json({
                success: false,
                message: activeBlock.reason || AssessmentAiBlock.BLOCK_MESSAGE,
                aiTutorBlocked: true
            });
        }
        return next();
    } catch (err) {
        next(err);
    }
};

module.exports = { assertAiTutorAllowed };
