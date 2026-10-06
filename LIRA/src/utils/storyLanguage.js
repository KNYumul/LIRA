const wordsByLanguage = {
  FIL: new Set("ang mga ng sa ay siya sila kami tayo kayo ako ikaw niya nila namin natin inyong kanyang kanilang isang mga ito iyon dito doon upang ngunit dahil kaya habang nang hindi walang meron mayroon araw naman rin din para kung mula bawat lahat paano bakit sino saan alin ano at".split(" ")),
  ENG: new Set("the a an and is are was were she he they we you his her their our your this that these those with from into when where which what who why how because but would could should had has have not there then each every all of to".split(" ")),
};

// Common reading vocabulary supplements the function words used for stories.
// Shared words and unknown words cannot reliably identify a single-word card.
const flashcardWords = {
  ENG: new Set([...wordsByLanguage.ENG, ..."apple banana orange fruit cat dog bird fish cow pig horse chicken duck goat animal house home school book pencil paper teacher student child children boy girl mother father sister brother family friend water food rice bread milk egg sun moon star sky rain wind tree flower leaf mountain river sea red blue green yellow black white pink brown purple one two three four five six seven eight nine ten happy sad big small hot cold good bad run walk read write eat drink sleep play jump sing dance eyes ears nose mouth hand feet head love hello morning night thank thanks beautiful".split(" ")]),
  FIL: new Set([...wordsByLanguage.FIL, ..."mansanas saging kahel prutas pusa aso ibon isda baka baboy kabayo manok pato kambing hayop bahay tahanan paaralan aklat libro lapis papel guro mag-aaral bata lalaki babae nanay tatay ina ama ate kuya kapatid pamilya kaibigan tubig pagkain kanin tinapay gatas itlog buwan bituin langit ulan hangin puno bulaklak dahon bundok ilog dagat pula asul berde dilaw itim puti rosas kayumanggi lila isa dalawa tatlo apat lima anim pito walo siyam sampu masaya malungkot malaki maliit mainit malamig mabuti masama takbo lakad basa sulat kain inom tulog laro talon kanta sayaw mata tainga ilong bibig kamay paa ulo mahal kumusta umaga gabi salamat maganda si ni nasa".split(" ")]),
};
const ambiguousFlashcardWords = new Set("a an at ay to din para ate".split(" "));

export function detectFlashcardLanguage(text) {
  const words = String(text || "").toLowerCase().match(/[\p{L}]+(?:-[\p{L}]+)*/gu) || [];
  if (!words.length) return null;
  const scores = { ENG: 0, FIL: 0 };
  for (const word of words) {
    if (ambiguousFlashcardWords.has(word)) continue;
    const english = flashcardWords.ENG.has(word);
    const filipino = flashcardWords.FIL.has(word);
    if (english === filipino) continue;
    scores[english ? "ENG" : "FIL"] += 1;
  }
  const best = scores.ENG > scores.FIL ? "ENG" : "FIL";
  const other = best === "ENG" ? "FIL" : "ENG";
  // Require evidence across the card and a clear majority for mixed text.
  return scores[best] > 0 && scores[best] / words.length >= 0.5
    && scores[best] > scores[other] * 2 ? best : detectStoryLanguage(text);
}

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
