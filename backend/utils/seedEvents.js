const Event = require('../models/Event');

// Legacy demo/sample events that were auto-seeded into the database on every
// server boot. They are NOT real events — they were example data used to
// populate the admin events table. The admin events table must now only show
// real events created through the event creation system, so this module no
// longer inserts them. Running it once removes any previously-seeded rows.
const LEGACY_DEMO_SLUGS = [
    'emare-digital-mastery',
    'content-creation-bootcamp',
    'ai-tools-for-creators',
    'freelancing-mastery',
    'pricing-your-creative-work',
    'digital-storytelling-workshop',
    'social-media-growth-lab',
    'portfolio-building-clinic'
];

/**
 * Removes the legacy demo events (by slug). Safe to run on every boot — it is
 * idempotent and only deletes rows matching the known demo slugs. Returns the
 * number of documents removed.
 */
const removeSeedEvents = async () => {
    const { deletedCount } = await Event.deleteMany({ slug: { $in: LEGACY_DEMO_SLUGS } });
    if (deletedCount > 0) {
        console.log(`🧹 Event cleanup: removed ${deletedCount} legacy demo event(s).`);
    }
    return { removed: deletedCount };
};

module.exports = removeSeedEvents;