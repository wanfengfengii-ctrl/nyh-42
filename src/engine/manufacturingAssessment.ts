import type {
  CandidateScheme,
  Gear,
  GearStage,
  ManufacturingAssessment,
  ManufacturingConstraints,
  ManufacturingDifficulty,
  AssemblyRisk,
  WeightEstimate,
  LifespanRisk,
  DifficultyLevel,
  RiskLevel,
  Shaft,
} from '@/types';
import { MATERIAL_PROPERTIES, PRECISION_LEVELS } from '@/types';

function scoreToDifficultyLevel(score: number): DifficultyLevel {
  if (score >= 85) return 'very_easy';
  if (score >= 70) return 'easy';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'difficult';
  return 'very_difficult';
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'very_low';
  if (score >= 70) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'high';
  return 'very_high';
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function assessToothMachining(
  stages: GearStage[],
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  let totalPenalty = 0;
  const mod = constraints.module;

  for (const stage of stages) {
    for (const teeth of [stage.driverTeeth, stage.drivenTeeth]) {
      const pitchDiameter = teeth * mod;
      const addendum = mod;
      const dedendum = 1.25 * mod;
      const toothThicknessAtRoot = (Math.PI * mod / 2) - 2 * dedendum * Math.tan(Math.PI / 9);

      if (teeth < 14) {
        const undercutPenalty = (14 - teeth) * 6;
        totalPenalty += undercutPenalty;
        if (teeth <= 12) {
          details.push(`齿数 ${teeth} 会产生严重根切，需采用正变位或特殊刀具`);
        } else {
          details.push(`齿数 ${teeth} 存在轻度根切风险，建议变位设计`);
        }
      }

      if (mod < 0.5) {
        totalPenalty += 8;
        details.push(`模数 ${mod}mm 属于微小模数，需专用精密加工设备`);
      } else if (mod > 8) {
        totalPenalty += 10;
        details.push(`模数 ${mod}mm 属于大模数，齿轮重量大加工周期长`);
      }

      if (pitchDiameter > 400) {
        totalPenalty += 12;
        details.push(`齿顶圆直径 ${(pitchDiameter + 2 * addendum).toFixed(1)}mm 超限，需大型机床`);
      }

      if (toothThicknessAtRoot < constraints.minToothThickness) {
        const deficit = constraints.minToothThickness - toothThicknessAtRoot;
        totalPenalty += Math.min(15, deficit * 10);
        details.push(`齿根厚度 ${toothThicknessAtRoot.toFixed(2)}mm 小于最小要求 ${constraints.minToothThickness}mm`);
      }
    }
  }

  const gearPairs = stages.length;
  const ratioSpread = stages.map(s => Math.max(s.driverTeeth, s.drivenTeeth) / Math.min(s.driverTeeth, s.drivenTeeth));
  const maxSpread = Math.max(...ratioSpread);
  if (maxSpread > 5) {
    totalPenalty += 8;
    details.push(`单级传动比 ${maxSpread.toFixed(1)}:1 过大，两齿轮尺寸差异悬殊`);
  }

  const avgPenaltyPerPair = gearPairs > 0 ? totalPenalty / gearPairs : 0;
  const score = clampScore(100 - avgPenaltyPerPair - gearPairs * 2);

  return { score, details };
}

function assessMaterialHardness(
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];
  const precisionGrade = PRECISION_LEVELS[constraints.machiningPrecision].grade;

  let score = matProps.machinability * 100;

  if (matProps.machinability < 0.5) {
    details.push(`材料 ${matProps.name} 硬度高，切削加工难度大，刀具磨损快`);
    score -= 10;
  } else if (matProps.machinability < 0.7) {
    details.push(`材料 ${matProps.name} 需要硬质合金刀具加工`);
  }

  if (precisionGrade <= 6 && matProps.machinability < 0.7) {
    score -= 15;
    details.push(`高精度要求与难加工材料组合，需多次磨削工序`);
  }

  if (constraints.material === 'plastic_POM' && precisionGrade <= 7) {
    score -= 12;
    details.push(`POM塑料注塑齿轮达到 IT${precisionGrade} 精度需精密模具`);
  }

  if (constraints.material === 'cast_iron') {
    score -= 5;
    details.push(`铸铁材料铸造后需去应力退火，周期较长`);
  }

  return { score: clampScore(score), details };
}

