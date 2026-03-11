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
import { hexRegex, isHexColor } from './hex-utils';

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
 * Obsidian's markdown renderer converts hex codes whose first character after
 * '#' is a letter (e.g. #ff0000) into <a class="tag"> elements because they
 * look like vault tags. This function detects those anchors, confirms the
 * text is a valid hex colour, and replaces the anchor with a swatch + styled
 * code span.
 */
function replaceTags(el: HTMLElement): void {
	el.querySelectorAll<HTMLAnchorElement>('a.tag').forEach((tagEl) => {
		const text = (tagEl.textContent ?? '').trim();
		if (!isHexColor(text)) return;

		const frag = document.createDocumentFragment();
		frag.appendChild(createSwatchEl(text));
		const code = document.createElement('span');
		code.className = 'hex-color-code';
		code.textContent = text;
		frag.appendChild(code);

		tagEl.replaceWith(frag);
	});
}

/**
 * Hex codes whose first character after '#' is a digit (e.g. #1a2b3c) are
 * not treated as tags by Obsidian and remain as plain text. This function
 * walks all text nodes (skipping content inside <code> and <pre>) and
 * replaces each hex match with a swatch + styled code span.
 */
function replaceTextNodes(el: HTMLElement): void {
	const walker = document.createTreeWalker(
		el,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node: Node): number {
				let parent = (node as Text).parentElement;
				while (parent && parent !== el) {
					if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
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

		while ((match = re.exec(text)) !== null) {
			if (match.index > lastIndex) {
				frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
			}
			frag.appendChild(createSwatchEl(match[0]));
			const code = document.createElement('span');
			code.className = 'hex-color-code';
			code.textContent = match[0];
			frag.appendChild(code);
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			frag.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		parent.replaceChild(frag, textNode);
	}
}

function postProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
	replaceTags(el);
	replaceTextNodes(el);
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
 * Walks up the syntax tree at the given position to check whether it sits
 * inside an inline code span, fenced code block, or indented code block.
 * Used to suppress swatch decorations inside code regions in the editor.
 */
function isInCodeNode(state: EditorState, pos: number): boolean {
	let node = syntaxTree(state).resolveInner(pos, 1);
	while (node) {
		const { name } = node.type;
		if (name === 'InlineCode' || name === 'FencedCode' || name === 'CodeBlock') {
			return true;
		}
		if (!node.parent) break;
		node = node.parent;
	}
	return false;
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const re = hexRegex();
		let match: RegExpExecArray | null;

		while ((match = re.exec(text)) !== null) {
			const matchFrom = from + match.index;
			const matchTo = matchFrom + match[0].length;

			if (isInCodeNode(view.state, matchFrom)) continue;

			// Swatch widget placed immediately before the hex code.
			builder.add(
				matchFrom,
				matchFrom,
				Decoration.widget({ widget: new SwatchWidget(match[0]), side: -1 }),
			);

			// Mark to restyle the hex text and override any tag link styling.
			builder.add(
				matchFrom,
				matchTo,
				Decoration.mark({ class: 'hex-color-code', inclusive: false }),
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
			if (update.docChanged || update.viewportChanged) {
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
