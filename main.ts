import { Plugin } from 'obsidian';

function isValidColor(color: string): boolean {
	return CSS.supports('color', color);
}

export default class HexVision extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor('hex', (source, el) => {
			const pre = el.createEl('pre', { cls: 'language-hex' });
			pre.createEl('code', { cls: 'language-hex', text: source });
		});

		this.registerMarkdownCodeBlockProcessor('palette-hex', (source, el) => {
			const table = el.createEl('table', { cls: 'colour-table' });
			const lines = source.split('\n');

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !isValidColor(trimmed)) { continue; }

				const tr = table.createEl('tr');
				const td = tr.createEl('td');
				td.style.backgroundColor = trimmed;
				td.createEl('code', { text: trimmed });
			}
		});
	}

	onunload() {}
}