function assessPrecisionRequirement(
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const precision = PRECISION_LEVELS[constraints.machiningPrecision];
  const grade = precision.grade;

  let score = 100;

  if (grade <= 4) {
    score -= 25;
    details.push(`${precision.name} 需超精密研磨加工，制造成本极高`);
  } else if (grade <= 6) {
    score -= 15;
    details.push(`${precision.name} 需磨齿工序，加工周期显著增加`);
  } else if (grade <= 8) {
    score -= 5;
    details.push(`${precision.name} 需滚齿后剃齿或珩齿`);
  } else {
    details.push(`${precision.name} 可直接滚齿或插齿达到`);
  }

  const costMultiplierText = precision.costMultiplier >= 2.5
    ? `制造成本为普通精度的 ${precision.costMultiplier} 倍`
    : null;
  if (costMultiplierText) {
    details.push(costMultiplierText);
  }

  return { score: clampScore(score), details };
}

function assessSizeExtremes(
  stages: GearStage[],
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const mod = constraints.module;
  let score = 100;

  const allTeeth = stages.flatMap(s => [s.driverTeeth, s.drivenTeeth]);
  const maxTeeth = Math.max(...allTeeth);
  const minTeeth = Math.min(...allTeeth);

  const maxDiameter = maxTeeth * mod + 2 * mod;
  const minDiameter = minTeeth * mod + 2 * mod;

  if (maxDiameter > 500) {
    score -= 15;
    details.push(`最大齿轮外径 ${maxDiameter.toFixed(1)}mm，需大型加工设备`);
  } else if (maxDiameter > 300) {
    score -= 5;
  }

  if (minDiameter < 20) {
    score -= 10;
    details.push(`最小齿轮外径 ${minDiameter.toFixed(1)}mm，装夹定位困难`);
  }

  const sizeRatio = maxDiameter / Math.max(minDiameter, 1);
  if (sizeRatio > 8) {
    score -= 8;
    details.push(`最大最小齿轮外径比 ${sizeRatio.toFixed(1)}:1，刀具规格跨度大`);
  }

  return { score: clampScore(score), details };
}

function assessCompoundGear(
  stages: GearStage[]
): { score: number; details: string[] } {
  const details: string[] = [];
  const compoundCount = Math.max(0, stages.length - 1);

  let score = 100 - compoundCount * 8;

  if (compoundCount > 0) {
    details.push(`方案包含 ${compoundCount} 个双联齿轮，需保证同轴度和齿向精度`);
  }

  for (let i = 0; i < stages.length - 1; i++) {
    const drivenTeeth = stages[i].drivenTeeth;
    const nextDriverTeeth = stages[i + 1].driverTeeth;
    const teethDiff = Math.abs(drivenTeeth - nextDriverTeeth);
    if (teethDiff < 5) {
      score -= 5;
      details.push(`双联齿轮齿数差 ${teethDiff} 较小，退刀槽设计受限`);
    }
  }

  return { score: clampScore(score), details };
}

