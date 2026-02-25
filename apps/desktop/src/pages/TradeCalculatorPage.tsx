import React, { useState } from 'react';
import { useDynastyStore } from '../store';
import { calculateTradeValue, type TradeValueResult } from '../lib/trade-calculator';

const POSITIONS = ['QB', 'EDGE', 'LT', 'CB', 'WR', 'S', 'DT', 'RB', 'TE', 'OL', 'LB', 'K', 'P'];

const GRADE_STYLES: Record<TradeValueResult['grade'], string> = {
  Elite: 'bg-purple-900/50 text-purple-300 border-purple-600',
  High: 'bg-green-900/50 text-green-300 border-green-600',
  Average: 'bg-yellow-900/50 text-yellow-300 border-yellow-600',
  Low: 'bg-orange-900/50 text-orange-300 border-orange-600',
  Untradeable: 'bg-red-900/50 text-red-300 border-red-600',
};

export function TradeCalculatorPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  // Madden-only guard
  if (!activeDynasty || activeDynasty.sport !== 'madden') return null;

  return <TradeCalculatorContent />;
}

function TradeCalculatorContent() {
  const [position, setPosition] = useState<string>('QB');
  const [overallRating, setOverallRating] = useState<number>(75);
  const [age, setAge] = useState<number>(27);
  const [contractYearsLeft, setContractYearsLeft] = useState<number>(2);
  const [result, setResult] = useState<TradeValueResult | null>(null);

  const handleCalculate = () => {
    const r = calculateTradeValue({ position, overallRating, age, contractYearsLeft });
    setResult(r);
  };

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors';
  const labelClass = 'block text-xs font-medium text-gray-400 mb-1';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Trade Value Calculator</h1>
        <p className="text-gray-400 text-sm mt-1">Evaluate a player's trade value based on position, rating, age, and contract</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Calculator form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Player Info</h2>

          <div className="space-y-4">
            {/* Position */}
            <div>
              <label className={labelClass}>Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={inputClass}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Overall Rating */}
            <div>
              <label className={labelClass}>Overall Rating (50–99)</label>
              <input
                type="number"
                min={50}
                max={99}
                value={overallRating}
                onChange={(e) => setOverallRating(Math.min(99, Math.max(50, Number(e.target.value))))}
                className={inputClass}
              />
            </div>

            {/* Age */}
            <div>
              <label className={labelClass}>Age (20–40)</label>
              <input
                type="number"
                min={20}
                max={40}
                value={age}
                onChange={(e) => setAge(Math.min(40, Math.max(20, Number(e.target.value))))}
                className={inputClass}
              />
            </div>

            {/* Contract Years Left */}
            <div>
              <label className={labelClass}>Contract Years Left (0–7)</label>
              <input
                type="number"
                min={0}
                max={7}
                value={contractYearsLeft}
                onChange={(e) => setContractYearsLeft(Math.min(7, Math.max(0, Number(e.target.value))))}
                className={inputClass}
              />
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Calculate Trade Value
            </button>
          </div>
        </div>

        {/* Result panel */}
        {result ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Result</h2>

            {/* Grade badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-4 ${GRADE_STYLES[result.grade]}`}>
              {result.grade}
            </div>

            {/* Total value */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-1">Trade Value Score</p>
              <p className="text-5xl font-bold text-white">{result.totalValue}</p>
              <p className="text-xs text-gray-600 mt-1">out of 150</p>
            </div>

            {/* Breakdown table */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Breakdown</p>
              <div className="divide-y divide-gray-800">
                <BreakdownRow label="Base Position Value" value={result.breakdown.basePosition} positive />
                <BreakdownRow label="Rating Adjustment" value={result.breakdown.ratingAdjustment} positive />
                <BreakdownRow label="Age Penalty" value={-result.breakdown.agePenalty} />
                <BreakdownRow label="Contract Bonus" value={result.breakdown.contractBonus} positive />
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-semibold text-gray-200">Total</span>
                  <span className="text-sm font-bold text-amber-400">{result.totalValue}</span>
                </div>
              </div>
            </div>

            {/* Grade key */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-600 mb-2">Grade Scale</p>
              <div className="flex flex-wrap gap-1.5">
                {(['Elite', 'High', 'Average', 'Low', 'Untradeable'] as TradeValueResult['grade'][]).map((g) => (
                  <span
                    key={g}
                    className={`text-xs px-2 py-0.5 rounded-full border ${GRADE_STYLES[g]} ${g === result.grade ? 'font-bold ring-1 ring-white/20' : 'opacity-60'}`}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-5 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Enter player info and click Calculate to see trade value</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface BreakdownRowProps {
  label: string;
  value: number;
  positive?: boolean;
}

function BreakdownRow({ label, value, positive }: BreakdownRowProps) {
  const isPositive = value >= 0;
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          value === 0 ? 'text-gray-600' : isPositive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  );
}
