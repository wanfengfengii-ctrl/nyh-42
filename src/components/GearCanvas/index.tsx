import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { useGearStore } from '@/store/useGearStore';
import { computeTransmission, computeAngleAtTime } from '@/engine/transmission';
import { getBrokenGearIds, getInvalidGearIds } from '@/engine/validation';
import { teethToRadius, generateGearPath, distance } from '@/utils/gearMath';
import type { Gear, MeshRelation, Shaft } from '@/types';

const MESH_PORT_RADIUS = 8;
const CANVAS_GRID_SIZE = 20;

export default function GearCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement | null>(null);

  const gears = useGearStore((s) => s.gears);
  const shafts = useGearStore((s) => s.shafts);
  const meshes = useGearStore((s) => s.meshes);
  const selectedGearId = useGearStore((s) => s.selectedGearId);
  const selectedMeshId = useGearStore((s) => s.selectedMeshId);
  const driverId = useGearStore((s) => s.driverId);
  const driverSpeed = useGearStore((s) => s.driverSpeed);
  const isPlaying = useGearStore((s) => s.isPlaying);
  const elapsedTime = useGearStore((s) => s.elapsedTime);
  const timeScale = useGearStore((s) => s.timeScale);
  const validation = useGearStore((s) => s.validation);
  const isCreatingMesh = useGearStore((s) => s.isCreatingMesh);
  const meshSourceId = useGearStore((s) => s.meshSourceId);
  const pendingMeshType = useGearStore((s) => s.pendingMeshType);
  const mousePos = useGearStore((s) => s.mousePos);

  const selectGear = useGearStore((s) => s.selectGear);
  const moveGear = useGearStore((s) => s.moveGear);
  const addGear = useGearStore((s) => s.addGear);
  const addShaft = useGearStore((s) => s.addShaft);
  const removeGear = useGearStore((s) => s.removeGear);
  const selectMesh = useGearStore((s) => s.selectMesh);
  const startCreatingMesh = useGearStore((s) => s.startCreatingMesh);
  const cancelCreatingMesh = useGearStore((s) => s.cancelCreatingMesh);
  const completeMesh = useGearStore((s) => s.completeMesh);
  const setMousePos = useGearStore((s) => s.setMousePos);

  const brokenGearIds = useMemo(
    () => getBrokenGearIds(gears, meshes, driverId, driverSpeed),
    [gears, meshes, driverId, driverSpeed]
  );

  const invalidGearIds = useMemo(
    () => getInvalidGearIds(validation.errors),
    [validation.errors]
  );

  const transmissionResult = useMemo(
    () => computeTransmission(gears, meshes, driverId, driverSpeed),
    [gears, meshes, driverId, driverSpeed]
  );

  const gearAngles = useMemo(() => {
    const angles = new Map<string, number>();
    if (!isPlaying || !validation.isValid) {
      gears.forEach((g) => angles.set(g.id, g.initialAngle));
      return angles;
    }
    gears.forEach((g) => {
      const state = transmissionResult.gearStates.get(g.id);
      if (state) {
        angles.set(g.id, computeAngleAtTime(state, elapsedTime));
      } else {
        angles.set(g.id, g.initialAngle);
      }
    });
    return angles;
  }, [gears, isPlaying, validation.isValid, elapsedTime, transmissionResult]);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const g = svg.select<SVGGElement>('.canvas-root');
    gRef.current = g.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const gearType = e.dataTransfer.getData('gearType') as Gear['type'] | '';
      const itemKind = e.dataTransfer.getData('itemKind') as 'gear' | 'shaft' | '';

      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const point = svg.createSVGPoint();
      point.x = e.clientX - rect.left;
      point.y = e.clientY - rect.top;

      const transform = d3.select(svg).select<SVGGElement>('.canvas-root').attr('transform');
      let tx = 0, ty = 0, scale = 1;
      if (transform) {
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (match) { tx = parseFloat(match[1]); ty = parseFloat(match[2]); }
        if (scaleMatch) { scale = parseFloat(scaleMatch[1]); }
      }

      const x = (point.x - tx) / scale;
      const y = (point.y - ty) / scale;

      if (itemKind === 'shaft') {
        addShaft(x, y);
      } else if (gearType) {
        addGear(gearType, x, y);
      }
    },
    [addGear, addShaft]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).closest('.gear-group')) return;
      if ((e.target as SVGElement).closest('.mesh-link')) return;
      if (isCreatingMesh) {
        cancelCreatingMesh();
        return;
      }
      selectGear(null);
      selectMesh(null);
    },
    [isCreatingMesh, cancelCreatingMesh, selectGear, selectMesh]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isCreatingMesh) return;
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const point = svg.createSVGPoint();
      point.x = e.clientX - rect.left;
      point.y = e.clientY - rect.top;

      const transform = d3.select(svg).select<SVGGElement>('.canvas-root').attr('transform');
      let tx = 0, ty = 0, scale = 1;
      if (transform) {
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (match) { tx = parseFloat(match[1]); ty = parseFloat(match[2]); }
        if (scaleMatch) { scale = parseFloat(scaleMatch[1]); }
      }

      const x = (point.x - tx) / scale;
      const y = (point.y - ty) / scale;
      setMousePos({ x, y });
    },
    [isCreatingMesh, setMousePos]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGearId) {
          removeGear(selectedGearId);
        }
      }
      if (e.key === 'Escape') {
        cancelCreatingMesh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGearId, removeGear, cancelCreatingMesh]);

  const meshLineData = useMemo(() => {
    const gearMap = new Map(gears.map((g) => [g.id, g]));
    return meshes.map((m) => ({
      ...m,
      sourceGear: gearMap.get(m.sourceId),
      targetGear: gearMap.get(m.targetId),
    })).filter((m) => m.sourceGear && m.targetGear);
  }, [gears, meshes]);

  const [canvasW, canvasH] = [2000, 1500];

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--color-bg)' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id="grid-pattern"
            width={CANVAS_GRID_SIZE}
            height={CANVAS_GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${CANVAS_GRID_SIZE} 0 L 0 0 0 ${CANVAS_GRID_SIZE}`}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={0.3}
              opacity={0.4}
            />
          </pattern>
          <radialGradient id="gear-gradient-sun" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#f5b899" />
            <stop offset="50%" stopColor="#d4753c" />
            <stop offset="100%" stopColor="#a94f24" />
          </radialGradient>
          <radialGradient id="gear-gradient-planet" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#97bfcf" />
            <stop offset="50%" stopColor="#4a90a4" />
            <stop offset="100%" stopColor="#336779" />
          </radialGradient>
          <radialGradient id="gear-gradient-shaft" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#b8a9d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
          <filter id="glow-copper">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#d4753c" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-error">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#ef4444" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="canvas-root">
          <rect
            x={-canvasW / 2}
            y={-canvasH / 2}
            width={canvasW}
            height={canvasH}
            fill="url(#grid-pattern)"
          />

          {meshLineData.map((m) => {
            const isBroken = brokenGearIds.has(m.sourceId) || brokenGearIds.has(m.targetId);
            const isSelected = selectedMeshId === m.id;
            const srcState = transmissionResult.gearStates.get(m.sourceId);
            const tgtState = transmissionResult.gearStates.get(m.targetId);

            return (
              <g key={m.id}>
                <line
                  className={`mesh-link ${isBroken ? 'broken' : ''}`}
                  x1={m.sourceGear!.x}
                  y1={m.sourceGear!.y}
                  x2={m.targetGear!.x}
                  y2={m.targetGear!.y}
                  stroke={isBroken ? 'var(--color-chain-broken)' : isSelected ? 'var(--color-copper)' : 'var(--color-text-muted)'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={m.type === 'shaft' ? '8 4' : isBroken ? '6 4' : 'none'}
                  opacity={isBroken ? 0.8 : 0.5}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); selectMesh(m.id); }}
                />
                <text
                  x={(m.sourceGear!.x + m.targetGear!.x) / 2}
                  y={(m.sourceGear!.y + m.targetGear!.y) / 2 - 8}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  style={{ pointerEvents: 'none' }}
                >
                  {m.type === 'mesh'
                    ? `i=${srcState && tgtState ? (srcState.angularVelocity / tgtState.angularVelocity).toFixed(2) : '?'}`
                    : '同轴'}
                </text>
              </g>
            );
          })}

          {isCreatingMesh && meshSourceId && (() => {
            const sourceGear = gears.find((g) => g.id === meshSourceId);
            if (!sourceGear) return null;
            return (
              <line
                x1={sourceGear.x}
                y1={sourceGear.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke={pendingMeshType === 'mesh' ? 'var(--color-copper)' : 'var(--color-steel)'}
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.8}
              />
            );
          })()}

          {shafts.map((shaft) => (
            <ShaftNode key={shaft.id} shaft={shaft} />
          ))}

          {gears.map((gear) => (
            <GearNode
              key={gear.id}
              gear={gear}
              angle={gearAngles.get(gear.id) || 0}
              isSelected={selectedGearId === gear.id}
              isBroken={brokenGearIds.has(gear.id)}
              isInvalid={invalidGearIds.has(gear.id)}
              isDriver={gear.isDriver}
              transmissionState={transmissionResult.gearStates.get(gear.id)}
              isCreatingMeshSource={isCreatingMesh && meshSourceId === gear.id}
              isPotentialTarget={isCreatingMesh && meshSourceId !== gear.id}
              onStartMesh={(type) => startCreatingMesh(gear.id, type)}
              onSelect={() => selectGear(gear.id)}
              onMove={(x, y) => moveGear(gear.id, x, y)}
              onCompleteMesh={(targetId) => completeMesh(targetId)}
              otherGears={gears.filter((g) => g.id !== gear.id)}
              isPlaying={isPlaying}
              elapsedTime={elapsedTime}
            />
          ))}
        </g>
      </svg>

      {isCreatingMesh && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-copper)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            zIndex: 10,
          }}
        >
          点击目标齿轮完成{pendingMeshType === 'mesh' ? '啮合' : '同轴'}连接 · ESC 取消
        </div>
      )}
    </div>
  );
}

interface GearNodeProps {
  gear: Gear;
  angle: number;
  isSelected: boolean;
  isBroken: boolean;
  isInvalid: boolean;
  isDriver: boolean;
  transmissionState: { angularVelocity: number; direction: string } | undefined;
  isCreatingMeshSource: boolean;
  isPotentialTarget: boolean;
  onStartMesh: (type: 'mesh' | 'shaft') => void;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onCompleteMesh: (targetId: string) => void;
  otherGears: Gear[];
  isPlaying: boolean;
  elapsedTime: number;
}

function GearNode({
  gear,
  angle,
  isSelected,
  isBroken,
  isInvalid,
  isDriver,
  transmissionState,
  isCreatingMeshSource,
  isPotentialTarget,
  onStartMesh,
  onSelect,
  onMove,
  onCompleteMesh,
  otherGears,
}: GearNodeProps) {
  const groupRef = useRef<SVGGElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const radius = teethToRadius(gear.teeth);
  const gradientId = gear.type === 'sun' ? 'url(#gear-gradient-sun)' : gear.type === 'planet' ? 'url(#gear-gradient-planet)' : 'url(#gear-gradient-shaft)';

  const gearPath = generateGearPath(gear.teeth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCreatingMeshSource) return;
      isDragging.current = true;
      dragStart.current = { x: gear.x, y: gear.y };

      const svg = (e.target as SVGElement).closest('svg');
      if (!svg) return;

      const point = svg.createSVGPoint();
      const transform = d3.select(svg).select<SVGGElement>('.canvas-root').attr('transform');
      let tx = 0, ty = 0, scale = 1;
      if (transform) {
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (match) { tx = parseFloat(match[1]); ty = parseFloat(match[2]); }
        if (scaleMatch) { scale = parseFloat(scaleMatch[1]); }
      }

      const startX = e.clientX;
      const startY = e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        onMove(dragStart.current.x + dx, dragStart.current.y + dy);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [gear.x, gear.y, onMove, isCreatingMeshSource]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCreatingMeshSource) return;
      onSelect();
    },
    [onSelect, isCreatingMeshSource]
  );

  const handlePortClick = useCallback(
    (e: React.MouseEvent, type: 'mesh' | 'shaft') => {
      e.stopPropagation();
      if (isPotentialTarget) return;
      onStartMesh(type);
    },
    [onStartMesh, isPotentialTarget]
  );

  const handleGearClickAsTarget = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCreatingMeshSource) return;
      onCompleteMesh(gear.id);
    },
    [isCreatingMeshSource, onCompleteMesh, gear.id]
  );

  const shouldHighlightAsTarget = isPotentialTarget;

  const filterAttr = isInvalid
    ? 'url(#glow-error)'
    : isSelected
    ? 'url(#glow-copper)'
    : undefined;

  return (
    <g
      ref={groupRef}
      className="gear-group"
      transform={`translate(${gear.x}, ${gear.y})`}
      style={{ cursor: shouldHighlightAsTarget ? 'crosshair' : 'grab' }}
      onMouseDown={handleMouseDown}
      onClick={shouldHighlightAsTarget ? handleGearClickAsTarget : handleClick}
    >
      <g
        transform={`rotate(${angle})`}
        filter={filterAttr}
        className={`gear-node ${isSelected ? 'selected' : ''} ${isInvalid ? 'error' : ''} ${isBroken ? 'animate-pulse-error' : ''}`}
      >
        <path
          d={gearPath}
          fill={gradientId}
          stroke={isSelected ? 'var(--color-copper)' : isInvalid ? 'var(--color-error)' : 'rgba(255,255,255,0.15)'}
          strokeWidth={isSelected ? 2 : 1}
          opacity={shouldHighlightAsTarget ? 0.7 : 1}
        />
        <circle
          r={radius * 0.3}
          fill="var(--color-bg)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
        <circle r={3} fill="var(--color-copper)" opacity={0.8} />

        {isDriver && (
          <circle
            r={5}
            cx={0}
            cy={-radius * 0.3 - 2}
            fill="var(--color-copper)"
            opacity={0.9}
          />
        )}
      </g>

      {!isCreatingMeshSource && !isPotentialTarget && (
        <>
          <circle
            cx={0}
            cy={-radius - MESH_PORT_RADIUS}
            r={MESH_PORT_RADIUS}
            fill="transparent"
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.4}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handlePortClick(e, 'mesh')}
            onMouseEnter={(e) => {
              (e.target as SVGElement).setAttribute('opacity', '1');
              (e.target as SVGElement).setAttribute('stroke', 'var(--color-copper)');
            }}
            onMouseLeave={(e) => {
              (e.target as SVGElement).setAttribute('opacity', '0.4');
              (e.target as SVGElement).setAttribute('stroke', 'var(--color-text-muted)');
            }}
          />
          <circle
            cx={radius + MESH_PORT_RADIUS}
            cy={0}
            r={MESH_PORT_RADIUS}
            fill="transparent"
            stroke="var(--color-steel)"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.4}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handlePortClick(e, 'shaft')}
            onMouseEnter={(e) => {
              (e.target as SVGElement).setAttribute('opacity', '1');
              (e.target as SVGElement).setAttribute('stroke', 'var(--color-steel)');
            }}
            onMouseLeave={(e) => {
              (e.target as SVGElement).setAttribute('opacity', '0.4');
              (e.target as SVGElement).setAttribute('stroke', 'var(--color-steel)');
            }}
          />
        </>
      )}

      <text
        y={radius + 16}
        textAnchor="middle"
        fill={isInvalid ? 'var(--color-error)' : 'var(--color-text)'}
        fontSize={10}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {gear.name}
      </text>
      <text
        y={radius + 28}
        textAnchor="middle"
        fill="var(--color-text-muted)"
        fontSize={9}
        fontFamily="var(--font-mono)"
        style={{ pointerEvents: 'none' }}
      >
        z={gear.teeth}
        {transmissionState && ` · ω=${(transmissionState.angularVelocity * 60 / (2 * Math.PI)).toFixed(1)}rpm`}
      </text>

      {isInvalid && (
        <circle
          r={radius + 4}
          fill="none"
          stroke="var(--color-error)"
          strokeWidth={2}
          strokeDasharray="4 3"
          className="animate-pulse-error"
        />
      )}
    </g>
  );
}

function ShaftNode({ shaft }: { shaft: Shaft }) {
  return (
    <g transform={`translate(${shaft.x}, ${shaft.y})`} style={{ cursor: 'pointer' }}>
      <circle
        r={14}
        fill="none"
        stroke="var(--color-steel)"
        strokeWidth={2}
        strokeDasharray="4 2"
        opacity={0.6}
      />
      <circle
        r={8}
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-steel)"
        strokeWidth={1.5}
      />
      <circle r={2} fill="var(--color-steel)" />
      <line x1={-14} y1={0} x2={-18} y2={0} stroke="var(--color-steel)" strokeWidth={1.5} />
      <line x1={14} y1={0} x2={18} y2={0} stroke="var(--color-steel)" strokeWidth={1.5} />
      <line x1={0} y1={-14} x2={0} y2={-18} stroke="var(--color-steel)" strokeWidth={1.5} />
      <line x1={0} y1={14} x2={0} y2={18} stroke="var(--color-steel)" strokeWidth={1.5} />
      <text
        y={30}
        textAnchor="middle"
        fill="var(--color-text-muted)"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fontWeight={500}
        style={{ pointerEvents: 'none' }}
      >
        {shaft.name}
      </text>
    </g>
  );
}