export function evaluateManufacturingDifficulty(
  stages: GearStage[],
  constraints: ManufacturingConstraints
): ManufacturingDifficulty {
  const toothResult = assessToothMachining(stages, constraints);
  const materialResult = assessMaterialHardness(constraints);
  const precisionResult = assessPrecisionRequirement(constraints);
  const sizeResult = assessSizeExtremes(stages, constraints);
  const compoundResult = assessCompoundGear(stages);

  const weights = {
    tooth: 0.28,
    material: 0.18,
    precision: 0.24,
    size: 0.15,
    compound: 0.15,
  };

  const score = clampScore(
    toothResult.score * weights.tooth +
    materialResult.score * weights.material +
    precisionResult.score * weights.precision +
    sizeResult.score * weights.size +
    compoundResult.score * weights.compound
  );

  const details = [
    ...toothResult.details,
    ...materialResult.details,
    ...precisionResult.details,
    ...sizeResult.details,
    ...compoundResult.details,
  ];

  return {
    score,
    level: scoreToDifficultyLevel(score),
    toothMachiningScore: toothResult.score,
    materialHardnessScore: materialResult.score,
    precisionRequirementScore: precisionResult.score,
    sizeExtremeScore: sizeResult.score,
    compoundGearScore: compoundResult.score,
    details: details.slice(0, 10),
  };
}

function assessClearanceFit(
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const grade = PRECISION_LEVELS[constraints.machiningPrecision].grade;
  const clearance = constraints.assemblyClearance;

  let score = 100;
  const expectedClearanceRange = grade <= 6 ? [0.01, 0.05] : grade <= 8 ? [0.03, 0.1] : [0.05, 0.2];

  if (clearance < expectedClearanceRange[0]) {
    const deficit = expectedClearanceRange[0] - clearance;
    score -= Math.min(25, deficit * 300);
    details.push(`装配间隙 ${clearance}mm 偏小，与 IT${grade} 精度可能产生过盈装配`);
  } else if (clearance > expectedClearanceRange[1]) {
    const excess = clearance - expectedClearanceRange[1];
    score -= Math.min(20, excess * 150);
    details.push(`装配间隙 ${clearance}mm 偏大，传动回差会增加`);
  } else {
    details.push(`装配间隙 ${clearance}mm 与 IT${grade} 精度匹配良好`);
  }

  if (clearance < 0.02 && grade >= 9) {
    score -= 15;
    details.push(`小间隙配合需更高加工精度保证，建议提升至 IT7 或以上`);
  }

  return { score: clampScore(score), details };
}

function assessShaftCompatibility(
  gears: Gear[],
  shafts: Shaft[],
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const mod = constraints.module;
  const shaftDiameter = constraints.shaftDiameter;

  let minScore = 100;
  let totalPenalty = 0;

  const shaftGearMap = new Map<string, Gear[]>();
  for (const gear of gears) {
    if (gear.shaftId) {
      const list = shaftGearMap.get(gear.shaftId) || [];
      list.push(gear);
      shaftGearMap.set(gear.shaftId, list);
    }
  }

  for (const gear of gears) {
    const boreMinDiameter = Math.max(shaftDiameter * 1.1, gear.teeth * mod * 0.15);
    const rootDiameter = gear.teeth * mod - 2 * 1.25 * mod;

    if (shaftDiameter >= rootDiameter * 0.85) {
      const penalty = 20;
      totalPenalty += penalty;
      minScore = Math.min(minScore, 100 - penalty);
      details.push(`齿轮 "${gear.name}"(${gear.teeth}齿) 轴径 ${shaftDiameter}mm 接近齿根圆 ${rootDiameter.toFixed(1)}mm，腹板过薄`);
    }

    if (boreMinDiameter > rootDiameter * 0.6) {
      details.push(`齿轮 "${gear.name}" 轮毂孔径与齿根圆比值偏高，需校核强度`);
    }
  }

  shaftGearMap.forEach((shaftGears) => {
    if (shaftGears.length >= 2) {
      const maxTeeth = Math.max(...shaftGears.map(g => g.teeth));
      const minTeeth = Math.min(...shaftGears.map(g => g.teeth));
      if (maxTeeth / minTeeth > 4) {
        totalPenalty += 10;
        details.push(`同轴双联齿轮尺寸差异大（${minTeeth}齿 vs ${maxTeeth}齿），加工装夹难度增加`);
      }
    }
  });

  if (shaftDiameter < 4) {
    totalPenalty += 12;
    details.push(`轴径 ${shaftDiameter}mm 偏细，长轴易发生挠曲变形`);
  } else if (shaftDiameter > 80) {
    totalPenalty += 8;
    details.push(`轴径 ${shaftDiameter}mm 偏粗，材料成本和重量上升`);
  }

  const avgScore = shafts.length > 0 ? clampScore(100 - totalPenalty / shafts.length) : 100;
  const finalScore = Math.min(avgScore, minScore);

  return { score: clampScore(finalScore), details };
}

