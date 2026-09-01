// ═══════════════════════════════════════════════
// Triwara POS — Pure SVG Smooth Line & Area Chart Component
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { ISalesChartResult } from '../../services/report.service';
import { formatRupiah } from '../../utils/currency';

interface SalesChartProps {
  data: ISalesChartResult;
}

/**
 * Calculates a clean rounded ceiling number for the Y-axis.
 * Handles numbers dynamically:
 * e.g. 350,000 -> 400,000 | 4,800,000 -> 5,000,000 | 18,000,000 -> 20,000,000
 */
function getNiceCeiling(val: number): number {
  if (val <= 0) return 50000;
  const exponent = Math.floor(Math.log10(val));
  const fraction = val / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, peakPoint, mode, modeLabel, totalOmset } = data;

  // Compute maximum omset and clean ceiling for dynamic Y-axis auto-rescaling
  const maxDataVal = Math.max(0, ...points.map((p) => p.omset));
  const ceilingOmset = getNiceCeiling(maxDataVal || 50000);

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 70;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartHeight;

  // Format compact Rupiah for Y-axis ticks
  const formatCompactRp = (val: number): string => {
    if (val >= 1000000000) {
      const m = (val / 1000000000).toFixed(1).replace(/\.0$/, '');
      return `Rp ${m}M`;
    }
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

  // Dynamic Y-axis grid ticks (5 levels: 0%, 25%, 50%, 75%, 100%)
  const yTicks = [
    0,
    ceilingOmset * 0.25,
    ceilingOmset * 0.5,
    ceilingOmset * 0.75,
    ceilingOmset,
  ];

  // Map data points to SVG coordinates (X, Y)
  const totalPoints = points.length;
  const stepX = totalPoints > 1 ? chartWidth / (totalPoints - 1) : chartWidth / 2;

  const coordinates = points.map((pt, idx) => {
    const x = paddingLeft + (totalPoints > 1 ? idx * stepX : chartWidth / 2);
    const yRatio = ceilingOmset > 0 && totalOmset > 0 ? pt.omset / ceilingOmset : 0;
    const y = baselineY - yRatio * chartHeight;
    return { x, y, pt, idx };
  });

  // Build smooth cubic bezier curve path through coordinates
  const buildSmoothPath = (coords: Array<{ x: number; y: number }>): string => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      // Catmull-Rom to Cubic Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePathD = buildSmoothPath(coordinates);
  const firstX = coordinates[0]?.x || paddingLeft;
  const lastX = coordinates[coordinates.length - 1]?.x || paddingLeft + chartWidth;
  const areaPathD = `${linePathD} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

  // Determine which X-axis labels to display to prevent crowding
  const shouldShowLabel = (idx: number): boolean => {
    if (mode === 'hourly') {
      // Show every 3 hours: 00, 03, 06, 09, 12, 15, 18, 21, and last (23)
      return idx % 3 === 0 || idx === 23;
    }
    if (mode === 'interval') {
      // Interval has 6 slots per day.
      if (totalPoints > 24) {
        return idx % 3 === 0 || idx === totalPoints - 1;
      }
      if (totalPoints > 12) {
        return idx % 2 === 0 || idx === totalPoints - 1;
      }
      return true;
    }
    if (mode === 'daily') {
      // If days > 15, show every 2nd or 3rd day to avoid crowding
      if (totalPoints > 20) {
        return idx % 3 === 0 || idx === totalPoints - 1;
      }
      if (totalPoints > 10) {
        return idx % 2 === 0 || idx === totalPoints - 1;
      }
      return true;
    }
    if (mode === 'weekly') {
      return true;
    }
    if (mode === 'monthly') {
      return true;
    }
    return true;
  };

  const activePoint = hoveredIndex !== null ? coordinates[hoveredIndex] : null;

  return (
    <div className="sales-chart-card">
      {/* Chart Header Bar */}
      <div className="sales-chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 className="sales-chart-title">📈 Tren Omset Penjualan</h3>
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
        {activePoint ? (
          <span>
            <strong style={{ color: activePoint.pt.isPeak ? '#16a34a' : '#2563eb' }}>
              {activePoint.pt.fullLabel}
            </strong>
            : <strong>{formatRupiah(activePoint.pt.omset)}</strong> ({activePoint.pt.orderCount} pesanan)
            {activePoint.pt.isPeak && (
              <span style={{ color: '#16a34a', marginLeft: '6px', fontWeight: 700 }}>(🔥 Puncak)</span>
            )}
          </span>
        ) : (
          <span style={{ color: '#64748b' }}>
            Geser kursor / sentuh titik kurva untuk melihat rincian omset.
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
            {/* Area Gradient Fill (Neon Blue to Transparent) */}
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
            </linearGradient>

            {/* Line Stroke Gradient */}
            <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Auto-Rescaling Y-Axis Labels */}
          {yTicks.map((val, i) => {
            const y = baselineY - (val / ceilingOmset) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
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
            y1={baselineY}
            x2={svgWidth - paddingRight}
            y2={baselineY}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* 1. Shaded Gradient Area Under Curve */}
          {totalOmset > 0 && (
            <path
              d={areaPathD}
              fill="url(#lineAreaGradient)"
              style={{ transition: 'all 0.3s ease' }}
            />
          )}

          {/* 2. Main Curved Line Stroke */}
          {totalOmset > 0 && (
            <path
              d={linePathD}
              fill="none"
              stroke="url(#lineStrokeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.35))' }}
            />
          )}

          {/* 3. Active Crosshair Guideline */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={baselineY}
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
            </g>
          )}

          {/* 4. Interactive Data Points & Hover Targets */}
          {coordinates.map((coord, idx) => {
            const isHovered = hoveredIndex === idx;
            const isPeak = coord.pt.isPeak;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Wide transparent touch/click zone */}
                <rect
                  x={coord.x - stepX / 2}
                  y={paddingTop}
                  width={stepX}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />

                {/* Outer Glow Ring for Peak or Hovered Point */}
                {(isHovered || isPeak) && totalOmset > 0 && coord.pt.omset > 0 && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isHovered ? 8 : 6}
                    fill="none"
                    stroke={isPeak ? '#16a34a' : '#2563eb'}
                    strokeWidth="2"
                    opacity={isHovered ? 1 : 0.6}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Center Point Dot */}
                {totalOmset > 0 && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isHovered ? 5 : isPeak ? 4.5 : 3}
                    fill={isPeak ? '#16a34a' : isHovered ? '#1d4ed8' : '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* X-Axis Tick Label */}
                {shouldShowLabel(idx) && (
                  <text
                    x={coord.x}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fill={isPeak ? '#16a34a' : isHovered ? '#0f172a' : '#64748b'}
                    fontWeight={isPeak || isHovered ? 700 : 400}
                    fontSize={mode === 'hourly' || mode === 'interval' ? '10' : '11'}
                    fontFamily="sans-serif"
                  >
                    {coord.pt.label}
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
