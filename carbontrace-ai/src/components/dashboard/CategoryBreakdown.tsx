"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";
import { CarbonScore } from "../../lib/carbon/types";

interface CategoryBreakdownProps {
  breakdown: CarbonScore["breakdown"];
}

const CATEGORY_CONFIG = {
  transport: { name: "Transport", icon: "🚗", color: "#3B82F6", patternId: "pattern-transport", bgClass: "bg-[#3B82F6]", fillClass: "fill-[#3B82F6]" },
  homeEnergy: { name: "Energy", icon: "⚡", color: "#F59E0B", patternId: "pattern-energy", bgClass: "bg-[#F59E0B]", fillClass: "fill-[#F59E0B]" },
  food: { name: "Food", icon: "🍽️", color: "#10B981", patternId: "pattern-food", bgClass: "bg-[#10B981]", fillClass: "fill-[#10B981]" },
  shopping: { name: "Shopping", icon: "🛍️", color: "#8B5CF6", patternId: "pattern-shopping", bgClass: "bg-[#8B5CF6]", fillClass: "fill-[#8B5CF6]" },
  waste: { name: "Waste", icon: "🗑️", color: "#6B7280", patternId: "pattern-waste", bgClass: "bg-[#6B7280]", fillClass: "fill-[#6B7280]" },
};

interface ActiveShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

// Custom active shape for highlighted segment
const renderActiveShape = (props: unknown) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as ActiveShapeProps;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

interface TooltipPayloadEntry {
  payload?: {
    name: string;
    icon: string;
    value: number;
  };
}

const CustomTooltip = ({ active, payload, total }: { active?: boolean; payload?: readonly TooltipPayloadEntry[]; total: number }) => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-surface-2 p-3 rounded shadow-subtle border border-surface">
        <p className="text-text font-semibold">{data.icon} {data.name}</p>
        <p className="text-muted text-sm">{Math.round(data.value).toLocaleString()} kg CO₂e</p>
        <p className="text-accent text-sm font-medium">{percentage}%</p>
      </div>
    );
  }
  return null;
};

interface LegendDataEntry {
  bgClass: string;
  icon: string;
  name: string;
}

const CustomLegend = ({ payload, data }: { payload?: readonly unknown[]; data: LegendDataEntry[] }) => {
  return (
    <ul className="flex flex-wrap justify-center gap-4 mt-4">
      {payload?.map((_: unknown, index: number) => {
        const item = data[index];
        return (
          <li key={`item-${index}`} className="flex items-center text-sm text-text">
            <span 
              className={`w-3 h-3 rounded-full mr-2 ${item.bgClass}`} 
              aria-hidden="true"
            />
            <span aria-hidden="true" className="mr-1">{item.icon}</span>
            {item.name}
          </li>
        );
      })}
    </ul>
  );
};

export function CategoryBreakdown({ breakdown }: CategoryBreakdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const data = Object.entries(breakdown).map(([key, value]) => ({
    name: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].name,
    icon: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].icon,
    value,
    color: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].color,
    patternId: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].patternId,
    bgClass: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].bgClass,
    fillClass: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].fillClass,
  }));

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const ariaLabelText = `Carbon breakdown: ${data.map(d => `${d.name} ${Math.round(d.value)} kilograms`).join(", ")}`;

  return (
    <div 
      className="w-full h-80 flex flex-col items-center"
      aria-label={ariaLabelText}
      role="region"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {/* Patterns for color-blind accessibility */}
            <pattern id="pattern-transport" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3"/>
            </pattern>
            <pattern id="pattern-energy" patternUnits="userSpaceOnUse" width="8" height="8">
              <circle cx="4" cy="4" r="2" fill="#ffffff" fillOpacity="0.3"/>
            </pattern>
            <pattern id="pattern-food" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M0,0 l0,4 M2,0 l0,4" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3"/>
            </pattern>
            <pattern id="pattern-shopping" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M0,0 l8,8 M8,0 l-8,8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3"/>
            </pattern>
            <pattern id="pattern-waste" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M0,4 l4,0" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3"/>
            </pattern>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            // @ts-expect-error: Recharts type definitions are sometimes incomplete for activeIndex on Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            onClick={onPieEnter} // Mobile support
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#${entry.patternId})`} 
                stroke={entry.color} 
                strokeWidth={2}
                className={entry.fillClass}
              />
            ))}
          </Pie>
          <Tooltip content={(props) => <CustomTooltip {...props} total={total} />} />
          <Legend content={(props) => <CustomLegend {...props} data={data} />} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