function assessToleranceAccumulation(
  stages: GearStage[],
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const grade = PRECISION_LEVELS[constraints.machiningPrecision].grade;
  const stageCount = stages.length;

  const tolPerStage = grade <= 5 ? 0.005 : grade <= 7 ? 0.01 : grade <= 9 ? 0.02 : 0.04;
  const totalTol = tolPerStage * stageCount;
  const backlashBudget = constraints.assemblyClearance * 0.6;

  let score = 100;

  if (totalTol > backlashBudget) {
    const ratio = totalTol / backlashBudget;
    score -= Math.min(30, (ratio - 1) * 40);
    details.push(`公差累积 ${totalTol.toFixed(3)}mm 超过回差预算 ${backlashBudget.toFixed(3)}mm，可能影响传动精度`);
  } else {
    details.push(`公差累积 ${totalTol.toFixed(3)}mm 在允许范围内`);
  }

  if (stageCount >= 5) {
    score -= 15;
    details.push(`${stageCount} 级传动累积误差大，系统精度衰减明显`);
  } else if (stageCount >= 4) {
    score -= 8;
  }

  return { score: clampScore(score), details };
}

function assessStageCountAssembly(
  stages: GearStage[]
): { score: number; details: string[] } {
  const details: string[] = [];
  const stageCount = stages.length;
  const totalGears = stageCount * 2 - 1;

  let score = 100;
  score -= Math.max(0, stageCount - 2) * 7;

  if (stageCount >= 5) {
    details.push(`${stageCount} 级传动需要 ${totalGears} 个齿轮和 ${stageCount + 1} 根轴，零件多装配复杂`);
  } else if (stageCount >= 3) {
    details.push(`需 ${totalGears} 个齿轮和 ${stageCount + 1} 根轴，装配工作量适中`);
  } else {
    details.push(`仅需 ${totalGears} 个齿轮，装配简便`);
  }

  return { score: clampScore(score), details };
}

export function evaluateAssemblyRisk(
  stages: GearStage[],
  gears: Gear[],
  shafts: Shaft[],
  constraints: ManufacturingConstraints
): AssemblyRisk {
  const clearanceResult = assessClearanceFit(constraints);
  const shaftResult = assessShaftCompatibility(gears, shafts, constraints);
  const toleranceResult = assessToleranceAccumulation(stages, constraints);
  const stageCountResult = assessStageCountAssembly(stages);

  const weights = {
    clearance: 0.28,
    shaft: 0.32,
    tolerance: 0.22,
    stageCount: 0.18,
  };

  const score = clampScore(
    clearanceResult.score * weights.clearance +
    shaftResult.score * weights.shaft +
    toleranceResult.score * weights.tolerance +
    stageCountResult.score * weights.stageCount
  );

  const details = [
    ...clearanceResult.details,
    ...shaftResult.details,
    ...toleranceResult.details,
    ...stageCountResult.details,
  ];

  return {
    score,
    level: scoreToRiskLevel(score),
    clearanceFitScore: clearanceResult.score,
    shaftCompatibilityScore: shaftResult.score,
    toleranceAccumulationScore: toleranceResult.score,
    stageCountScore: stageCountResult.score,
    details: details.slice(0, 10),
  };
}

