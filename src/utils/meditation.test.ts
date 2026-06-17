import { describe, it, expect } from 'vitest';
import { getMeditationDuration } from './meditation';

describe('getMeditationDuration', () => {
  it('should return 60 seconds for 0-4 completions', () => {
    expect(getMeditationDuration(0)).toBe(60);
    expect(getMeditationDuration(1)).toBe(60);
    expect(getMeditationDuration(4)).toBe(60);
  });

  it('should return 120 seconds for 5-9 completions', () => {
    expect(getMeditationDuration(5)).toBe(120);
    expect(getMeditationDuration(7)).toBe(120);
    expect(getMeditationDuration(9)).toBe(120);
  });

  it('should return 180 seconds for 10-14 completions', () => {
    expect(getMeditationDuration(10)).toBe(180);
    expect(getMeditationDuration(12)).toBe(180);
    expect(getMeditationDuration(14)).toBe(180);
  });

  it('should return 300 seconds for 15-19 completions', () => {
    expect(getMeditationDuration(15)).toBe(300);
    expect(getMeditationDuration(17)).toBe(300);
    expect(getMeditationDuration(19)).toBe(300);
  });

  it('should return 420 seconds for 20-24 completions', () => {
    expect(getMeditationDuration(20)).toBe(420);
    expect(getMeditationDuration(22)).toBe(420);
    expect(getMeditationDuration(24)).toBe(420);
  });

  it('should return 600 seconds for 25-29 completions', () => {
    expect(getMeditationDuration(25)).toBe(600);
    expect(getMeditationDuration(27)).toBe(600);
    expect(getMeditationDuration(29)).toBe(600);
  });

  it('should return 900 seconds (15 min cap) for 30+ completions', () => {
    expect(getMeditationDuration(30)).toBe(900);
    expect(getMeditationDuration(35)).toBe(900);
    expect(getMeditationDuration(100)).toBe(900);
  });
});
