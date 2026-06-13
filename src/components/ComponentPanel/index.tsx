import { Text, Tooltip, Stack } from '@mantine/core';
import { Sun, Orbit, Cog } from 'lucide-react';
import type { GearType } from '@/types';

interface ComponentItem {
  type: GearType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultTeeth: number;
}

const COMPONENTS: ComponentItem[] = [
  {
    type: 'sun',
    label: '太阳轮',
    description: '中心驱动齿轮',
    icon: <Sun size={20} />,
    defaultTeeth: 30,
  },
  {
    type: 'planet',
    label: '行星轮',
    description: '环绕运转的齿轮',
    icon: <Orbit size={20} />,
    defaultTeeth: 20,
  },
  {
    type: 'shaft',
    label: '传动齿轮',
    description: '同轴传动齿轮',
    icon: <Cog size={20} />,
    defaultTeeth: 20,
  },
];

interface ComponentPanelProps {
  onAddGear: (type: GearType, x: number, y: number) => void;
  canvasCenter: { x: number; y: number };
}

export default function ComponentPanel({ onAddGear, canvasCenter }: ComponentPanelProps) {
  const handleDragStart = (e: React.DragEvent, type: GearType) => {
    e.dataTransfer.setData('gearType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (type: GearType) => {
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;
    onAddGear(type, canvasCenter.x + offsetX, canvasCenter.y + offsetY);
  };

  return (
    <div
      style={{
        width: 180,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: '12px 8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <Text
        size="xs"
        fw={600}
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-muted)',
          letterSpacing: 1.5,
          marginBottom: 4,
          paddingLeft: 4,
        }}
      >
        组件库
      </Text>

      {COMPONENTS.map((comp) => (
        <Tooltip key={comp.type} label={comp.description} position="right">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, comp.type)}
            onClick={() => handleClick(comp.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              cursor: 'grab',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-hover)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-copper)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <div style={{ color: 'var(--color-copper)' }}>{comp.icon}</div>
            <Stack gap={0}>
              <Text size="xs" fw={600} style={{ lineHeight: 1.2 }}>
                {comp.label}
              </Text>
              <Text size="xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
                默认 {comp.defaultTeeth} 齿
              </Text>
            </Stack>
          </div>
        </Tooltip>
      ))}

      <div style={{ marginTop: 16 }}>
        <Text
          size="xs"
          fw={600}
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-muted)',
            letterSpacing: 1.5,
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          操作提示
        </Text>
        <Stack gap={4} style={{ paddingLeft: 4 }}>
          <Text size="xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
            · 拖拽组件到画布放置
          </Text>
          <Text size="xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
            · 点击齿轮选中编辑
          </Text>
          <Text size="xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
            · 从齿轮边缘拖线创建啮合
          </Text>
          <Text size="xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
            · Delete 键删除选中项
          </Text>
        </Stack>
      </div>
    </div>
  );
}