function calculateGearVolume(teeth: number, mod: number, faceWidth: number): number {
  const outerRadius = (teeth * mod) / 2 + mod;
  const boreRadius = Math.max(mod * 3, outerRadius * 0.18);
  const grossVolume = Math.PI * (outerRadius * outerRadius - boreRadius * boreRadius) * faceWidth;
  const webFactor = 0.6;
  return grossVolume * webFactor;
}

export function evaluateWeightEstimate(
  gears: Gear[],
  shafts: Shaft[],
  stages: GearStage[],
  constraints: ManufacturingConstraints
): WeightEstimate {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];
  const mod = constraints.module;
  const faceWidth = mod * constraints.faceWidthFactor;
  const perGearWeights: Array<{ gearId: string; gearName: string; weightGrams: number }> = [];

  let totalGearWeight = 0;

  for (const gear of gears) {
    const volumeCm3 = calculateGearVolume(gear.teeth, mod, faceWidth) / 1000;
    const weightGrams = volumeCm3 * matProps.density;
    totalGearWeight += weightGrams;
    perGearWeights.push({ gearId: gear.id, gearName: gear.name, weightGrams });
  }

  let totalShaftWeight = 0;
  const avgShaftLength = 80;
  const shaftRadius = constraints.shaftDiameter / 2;
  for (const shaft of shafts) {
    const shaftVolumeCm3 = Math.PI * shaftRadius * shaftRadius * avgShaftLength / 1000;
    const shaftWeight = shaftVolumeCm3 * matProps.density;
    totalShaftWeight += shaftWeight;
  }

  const totalWeightGrams = totalGearWeight + totalShaftWeight;
  const weightLimitGrams = constraints.maxTotalWeight;
  const overweight = totalWeightGrams > weightLimitGrams;

  details.push(`齿轮总重: ${totalGearWeight.toFixed(1)}g (共 ${gears.length} 个)`);
  details.push(`轴系估算重: ${totalShaftWeight.toFixed(1)}g (共 ${shafts.length} 根)`);
  details.push(`材料密度: ${matProps.density} g/cm³ (${matProps.name})`);

  if (overweight) {
    const excessPercent = ((totalWeightGrams - weightLimitGrams) / weightLimitGrams) * 100;
    details.push(`⚠ 超重 ${excessPercent.toFixed(1)}%，超出重量限制 ${weightLimitGrams}g`);
    if (constraints.material !== 'aluminum_6061' && constraints.material !== 'plastic_POM') {
      details.push(`建议：考虑更换为铝合金或塑料材质可减重约 65%~82%`);
    }
  } else {
    const usagePercent = (totalWeightGrams / weightLimitGrams) * 100;
    details.push(`重量利用率 ${usagePercent.toFixed(1)}%，在限制范围内`);
  }

  if (totalGearWeight > 2000 && mod > 4) {
    details.push(`大模数金属齿轮方案偏重，安装时需考虑吊装`);
  }

  return {
    totalWeightGrams,
    perGearWeights,
    shaftWeightGrams: totalShaftWeight,
    overweight,
    weightLimit: weightLimitGrams,
    details,
  };
}

function assessContactStress(
  stages: GearStage[],
  constraints: ManufacturingConstraints,
  driverSpeed: number
): { score: number; details: string[] } {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];
  const mod = constraints.module;
  const faceWidth = mod * constraints.faceWidthFactor;

  let minScore = 100;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageRatio = stage.ratio;
    const cumulativeRatio = stages.slice(0, i + 1).reduce((a, s) => a * s.ratio, 1);
    const outputSpeed = driverSpeed / cumulativeRatio;
    const pitchVelocity = (Math.PI * stage.driverTeeth * mod * outputSpeed) / (60 * 1000);

    const torqueFactor = Math.max(1, Math.sqrt(cumulativeRatio) * 0.8);
    const contactStressIndex = (torqueFactor * 100) / (faceWidth * Math.sqrt(stage.driverTeeth));

    const allowableStress = matProps.yieldStrength * 0.35;
    const stressRatio = contactStressIndex * 5 / Math.max(allowableStress, 1);

    let stageScore = 100;
    if (stressRatio > 1.2) {
      stageScore -= 25;
      details.push(`第${i + 1}级 (${stage.driverTeeth}→${stage.drivenTeeth}) 接触应力偏高，需校核齿面强度`);
    } else if (stressRatio > 0.9) {
      stageScore -= 10;
      details.push(`第${i + 1}级接触应力接近许用值，建议提高材料等级`);
    }

    if (pitchVelocity > 15) {
      stageScore -= 12;
      details.push(`第${i + 1}级节圆线速度 ${pitchVelocity.toFixed(1)}m/s 偏高，需考虑动载和润滑`);
    }

    minScore = Math.min(minScore, stageScore);
  }

  return { score: clampScore(minScore), details };
}

