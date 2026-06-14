import { useCallback } from 'react';
import { ActionIcon, Group, SegmentedControl, Text, Tooltip, TextInput, Modal, NumberInput, Badge, Stack, ScrollArea, Divider } from '@mantine/core';
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
  Sparkles,
  XCircle,
  AlertCircle,
  Link2,
  Wand2,
} from 'lucide-react';
import { useGearStore } from '@/store/useGearStore';
import { formatTime } from '@/lib/utils';
import ReverseSearchPanel from '@/components/ReverseSearchPanel';

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
  const gears = useGearStore((s) => s.gears);
  const generateReport = useGearStore((s) => s.generateReport);
  const getChainRecommendations = useGearStore((s) => s.getChainRecommendations);
  const chainRecommendations = useGearStore((s) => s.chainRecommendations);
  const applyChainRecommendation = useGearStore((s) => s.applyChainRecommendation);
  const setReverseSearchOpen = useGearStore((s) => s.setReverseSearchOpen);
  const reverseCandidates = useGearStore((s) => s.reverseSearch.candidates);

  const [saveOpened, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [loadOpened, { open: openLoad, close: closeLoad }] = useDisclosure(false);
  const [reportOpened, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [recommendOpened, { open: openRecommend, close: closeRecommend }] = useDisclosure(false);

  const handleSave = useCallback(() => {
    const ok = saveCurrentScheme();
    if (ok) closeSave();
  }, [saveCurrentScheme, closeSave]);

  const handleOpenSave = useCallback(() => {
    generateReport();
    openSave();
  }, [generateReport, openSave]);

  const handleOpenRecommend = useCallback(() => {
    getChainRecommendations();
    openRecommend();
  }, [getChainRecommendations, openRecommend]);

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
          <Tooltip label="保存方案（含冲突检查）">
            <ActionIcon variant="subtle" color="gray" onClick={handleOpenSave}>
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

        <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        <Tooltip label="自动推荐可行传动链">
          <ActionIcon variant="subtle" color="cyan" onClick={handleOpenRecommend}>
            <Sparkles size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="天球目标反推排齿">
          <div style={{ position: 'relative' }}>
            <ActionIcon variant="subtle" color="violet" onClick={() => setReverseSearchOpen(true)}>
              <Wand2 size={18} />
            </ActionIcon>
            {reverseCandidates.length > 0 && (
              <Badge
                size="xs"
                color="violet"
                variant="filled"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  fontSize: 9,
                }}
              >
                {reverseCandidates.length}
              </Badge>
            )}
          </div>
        </Tooltip>

        <Tooltip label="查看完整冲突清单">
          <ActionIcon variant="subtle" color="yellow" onClick={() => { generateReport(); openReport(); }}>
            <AlertTriangle size={18} />
          </ActionIcon>
        </Tooltip>

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

      <Modal opened={saveOpened} onClose={closeSave} title="保存方案（冲突检查）" size="md" centered>
        <TextInput
          label="方案名称"
          value={schemeName}
          onChange={(e) => setSchemeName(e.currentTarget.value)}
          mb="md"
        />

        <ConflictReportSection />

        <Divider my="md" />

        <Group justify="flex-end">
          <ActionIcon variant="filled" color="copper" onClick={handleSave} disabled={!validation.isValid} size="lg">
            <Save size={18} />
          </ActionIcon>
        </Group>
      </Modal>

      <Modal opened={reportOpened} onClose={closeReport} title="完整冲突清单" size="md" centered>
        <ConflictReportSection />
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

      <Modal opened={recommendOpened} onClose={closeRecommend} title="自动推荐可行传动链" size="md" centered>
        {gears.length < 2 ? (
          <Text size="sm" c="dimmed">至少需要 2 个齿轮才能推荐传动链</Text>
        ) : chainRecommendations.length === 0 ? (
          <Text size="sm" c="dimmed">暂无推荐的传动链连接。所有齿轮可能已连接。</Text>
        ) : (
          <Stack gap="xs">
            {chainRecommendations.map((rec, idx) => {
              const sourceGear = gears.find((g) => g.id === rec.sourceGearId);
              const targetGear = gears.find((g) => g.id === rec.targetGearId);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Group gap={6}>
                      <Link2 size={14} style={{ color: rec.connectionType === 'mesh' ? 'var(--color-copper)' : 'var(--color-steel)' }} />
                      <Text size="xs" fw={600}>
                        {sourceGear?.name || '?'} → {targetGear?.name || '?'}
                      </Text>
                      <Badge size="xs" variant="light" color={rec.connectionType === 'mesh' ? 'copper' : 'steel'}>
                        {rec.connectionType === 'mesh' ? '啮合' : '同轴'}
                      </Badge>
                    </Group>
                    <Text size="xs" style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {rec.reason}
                    </Text>
                  </div>
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    size="sm"
                    onClick={() => applyChainRecommendation(rec)}
                  >
                    <Link2 size={14} />
                  </ActionIcon>
                </div>
              );
            })}
          </Stack>
        )}
      </Modal>

      <ReverseSearchPanel />
    </>
  );
}

function ConflictReportSection() {
  const conflictReport = useGearStore((s) => s.conflictReport);
  const gears = useGearStore((s) => s.gears);

  if (!conflictReport) {
    return (
      <Text size="sm" c="dimmed">尚未生成冲突报告</Text>
    );
  }

  if (conflictReport.conflicts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
        <Text size="sm" fw={600} style={{ color: '#10b981' }}>无冲突，方案有效</Text>
      </div>
    );
  }

  return (
    <div>
      <Group gap="xs" mb="sm">
        {conflictReport.totalErrors > 0 && (
          <Badge color="red" variant="light" leftSection={<XCircle size={10} />}>
            {conflictReport.totalErrors} 错误
          </Badge>
        )}
        {conflictReport.totalWarnings > 0 && (
          <Badge color="yellow" variant="light" leftSection={<AlertCircle size={10} />}>
            {conflictReport.totalWarnings} 警告
          </Badge>
        )}
        <Badge
          color={conflictReport.canSave ? 'green' : 'red'}
          variant="light"
        >
          {conflictReport.canSave ? '可保存' : '不可保存'}
        </Badge>
      </Group>

      <ScrollArea style={{ maxHeight: 300 }}>
        <Stack gap="xs">
          {conflictReport.conflicts.map((c, idx) => {
            const affectedGears = c.gearIds
              .map((id) => gears.find((g) => g.id === id)?.name)
              .filter(Boolean);

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  background: c.severity === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  borderRadius: 6,
                  border: `1px solid ${c.severity === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                }}
              >
                {c.severity === 'error' ? (
                  <XCircle size={14} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={14} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <Text size="xs" fw={500} style={{ color: c.severity === 'error' ? '#ef4444' : '#f59e0b' }}>
                    {c.message}
                  </Text>
                  {affectedGears.length > 0 && (
                    <Text size="xs" style={{ color: 'var(--color-text-muted)', marginTop: 2, fontSize: 9 }}>
                      涉及: {affectedGears.join('、')}
                    </Text>
                  )}
                  {c.shaftId && (
                    <Text size="xs" style={{ color: 'var(--color-text-muted)', marginTop: 1, fontSize: 9 }}>
                      轴: {c.shaftId}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </Stack>
      </ScrollArea>
    </div>
  );
}
