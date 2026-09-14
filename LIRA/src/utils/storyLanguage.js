const wordsByLanguage = {
  FIL: new Set("ang mga ng sa ay siya sila kami tayo kayo ako ikaw niya nila namin natin inyong kanyang kanilang isang mga ito iyon dito doon upang ngunit dahil kaya habang nang hindi walang meron mayroon araw naman rin din para kung mula bawat lahat paano bakit sino saan alin ano at".split(" ")),
  ENG: new Set("the a an and is are was were she he they we you his her their our your this that these those with from into when where which what who why how because but would could should had has have not there then each every all of to".split(" ")),
};

// A conservative hint, not a definitive language classifier. Mixed or short text
// remains undecided so the teacher is not prompted on weak evidence.
export function detectStoryLanguage(text) {
  const words = String(text || "").toLowerCase().match(/[\p{L}]+/gu) || [];
  if (words.length < 12) return null;
  const scores = Object.entries(wordsByLanguage).map(([language, vocabulary]) => {
    const matches = words.filter((word) => vocabulary.has(word));
    return { language, count: matches.length, distinct: new Set(matches).size };
  }).sort((a, b) => b.count - a.count);
  const [best, other] = scores;
  return best.count >= 5 && best.distinct >= 3 && best.count / words.length >= 0.15
    && best.count >= (other.count + 1) * 2.5 ? best.language : null;
}
