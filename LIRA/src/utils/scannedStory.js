function separateScanHeading(pageTexts) {
  let title = "";
  const knownHeadings = new Set();
  const normalize = (line) => line.trim().replace(/\s+/g, " ").toLowerCase();
  const isByline = (line) => {
    const match = line.trim().match(/^(?:(?:story|written)\s+by|author\s*:|by|(?:isinulat|akda|kuwento|kwento)\s+ni|may-akda\s*:|ni)\s+(.+)$/i);
    return Boolean(match && /^\p{Lu}[\p{L}\p{M} .,'’-]{0,100}$/u.test(match[1]));
  };
  const isTitle = (line) => {
    const words = line.trim().split(/\s+/);
    return words.length >= 2 && words.length <= 14
      && !/[.!?:;]$/.test(line.trim())
      && words.every((word) => /^\p{Lu}/u.test(word) || /^(?:a|an|and|at|by|for|in|of|on|or|the|to|with|ang|at|ay|mga|na|ng|ni|sa)$/i.test(word))
      && !/^(?:questions|comprehension questions|mga tanong|tanong|mga katanungan|katanungan|answer key)$/i.test(line.trim());
  };
  const pages = pageTexts.map((text, pageIndex) => {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let cursor = 0;
    while (cursor < lines.length && !lines[cursor].trim()) cursor += 1;
    if (pageIndex === 0) {
      const first = lines[cursor]?.trim() || "";
      const explicitTitle = first.match(/^(?:title|pamagat)\s*:\s*(.+)$/i);
      const candidates = [];
      let next = cursor;
      while (next < lines.length && candidates.length < 3) {
        const line = lines[next].trim();
        if (!line) { next += 1; continue; }
        if (isByline(line)) break;
        if (!isTitle(line)) break;
        candidates.push(line);
        next += 1;
      }
      // Require a byline after a wrapped heading, or a separated single title.
      const hasByline = isByline(lines[next] || "");
      if (explicitTitle) {
        title = explicitTitle[1].trim();
        knownHeadings.add(normalize(first));
        cursor += 1;
      } else if (candidates.length && (hasByline || (candidates.length === 1 && !lines[cursor + 1]?.trim()))) {
        title = candidates.join(" ");
        candidates.forEach((line) => knownHeadings.add(normalize(line)));
        cursor = next;
      }
    }
    // Only remove metadata at the top of a page, never matches inside the story.
    while (cursor < lines.length) {
      const line = lines[cursor].trim();
      if (!line || knownHeadings.has(normalize(line)) || isByline(line)) {
        cursor += 1;
      } else break;
    }
    return lines.slice(cursor).join("\n").trim();
  });
  return { title, pages };
}

// Keep unmatched text for review rather than silently discarding OCR output.
export function splitScannedStory(pageTexts) {
  const heading = separateScanHeading(pageTexts);
  const source = heading.pages.join("\n\n");
  const starts = [...source.matchAll(/(?:^|\n)[ \t]*(\d+)[.)][ \t]+/g)];
  const questions = [];
  const removed = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1]?.index ?? source.length;
    const body = source.slice(start.index + start[0].length, end);
    const labels = [...body.matchAll(/(?:^|\s)([A-Da-d])[.)][ \t]+/g)];
    if (labels.length < 2 || labels.some((label, i) => label[1].toUpperCase() !== "ABCD"[i])) continue;
    const question = body.slice(0, labels[0].index).trim();
    const options = labels.map((label, i) => body.slice(
      label.index + label[0].length, labels[i + 1]?.index ?? body.length,
    ).trim());
    // A blank line after the final choice can introduce more story text or an answer key.
    const last = labels.at(-1);
    const lastStart = last.index + last[0].length;
    const suffix = body.slice(lastStart).search(/\n[ \t]*\n/);
    const bodyEnd = suffix < 0 ? body.length : lastStart + suffix;
    options[options.length - 1] = body.slice(lastStart, bodyEnd).trim();
    if (!question || options.some((option) => !option)) continue;
    questions.push({ id: questions.length + 1, question, options, correct: null });
    removed.push([start.index, start.index + start[0].length + bodyEnd]);
  }
  let remaining = source;
  for (const [start, end] of removed.reverse()) {
    remaining = remaining.slice(0, start) + "\n\n" + remaining.slice(end);
  }
  if (questions.length) {
    remaining = remaining.replace(/^[ \t]*(?:comprehension questions|questions|mga tanong|tanong)[ \t]*:?[ \t]*$/gim, "");
  }
  return {
    title: heading.title,
    pages: remaining.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean)
      .map((text, index) => ({ id: index + 1, text })),
    questions,
  };
}
