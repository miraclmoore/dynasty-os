// Position base values (0-100 scale)
const POSITION_BASE: Record<string, number> = {
  QB: 100,
  EDGE: 85,
  LT: 80,
  CB: 78,
  WR: 75,
  S: 72,
  DT: 70,
  RB: 65,
  TE: 65,
  OL: 60,
  LB: 60,
  K: 20,
  P: 20,
};

export interface TradeValueInput {
  position: string;
  overallRating: number;    // 50–99
  age: number;              // player age
  contractYearsLeft: number; // 0–7
}

export interface TradeValueResult {
  totalValue: number;       // 0–150 point scale
  grade: 'Elite' | 'High' | 'Average' | 'Low' | 'Untradeable';
  breakdown: {
    basePosition: number;
    ratingAdjustment: number;
    agePenalty: number;
    contractBonus: number;
  };
}

export function calculateTradeValue(input: TradeValueInput): TradeValueResult {
  const { position, overallRating, age, contractYearsLeft } = input;

  const basePos = POSITION_BASE[position.toUpperCase()] ?? 60;

  // ratingFactor: 0–1 scale above 50
  const ratingFactor = (overallRating - 50) / 50;

  // agePenalty: 8% reduction per year above 30
  const agePenalty = age > 30 ? (age - 30) * 0.08 : 0;

  // contractBonus: capped at 20%, 5% per year above 1
  const contractBonus = Math.min(0.2, (contractYearsLeft - 1) * 0.05);

  // Base value with rating applied
  const base = basePos * (1 + ratingFactor);

  // Final value with age and contract adjustments
  const rawTotal = base * (1 - agePenalty) * (1 + contractBonus);
  const totalValue = Math.max(0, Math.min(150, Math.round(rawTotal)));

  // Grade thresholds
  let grade: TradeValueResult['grade'];
  if (totalValue >= 100) grade = 'Elite';
  else if (totalValue >= 70) grade = 'High';
  else if (totalValue >= 40) grade = 'Average';
  else if (totalValue >= 10) grade = 'Low';
  else grade = 'Untradeable';

  return {
    totalValue,
    grade,
    breakdown: {
      basePosition: Math.round(basePos),
      ratingAdjustment: Math.round(basePos * ratingFactor),
      agePenalty: Math.round(base * agePenalty),
      contractBonus: Math.round(base * (1 - agePenalty) * contractBonus),
    },
  };
}