function assessBendingStress(
  stages: GearStage[],
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];
  const mod = constraints.module;
  const faceWidth = mod * constraints.faceWidthFactor;

  let minScore = 100;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const cumulativeRatio = stages.slice(0, i + 1).reduce((a, s) => a * s.ratio, 1);
    const torqueFactor = Math.max(1, cumulativeRatio * 0.6);

    const driverModule = stage.driverTeeth * mod;
    const bendingIndex = (torqueFactor * 1000) / (driverModule * faceWidth * stage.driverTeeth);
    const allowableBending = matProps.yieldStrength * 0.25;
    const bendRatio = bendingIndex / Math.max(allowableBending, 10);

    let stageScore = 100;
    if (stage.driverTeeth <= 14 && bendRatio > 0.7) {
      stageScore -= 18;
      details.push(`第${i + 1}级主动轮 ${stage.driverTeeth} 齿齿数少，齿根弯曲应力大，建议正变位设计`);
    } else if (bendRatio > 1.1) {
      stageScore -= 22;
      details.push(`第${i + 1}级齿根弯曲强度不足，可能发生断齿`);
    } else if (bendRatio > 0.85) {
      stageScore -= 8;
    }

    minScore = Math.min(minScore, stageScore);
  }

  return { score: clampScore(minScore), details };
}

function assessWearResistance(
  constraints: ManufacturingConstraints
): { score: number; details: string[] } {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];
  const grade = PRECISION_LEVELS[constraints.machiningPrecision].grade;

  let score = 100;

  if (matProps.tensileStrength >= 900) {
    details.push(`${matProps.name} 高强度材料，耐磨性优良`);
  } else if (matProps.tensileStrength >= 500) {
    score -= 5;
    details.push(`${matProps.name} 耐磨性适中，适合中载工况`);
  } else if (matProps.tensileStrength >= 200) {
    score -= 15;
    details.push(`${matProps.name} 耐磨性一般，不适用于长期高载传动`);
  } else {
    score -= 28;
    details.push(`${matProps.name} 强度偏低，易发生磨损和变形`);
  }

  if (grade <= 6) {
    score += 5;
    details.push(`IT${grade} 高精度加工可降低磨粒磨损`);
  } else if (grade >= 10) {
    score -= 10;
    details.push(`IT${grade} 加工精度偏低，齿面接触不良会加速磨损`);
  }

  if (constraints.material === 'plastic_POM') {
    score -= 15;
    details.push(`POM塑料齿轮长期运行可能发生蠕变和磨耗`);
  }

  if (constraints.material === 'brass') {
    details.push(`黄铜材料抗胶合性能好，适合低速精密传动`);
  }

  return { score: clampScore(score), details };
}

