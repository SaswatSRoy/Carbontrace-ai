"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function TrendLine({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3B31" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#869e8b" 
            tick={{ fill: '#869e8b', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#869e8b" 
            tick={{ fill: '#869e8b', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val/1000}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1A2E1F', border: '1px solid #2D3B31', borderRadius: '12px' }}
            itemStyle={{ color: '#86EFAC' }}
            formatter={(value: any) => [`${value} kg`, 'Total Emissions']}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#86EFAC" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#86EFAC', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4ADE80', stroke: '#1A2E1F', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
