/**
 * Returns a fresh RegExp that matches 6-digit (#RRGGBB) hex colour codes in
 * rendered DOM text (reading view). The negative lookahead prevents matching
 * substrings of longer hex strings.
 *
 * A new instance is returned on every call so callers never share lastIndex
 * state when the regex is used with exec() in a loop.
 */
export function hexRegex(): RegExp {
	return /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
}

/**
 * Returns a fresh RegExp that matches backslash-escaped 6-digit hex colour
 * codes (\#RRGGBB) in raw markdown source / editor text. Used in live-preview
 * to find the swatch trigger without conflicting with Obsidian's tag system.
 */
export function escapedHexRegex(): RegExp {
	return /\\#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
}

/**
 * Returns true when the entire string is a valid 6-digit hex colour code
 * (e.g. "#ff0000" or "#FF0000").
 */
export function isHexColor(text: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(text);
}
