import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hexRegex, escapedHexRegex, isHexColor } from '../hex-utils';

// ---------------------------------------------------------------------------
// isHexColor
// ---------------------------------------------------------------------------

describe('isHexColor', () => {
	// Valid cases
	it('accepts a lowercase 6-digit hex', () => {
		assert.ok(isHexColor('#ff0000'));
	});
	it('accepts an uppercase 6-digit hex', () => {
		assert.ok(isHexColor('#FF0000'));
	});
	it('accepts a mixed-case 6-digit hex', () => {
		assert.ok(isHexColor('#aAbBcC'));
	});
	it('accepts all-zero hex', () => {
		assert.ok(isHexColor('#000000'));
	});
	it('accepts all-f hex', () => {
		assert.ok(isHexColor('#ffffff'));
	});

	// Invalid length
	it('rejects a 3-digit hex', () => {
		assert.ok(!isHexColor('#f00'));
	});
	it('rejects a 4-digit hex', () => {
		assert.ok(!isHexColor('#ff00'));
	});
	it('rejects a 5-digit hex', () => {
		assert.ok(!isHexColor('#ff000'));
	});
	it('rejects a 7-digit hex', () => {
		assert.ok(!isHexColor('#ff00001'));
	});
	it('rejects an 8-digit hex (RGBA)', () => {
		assert.ok(!isHexColor('#ff0000ff'));
	});

	// Invalid characters
	it('rejects non-hex characters', () => {
		assert.ok(!isHexColor('#gggggg'));
	});
	it('rejects a plain text tag', () => {
		assert.ok(!isHexColor('#obsidian'));
	});

	// Missing prefix
	it('rejects a hex string without #', () => {
		assert.ok(!isHexColor('ff0000'));
	});

	// Edge cases
	it('rejects an empty string', () => {
		assert.ok(!isHexColor(''));
	});
	it('rejects just a hash', () => {
		assert.ok(!isHexColor('#'));
	});
	it('rejects a hex with surrounding whitespace', () => {
		assert.ok(!isHexColor(' #ff0000 '));
	});
});

// ---------------------------------------------------------------------------
// hexRegex
// ---------------------------------------------------------------------------

describe('hexRegex', () => {
	it('matches a standalone hex code in prose', () => {
		const matches = [...'The colour is #ff0000 today.'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#ff0000');
	});

	it('matches multiple hex codes on one line', () => {
		const matches = [...'#ff0000 and #00ff00 and #0000ff'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 3);
		assert.deepStrictEqual(matches.map(m => m[0]), ['#ff0000', '#00ff00', '#0000ff']);
	});

	it('matches a hex code at the very start of the string', () => {
		const matches = [...'#1a2b3c is the colour'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#1a2b3c');
	});

	it('matches a hex code at the very end of the string', () => {
		const matches = [...'The colour is #1a2b3c'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#1a2b3c');
	});

	it('matches a hex code adjacent to punctuation', () => {
		const matches = [...'color: #ff0000;'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#ff0000');
	});

	it('matches uppercase hex codes', () => {
		const matches = [...'#FF0000'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#FF0000');
	});

	it('does NOT match a 3-digit hex code', () => {
		const matches = [...'#f00'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('does NOT match a 7-digit string as a 6-digit hex (lookahead)', () => {
		const matches = [...'#ff00001'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('does NOT match an 8-digit string as a 6-digit hex', () => {
		const matches = [...'#ff0000ff'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('does NOT match a plain tag', () => {
		const matches = [...'#obsidian'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('does NOT match a mixed alphanumeric tag that is not a hex code', () => {
		const matches = [...'#hello123'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('returns independent instances — no shared lastIndex state', () => {
		const text = '#ff0000 #00ff00';
		const a = [...text.matchAll(hexRegex())];
		const b = [...text.matchAll(hexRegex())];
		assert.strictEqual(a.length, 2);
		assert.strictEqual(b.length, 2);
	});

	it('correctly identifies the match position (index)', () => {
		const text = 'before #aabbcc after';
		const matches = [...text.matchAll(hexRegex())];
		assert.strictEqual(matches[0].index, 7);
	});

	it('matches a hex code even when preceded by a backslash (DOM text never has raw backslashes)', () => {
		// In reading-view DOM, Obsidian strips the \ so text nodes only contain #RRGGBB.
		// hexRegex is used on DOM text, so it must match #RRGGBB regardless of what precedes it.
		const matches = [...'\\#ff0000'.matchAll(hexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '#ff0000');
	});
});

// ---------------------------------------------------------------------------
// escapedHexRegex
// ---------------------------------------------------------------------------

describe('escapedHexRegex', () => {
	it('matches a backslash-escaped hex code', () => {
		const matches = [...'\\#ff0000'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '\\#ff0000');
	});

	it('matches an escaped hex code embedded in prose', () => {
		const matches = [...'use \\#007BA7 for links'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '\\#007BA7');
	});

	it('does NOT match an unescaped hex code', () => {
		const matches = [...'#ff0000'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('matches multiple escaped hex codes', () => {
		const matches = [...'\\#ff0000 and \\#00ff00'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 2);
		assert.deepStrictEqual(matches.map(m => m[0]), ['\\#ff0000', '\\#00ff00']);
	});

	it('matches an escaped all-digit hex code', () => {
		const matches = [...'\\#123456'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '\\#123456');
	});

	it('matches an escaped uppercase hex code', () => {
		const matches = [...'\\#FF0000'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '\\#FF0000');
	});

	it('does NOT match a 7-digit escaped string (lookahead)', () => {
		const matches = [...'\\#ff00001'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('does NOT match an 8-digit escaped string', () => {
		const matches = [...'\\#ff0000ff'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 0);
	});

	it('matches escaped hex while ignoring adjacent unescaped one', () => {
		const matches = [...'\\#ff0000 and #00ff00'.matchAll(escapedHexRegex())];
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0][0], '\\#ff0000');
	});

	it('returns independent instances — no shared lastIndex state', () => {
		const text = '\\#ff0000 \\#00ff00';
		const a = [...text.matchAll(escapedHexRegex())];
		const b = [...text.matchAll(escapedHexRegex())];
		assert.strictEqual(a.length, 2);
		assert.strictEqual(b.length, 2);
	});

	it('correctly identifies the match position (index)', () => {
		const text = 'before \\#aabbcc after';
		const matches = [...text.matchAll(escapedHexRegex())];
		assert.strictEqual(matches[0].index, 7);
	});
});
