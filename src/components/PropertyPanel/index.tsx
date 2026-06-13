import { useCallback, useMemo } from 'react';
import { Text, TextInput, NumberInput, Select, Switch, Stack, Group, Badge, Divider, ActionIcon, Tooltip } from '@mantine/core';
import { Trash2, Star, AlertTriangle } from 'lucide-react';
import { useGearStore } from '@/store/useGearStore';
import { computeTransmission } from '@/engine/transmission';
import { rpmToRadPerSec, formatRpm, formatAngle } from '@/utils/gearMath';
import type { RotationDirection } from '@/types';

export default function PropertyPanel() {
  const gears = useGearStore((s) => s.gears);
  const meshes = useGearStore((s) => s.meshes);
  const selectedGearId = useGearStore((s) => s.selectedGearId);
  const selectedMeshId = useGearStore((s) => s.selectedMeshId);
  const driverId = useGearStore((s) => s.driverId);
  const driverSpeed = useGearStore((s) => s.driverSpeed);
  const validation = useGearStore((s) => s.validation);

  const updateGear = useGearStore((s) => s.updateGear);
  const removeGear = useGearStore((s) => s.removeGear);
  const setDriver = useGearStore((s) => s.setDriver);
  const removeMesh = useGearStore((s) => s.removeMesh);

  const selectedGear = useMemo(
    () => gears.find((g) => g.id === selectedGearId),
    [gears, selectedGearId]
  );

  const selectedMesh = useMemo(
    () => meshes.find((m) => m.id === selectedMeshId),
    [meshes, selectedMeshId]
  );

  const transmissionResult = useMemo(
    () => computeTransmission(gears, meshes, driverId, driverSpeed),
    [gears, meshes, driverId, driverSpeed]
  );

  const gearErrors = useMemo(
    () => validation.errors.filter((e) => selectedGearId && e.gearIds.includes(selectedGearId)),
    [validation.errors, selectedGearId]
  );

  const connectedMeshes = useMemo(
    () => meshes.filter((m) => m.sourceId === selectedGearId || m.targetId === selectedGearId),
    [meshes, selectedGearId]
  );

  const handleTeethChange = useCallback(
    (value: number | string) => {
      if (!selectedGearId) return;
      const teeth = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!isNaN(teeth)) {
        updateGear(selectedGearId, { teeth: Math.max(1, teeth) });
      }
    },
    [selectedGearId, updateGear]
  );

  const handleDirectionChange = useCallback(
    (value: string | null) => {
      if (!selectedGearId || !value) return;
      updateGear(selectedGearId, { direction: value as RotationDirection });
    },
    [selectedGearId, updateGear]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedGearId) return;
      updateGear(selectedGearId, { name: e.currentTarget.value });
    },
    [selectedGearId, updateGear]
  );

  const handleInitialAngleChange = useCallback(
    (value: number | string) => {
      if (!selectedGearId) return;
      const angle = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(angle)) {
        updateGear(selectedGearId, { initialAngle: angle });
      }
    },
    [selectedGearId, updateGear]
  );

  if (selectedMesh) {
    const sourceGear = gears.find((g) => g.id === selectedMesh.sourceId);
    const targetGear = gears.find((g) => g.id === selectedMesh.targetId);

    return (
      <div style={panelStyle}>
        <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-copper)', letterSpacing: 1 }}>
          连接属性
        </Text>
        <Divider my="sm" color="var(--color-border)" />
        <Stack gap="xs">
          <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>
            类型: {selectedMesh.type === 'mesh' ? '啮合' : '同轴'}
          </Text>
          <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>
            源: {sourceGear?.name || '未知'}
          </Text>
          <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>
            目标: {targetGear?.name || '未知'}
          </Text>
          {selectedMesh.type === 'mesh' && sourceGear && targetGear && (
            <Text size="xs" style={{ color: 'var(--color-steel)' }}>
              传动比: {sourceGear.teeth}:{targetGear.teeth} = {(sourceGear.teeth / targetGear.teeth).toFixed(3)}
            </Text>
          )}
        </Stack>
        <Divider my="sm" color="var(--color-border)" />
        <Tooltip label="删除连接">
          <ActionIcon variant="subtle" color="red" onClick={() => removeMesh(selectedMesh.id)}>
            <Trash2 size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
    );
  }

  if (!selectedGear) {
    return (
      <div style={panelStyle}>
        <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)', letterSpacing: 1 }}>
          属性面板
        </Text>
        <Divider my="sm" color="var(--color-border)" />
        <Text size="xs" style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 40 }}>
          点击齿轮查看属性
        </Text>
      </div>
    );
  }

  const state = transmissionResult.gearStates.get(selectedGear.id);

  return (
    <div style={panelStyle}>
      <Group justify="space-between" align="center">
        <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-display)', color: 'var(--color-copper)', letterSpacing: 1 }}>
          {selectedGear.type === 'sun' ? '太阳轮' : selectedGear.type === 'planet' ? '行星轮' : '传动齿轮'}
        </Text>
        <Group gap={4}>
          <Tooltip label={selectedGear.isDriver ? '当前主动轮' : '设为主动轮'}>
            <ActionIcon
              variant={selectedGear.isDriver ? 'filled' : 'subtle'}
              color="copper"
              size="sm"
              onClick={() => setDriver(selectedGear.id)}
            >
              <Star size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="删除齿轮">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeGear(selectedGear.id)}>
              <Trash2 size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Divider my="sm" color="var(--color-border)" />

      <Stack gap="sm">
        <TextInput
          label="名称"
          size="xs"
          value={selectedGear.name}
          onChange={handleNameChange}
          styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' } }}
        />

        <NumberInput
          label="齿数"
          size="xs"
          value={selectedGear.teeth}
          onChange={handleTeethChange}
          min={1}
          max={500}
          step={1}
          error={selectedGear.teeth <= 0 ? '齿数必须大于 0' : null}
          styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' } }}
        />

        <NumberInput
          label="初始角度 (°)"
          size="xs"
          value={selectedGear.initialAngle}
          onChange={handleInitialAngleChange}
          min={-360}
          max={360}
          step={5}
          styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' } }}
        />

        {selectedGear.isDriver && (
          <Select
            label="旋转方向"
            size="xs"
            value={selectedGear.direction}
            onChange={handleDirectionChange}
            data={[
              { value: 'cw', label: '顺时针 (CW)' },
              { value: 'ccw', label: '逆时针 (CCW)' },
            ]}
            styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' } }}
          />
        )}
      </Stack>

      <Divider my="sm" color="var(--color-border)" />

      <Text size="xs" fw={600} style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
        传动计算
      </Text>

      <Stack gap={4}>
        {state ? (
          <>
            <InfoRow label="角速度" value={formatRpm(state.angularVelocity * 60 / (2 * Math.PI))} />
            <InfoRow label="方向" value={state.direction === 'cw' ? '顺时针' : '逆时针'} />
            <InfoRow label="初始角度" value={formatAngle(selectedGear.initialAngle)} />
            {selectedGear.isDriver && (
              <InfoRow label="主动轮转速" value={`${driverSpeed} rpm`} highlight />
            )}
          </>
        ) : (
          <Text size="xs" style={{ color: 'var(--color-error)' }}>
            未连接到传动链
          </Text>
        )}
      </Stack>

      {connectedMeshes.length > 0 && (
        <>
          <Divider my="sm" color="var(--color-border)" />
          <Text size="xs" fw={600} style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
            连接关系 ({connectedMeshes.length})
          </Text>
          <Stack gap={4}>
            {connectedMeshes.map((m) => {
              const otherId = m.sourceId === selectedGear.id ? m.targetId : m.sourceId;
              const otherGear = gears.find((g) => g.id === otherId);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 4,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Text size="xs" style={{ color: 'var(--color-text)' }}>
                    {m.type === 'mesh' ? '⚙' : '⊕'} {otherGear?.name || '未知'}
                  </Text>
                  <Badge size="xs" variant="light" color={m.type === 'mesh' ? 'copper' : 'steel'}>
                    {m.type === 'mesh' ? '啮合' : '同轴'}
                  </Badge>
                </div>
              );
            })}
          </Stack>
        </>
      )}

      {gearErrors.length > 0 && (
        <>
          <Divider my="sm" color="var(--color-border)" />
          <Stack gap={4}>
            {gearErrors.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: '6px 8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 4,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <AlertTriangle size={12} style={{ color: 'var(--color-error)', marginTop: 2, flexShrink: 0 }} />
                <Text size="xs" style={{ color: 'var(--color-error)' }}>
                  {e.message}
                </Text>
              </div>
            ))}
          </Stack>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>{label}</Text>
      <Text
        size="xs"
        fw={highlight ? 700 : 500}
        style={{
          color: highlight ? 'var(--color-copper)' : 'var(--color-text)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
      </Text>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'var(--color-bg-secondary)',
  borderLeft: '1px solid var(--color-border)',
  padding: '12px 10px',
  overflowY: 'auto',
  height: '100%',
};