function assessFatigueLife(
  stages: GearStage[],
  constraints: ManufacturingConstraints,
  driverSpeed: number
): { score: number; details: string[] } {
  const details: string[] = [];
  const matProps = MATERIAL_PROPERTIES[constraints.material];

  let score = 100;

  const totalRatio = stages.reduce((a, s) => a * s.ratio, 1);
  const outputSpeed = driverSpeed / totalRatio;
  const cyclesPerDay = outputSpeed * 60 * 24;
  const cyclesPerYear = cyclesPerDay * 365;

  const hasHighCycle = cyclesPerYear > 1e7;
  const hasVeryHighCycle = cyclesPerYear > 1e8;

  if (hasVeryHighCycle) {
    score -= 18;
    details.push(`年循环次数 ${cyclesPerYear.toExponential(2)} 次，属超高周疲劳工况`);
    if (matProps.tensileStrength < 600) {
      score -= 15;
      details.push(`建议使用高强度钢材以延长疲劳寿命`);
    }
  } else if (hasHighCycle) {
    score -= 8;
    details.push(`年循环次数 ${cyclesPerYear.toExponential(2)} 次，需考虑疲劳设计`);
  } else {
    details.push(`年循环次数 ${cyclesPerYear.toExponential(2)} 次，一般静强度设计即可`);
  }

  const stageCount = stages.length;
  if (stageCount >= 4) {
    score -= (stageCount - 3) * 5;
    details.push(`多级传动中后级应力循环次数低，前级齿轮寿命为瓶颈`);
  }

  if (constraints.material === 'steel_20CrMnTi') {
    score += 10;
    details.push(`渗碳钢表面硬度高，接触疲劳寿命长`);
  } else if (constraints.material === 'steel_40Cr') {
    score += 5;
  }

  return { score: clampScore(score), details };
}

export function evaluateLifespanRisk(
  stages: GearStage[],
  constraints: ManufacturingConstraints,
  driverSpeed: number
): LifespanRisk {
  const contactResult = assessContactStress(stages, constraints, driverSpeed);
  const bendingResult = assessBendingStress(stages, constraints);
  const wearResult = assessWearResistance(constraints);
  const fatigueResult = assessFatigueLife(stages, constraints, driverSpeed);

  const weights = {
    contact: 0.28,
    bending: 0.28,
    wear: 0.20,
    fatigue: 0.24,
  };

  const score = clampScore(
    contactResult.score * weights.contact +
    bendingResult.score * weights.bending +
    wearResult.score * weights.wear +
    fatigueResult.score * weights.fatigue
  );

  const details = [
    ...contactResult.details,
    ...bendingResult.details,
    ...wearResult.details,
    ...fatigueResult.details,
  ];

  return {
    score,
    level: scoreToRiskLevel(score),
    contactStressScore: contactResult.score,
    bendingStressScore: bendingResult.score,
    wearResistanceScore: wearResult.score,
    fatigueLifeScore: fatigueResult.score,
    details: details.slice(0, 10),
  };
}

