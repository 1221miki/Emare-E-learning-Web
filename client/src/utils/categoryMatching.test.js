import { describe, expect, it } from 'vitest';
import { categoryMatchesCourse } from './categoryMatching';

describe('categoryMatchesCourse', () => {
  it('matches published categories with shared aliases', () => {
    expect(categoryMatchesCourse('Web Development', 'Web Coding')).toBe(true);
    expect(categoryMatchesCourse('Programming', 'Web Coding')).toBe(true);
    expect(categoryMatchesCourse('Artificial Intelligence', 'AI')).toBe(true);
    expect(categoryMatchesCourse('Cloud Computing', 'DevOps & CI/CD')).toBe(true);
  });

  it('does not match unrelated categories', () => {
    expect(categoryMatchesCourse('Graphic Design', 'Cybersecurity')).toBe(false);
  });
});
