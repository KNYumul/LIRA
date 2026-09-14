import test from "node:test";
import assert from "node:assert/strict";
import { readPdfPages } from "./pdfOcr.js";

function fixture(texts, recognized = ["Scanned text"]) {
  const calls = { workers: 0, languages: [], renders: [], cleaned: [], terminated: 0, progress: [], canvases: [] };
  const pdf = {
    numPages: texts.length,
    async getPage(number) {
      return {
        getTextContent: async () => texts[number - 1],
        getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
        render: () => { calls.renders.push(number); return { promise: Promise.resolve() }; },
        cleanup: () => calls.cleaned.push(number),
      };
    },
  };
  const options = {
    extractText: (value) => value,
    createWorker: async (languages) => {
      calls.languages.push(languages);
      calls.workers += 1;
      return {
        recognize: async () => {
          const value = recognized.shift();
          if (value instanceof Error) throw value;
          return { data: { text: value } };
        },
        terminate: async () => { calls.terminated += 1; },
      };
    },
    createCanvas: () => {
      const canvas = { getContext: () => ({}) };
      calls.canvases.push(canvas);
      return canvas;
    },
    onProgress: (message) => calls.progress.push(message),
  };
  return { pdf, options, calls };
}

test("selectable PDF text does not initialize OCR or render pages", async () => {
  const { pdf, options, calls } = fixture(["First page", "Second page"]);
  assert.deepEqual(await readPdfPages(pdf, options), ["First page", "Second page"]);
  assert.equal(calls.workers, 0);
  assert.deepEqual(calls.renders, []);
  assert.deepEqual(calls.cleaned, [1, 2]);
});

test("mixed PDFs retain order and reuse OCR only on pages without text", async () => {
  const { pdf, options, calls } = fixture(["Text page", "  ", "More text", ""], ["Image page", "Last page"]);
  assert.deepEqual(await readPdfPages(pdf, options), ["Text page", "Image page", "More text", "Last page"]);
  assert.deepEqual(calls.renders, [2, 4]);
  assert.equal(calls.workers, 1);
  assert.equal(calls.terminated, 1);
  assert.ok(calls.progress.includes("Scanning PDF page 2 of 4…"));
  assert.ok(calls.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0));
});

test("OCR failure identifies the page and releases resources", async () => {
  const { pdf, options, calls } = fixture(["Text", ""], [new Error("Scanner unavailable")]);
  await assert.rejects(readPdfPages(pdf, options), /PDF page 2: Scanner unavailable/);
  assert.equal(calls.terminated, 1);
  assert.deepEqual(calls.cleaned, [1, 2]);
  assert.equal(calls.canvases[0].width, 0);
});

test("unreadable pages produce an error instead of inserting a message into the story", async () => {
  const { pdf, options, calls } = fixture([""], [" \n "]);
  await assert.rejects(readPdfPages(pdf, options), /PDF page 1: No readable text/);
  assert.equal(calls.terminated, 1);
});

test("Filipino PDFs use Tagalog and English data in one worker", async () => {
  const { pdf, options, calls } = fixture(["", ""], ["May puno.", "May bahay."]);
  await readPdfPages(pdf, { ...options, language: "FIL" });
  assert.deepEqual(calls.languages, [["fil", "eng"]]);
});

test("English-tab PDFs also load Filipino to handle a mistaken tab selection", async () => {
  const { pdf, options, calls } = fixture([""]);
  await readPdfPages(pdf, options);
  assert.deepEqual(calls.languages, [["eng", "fil"]]);
});
