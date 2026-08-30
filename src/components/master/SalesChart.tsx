// ═══════════════════════════════════════════════
// Triwara POS — Pure SVG Responsive Sales Chart Component
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { ISalesChartResult, IChartDataPoint } from '../../services/report.service';
import { formatRupiah } from '../../utils/currency';

interface SalesChartProps {
  data: ISalesChartResult;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<IChartDataPoint | null>(null);

  const { points, peakPoint, mode, modeLabel, totalOmset } = data;

  // Compute maximum omset for Y scale (minimum 10,000 to prevent divide by zero)
  const maxOmset = Math.max(
    10000,
    ...points.map((p) => p.omset)
  );

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Format compact Rupiah for Y-axis ticks
  const formatCompactRp = (val: number): string => {
    if (val >= 1000000) {
      const jt = (val / 1000000).toFixed(1).replace(/\.0$/, '');
      return `Rp ${jt}jt`;
    }
    if (val >= 1000) {
      const rb = Math.round(val / 1000);
      return `Rp ${rb}rb`;
    }
    return `Rp ${val}`;
  };

  // Y-axis grid ticks (4 levels: 0, 33%, 66%, 100%)
  const yTicks = [0, maxOmset * 0.33, maxOmset * 0.66, maxOmset];

  // Bar sizing calculation
  const totalSlots = points.length;
  const slotWidth = chartWidth / totalSlots;
  const barWidth = Math.max(8, Math.min(32, slotWidth * 0.65));

  // Determine which X-axis labels to display to avoid overlapping
  const shouldShowLabel = (idx: number): boolean => {
    if (mode === 'hourly') {
      // Show every 3 hours: 00, 03, 06, 09, 12, 15, 18, 21, and last (23)
      return idx % 3 === 0 || idx === 23;
    }
    return true; // For daily (<= 7) and weekly (4), show all labels
  };

  return (
    <div className="sales-chart-card">
      {/* Chart Header Bar */}
      <div className="sales-chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 className="sales-chart-title">📊 Grafik Omset Penjualan</h3>
          <span className="sales-chart-mode-tag">{modeLabel}</span>
        </div>

        {peakPoint && peakPoint.omset > 0 && (
          <div className="sales-chart-peak-badge" title="Waktu dengan penjualan tertinggi">
            🔥 Teramai: <strong>{peakPoint.label}</strong> ({formatRupiah(peakPoint.omset)})
          </div>
        )}
      </div>

      {/* Active Hover Tooltip Banner */}
      <div className="sales-chart-tooltip-bar">
        {hoveredPoint ? (
          <span>
            <strong style={{ color: hoveredPoint.isPeak ? '#4ade80' : '#60a5fa' }}>
              {hoveredPoint.fullLabel}
            </strong>
            : <strong>{formatRupiah(hoveredPoint.omset)}</strong> ({hoveredPoint.orderCount} pesanan)
            {hoveredPoint.isPeak && <span style={{ color: '#4ade80', marginLeft: '6px' }}>(Puncak)</span>}
          </span>
        ) : (
          <span style={{ color: '#71717a' }}>
            Arahkan kursor / tap batang grafik untuk melihat rincian omset.
          </span>
        )}
      </div>

      {/* Main SVG Visualization */}
      <div className="sales-chart-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="sales-chart-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Standard Bar Gradient */}
            <linearGradient id="barGradientStandard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
            </linearGradient>

            {/* Peak Bar Gradient */}
            <linearGradient id="barGradientPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.75" />
            </linearGradient>

            {/* Hover Bar Gradient */}
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val, i) => {
            const y = paddingTop + chartHeight - (val / maxOmset) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {formatCompactRp(val)}
                </text>
              </g>
            );
          })}

          {/* Sumbu X Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={svgWidth - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#3f3f46"
            strokeWidth="1.5"
          />

          {/* Chart Bars */}
          {points.map((pt, idx) => {
            const slotCenterX = paddingLeft + idx * slotWidth + slotWidth / 2;
            const barX = slotCenterX - barWidth / 2;
            const barH = totalOmset > 0 && pt.omset > 0 ? (pt.omset / maxOmset) * chartHeight : 2;
            const barY = paddingTop + chartHeight - barH;
            const isHovered = hoveredPoint?.label === pt.label;

            let fill = 'url(#barGradientStandard)';
            if (pt.isPeak) fill = 'url(#barGradientPeak)';
            if (isHovered) fill = 'url(#barGradientHover)';

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Transparent hit area for easy touch/mouse hover */}
                <rect
                  x={slotCenterX - slotWidth / 2}
                  y={paddingTop}
                  width={slotWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />

                {/* Animated Rounded Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  rx="3"
                  ry="3"
                  fill={fill}
                  stroke={isHovered ? '#ffffff' : pt.isPeak ? '#86efac' : 'none'}
                  strokeWidth={isHovered ? '1.5' : '1'}
                  opacity={hoveredPoint && !isHovered ? 0.6 : 1}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Optional Peak Crown Indicator */}
                {pt.isPeak && (
                  <circle
                    cx={slotCenterX}
                    cy={Math.max(paddingTop + 5, barY - 6)}
                    r="3.5"
                    fill="#4ade80"
                  />
                )}

                {/* X-Axis Tick Label */}
                {shouldShowLabel(idx) && (
                  <text
                    x={slotCenterX}
                    y={paddingTop + chartHeight + 18}
                    textAnchor="middle"
                    fill={pt.isPeak ? '#4ade80' : isHovered ? '#fafafa' : '#a1a1aa'}
                    fontWeight={pt.isPeak || isHovered ? 700 : 400}
                    fontSize={mode === 'hourly' ? '10' : '11'}
                    fontFamily="sans-serif"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {totalOmset === 0 && (
        <div className="sales-chart-empty-overlay">
          <span>Belum ada omset penjualan yang tercatat pada rentang waktu ini.</span>
        </div>
      )}
    </div>
  );
};
