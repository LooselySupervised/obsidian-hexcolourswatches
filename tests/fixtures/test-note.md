# HexVision — Manual Test Scenarios

Open this file in Obsidian with the HexVision plugin enabled.
Each scenario states what you should see. Test in both **Reading view** and
**Live Preview** (editing) mode unless stated otherwise.

---

## 1 · Basic inline hex (digit-leading — never a tag)

The sky is #1a9bfc and the grass is #2ecc71.

**Expected:** Each hex code is preceded by a coloured swatch blob; the hex
text is styled in the theme's muted monospace colour. No tag links.

---

## 2 · Letter-leading hex (would normally become an Obsidian tag)

The brand colours are #ff0000 and #aabbcc and #ffffff.

**Expected:** Same as scenario 1. Obsidian would normally convert these to
tag links (they start with a letter after #); the plugin should intercept
that and show swatches instead.

---

## 3 · Uppercase hex

Try #FF5733 and #C70039 in a sentence.

**Expected:** Swatches shown for both; casing is preserved in the displayed
code text.

---

## 4 · Multiple hex codes on a single line

#ff0000 #00ff00 #0000ff #ffff00 #ff00ff #00ffff

**Expected:** Six swatches, one before each code, all on the same line.

---

## 5 · Hex code at start of paragraph

#deadbe is an unusual colour.

**Expected:** Swatch shown before #deadbe at the very start of the line.

---

## 6 · Hex code at end of paragraph

My favourite colour this week is #c0ffee

**Expected:** Swatch shown before the trailing #c0ffee.

---

## 7 · Hex inside a backtick code span — should NOT render

The variable is set to `#ff0000` in the source.

**Expected:** No swatch. The hex code inside the backtick span must be left
completely untouched — raw text only.

---

## 8 · Hex inside a fenced code block — should NOT render

```
background-color: #ff0000;
color: #ffffff;
```

**Expected:** No swatches anywhere inside the code block. Raw text only.

---

## 9 · Invalid / near-miss hex codes — should NOT render

These must all be ignored:

- 5-digit: #ff000 (too short)
- 7-digit: #ff00001 (too long)
- 8-digit (RGBA): #ff0000ff (too long)
- 3-digit: #f00 (not supported)
- Non-hex chars: #gggggg
- Plain tag: #obsidian
- Just a hash: #

**Expected:** No swatches for any of the above.

---

## 10 · Hex next to punctuation

The palette is (#ff0000, #00ff00, #0000ff).

**Expected:** Three swatches; surrounding punctuation unaffected.

---

## 11 · Hex in a heading

### Design token: #4a90e2

**Expected:** Swatch visible inside the heading.

---

## 12 · Hex in a bullet list

- Primary: #0055ff
- Secondary: #ff5500
- Neutral: #888888

**Expected:** Swatch before each hex code in the list.

---

## 13 · Live-preview typing test (editor mode only)

Type a new hex code character by character: `#`, `f`, `f`, `0`, `0`, `0`, `0`

**Expected:** No swatch appears until all 6 digits are present and correct
(i.e. at `#ff0000`). No partial/wrong-colour swatch at any intermediate step.
