import { useMemo, useState } from 'react';
import {
  Modal,
  Text,
  NumberInput,
  Select,
  Switch,
  Button,
  Stack,
  Group,
  Badge,
  Divider,
  Progress,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Checkbox,
  Table,
  Card,
} from '@mantine/core';
import {
  Wand2,
  Play,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Ruler,
  Target,
  Sparkles,
  Gauge,
  Download,
  GitCompare,
  X,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useGearStore } from '@/store/useGearStore';
import { CELESTIAL_PERIODS, type CandidateScheme } from '@/types';
import { targetPeriodToRatio } from '@/engine/reverseGearSearch';

export default function ReverseSearchPanel() {
  const reverseSearch = useGearStore((s) => s.reverseSearch);
  const setReverseSearchOpen = useGearStore((s) => s.setReverseSearchOpen);
  const setReverseSearchParams = useGearStore((s) => s.setReverseSearchParams);
  const runReverseGearSearch = useGearStore((s) => s.runReverseGearSearch);
  const setReverseSearchSortBy = useGearStore((s) => s.setReverseSearchSortBy);
  const setReverseSearchFilter = useGearStore((s) => s.setReverseSearchFilter);
  const toggleCandidateSelection = useGearStore((s) => s.toggleCandidateSelection);
  const clearCandidateSelection = useGearStore((s) => s.clearCandidateSelection);
  const applyCandidateScheme = useGearStore((s) => s.applyCandidateScheme);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmCandidate, setConfirmCandidate] = useState<CandidateScheme | null>(null);

  const targetRatio = useMemo(() => {
    return targetPeriodToRatio(reverseSearch.params.targetPeriodDays, reverseSearch.params.driverSpeedRpm);
  }, [reverseSearch.params.targetPeriodDays, reverseSearch.params.driverSpeedRpm]);

  const selectedCandidates = useMemo(() => {
    return reverseSearch.candidates.filter((c) => reverseSearch.selectedCandidateIds.includes(c.id));
  }, [reverseSearch.candidates, reverseSearch.selectedCandidateIds]);

  const handlePresetSelect = (value: string | null) => {
    if (!value) return;
    const preset = CELESTIAL_PERIODS.find((p) => p.body === value);
    if (preset) {
      setReverseSearchParams({ targetPeriodDays: preset.periodDays });
    }
  };

  const handleSearch = async () => {
    await runReverseGearSearch();
  };

  return (
    <>
      <Modal
        opened={reverseSearch.isOpen}
        onClose={() => setReverseSearchOpen(false)}
        title={
          <Group gap={8}>
            <Wand2 size={20} style={{ color: 'var(--color-copper)' }} />
            <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>
              天球目标反推排齿
            </Text>
          </Group>
        }
        size="xl"
        centered
        styles={{
          body: { padding: 0 },
        }}
      >
      <div style={{ display: 'flex', height: '80vh', overflow: 'hidden' }}>
        <div
          style={{
            width: 300,
            borderRight: '1px solid var(--color-border)',
            padding: '12px 14px',
            overflowY: 'auto',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <Stack gap="sm">
            <div>
              <Text size="xs" fw={700} style={{ color: 'var(--color-copper)', marginBottom: 6 }}>
                <Group gap={4}><Target size={12} /> 目标天体周期</Group>
              </Text>
              <Select
                size="xs"
                placeholder="选择预设天体..."
                data={CELESTIAL_PERIODS.map((p) => ({ value: p.body, label: `${p.name} (${p.periodDays.toFixed(2)}天)` }))}
                onChange={handlePresetSelect}
                mb={6}
                styles={{ input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
              />
              <NumberInput
                size="xs"
                label="自定义周期 (天)"
                value={reverseSearch.params.targetPeriodDays}
                onChange={(v) => setReverseSearchParams({ targetPeriodDays: Number(v) || 1 })}
                min={0.001}
                step={0.1}
                decimalScale={4}
                styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
              />
              <Text size="xs" style={{ color: 'var(--color-steel)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                目标传动比: 1 : {targetRatio.toFixed(4)}
              </Text>
            </div>

            <Divider color="var(--color-border)" />

            <div>
              <Text size="xs" fw={700} style={{ color: 'var(--color-copper)', marginBottom: 6 }}>
                <Group gap={4}><ArrowRightLeft size={12} /> 输出方向</Group>
              </Text>
              <Select
                size="xs"
                value={reverseSearch.params.targetDirection}
                onChange={(v) => v && setReverseSearchParams({ targetDirection: v as 'cw' | 'ccw' })}
                data={[
                  { value: 'cw', label: '顺时针 (CW)' },
                  { value: 'ccw', label: '逆时针 (CCW)' },
                ]}
                styles={{ input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
              />
            </div>

            <Divider color="var(--color-border)" />

            <div>
              <Text size="xs" fw={700} style={{ color: 'var(--color-copper)', marginBottom: 6 }}>
                <Group gap={4}><Gauge size={12} /> 约束条件</Group>
              </Text>
              <Stack gap={6}>
                <NumberInput
                  size="xs"
                  label="允许误差 (%)"
                  value={reverseSearch.params.errorTolerancePercent}
                  onChange={(v) => setReverseSearchParams({ errorTolerancePercent: Number(v) || 0.1 })}
                  min={0.01}
                  max={50}
                  step={0.1}
                  decimalScale={2}
                  styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                />
                <NumberInput
                  size="xs"
                  label="最大齿轮级数"
                  value={reverseSearch.params.maxStages}
                  onChange={(v) => setReverseSearchParams({ maxStages: Math.max(1, Math.min(8, Number(v) || 1)) })}
                  min={1}
                  max={8}
                  step={1}
                  styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                />
                <Group gap={6} grow>
                  <NumberInput
                    size="xs"
                    label="最小齿数"
                    value={reverseSearch.params.minTeeth}
                    onChange={(v) => setReverseSearchParams({ minTeeth: Math.max(4, Number(v) || 4) })}
                    min={4}
                    step={1}
                    styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                  />
                  <NumberInput
                    size="xs"
                    label="最大齿数"
                    value={reverseSearch.params.maxTeeth}
                    onChange={(v) => setReverseSearchParams({ maxTeeth: Math.max(reverseSearch.params.minTeeth, Number(v) || 100) })}
                    min={10}
                    step={5}
                    styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                  />
                </Group>
                <NumberInput
                  size="xs"
                  label="最大占用空间 (px)"
                  value={reverseSearch.params.maxDiameter}
                  onChange={(v) => setReverseSearchParams({ maxDiameter: Math.max(100, Number(v) || 800) })}
                  min={100}
                  step={50}
                  styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                />
                <NumberInput
                  size="xs"
                  label="主动轮转速 (rpm)"
                  value={reverseSearch.params.driverSpeedRpm}
                  onChange={(v) => setReverseSearchParams({ driverSpeedRpm: Math.max(1, Number(v) || 60) })}
                  min={1}
                  step={5}
                  styles={{ label: { fontSize: 10, color: 'var(--color-text-muted)' }, input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
                />
              </Stack>
            </div>

            <Divider color="var(--color-border)" />

            <div>
              <Text size="xs" fw={700} style={{ color: 'var(--color-copper)', marginBottom: 6 }}>
                <Group gap={4}><Sparkles size={12} /> 搜索偏好</Group>
              </Text>
              <Stack gap={4}>
                <Switch
                  size="xs"
                  label="优先较少级数"
                  checked={reverseSearch.params.preferFewerStages}
                  onChange={(e) => setReverseSearchParams({ preferFewerStages: e.currentTarget.checked })}
                  styles={{ label: { fontSize: 11 } }}
                />
                <Switch
                  size="xs"
                  label="优先较小体积"
                  checked={reverseSearch.params.preferSmallerSize}
                  onChange={(e) => setReverseSearchParams({ preferSmallerSize: e.currentTarget.checked })}
                  styles={{ label: { fontSize: 11 } }}
                />
                <Switch
                  size="xs"
                  label="排除自锁方案"
                  checked={reverseSearch.params.avoidSelfLock}
                  onChange={(e) => setReverseSearchParams({ avoidSelfLock: e.currentTarget.checked })}
                  styles={{ label: { fontSize: 11 } }}
                />
              </Stack>
            </div>

            <Divider color="var(--color-border)" />

            <Button
              leftSection={reverseSearch.isSearching ? <Progress size="xs" value={reverseSearch.searchProgress} style={{ width: 60 }} /> : <Play size={16} />}
              onClick={handleSearch}
              loading={reverseSearch.isSearching}
              variant="filled"
              color="copper"
              size="sm"
              fullWidth
              styles={{
                root: {
                  background: 'linear-gradient(135deg, var(--color-copper), var(--color-copper-dark))',
                  boxShadow: '0 4px 12px rgba(212, 117, 60, 0.3)',
                },
              }}
            >
              {reverseSearch.isSearching ? `搜索中 ${reverseSearch.searchProgress.toFixed(0)}%` : '开始搜索方案'}
            </Button>

            {reverseSearch.candidates.length > 0 && (
              <Text size="xs" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                找到 {reverseSearch.candidates.length} 个可行方案
              </Text>
            )}
          </Stack>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Group gap={6}>
              <Text size="xs" fw={600} style={{ color: 'var(--color-text-muted)' }}>排序:</Text>
              <Select
                size="xs"
                value={reverseSearch.sortBy}
                onChange={(v) => v && setReverseSearchSortBy(v as 'error' | 'stages' | 'size' | 'score')}
                data={[
                  { value: 'score', label: '综合评分' },
                  { value: 'error', label: '误差最小' },
                  { value: 'stages', label: '级数最少' },
                  { value: 'size', label: '体积最小' },
                ]}
                style={{ width: 100 }}
                styles={{ input: { background: 'var(--color-bg-tertiary)', fontSize: 11 } }}
              />
            </Group>

            <Group gap={6}>
              <Checkbox
                size="xs"
                label="排除自锁"
                checked={reverseSearch.filterSelfLock}
                onChange={(e) => setReverseSearchFilter('filterSelfLock', e.currentTarget.checked)}
                styles={{ label: { fontSize: 11 } }}
              />
              <Checkbox
                size="xs"
                label="排除方向冲突"
                checked={reverseSearch.filterDirectionConflict}
                onChange={(e) => setReverseSearchFilter('filterDirectionConflict', e.currentTarget.checked)}
                styles={{ label: { fontSize: 11 } }}
              />
            </Group>

            {selectedCandidates.length > 0 && (
              <Group gap={6} ml="auto">
                <Badge size="xs" variant="light" color="cyan">
                  已选 {selectedCandidates.length} 个对比
                </Badge>
                <Tooltip label="清除选择">
                  <ActionIcon variant="subtle" color="gray" size="xs" onClick={clearCandidateSelection}>
                    <X size={12} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </div>

          <ScrollArea style={{ flex: 1 }}>
            {reverseSearch.isSearching ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Progress value={reverseSearch.searchProgress} size="lg" style={{ maxWidth: 300, margin: '0 auto 16px' }} />
                <Text size="sm" style={{ color: 'var(--color-text-muted)' }}>
                  正在搜索最佳齿轮组合方案...
                </Text>
                <Text size="xs" style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                  当前进度: {reverseSearch.searchProgress.toFixed(0)}%
                </Text>
              </div>
            ) : reverseSearch.candidates.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Wand2 size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 16, opacity: 0.4 }} />
                <Text size="sm" style={{ color: 'var(--color-text-muted)' }}>
                  暂无搜索结果
                </Text>
                <Text size="xs" style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                  调整参数后点击"开始搜索方案"
                </Text>
              </div>
            ) : selectedCandidates.length >= 2 ? (
              <div style={{ padding: 12 }}>
                <Group mb="sm">
                  <GitCompare size={16} style={{ color: 'var(--color-steel)' }} />
                  <Text size="sm" fw={700} style={{ color: 'var(--color-steel)' }}>方案对比</Text>
                </Group>
                <CandidateCompareTable candidates={selectedCandidates} targetPeriodDays={reverseSearch.params.targetPeriodDays} />
              </div>
            ) : (
              <Stack gap={8} style={{ padding: 12 }}>
                {reverseSearch.candidates.map((candidate, idx) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    index={idx + 1}
                    isExpanded={expandedId === candidate.id}
                    isSelected={reverseSearch.selectedCandidateIds.includes(candidate.id)}
                    onToggleExpand={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                    onToggleSelect={() => toggleCandidateSelection(candidate.id)}
                    onApply={() => setConfirmCandidate(candidate)}
                    targetPeriodDays={reverseSearch.params.targetPeriodDays}
                  />
                ))}
              </Stack>
            )}
          </ScrollArea>
        </div>
      </div>
    </Modal>

    <Modal
      opened={!!confirmCandidate}
      onClose={() => setConfirmCandidate(null)}
      title={
        <Group gap={8}>
          <Download size={20} style={{ color: 'var(--color-copper)' }} />
          <Text size="sm" fw={700}>应用方案到画布</Text>
        </Group>
      }
      size="sm"
      centered
    >
      <Stack gap="md">
        <Text size="sm" style={{ color: 'var(--color-text-muted)' }}>
          确定要将此方案应用到当前画布吗？
        </Text>

        {confirmCandidate && (
          <Card withBorder padding="sm" radius={8} style={{ background: 'var(--color-bg-tertiary)' }}>
            <Stack gap={4}>
              <Group gap={8}>
                <Badge size="xs" variant="light" color="copper">
                  {confirmCandidate.stageCount} 级传动
                </Badge>
                <Badge size="xs" variant="light" color={confirmCandidate.theoreticalErrorPercent < 0.5 ? 'green' : 'yellow'}>
                  误差 {confirmCandidate.theoreticalErrorPercent.toFixed(3)}%
                </Badge>
                <Badge size="xs" variant="light" color="steel">
                  {confirmCandidate.totalGearCount} 齿轮
                </Badge>
              </Group>
              <Text size="xs" style={{ fontFamily: 'var(--font-mono)' }}>
                周期: {confirmCandidate.actualPeriodDays.toFixed(4)} 天
              </Text>
              <Text size="xs" style={{ fontFamily: 'var(--font-mono)' }}>
                传动比: 1 : {confirmCandidate.totalRatio.toFixed(4)}
              </Text>
            </Stack>
          </Card>
        )}

        <div
          style={{
            padding: 10,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 6,
          }}
        >
          <Group gap={8}>
            <AlertTriangle size={16} color="#ef4444" />
            <Text size="xs" style={{ color: '#ef4444' }}>
              当前画布中的所有齿轮和传动轴将被替换，此操作无法撤销。
            </Text>
          </Group>
        </div>

        <Group justify="flex-end" gap={8}>
          <Button variant="subtle" color="gray" size="sm" onClick={() => setConfirmCandidate(null)}>
            取消
          </Button>
          <Button
            variant="filled"
            color="copper"
            size="sm"
            onClick={() => {
              if (confirmCandidate) {
                applyCandidateScheme(confirmCandidate);
                setConfirmCandidate(null);
              }
            }}
          >
            确认应用
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}

function CandidateCard({
  candidate,
  index,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onApply,
  targetPeriodDays,
}: {
  candidate: CandidateScheme;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onApply: () => void;
  targetPeriodDays: number;
}) {
  const errorColor = candidate.theoreticalErrorPercent < 0.1 ? '#10b981' : candidate.theoreticalErrorPercent < 1 ? '#f59e0b' : '#ef4444';

  return (
    <Card
      withBorder
      padding={10}
      radius={8}
      style={{
        background: isSelected ? 'rgba(74, 144, 164, 0.08)' : 'var(--color-surface)',
        borderColor: isSelected ? 'var(--color-steel)' : 'var(--color-border)',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Checkbox
          size="sm"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label="选择对比"
        />

        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-copper), var(--color-copper-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} mb={4}>
            <Badge size="xs" variant="light" color="copper">
              <Layers size={10} style={{ marginRight: 4 }} />
              {candidate.stageCount} 级
            </Badge>
            <Badge size="xs" variant="light" color={candidate.theoreticalErrorPercent < 0.5 ? 'green' : candidate.theoreticalErrorPercent < 2 ? 'yellow' : 'red'}>
              误差 {candidate.theoreticalErrorPercent.toFixed(3)}%
            </Badge>
            <Badge size="xs" variant="light" color="steel">
              <Ruler size={10} style={{ marginRight: 4 }} />
              {candidate.estimatedDiameter.toFixed(0)} px
            </Badge>
            {candidate.hasSelfLock && (
              <Badge size="xs" variant="light" color="red" leftSection={<Lock size={10} />}>
                自锁风险
              </Badge>
            )}
            {candidate.directionConflict && (
              <Badge size="xs" variant="light" color="orange" leftSection={<ArrowRightLeft size={10} />}>
                方向冲突
              </Badge>
            )}
            <Badge size="xs" variant="light" color="cyan">
              {candidate.totalGearCount} 齿轮
            </Badge>
          </Group>
          <Group gap={16}>
            <div>
              <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>实际周期</Text>
              <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-mono)' }}>
                {candidate.actualPeriodDays.toFixed(4)} 天
              </Text>
            </div>
            <div>
              <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>传动比</Text>
              <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-mono)' }}>
                1 : {candidate.totalRatio.toFixed(4)}
              </Text>
            </div>
            <div>
              <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>输出方向</Text>
              <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-mono)', color: candidate.directionConflict ? '#ef4444' : '#10b981' }}>
                {candidate.outputDirection === 'cw' ? '顺时针' : '逆时针'}
              </Text>
            </div>
            <div>
              <Text size="xs" style={{ color: 'var(--color-text-muted)' }}>综合评分</Text>
              <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-copper)' }}>
                {candidate.score.toFixed(1)}
              </Text>
            </div>
          </Group>
        </div>

        <Group gap={4}>
          <Tooltip label="查看详情">
            <ActionIcon variant="subtle" color="gray" onClick={onToggleExpand} size="sm">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="应用到画布">
            <ActionIcon variant="subtle" color="green" onClick={onApply} size="sm">
              <Download size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>

      {isExpanded && (
        <>
          <Divider my={10} color="var(--color-border)" />
          <div>
            <Text size="xs" fw={600} style={{ color: 'var(--color-copper)', marginBottom: 8 }}>
              各级传动比
            </Text>
            <Group gap={6}>
              {candidate.stages.map((stage, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      padding: '4px 8px',
                      background: 'var(--color-bg-tertiary)',
                      borderRadius: 4,
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                    }}
                  >
                    {stage.driverTeeth}T <ArrowRight size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {stage.drivenTeeth}T
                  </div>
                  {i < candidate.stages.length - 1 && (
                    <Badge size="xs" variant="dot" color="gray">
                      双联
                    </Badge>
                  )}
                </div>
              ))}
            </Group>

            <Table mt={10} withTableBorder styles={{ table: { fontSize: 11 } }}>
              <thead>
                <tr>
                  <th style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '4px 8px' }}>指标</th>
                  <th style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '4px 8px' }}>目标值</th>
                  <th style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '4px 8px' }}>实际值</th>
                  <th style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '4px 8px' }}>偏差</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px' }}>周期</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>{targetPeriodDays.toFixed(4)} 天</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>{candidate.actualPeriodDays.toFixed(4)} 天</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', color: errorColor }}>
                    {candidate.theoreticalErrorPercent.toFixed(4)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px' }}>传动比</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>1 : {targetPeriodToRatio(targetPeriodDays, candidate.driverSpeed).toFixed(4)}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>1 : {candidate.totalRatio.toFixed(4)}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>-</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px' }}>自锁检测</td>
                  <td style={{ padding: '4px 8px' }}>无</td>
                  <td style={{ padding: '4px 8px', color: candidate.hasSelfLock ? '#ef4444' : '#10b981' }}>
                    {candidate.hasSelfLock ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                  </td>
                  <td style={{ padding: '4px 8px' }}>-</td>
                </tr>
              </tbody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}

