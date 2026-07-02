"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

ChartJS.defaults.font.family =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
ChartJS.defaults.color = "#94a3b8";
ChartJS.defaults.borderColor = "rgba(148,163,184,0.15)";

const GRID = { color: "rgba(148,163,184,0.14)" };
const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
};

export const BLUES = ["#2563eb", "#0ea5e9", "#6366f1", "#06b6d4", "#3b82f6", "#818cf8", "#38bdf8", "#1d4ed8", "#a5b4fc", "#7dd3fc", "#93c5fd", "#67e8f9", "#4f46e5", "#0284c7"];

export function LineChart({
  labels,
  series,
  height = 260,
  money = true,
}: {
  labels: string[];
  series: { label: string; data: number[]; color?: string; fill?: boolean }[];
  height?: number;
  money?: boolean;
}) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: series.map((s, i) => ({
            label: s.label,
            data: s.data,
            borderColor: s.color || BLUES[i % BLUES.length],
            backgroundColor: (s.color || BLUES[i % BLUES.length]) + "22",
            fill: s.fill !== false,
            tension: 0.4,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: series.length > 1, position: "top", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
            tooltip: {
              callbacks: money
                ? { label: (c) => `${c.dataset.label}: ${compact(Number(c.parsed.y))}` }
                : undefined,
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: GRID, ticks: money ? { callback: (v) => compact(Number(v)) } : {} },
          },
        }}
      />
    </div>
  );
}

export function BarChart({
  labels,
  series,
  height = 260,
  money = true,
  horizontal = false,
  stacked = false,
}: {
  labels: string[];
  series: { label: string; data: number[]; color?: string }[];
  height?: number;
  money?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
}) {
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: series.map((s, i) => ({
            label: s.label,
            data: s.data,
            backgroundColor: s.color || BLUES[i % BLUES.length],
            borderRadius: 8,
            maxBarThickness: 34,
          })),
        }}
        options={{
          indexAxis: horizontal ? "y" : "x",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: series.length > 1, position: "top", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
            tooltip: money
              ? { callbacks: { label: (c) => `${c.dataset.label}: ${compact(Number(horizontal ? c.parsed.x : c.parsed.y))}` } }
              : undefined,
          },
          scales: {
            x: horizontal
              ? { grid: GRID, stacked, ticks: money ? { callback: (v) => compact(Number(v)) } : {} }
              : { grid: { display: false }, stacked },
            y: horizontal
              ? { grid: { display: false }, stacked }
              : { grid: GRID, stacked, ticks: money ? { callback: (v) => compact(Number(v)) } : {} },
          },
        }}
      />
    </div>
  );
}

export function DonutChart({
  labels,
  data,
  height = 260,
  colors,
  money = true,
}: {
  labels: string[];
  data: number[];
  height?: number;
  colors?: string[];
  money?: boolean;
}) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors || BLUES,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.65)",
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: { position: "right", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 12 } },
            tooltip: money ? { callbacks: { label: (c) => `${c.label}: ${compact(Number(c.parsed))}` } } : undefined,
          },
        }}
      />
    </div>
  );
}
