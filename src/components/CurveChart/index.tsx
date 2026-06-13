import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Text, SegmentedControl, Group, Badge } from '@mantine/core';
import { useGearStore } from '@/store/useGearStore';
import { computeTransmission, computeCumulativeAngleCurve, getSecondsInPeriod } from '@/engine/transmission';
import type { TimePeriod } from '@/types';

const MARGIN = { top: 24, right: 16, bottom: 36, left: 56 };

export default function CurveChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const gears = useGearStore((s) => s.gears);
  const meshes = useGearStore((s) => s.meshes);
  const driverId = useGearStore((s) => s.driverId);
  const driverSpeed = useGearStore((s) => s.driverSpeed);
  const timePeriod = useGearStore((s) => s.timePeriod);
  const validation = useGearStore((s) => s.validation);
  const elapsedTime = useGearStore((s) => s.elapsedTime);
  const isPlaying = useGearStore((s) => s.isPlaying);
  const setTimePeriod = useGearStore((s) => s.setTimePeriod);
  const selectedGearId = useGearStore((s) => s.selectedGearId);
  const selectGear = useGearStore((s) => s.selectGear);

  const transmissionResult = useMemo(
    () => computeTransmission(gears, meshes, driverId, driverSpeed),
    [gears, meshes, driverId, driverSpeed]
  );

  const totalSeconds = useMemo(() => getSecondsInPeriod(timePeriod), [timePeriod]);

  const curveData = useMemo(() => {
    if (!validation.isValid || gears.length === 0) return [];
    return gears
      .filter((g) => transmissionResult.gearStates.has(g.id))
      .map((gear) => {
        const state = transmissionResult.gearStates.get(gear.id)!;
        const points = computeCumulativeAngleCurve(state, totalSeconds, 200);
        return {
          gearId: gear.id,
          gearName: gear.name,
          color: gear.color,
          points,
          isDriver: gear.isDriver,
        };
      });
  }, [gears, transmissionResult, totalSeconds, validation.isValid]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');

    if (curveData.length === 0) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', 12)
        .attr('font-family', 'var(--font-mono)')
        .text('暂无有效传动数据');
      return;
    }

    const allAngles = curveData.flatMap((d) => d.points.map((p) => p.angle));
    const minAngle = d3.min(allAngles) || 0;
    const maxAngle = d3.max(allAngles) || 0;
    const anglePadding = (maxAngle - minAngle) * 0.1 || 10;

    const xScale = d3.scaleLinear().domain([0, totalSeconds]).range([0, innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([minAngle - anglePadding, maxAngle + anglePadding])
      .range([innerH, 0]);

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => formatTimeLabel(Number(d), timePeriod));

    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => formatAngleLabel(Number(d)));

    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 10)
      .attr('font-family', 'var(--font-mono)');

    g.selectAll('.domain').attr('stroke', 'var(--color-border)');
    g.selectAll('.tick line').attr('stroke', 'var(--color-border)');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 10)
      .attr('font-family', 'var(--font-mono)');

    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(6))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.5);

    const line = d3
      .line<{ time: number; angle: number }>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.angle))
      .curve(d3.curveMonotoneX);

    curveData.forEach((series) => {
      const isSelected = selectedGearId === series.gearId;
      const path = g
        .append('path')
        .datum(series.points)
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('opacity', selectedGearId ? (isSelected ? 1 : 0.25) : 0.8)
        .attr('d', line)
        .style('cursor', 'pointer')
        .on('click', () => selectGear(isSelected ? null : series.gearId));

      const totalLength = (path.node() as SVGPathElement | null)?.getTotalLength() || 0;

      if (isPlaying && elapsedTime <= totalSeconds) {
        const progress = elapsedTime / totalSeconds;
        const dashOffset = totalLength * (1 - progress);
        path
          .attr('stroke-dasharray', String(totalLength))
          .attr('stroke-dashoffset', String(dashOffset));

        const currentIdx = Math.floor(progress * 200);
        const currentPoint = series.points[Math.min(currentIdx, series.points.length - 1)];
        if (currentPoint) {
          g.append('circle')
            .attr('cx', xScale(currentPoint.time))
            .attr('cy', yScale(currentPoint.angle))
            .attr('r', 4)
            .attr('fill', series.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
        }
      }
    });

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 10)
      .attr('font-family', 'var(--font-mono)')
      .text(timePeriod === 'day' ? '时间 (小时)' : '时间 (天)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 10)
      .attr('font-family', 'var(--font-mono)')
      .text('累计角位移 (°)');
  }, [curveData, totalSeconds, timePeriod, elapsedTime, isPlaying, selectedGearId, selectGear]);

  return (
    <div
      style={{
        height: 220,
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Group gap={8}>
          <Text
            size="xs"
            fw={700}
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-copper)',
              letterSpacing: 1.5,
            }}
          >
            累计转动曲线
          </Text>
          {curveData.length > 0 && (
            <Badge size="xs" variant="light" color="steel">
              {curveData.length} 个齿轮
            </Badge>
          )}
        </Group>
        <SegmentedControl
          size="xs"
          value={timePeriod}
          onChange={(v) => setTimePeriod(v as TimePeriod)}
          data={[
            { label: '一天', value: 'day' },
            { label: '一年', value: 'year' },
          ]}
          styles={{
            root: { background: 'var(--color-bg-tertiary)' },
            label: { fontSize: 11, fontFamily: 'var(--font-mono)' },
          }}
        />
      </div>

      <div ref={containerRef} style={{ flex: 1, padding: '0 4px' }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
}

function formatTimeLabel(seconds: number, period: TimePeriod): string {
  if (period === 'day') {
    const hours = seconds / 3600;
    return hours.toFixed(0) + 'h';
  }
  const days = seconds / (3600 * 24);
  return days.toFixed(0) + 'd';
}

function formatAngleLabel(angle: number): string {
  if (Math.abs(angle) >= 360) {
    const rotations = angle / 360;
    return rotations.toFixed(1) + '圈';
  }
  return angle.toFixed(0) + '°';
}
