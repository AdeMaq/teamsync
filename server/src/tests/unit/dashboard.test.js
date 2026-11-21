import { healthOf } from '../../modules/dashboard/dashboard.service.js';

const NOW = new Date('2026-11-14T12:00:00Z');
const counts = (open, overdue = 0) => ({ total: open, done: 0, open, overdue });

describe('healthOf', () => {
  it('is "shipped" for a completed project, whatever its tasks say', () => {
    expect(healthOf({ status: 'completed', endDate: null }, counts(3, 2), NOW)).toBe('shipped');
  });

  it('is "at-risk" when the project has overdue tasks', () => {
    expect(healthOf({ status: 'active', endDate: null }, counts(5, 1), NOW)).toBe('at-risk');
  });

  it('is "at-risk" when the end date has passed and work is still open', () => {
    expect(healthOf({ status: 'active', endDate: '2026-11-01T00:00:00Z' }, counts(2), NOW)).toBe('at-risk');
  });

  it('is "on-track" when the end date has passed but nothing is open', () => {
    expect(healthOf({ status: 'active', endDate: '2026-11-01T00:00:00Z' }, counts(0), NOW)).toBe('on-track');
  });

  it('counts the end date itself as still on time (the whole day)', () => {
    expect(healthOf({ status: 'active', endDate: '2026-11-14T00:00:00Z' }, counts(2), NOW)).toBe('on-track');
    expect(healthOf({ status: 'active', endDate: '2026-11-15T00:00:00Z' }, counts(2), NOW)).toBe('on-track');
  });

  it('is "on-track" for a project with no problems', () => {
    expect(healthOf({ status: 'planning', endDate: null }, counts(4), NOW)).toBe('on-track');
  });
});
