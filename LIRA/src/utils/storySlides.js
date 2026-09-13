// Paginate at read time so existing uploads also use five sentences per slide.
export function storySlides(pages = [], language = 'ENG') {
  const text = pages.map((page) => String(page?.text || '').trim()).filter(Boolean).join('\n\n');
  if (!text) return [];

  const segments = typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(language === 'FIL' ? 'fil' : 'en', { granularity: 'sentence' }).segment(text), (part) => part.segment)
    : text.match(/[\s\S]+?(?:[.!?]+["'”’)]*(?:\s+|$)|$)/gu) || [text];

  // Segmenter can return paragraph whitespace separately; it is not a sentence.
  const sentences = [];
  for (const segment of segments) {
    if (segment.trim()) sentences.push(segment);
    else if (sentences.length) sentences[sentences.length - 1] += segment;
  }

  const slides = [];
  for (let index = 0; index < sentences.length; index += 5) {
    slides.push(sentences.slice(index, index + 5).join('').trim());
  }
  return slides;
}
