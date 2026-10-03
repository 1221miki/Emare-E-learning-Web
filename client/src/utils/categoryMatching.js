const CATEGORY_ALIASES = {
  programming: ['programming', 'software development', 'coding', 'development', 'web coding', 'frontend', 'backend', 'full stack'],
  'web development': ['web development', 'web coding', 'frontend', 'backend', 'full stack', 'web'],
  'artificial intelligence': ['artificial intelligence', 'ai', 'machine learning', 'ml', 'deep learning', 'data science'],
  cybersecurity: ['cybersecurity', 'security', 'network security', 'ethical hacking'],
  'data science': ['data science', 'analytics', 'data analytics', 'machine learning', 'ml'],
  'mobile development': ['mobile development', 'android', 'ios', 'flutter', 'react native'],
  'cloud computing': ['cloud computing', 'cloud', 'cloud infrastructure', 'devops', 'devops ci cd', 'ci cd', 'infrastructure'],
  'devops & ci/cd': ['devops & ci/cd', 'devops', 'ci/cd', 'ci cd', 'cloud', 'cloud computing', 'automation', 'infrastructure'],
  'graphic design': ['graphic design', 'design', 'creative media', 'ux', 'ui/ux', 'visual design'],
  'business & management': ['business', 'business & management', 'management', 'marketing'],
  databases: ['databases', 'database', 'sql', 'mongodb', 'postgres'],
  networking: ['networking', 'network engineering', 'network', 'systems administration'],
  'robotics hardware': ['robotics', 'robotics hardware', 'hardware', 'embedded systems'],
  'creative media': ['creative media', 'media', 'design', 'animation']
};

const normalizeValue = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

export const categoryMatchesCourse = (categoryName, courseTechnicalCategory) => {
  if (!categoryName || !courseTechnicalCategory) return false;

  const normalizedCategory = normalizeValue(categoryName);
  const normalizedCourseCategory = normalizeValue(courseTechnicalCategory);

  if (!normalizedCategory || !normalizedCourseCategory) return false;

  if (normalizedCategory === normalizedCourseCategory) return true;

  const categoryAliases = CATEGORY_ALIASES[normalizedCategory] || [];
  const courseAliases = CATEGORY_ALIASES[normalizedCourseCategory] || [];

  if (categoryAliases.includes(normalizedCourseCategory) || courseAliases.includes(normalizedCategory)) return true;

  if (normalizedCategory.includes(normalizedCourseCategory) || normalizedCourseCategory.includes(normalizedCategory)) return true;

  const categoryTokens = new Set(normalizedCategory.split(' '));
  const courseTokens = new Set(normalizedCourseCategory.split(' '));
  const overlap = [...categoryTokens].filter(token => token && courseTokens.has(token));

  return overlap.length > 0;
};

export const normalizeCategoryValue = normalizeValue;
