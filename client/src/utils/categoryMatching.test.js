import { describe, expect, it } from 'vitest';
import { categoryMatchesCourse } from './categoryMatching';

describe('categoryMatchesCourse', () => {
  it('matches published categories with shared aliases', () => {
    expect(categoryMatchesCourse('Web Development', 'Web Coding')).toBe(true);
    expect(categoryMatchesCourse('Programming', 'Web Coding')).toBe(true);
    expect(categoryMatchesCourse('Artificial Intelligence', 'AI')).toBe(true);
    expect(categoryMatchesCourse('Cloud Computing', 'DevOps & CI/CD')).toBe(true);
    expect(categoryMatchesCourse('AI & ML', 'Data Science')).toBe(true);
    expect(categoryMatchesCourse('AI & ML', 'Artificial Intelligence')).toBe(true);
    expect(categoryMatchesCourse('Database', 'Databases')).toBe(true);
    expect(categoryMatchesCourse('Security', 'Cybersecurity')).toBe(true);
    expect(categoryMatchesCourse('Design', 'Graphic Design')).toBe(true);
  });

  it('does not match unrelated categories', () => {
    expect(categoryMatchesCourse('Graphic Design', 'Cybersecurity')).toBe(false);
  });
});
