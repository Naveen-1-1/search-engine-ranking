const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
]);

const SEARCHABLE_FIELDS = [
  "title",
  "summary",
  "body",
  "category",
  "source",
  "tags",
];

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(value) {
  return normalizeText(Array.isArray(value) ? value.join(" ") : value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

export function buildRecordTermStats(record) {
  const stats = [];

  for (const field of SEARCHABLE_FIELDS) {
    const tokens = tokenize(record[field]);
    const termMap = new Map();

    tokens.forEach((term, position) => {
      if (!termMap.has(term)) {
        termMap.set(term, {
          term,
          field,
          termFrequency: 0,
          positions: [],
        });
      }

      const entry = termMap.get(term);
      entry.termFrequency += 1;
      entry.positions.push(position);
    });

    stats.push(...termMap.values());
  }

  return stats;
}

export { SEARCHABLE_FIELDS };