export function generateRecommendations(
  difficulty: ManufacturingDifficulty,
  assembly: AssemblyRisk,
  weight: WeightEstimate,
  lifespan: LifespanRisk,
  stages: GearStage[],
  constraints: ManufacturingConstraints
): string[] {
  const recommendations: string[] = [];

  if (difficulty.score < 60) {
    if (difficulty.toothMachiningScore < 60) {
      recommendations.push(`优先考虑增加最少齿数下限，避免严重根切；如必须小齿数，采用正变位齿轮设计`);
    }
    if (difficulty.precisionRequirementScore < 60) {
      recommendations.push(`评估是否可以放宽精度要求至 IT8~IT9，可显著降低成本和周期`);
    }
    if (difficulty.materialHardnessScore < 60 && constraints.material !== 'steel_45') {
      recommendations.push(`如载荷允许，更换为 45号钢 可大幅改善加工性`);
    }
    if (difficulty.compoundGearScore < 60) {
      recommendations.push(`优化传动比分配，减少双联齿轮齿数差过小的情况`);
    }
  }

  if (assembly.score < 60) {
    if (assembly.toleranceAccumulationScore < 60) {
      recommendations.push(`减少传动级数是降低公差累积最直接的方式`);
    }
    if (assembly.clearanceFitScore < 60) {
      recommendations.push(`调整装配间隙与加工精度的匹配关系，建议配合公差 H7/g6 或 H7/h6`);
    }
    if (assembly.shaftCompatibilityScore < 60) {
      recommendations.push(`校核轴径与齿轮内径比例，必要时增大模数或优化结构`);
    }
  }

  if (weight.overweight) {
    recommendations.push(`重量超标：建议换用 6061铝合金 (减重约66%) 或 POM塑料 (减重约82%)`);
    recommendations.push(`也可考虑减小齿宽系数（当前 ${constraints.faceWidthFactor}×模数）或镂空腹板设计`);
  }

  if (lifespan.score < 60) {
    if (lifespan.bendingStressScore < 60) {
      recommendations.push(`弯曲强度不足：增大模数、减少传动比或采用高强度钢材（40Cr/20CrMnTi）`);
    }
    if (lifespan.contactStressScore < 60) {
      recommendations.push(`接触应力过高：建议表面硬化处理或选用渗碳合金钢`);
    }
    if (lifespan.wearResistanceScore < 60) {
      recommendations.push(`耐磨性不足：提高齿面硬度或选用耐磨材料，同时保证润滑条件`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(`该方案综合可行性良好，各维度指标均在可接受范围内`);
    recommendations.push(`建议按 IT${PRECISION_LEVELS[constraints.machiningPrecision].grade} 精度组织加工，配合 ${MATERIAL_PROPERTIES[constraints.material].name} 材料`);
  }

  return recommendations.slice(0, 6);
}

export function assessManufacturingFeasibility(
  candidate: CandidateScheme,
  constraints: ManufacturingConstraints
): ManufacturingAssessment {
  const { stages, gears, shafts, driverSpeed } = candidate;

  const manufacturingDifficulty = evaluateManufacturingDifficulty(stages, constraints);
  const assemblyRisk = evaluateAssemblyRisk(stages, gears, shafts, constraints);
  const weightEstimate = evaluateWeightEstimate(gears, shafts, stages, constraints);
  const lifespanRisk = evaluateLifespanRisk(stages, constraints, driverSpeed);

  const weights = {
    difficulty: 0.28,
    assembly: 0.22,
    weight: 0.20,
    lifespan: 0.30,
  };

  const weightScore = weightEstimate.overweight
    ? Math.max(0, 50 - (weightEstimate.totalWeightGrams / weightEstimate.weightLimit - 1) * 100)
    : 100 - (1 - weightEstimate.totalWeightGrams / weightEstimate.weightLimit) * 20;

  const overallScore = clampScore(
    manufacturingDifficulty.score * weights.difficulty +
    assemblyRisk.score * weights.assembly +
    clampScore(weightScore) * weights.weight +
    lifespanRisk.score * weights.lifespan
  );

  const recommendations = generateRecommendations(
    manufacturingDifficulty,
    assemblyRisk,
    weightEstimate,
    lifespanRisk,
    stages,
    constraints
  );

  return {
    overallScore,
    manufacturingDifficulty,
    assemblyRisk,
    weightEstimate,
    lifespanRisk,
    feasibilityLevel: scoreToDifficultyLevel(overallScore),
    recommendations,
  };
}

export function assessAllCandidates(
  candidates: CandidateScheme[],
  constraints: ManufacturingConstraints
): CandidateScheme[] {
  return candidates.map((candidate) => ({
    ...candidate,
    manufacturingAssessment: assessManufacturingFeasibility(candidate, constraints),
  }));
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  very_easy: '极易制造',
  easy: '容易制造',
  moderate: '制造可行',
  difficult: '制造较难',
  very_difficult: '制造极难',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  very_low: '极低',
  low: '低',
  medium: '中等',
  high: '高',
  very_high: '极高',
};

export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  very_easy: '#10b981',
  easy: '#34d399',
  moderate: '#f59e0b',
  difficult: '#f97316',
  very_difficult: '#ef4444',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  very_low: '#10b981',
  low: '#34d399',
  medium: '#f59e0b',
  high: '#f97316',
  very_high: '#ef4444',
};
