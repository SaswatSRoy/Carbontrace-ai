"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export function ComparisonBars({ userScore, nationalAverage, targetScore }: { userScore: number, nationalAverage: number, targetScore: number }) {
  if (!userScore) return null;

  const data = [
    { name: '1.5°C Target', score: targetScore, fill: '#4ADE80' },
    { name: 'You', score: userScore, fill: '#86EFAC' },
    { name: 'Nat. Avg', score: nationalAverage, fill: '#64748b' },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3B31" horizontal={false} />
          <XAxis 
            type="number" 
            stroke="#869e8b" 
            tick={{ fill: '#869e8b', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val/1000}k`}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            stroke="#869e8b" 
            tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 500 }} 
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip 
            cursor={{ fill: '#2D3B31' }}
            contentStyle={{ backgroundColor: '#1A2E1F', border: '1px solid #2D3B31', borderRadius: '12px' }}
            itemStyle={{ color: '#86EFAC' }}
            formatter={(value: any) => [`${value} kg`, 'Emissions']}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
