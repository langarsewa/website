import { describe, expect, it } from 'vitest';
import { firstName, initials } from '../../src/lib/people';

describe('people', () => {
  it('derives a first name from a name, a login or an email', () => {
    expect(firstName('Hardeep Singh')).toBe('Hardeep');
    expect(firstName('harpreet.kaur@langarsewa.org')).toBe('Harpreet');
    expect(firstName('simran-k')).toBe('Simran');
    expect(firstName('')).toBe('');
  });

  it('derives up to two initials', () => {
    expect(initials('Hardeep Singh')).toBe('HS');
    expect(initials('harpreet.kaur@langarsewa.org')).toBe('HK');
    expect(initials('simran')).toBe('S');
  });
});
