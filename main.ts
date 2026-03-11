import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import {
	ViewPlugin,
	WidgetType,
	Decoration,
	DecorationSet,
	ViewUpdate,
	EditorView,
} from '@codemirror/view';
import { RangeSetBuilder, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { hexRegex, escapedHexRegex } from './hex-utils';

// ---------------------------------------------------------------------------
// Shared DOM helper
// ---------------------------------------------------------------------------

function createSwatchEl(color: string): HTMLElement {
	const swatch = document.createElement('span');
	swatch.className = 'hex-swatch';
	swatch.style.backgroundColor = color;
	return swatch;
}

// ---------------------------------------------------------------------------
// Reading-view post-processor
// ---------------------------------------------------------------------------

/**
 * Parses the section's raw source text via ctx.getSectionInfo and counts how
 * many times each escaped hex code (\#RRGGBB) appears. The result is used by
 * replaceTextNodes to swatch only those occurrences, since Obsidian strips the
 * backslash from the rendered DOM and we cannot detect it otherwise.
 */
function buildEscapedCounts(
	ctx: MarkdownPostProcessorContext,
	el: HTMLElement,
): Map<string, number> {
	const counts = new Map<string, number>();
	const info = ctx.getSectionInfo(el);
	if (!info) return counts;

	const source = info.text.split('\n').slice(info.lineStart, info.lineEnd + 1).join('\n');
	const re = /\\#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(source)) !== null) {
		const key = '#' + m[1].toLowerCase();
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

/**
 * Walks all text nodes in el (skipping <code>, <pre>, <a.tag>, and already-
 * processed swatch spans) and replaces each hex match that corresponds to a
 * backslash-escaped source occurrence with a swatch + styled code span.
 * Unescaped hex codes are left untouched.
 */
function replaceTextNodes(el: HTMLElement, escapedCounts: Map<string, number>): void {
	if (escapedCounts.size === 0) return;

	const walker = document.createTreeWalker(
		el,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node: Node): number {
				let parent = (node as Text).parentElement;
				while (parent && parent !== el) {
					const tag = parent.tagName;
					const cls = parent.className;
					if (tag === 'CODE' || tag === 'PRE') {
						return NodeFilter.FILTER_REJECT;
					}
					// Skip tag links — those are unescaped hex codes treated as tags.
					if (tag === 'A' && parent.classList.contains('tag')) {
						return NodeFilter.FILTER_REJECT;
					}
					if (cls === 'hex-color-code' || cls === 'hex-swatch') {
						return NodeFilter.FILTER_REJECT;
					}
					parent = parent.parentElement;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);

	const textNodes: Text[] = [];
	let node: Node | null;
	while ((node = walker.nextNode()) !== null) {
		textNodes.push(node as Text);
	}

	// Tracks how many escaped occurrences of each hex value have been swatched
	// so far across all text nodes in this element (DOM order ≈ source order).
	const swatchedCounts = new Map<string, number>();

	for (const textNode of textNodes) {
		const text = textNode.textContent ?? '';
		const re = hexRegex();
		if (!re.test(text)) continue;

		re.lastIndex = 0;
		const parent = textNode.parentNode;
		if (!parent) continue;

		const frag = document.createDocumentFragment();
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		let modified = false;

		while ((match = re.exec(text)) !== null) {
			const key = match[0].toLowerCase();
			const swatched = swatchedCounts.get(key) ?? 0;
			const escapedCount = escapedCounts.get(key) ?? 0;

			if (swatched < escapedCount) {
				// This occurrence corresponds to an escaped \#RRGGBB in source — add swatch.
				if (match.index > lastIndex) {
					frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
				}
				swatchedCounts.set(key, swatched + 1);
				frag.appendChild(createSwatchEl(match[0]));
				const code = document.createElement('span');
				code.className = 'hex-color-code';
				code.textContent = match[0];
				frag.appendChild(code);
				lastIndex = match.index + match[0].length;
				modified = true;
			}
			// else: unescaped occurrence — leave as plain text
		}

		if (!modified) continue;

		if (lastIndex < text.length) {
			frag.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		parent.replaceChild(frag, textNode);
	}
}

function postProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
	const escapedCounts = buildEscapedCounts(ctx, el);
	replaceTextNodes(el, escapedCounts);
}

// ---------------------------------------------------------------------------
// Live-preview editor extension (CodeMirror 6)
// ---------------------------------------------------------------------------

class SwatchWidget extends WidgetType {
	constructor(readonly color: string) { super(); }

	eq(other: SwatchWidget): boolean {
		return this.color === other.color;
	}

	toDOM(): HTMLElement {
		return createSwatchEl(this.color);
	}

	ignoreEvent(): boolean { return true; }
}

/**
 * Replaces the \#RRGGBB source text with a styled #RRGGBB span. Paired with
 * a SwatchWidget placed immediately before it.
 */
class HexCodeWidget extends WidgetType {
	constructor(readonly hex: string) { super(); }

	eq(other: HexCodeWidget): boolean {
		return this.hex === other.hex;
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'hex-color-code';
		span.textContent = '#' + this.hex;
		return span;
	}

	ignoreEvent(): boolean { return true; }
}

/**
 * Returns true when pos sits inside an inline code span, fenced code block,
 * or indented code block — used to suppress swatch decorations inside code.
 *
 * Four checks are combined for robustness, since the CM6 syntax tree may not
 * fully represent code-block internals in all Obsidian versions:
 *
 * 1. Syntax-tree walk: covers fully-parsed regions.
 * 2. Backtick-count fallback: odd number of backticks before pos on the same
 *    line → inside an inline code span.
 * 3. Indented code block: line starts with 4+ spaces or a tab.
 * 4. Fenced code block scan: toggle a flag for every ``` / ~~~ fence line
 *    found while scanning upward; an odd toggle count means pos is inside a
 *    fence that has no matching closer above it.
 */
function isInCodeNode(state: EditorState, pos: number): boolean {
	// 1. Syntax tree walk.
	let node = syntaxTree(state).resolveInner(pos, -1);
	while (node) {
		const { name } = node.type;
		if (
			name === 'InlineCode' ||
			name === 'FencedCode'  ||
			name === 'CodeBlock'   ||
			name === 'Code'        ||
			name === 'CodeText'    ||
			name === 'CodeMark'
		) {
			return true;
		}
		if (!node.parent) break;
		node = node.parent;
	}

	const line = state.doc.lineAt(pos);

	// 2. Inline code span: odd backtick count before pos on this line.
	const before = state.doc.sliceString(line.from, pos);
	if ((before.match(/`/g) ?? []).length % 2 === 1) return true;

	// 3. Indented code block.
	if (/^( {4}|\t)/.test(line.text)) return true;

	// 4. Fenced code block: scan upward toggling on each fence marker line.
	let insideFence = false;
	for (let n = line.number - 1; n >= Math.max(1, line.number - 300); n--) {
		if (/^(`{3,}|~{3,})/.test(state.doc.line(n).text)) {
			insideFence = !insideFence;
		}
	}
	return insideFence;
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const { state } = view;
	const selection = state.selection;

	for (const { from, to } of view.visibleRanges) {
		const text = state.doc.sliceString(from, to);
		const re = escapedHexRegex();
		let match: RegExpExecArray | null;

		while ((match = re.exec(text)) !== null) {
			const matchFrom = from + match.index;
			const matchTo = matchFrom + match[0].length;

			if (isInCodeNode(state, matchFrom)) continue;

			// Show raw text when the cursor is anywhere inside this token.
			const cursorInRange = selection.ranges.some(
				(r) => r.from <= matchTo && r.to >= matchFrom,
			);
			if (cursorInRange) continue;

			// match[0] is \#RRGGBB — strip the leading backslash.
			const colorWithHash = match[0].slice(1); // '#RRGGBB'
			const colorHex = colorWithHash.slice(1);  // 'RRGGBB'

			// Swatch widget placed immediately before the \#RRGGBB token.
			builder.add(
				matchFrom,
				matchFrom,
				Decoration.widget({ widget: new SwatchWidget(colorWithHash), side: -1 }),
			);

			// Replace \#RRGGBB with a styled #RRGGBB widget.
			builder.add(
				matchFrom,
				matchTo,
				Decoration.replace({ widget: new HexCodeWidget(colorHex) }),
			);
		}
	}

	return builder.finish();
}

const editorPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

// ---------------------------------------------------------------------------
// Plugin entry point
// ---------------------------------------------------------------------------

export default class HexColourSwatches extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor(postProcessor);
		this.registerEditorExtension(editorPlugin);
	}

	onunload() {}
}