function CandidateCompareTable({
  candidates,
  targetPeriodDays,
}: {
  candidates: CandidateScheme[];
  targetPeriodDays: number;
}) {
  return (
    <Table withTableBorder striped>
      <thead>
        <tr>
          <th style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '6px 10px' }}>指标</th>
          {candidates.map((c, i) => (
            <th key={c.id} style={{ background: 'var(--color-bg-tertiary)', fontSize: 10, padding: '6px 10px', textAlign: 'center' }}>
              方案 #{i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600, background: 'var(--color-bg-tertiary)' }}>目标周期</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', background: 'var(--color-bg-tertiary)' }}>
              {targetPeriodDays.toFixed(4)} 天
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>综合评分</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--color-copper)', fontWeight: 700 }}>
              {c.score.toFixed(1)}
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>齿轮级数</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {c.stageCount} 级
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>齿轮总数</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {c.totalGearCount}
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>实际周期</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {c.actualPeriodDays.toFixed(4)} 天
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>理论误差</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: c.theoreticalErrorPercent < 0.5 ? '#10b981' : c.theoreticalErrorPercent < 2 ? '#f59e0b' : '#ef4444' }}>
              {c.theoreticalErrorPercent.toFixed(4)}%
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>总传动比</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              1 : {c.totalRatio.toFixed(4)}
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>估计尺寸</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {c.estimatedDiameter.toFixed(0)} px
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>输出方向</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center', color: c.directionConflict ? '#ef4444' : '#10b981' }}>
              {c.outputDirection === 'cw' ? '顺时针' : '逆时针'}
              {c.directionConflict && ' ⚠'}
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>自锁风险</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center' }}>
              {c.hasSelfLock ? <XCircle size={14} color="#ef4444" /> : <CheckCircle2 size={14} color="#10b981" />}
            </td>
          ))}
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', fontWeight: 600 }}>各级齿数</td>
          {candidates.map((c) => (
            <td key={c.id} style={{ padding: '6px 10px', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              {c.stages.map((s, i) => (
                <span key={i}>
                  {s.driverTeeth}→{s.drivenTeeth}
                  {i < c.stages.length - 1 && ' | '}
                </span>
              ))}
            </td>
          ))}
        </tr>
      </tbody>
    </Table>
  );
}
