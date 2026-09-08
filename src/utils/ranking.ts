import type { Player, PlayerRankResult } from '../types';

/**
 * Calculates standard competition ranks (1224) with graceful tie handling
 */
export function calculateRanks(players: Player[]): PlayerRankResult[] {
  if (!players || players.length === 0) return [];

  // Sort players descending by score
  const sorted = [...players].sort((a, b) => b.score - a.score);

  // Group by score to identify ties
  const scoreCounts = new Map<number, number>();
  sorted.forEach(p => {
    scoreCounts.set(p.score, (scoreCounts.get(p.score) || 0) + 1);
  });

  let currentRank = 1;
  const results: PlayerRankResult[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i > 0 && p.score < sorted[i - 1].score) {
      currentRank = i + 1;
    }

    const isTie = (scoreCounts.get(p.score) || 0) > 1;

    results.push({
      playerId: p.id,
      playerName: p.name,
      finalScore: p.score,
      rank: currentRank,
      isTie,
    });
  }

  return results;
}

/**
 * Format rank label nicely for badges and UI
 */
export function formatRankLabel(rank: number, isTie: boolean): string {
  const suffix = getOrdinalSuffix(rank);
  if (isTie) {
    return `Joint ${rank}${suffix}`;
  }
  return `${rank}${suffix}`;
}

export function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
