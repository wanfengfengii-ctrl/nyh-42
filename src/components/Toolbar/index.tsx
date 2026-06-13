import { useCallback } from 'react';
import { ActionIcon, Group, SegmentedControl, Text, Tooltip, Menu, TextInput, Modal, NumberInput, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  FilePlus,
  Save,
  FolderOpen,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useGearStore } from '@/store/useGearStore';
import { formatTime } from '@/lib/utils';

const TIME_SCALES = [
  { label: '1x', value: '1' },
  { label: '10x', value: '10' },
  { label: '100x', value: '100' },
  { label: '1000x', value: '1000' },
];

export default function Toolbar() {
  const isPlaying = useGearStore((s) => s.isPlaying);
  const timeScale = useGearStore((s) => s.timeScale);
  const elapsedTime = useGearStore((s) => s.elapsedTime);
  const validation = useGearStore((s) => s.validation);
  const schemeName = useGearStore((s) => s.schemeName);
  const setPlaying = useGearStore((s) => s.setPlaying);
  const setTimeScale = useGearStore((s) => s.setTimeScale);
  const resetTime = useGearStore((s) => s.resetTime);
  const newScheme = useGearStore((s) => s.newScheme);
  const saveCurrentScheme = useGearStore((s) => s.saveCurrentScheme);
  const savedSchemes = useGearStore((s) => s.savedSchemes);
  const loadScheme = useGearStore((s) => s.loadScheme);
  const deleteSavedScheme = useGearStore((s) => s.deleteSavedScheme);
  const setSchemeName = useGearStore((s) => s.setSchemeName);
  const driverSpeed = useGearStore((s) => s.driverSpeed);
  const setDriverSpeed = useGearStore((s) => s.setDriverSpeed);

  const [saveOpened, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [loadOpened, { open: openLoad, close: closeLoad }] = useDisclosure(false);

  const handleSave = useCallback(() => {
    const ok = saveCurrentScheme();
    if (ok) closeSave();
  }, [saveCurrentScheme, closeSave]);

  return (
    <>
      <div
        style={{
          height: 52,
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          backdropFilter: 'blur(12px)',
        }}
      >
        <Group gap={4}>
          <Text
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-copper)',
              letterSpacing: 2,
              marginRight: 8,
            }}
          >
            GEARWORKS
          </Text>
        </Group>

        <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        <Group gap={4}>
          <Tooltip label="新建方案">
            <ActionIcon variant="subtle" color="gray" onClick={newScheme}>
              <FilePlus size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="保存方案">
            <ActionIcon variant="subtle" color="gray" onClick={openSave}>
              <Save size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="加载方案">
            <ActionIcon variant="subtle" color="gray" onClick={openLoad}>
              <FolderOpen size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        <Group gap={4}>
          <Tooltip label={isPlaying ? '暂停' : '播放'}>
            <ActionIcon
              variant="filled"
              color={isPlaying ? 'copper' : 'steel'}
              onClick={() => setPlaying(!isPlaying)}
              disabled={!validation.isValid}
              size="lg"
              style={{
                borderRadius: 20,
                boxShadow: isPlaying && validation.isValid
                  ? '0 0 12px var(--color-glow-copper)'
                  : 'none',
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="重置时间">
            <ActionIcon variant="subtle" color="gray" onClick={resetTime}>
              <RotateCcw size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4} style={{ marginLeft: 4 }}>
          <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
          <Text size="xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {formatTime(elapsedTime)}
          </Text>
        </Group>

        <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        <SegmentedControl
          size="xs"
          value={String(timeScale)}
          onChange={(v) => setTimeScale(Number(v))}
          data={TIME_SCALES}
          styles={{
            root: { background: 'var(--color-bg-tertiary)' },
            label: { fontSize: 11, fontFamily: 'var(--font-mono)' },
          }}
        />

        <Group gap={4} style={{ marginLeft: 4 }}>
          <Settings size={14} style={{ color: 'var(--color-text-muted)' }} />
          <NumberInput
            size="xs"
            value={driverSpeed}
            onChange={(v) => setDriverSpeed(Number(v) || 1)}
            min={1}
            max={10000}
            step={10}
            style={{ width: 80 }}
            styles={{
              input: { background: 'var(--color-bg-tertiary)', fontSize: 11 },
            }}
          />
          <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>rpm</Text>
        </Group>

        <div style={{ flex: 1 }} />

        <Group gap={6}>
          {validation.isValid ? (
            <Badge
              color="green"
              variant="light"
              leftSection={<CheckCircle2 size={12} />}
              styles={{ label: { fontSize: 10, fontFamily: 'var(--font-mono)' } }}
            >
              有效
            </Badge>
          ) : (
            <Tooltip label={validation.errors.map((e) => e.message).join('; ')}>
              <Badge
                color="red"
                variant="light"
                leftSection={<AlertTriangle size={12} />}
                styles={{ label: { fontSize: 10, fontFamily: 'var(--font-mono)' } }}
              >
                {validation.errors.length} 个问题
              </Badge>
            </Tooltip>
          )}
        </Group>
      </div>

      <Modal opened={saveOpened} onClose={closeSave} title="保存方案" size="sm" centered>
        <TextInput
          label="方案名称"
          value={schemeName}
          onChange={(e) => setSchemeName(e.currentTarget.value)}
          mb="md"
        />
        {!validation.isValid && (
          <Text size="sm" c="red" mb="md">
            方案存在验证错误，无法保存。请修正后再试。
          </Text>
        )}
        <Group justify="flex-end">
          <ActionIcon variant="filled" color="copper" onClick={handleSave} disabled={!validation.isValid} size="lg">
            <Save size={18} />
          </ActionIcon>
        </Group>
      </Modal>

      <Modal opened={loadOpened} onClose={closeLoad} title="加载方案" size="sm" centered>
        {savedSchemes.length === 0 ? (
          <Text size="sm" c="dimmed">暂无保存的方案</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {savedSchemes.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{ cursor: 'pointer', flex: 1 }}
                  onClick={() => { loadScheme(s.id); closeLoad(); }}
                >
                  <Text size="sm" fw={500}>{s.name}</Text>
                  <Text size="xs" c="dimmed">
                    {s.gears.length} 齿轮 · {s.meshes.length} 连接
                  </Text>
                </div>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); deleteSavedScheme(s.id); }}
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
