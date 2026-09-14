// The current Tesseract.js CDN publishes Filipino/Tagalog data under fil.
export function ocrLanguages(language = "ENG") {
  return language === "FIL" ? ["fil", "eng"] : ["eng", "fil"];
}

// OCR only image-only pages; reuse one worker for the whole document.
export async function readPdfPages(pdf, { extractText, createWorker, language = "ENG", createCanvas = () => document.createElement("canvas"), onProgress = () => {} }) {
  let worker;
  const pageTexts = [];
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      onProgress(`Reading PDF page ${number} of ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      let canvas;
      try {
        let text = extractText(await page.getTextContent()).trim();
        if (!text) {
          onProgress(`Scanning PDF page ${number} of ${pdf.numPages}…`);
          worker ??= await createWorker(ocrLanguages(language));
          const original = page.getViewport({ scale: 1 });
          // Render at double resolution, capped to avoid huge page allocations.
          const scale = Math.min(2, 3200 / Math.max(original.width, original.height));
          const viewport = page.getViewport({ scale });
          canvas = createCanvas();
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not prepare this page for scanning.");
          await page.render({ canvasContext: context, viewport, background: "rgb(255,255,255)" }).promise;
          const result = await worker.recognize(canvas);
          text = result.data.text.replace(/[ \t]+\n/g, "\n").trim();
        }
        if (!text) throw new Error("No readable text was found. Remove the blank page or use a clearer scan and try again.");
        pageTexts.push(text);
      } catch (error) {
        throw new Error(`PDF page ${number}: ${error.message || "Could not read this page. Please try again."}`);
      } finally {
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        page.cleanup();
      }
    }
    return pageTexts;
  } finally {
    if (worker) await worker.terminate();
  }
}
