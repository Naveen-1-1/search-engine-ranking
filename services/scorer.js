export const DEFAULT_WEIGHTS = {
  title: 5,
  summary: 3,
  body: 1,
  category: 1,
  source: 1,
  tags: 4,
  popularity: 2,
  recency: 2,
};

export function normalizeWeights(weights = {}) {
  return {
    ...DEFAULT_WEIGHTS,
    ...Object.fromEntries(
      Object.entries(weights).map(([key, value]) => [key, Number(value) || 0])
    ),
  };
}

export function scoreRecord(record, indexMatches, rankingProfile) {
  const weights = normalizeWeights(rankingProfile?.weights);
  const matchedTerms = new Set();
  const matchedFields = new Set();
  let textScore = 0;

  for (const match of indexMatches) {
    matchedTerms.add(match.term);
    matchedFields.add(match.field);
    textScore += (weights[match.field] || 1) * match.termFrequency;
  }

  const popularityScore = getPopularityScore(
    record.popularity,
    weights.popularity
  );
  const recencyScore = getRecencyScore(record.publishedAt, weights.recency);
  const score = textScore + popularityScore + recencyScore;

  return {
    score: Number(score.toFixed(4)),
    textScore: Number(textScore.toFixed(4)),
    popularityScore: Number(popularityScore.toFixed(4)),
    recencyScore: Number(recencyScore.toFixed(4)),
    matchedTerms: [...matchedTerms],
    matchedFields: [...matchedFields],
  };
}

function getPopularityScore(popularity, weight) {
  const normalizedPopularity =
    Math.max(0, Math.min(Number(popularity) || 0, 1000)) / 1000;
  return normalizedPopularity * weight;
}

function getRecencyScore(publishedAt, weight) {
  const publishedDate = new Date(publishedAt);

  if (Number.isNaN(publishedDate.getTime())) {
    return 0;
  }

  const ageInDays = Math.max(
    0,
    (Date.now() - publishedDate.getTime()) / 86400000
  );
  return (1 / (1 + ageInDays / 365)) * weight;
}
