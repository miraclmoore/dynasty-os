import React, { useEffect, useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import type { Season } from '@dynasty-os/core-types';
import { getSeasonsByDynasty } from '../lib/season-service';

interface SeasonSparklineProps {
  dynastyId: string;
  sport: string;
}

const BAR_COLORS: Record<string, string> = {
  cfb:    '#ea580c', // orange-600
  madden: '#2563eb', // blue-600
  nfl2k:  '#7c3aed', // violet-600
};

type ChartEntry = { year: number; wins: number; losses: number };

interface SparkTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartEntry }>;
}

function SparkTooltip({ active, payload }: SparkTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-gray-200 shadow-lg pointer-events-none">
      <span className="font-heading font-bold">{entry.year}</span>
      <span className="text-gray-400"> · </span>
      {entry.wins}–{entry.losses}
    </div>
  );
}

export function SeasonSparkline({ dynastyId, sport }: SeasonSparklineProps) {
  const [chartData, setChartData] = useState<ChartEntry[]>([]);

  useEffect(() => {
    getSeasonsByDynasty(dynastyId)
      .then((seasons: Season[]) => {
        const data = [...seasons]
          .sort((a, b) => a.year - b.year)
          .map((s) => ({ year: s.year, wins: s.wins, losses: s.losses }));
        setChartData(data);
      })
      .catch(() => {});
  }, [dynastyId]);

  if (chartData.length === 0) return null;

  const color = BAR_COLORS[sport] ?? '#6366f1';

  return (
    <div className="h-10 w-full mt-3 mb-0.5" title="Season win history">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%">
          <Bar dataKey="wins" fill={color} radius={[2, 2, 0, 0]} opacity={0.75} />
          <Tooltip
            content={<SparkTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
