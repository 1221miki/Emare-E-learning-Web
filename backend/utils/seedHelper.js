/**
 * seedHelper.js
 *
 * Category course seeding has been DISABLED.
 * Courses must be created manually by Admin or Instructor users through the platform.
 * The AI-seeded demo courses have been removed from the database.
 */

const seedCategoryCoursesHelper = async () => {
    // Intentionally empty — course seeding disabled.
    // Real courses are created by Instructors via CourseCreationWizard
    // or by Admins via the Admin Dashboard.
    console.log('ℹ️  Course seeding disabled — courses managed by instructors/admins only.');
};

module.exports = { seedCategoryCoursesHelper };
