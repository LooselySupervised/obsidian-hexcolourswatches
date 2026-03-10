import { describe, it, expect } from 'vitest';
import { hexRegex, isHexColor } from '../hex-utils';

// ---------------------------------------------------------------------------
// isHexColor
// ---------------------------------------------------------------------------

describe('isHexColor', () => {
	// Valid cases
	it('accepts a lowercase 6-digit hex', () => {
		expect(isHexColor('#ff0000')).toBe(true);
	});
	it('accepts an uppercase 6-digit hex', () => {
		expect(isHexColor('#FF0000')).toBe(true);
	});
	it('accepts a mixed-case 6-digit hex', () => {
		expect(isHexColor('#aAbBcC')).toBe(true);
	});
	it('accepts all-zero hex', () => {
		expect(isHexColor('#000000')).toBe(true);
	});
	it('accepts all-f hex', () => {
		expect(isHexColor('#ffffff')).toBe(true);
	});

	// Invalid length
	it('rejects a 3-digit hex', () => {
		expect(isHexColor('#f00')).toBe(false);
	});
	it('rejects a 4-digit hex', () => {
		expect(isHexColor('#ff00')).toBe(false);
	});
	it('rejects a 5-digit hex', () => {
		expect(isHexColor('#ff000')).toBe(false);
	});
	it('rejects a 7-digit hex', () => {
		expect(isHexColor('#ff00001')).toBe(false);
	});
	it('rejects an 8-digit hex (RGBA)', () => {
		expect(isHexColor('#ff0000ff')).toBe(false);
	});

	// Invalid characters
	it('rejects non-hex characters', () => {
		expect(isHexColor('#gggggg')).toBe(false);
	});
	it('rejects a plain text tag', () => {
		expect(isHexColor('#obsidian')).toBe(false);
	});

	// Missing prefix
	it('rejects a hex string without #', () => {
		expect(isHexColor('ff0000')).toBe(false);
	});

	// Edge cases
	it('rejects an empty string', () => {
		expect(isHexColor('')).toBe(false);
	});
	it('rejects just a hash', () => {
		expect(isHexColor('#')).toBe(false);
	});
	it('rejects a hex with surrounding whitespace', () => {
		expect(isHexColor(' #ff0000 ')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// hexRegex
// ---------------------------------------------------------------------------

describe('hexRegex', () => {
	it('matches a standalone hex code in prose', () => {
		const matches = [...'The colour is #ff0000 today.'.matchAll(hexRegex())];
		expect(matches).toHaveLength(1);
		expect(matches[0][0]).toBe('#ff0000');
	});

	it('matches multiple hex codes on one line', () => {
		const matches = [...'#ff0000 and #00ff00 and #0000ff'.matchAll(hexRegex())];
		expect(matches).toHaveLength(3);
		expect(matches.map(m => m[0])).toEqual(['#ff0000', '#00ff00', '#0000ff']);
	});

	it('matches a hex code at the very start of the string', () => {
		const matches = [...'#1a2b3c is the colour'.matchAll(hexRegex())];
		expect(matches).toHaveLength(1);
		expect(matches[0][0]).toBe('#1a2b3c');
	});

	it('matches a hex code at the very end of the string', () => {
		const matches = [...'The colour is #1a2b3c'.matchAll(hexRegex())];
		expect(matches).toHaveLength(1);
		expect(matches[0][0]).toBe('#1a2b3c');
	});

	it('matches a hex code adjacent to punctuation', () => {
		const matches = [...'color: #ff0000;'.matchAll(hexRegex())];
		expect(matches).toHaveLength(1);
		expect(matches[0][0]).toBe('#ff0000');
	});

	it('matches uppercase hex codes', () => {
		const matches = [...'#FF0000'.matchAll(hexRegex())];
		expect(matches).toHaveLength(1);
		expect(matches[0][0]).toBe('#FF0000');
	});

	it('does NOT match a 3-digit hex code', () => {
		const matches = [...'#f00'.matchAll(hexRegex())];
		expect(matches).toHaveLength(0);
	});

	it('does NOT match a 7-digit string as a 6-digit hex (lookahead)', () => {
		const matches = [...'#ff00001'.matchAll(hexRegex())];
		expect(matches).toHaveLength(0);
	});

	it('does NOT match an 8-digit string as a 6-digit hex', () => {
		const matches = [...'#ff0000ff'.matchAll(hexRegex())];
		expect(matches).toHaveLength(0);
	});

	it('does NOT match a plain tag', () => {
		const matches = [...'#obsidian'.matchAll(hexRegex())];
		expect(matches).toHaveLength(0);
	});

	it('does NOT match a mixed alphanumeric tag that is not a hex code', () => {
		const matches = [...'#hello123'.matchAll(hexRegex())];
		expect(matches).toHaveLength(0);
	});

	it('returns independent instances — no shared lastIndex state', () => {
		const text = '#ff0000 #00ff00';
		// Calling hexRegex() twice should both start from the beginning
		const a = [...text.matchAll(hexRegex())];
		const b = [...text.matchAll(hexRegex())];
		expect(a).toHaveLength(2);
		expect(b).toHaveLength(2);
	});

	it('correctly identifies the match position (index)', () => {
		const text = 'before #aabbcc after';
		const matches = [...text.matchAll(hexRegex())];
		expect(matches[0].index).toBe(7);
	});
});
