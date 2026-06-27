"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEUR, formatMonth } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium text-foreground">{formatEUR(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export function IncomeChart({ data }: { data: { month: string; income: number }[] }) {
  const chart = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chart} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<MoneyTooltip />} />
        <Bar dataKey="income" name="Net income" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BalanceChart({ data }: { data: { date: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={48} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip content={<MoneyTooltip />} />
        <Area type="monotone" dataKey="balance" name="Balance" stroke="var(--brand)" strokeWidth={2} fill="url(#balFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 200,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} strokeWidth={0}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={({ active, payload }: any) => {
          if (!active || !payload?.length) return null;
          const p = payload[0];
          return (
            <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
              <span className="font-medium">{p.name}: </span>
              <span className="tabular-nums">{p.value} ({total ? Math.round((p.value / total) * 100) : 0}%)</span>
            </div>
          );
        }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<MoneyTooltip />} />
        <Bar dataKey="value" name="Spend" radius={[0, 5, 5, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
