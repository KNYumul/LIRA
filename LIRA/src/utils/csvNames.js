const lastNameHeaders = new Set(['lastname', 'surname', 'familyname', 'studentlastname', 'learnerlastname']);
const fullNameHeaders = new Set(['name', 'fullname', 'studentname', 'learnername', 'studentfullname', 'learnerfullname']);

export function findCsvNameColumn(headers) {
  const lastName = headers.findIndex((header) => lastNameHeaders.has(header));
  if (lastName >= 0) return { index: lastName, fullName: false };
  return { index: headers.findIndex((header) => fullNameHeaders.has(header)), fullName: true };
}

export function extractCsvLastName(value, fullName = false) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  // A comma explicitly separates the surname from given names, even in a Last Name column.
  if (name.includes(',')) return name.split(',')[0].trim();
  if (!fullName || !name) return name;

  const words = name.split(' ');
  if (words.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(words.at(-1))) words.pop();
  let start = words.length - 1;
  // Preserve common compound surnames in otherwise given-name-first values.
  const prefixes = new Set(['de', 'del', 'dela', 'la', 'las', 'los', 'san', 'santa', 'santo', 'da', 'dos', 'di', 'van', 'von']);
  while (start > 0 && prefixes.has(words[start - 1].toLowerCase())) start -= 1;
  return words.slice(start).join(' ');
}
