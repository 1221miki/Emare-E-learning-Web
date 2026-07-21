const Wishlist = require('../models/Wishlist');

// @desc    Toggle course in wishlist (add/remove)
// @route   POST /api/wishlist/toggle
// @access  Private (Student)
exports.toggleWishlist = async (req, res) => {
    try {
        const { courseId } = req.body;
        const existing = await Wishlist.findOne({ userRef: req.user.id, courseRef: courseId });

        if (existing) {
            await Wishlist.findByIdAndDelete(existing._id);
            return res.status(200).json({ success: true, message: 'Removed from wishlist', added: false });
        }

        await Wishlist.create({ userRef: req.user.id, courseRef: courseId });
        res.status(201).json({ success: true, message: 'Added to wishlist', added: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get current user's wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getMyWishlist = async (req, res) => {
    try {
        const items = await Wishlist.find({ userRef: req.user.id })
            .populate('courseRef', 'courseTitle thumbnailUrl price technicalCategory averageRating creatorRef')
            .sort('-addedAt');
        res.status(200).json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
