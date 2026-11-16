import React, { useState } from 'react';
import {
  AlertTriangle,
  Crown,
  Download,
  Eye,
  Footprints,
  Gem,
  Lock,
  MessageSquare,
  RotateCcw,
  Shield,
  Shirt,
  Sliders,
  Sword,
  Trash2,
  TrendingUp,
  Upload,
  Wind,
} from 'lucide-react';
import {
  ArmorSetMeta,
  BuildCandidate,
  CardMechanicMeta,
  CardRecommendations,
  CardSlotEntry,
  ElementType,
  EvaluateResponse,
  GearAffixRecommendations,
  GearAffixSlotRec,
  GearInput,
  JobMeta,
  PassiveMeta,
  calcCumulativeStatCost,
  calcSingleStepCost,
  calcTotalStatPoints,
} from '../api/client';
import {
  ARMOR_SET_SLOTS,
  COATING_OPTIONS,
  RingBaseType,
  STAT_KEYS,
  STAT_LABELS,
  SimState,
  SlotGearSim,
  StatKey,
  getRingBaseOptionsForTier,
  getRingBaseRange,
  getRingBaseShortLabel,
  getSlotNativeBaseSpec,
  getSpecialAffixDef,
  getSpecialAffixOptionsForSlot,
  getTierIndepMax,
  getTierRomanLabel,
  getTierStatMax,
  getGearTiers,
  isAccessorySlot,
  isArmorSlot,
  isSlotModified,
  resolveArmorSetId,
  summarizeEquippedArmorSets,
} from '../utils/simState';

interface EquipmentPaperdollProps {
  build: BuildCandidate;
  benchmarkBuild?: BuildCandidate;
  job: JobMeta;
  level: number;
  refineLevel: number;
  gearAffixRecommendations: GearAffixRecommendations;
  cardRecommendations: CardRecommendations;
  cardMechanics?: Record<string, CardMechanicMeta>;
  simCardsBySlot?: Record<string, CardSlotEntry | null>;
  simState?: SimState | null;
  simResult?: EvaluateResponse | null;
  isSimulating?: boolean;
  allPassives?: PassiveMeta[];
  allArmorSets?: ArmorSetMeta[];
  allJobs?: JobMeta[];
  selectedJobId?: string;
  levelInput?: number;
  gearConfig?: GearInput;
  onChangeJob?: (jobId: string) => void;
  onChangeLevel?: (level: number) => void;
  onChangeGearConfig?: (nextGear: GearInput, reoptimize?: boolean) => void;
  onChangeSimState?: (updater: (prev: SimState) => SimState) => void;
  onResetToBenchmark?: () => void;
  onZeroAllGearStats?: () => void;
  onOpenCardPicker?: (cardSlotKey: string) => void;
  onOpenBuildJsonModal?: (tab: 'export' | 'import') => void;
  importNotice?: string | null;
}

const SLOT_ZH_MAP: Record<string, { label: string; sub: string }> = {
  head: { label: '頭上', sub: 'Head Upper' },
  face: { label: '頭中', sub: 'Head Mid' },
  mouth: { label: '頭下', sub: 'Head Lower' },
  armor: { label: '身體', sub: 'Body Armor' },
  garment: { label: '披風', sub: 'Garment' },
  weapon: { label: '武器', sub: 'Weapon' },
  shield: { label: '副手 / 盾牌', sub: 'Off-Hand' },
  shoes: { label: '鞋子', sub: 'Shoes' },
  accessory1: { label: '飾品 1', sub: 'Accessory 1' },
  accessory2: { label: '飾品 2', sub: 'Accessory 2' },
};

const LEFT_SLOTS = ['head', 'face', 'mouth', 'armor', 'garment'] as const;
const RIGHT_SLOTS = ['weapon', 'shield', 'shoes', 'accessory1', 'accessory2'] as const;

function SlotIcon({ slot, className = 'w-3.5 h-3.5' }: { slot: string; className?: string }) {
  switch (slot) {
    case 'head':
      return <Crown className={className} />;
    case 'face':
      return <Eye className={className} />;
    case 'mouth':
      return <MessageSquare className={className} />;
    case 'armor':
      return <Shirt className={className} />;
    case 'garment':
      return <Wind className={className} />;
    case 'weapon':
      return <Sword className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'shoes':
      return <Footprints className={className} />;
    default:
      return <Gem className={className} />;
  }
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case 'SS':
      return 'bg-[#9E2A2B]/12 text-[#9E2A2B] border-[#9E2A2B]/40';
    case 'S':
      return 'bg-[#9A6B22]/15 text-[#9A6B22] border-[#9A6B22]/40';
    case 'Limited':
      return 'bg-[#6B4C7B]/15 text-[#6B4C7B] border-[#6B4C7B]/40';
    case 'A':
      return 'bg-[#2B5B84]/12 text-[#2B5B84] border-[#2B5B84]/40';
    default:
      return 'bg-[#EDE5D5] text-[#5C4E3C] border-[#C5B69D]';
  }
}

function priorityBadgeClass(tier: string): string {
  if (tier.startsWith('S')) return 'bg-[#9E2A2B]/12 text-[#9E2A2B] border-[#9E2A2B]/35';
  if (tier.startsWith('A')) return 'bg-[#9A6B22]/15 text-[#9A6B22] border-[#9A6B22]/35';
  if (tier.startsWith('B')) return 'bg-[#2B5B84]/12 text-[#2B5B84] border-[#2B5B84]/35';
  return 'bg-[#EDE5D5] text-[#5C4E3C] border-[#D3C6B0]';
}

function formatStatTargetShort(text: string): string {
  const numMatch = text.match(/^(VIT|STR|AGI|DEX|INT|LUK)\s*\+(\d+)/i);
  if (numMatch) return `${numMatch[1].toUpperCase()} +${numMatch[2]}`;
  const m = text.match(/^(VIT|STR|AGI|DEX|INT|LUK|CRIT|M\.CRIT)/i);
  if (!m) return text.slice(0, 18);
  if (text.includes('Obsidian')) return 'CRIT +9% (Obsidian)';
  if (text.includes('Emerald')) return 'M.CRIT +9% (Emerald)';
  return m[1].toUpperCase();
}

function formatDiffText(diff: number, unit = '', decimals = 0): string | null {
  if (Math.abs(diff) < (decimals > 0 ? 0.05 : 1)) return null;
  const sign = diff > 0 ? '+' : '';
  const val = decimals > 0 ? diff.toFixed(decimals) : Math.round(diff).toLocaleString();
  return `${sign}${val}${unit}`;
}

export const EquipmentPaperdoll: React.FC<EquipmentPaperdollProps> = ({
  build,
  benchmarkBuild,
  job,
  level,
  refineLevel,
  gearAffixRecommendations,
  cardRecommendations,
  cardMechanics,
  simCardsBySlot,
  simState,
  simResult,
  isSimulating = false,
  allPassives = [],
  allArmorSets = [],
  allJobs = [],
  selectedJobId,
  levelInput,
  gearConfig,
  onChangeJob,
  onChangeLevel,
  onChangeGearConfig,
  onChangeSimState,
  onResetToBenchmark,
  onZeroAllGearStats,
  onOpenCardPicker,
  onOpenBuildJsonModal,
  importNotice,
}) => {
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>('weapon');
  const [enforceBudget, setEnforceBudget] = useState<boolean>(true);
  const [showPassiveDrawer, setShowPassiveDrawer] = useState<boolean>(false);

  const bench = benchmarkBuild ?? build;
  const slotMap = new Map<string, GearAffixSlotRec>(
    (gearAffixRecommendations.slots || []).map((s) => [s.slot, s])
  );
  const selectedSlot = slotMap.get(selectedSlotKey) ?? slotMap.get('weapon') ?? null;

  const vitComp = gearAffixRecommendations.vit_vs_flat_hp_comparison;
  const statPriority = gearAffixRecommendations.stat_priority_guide || [];
  const ringRec = gearAffixRecommendations.ring_recommendation;
  const bp = gearAffixRecommendations.breakpoints_status;
  const cm = build.combat_metrics;
  const benchCm = bench.combat_metrics;
  const isCaster = job.primary_dmg_type === 'magic';

  const statCap = level >= 119 ? 119 : 99;
  const totalBudget = calcTotalStatPoints(level);
  const activeBaseStats = simState?.base_stats ?? {
    vit: build.stats.vit?.base ?? 1,
    str: build.stats.str?.base ?? 1,
    agi: build.stats.agi?.base ?? 1,
    dex: build.stats.dex?.base ?? 1,
    int: build.stats.int?.base ?? 1,
    luk: build.stats.luk?.base ?? 1,
  };
  const pointsSpent = STAT_KEYS.reduce(
    (sum, k) => sum + calcCumulativeStatCost(activeBaseStats[k] ?? 1),
    0
  );
  const pointsRemaining = totalBudget - pointsSpent;

  const simDps = simResult?.total_dps ?? bench.total_dps;
  const benchDps = bench.total_dps;
  const dpsDiff = simDps - benchDps;
  const dpsDiffPct = benchDps > 0 ? (dpsDiff / benchDps) * 100 : 0;

  const liveRefine = simState?.weapon_refine ?? refineLevel;

  const getCardKeysForSlot = (slotRec: GearAffixSlotRec): string[] => {
    if (slotRec.blocked_by_two_handed) return [];
    if (slotRec.slot === 'weapon') return job.is_two_handed ? ['weapon_1', 'weapon_2'] : ['weapon_1'];
    if (slotRec.slot === 'head') return ['head_upper'];
    if (slotRec.slot === 'face') return ['head_mid'];
    if (slotRec.slot === 'mouth') return ['head_lower'];
    if (slotRec.slot === 'armor') return ['body'];
    if (slotRec.slot === 'accessory1') return ['accessory_1'];
    if (slotRec.slot === 'accessory2') return ['accessory_2'];
    return [slotRec.slot];
  };

  const activeCardSource = simCardsBySlot ?? cardRecommendations.cards_by_slot;

  const getFullCardsForSlot = (slotRec: GearAffixSlotRec) => {
    return getCardKeysForSlot(slotRec)
      .map((k) => activeCardSource[k])
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  };

  const isSlotCardsModified = (slotRec: GearAffixSlotRec): boolean => {
    if (!simState || slotRec.blocked_by_two_handed) return false;
    return getCardKeysForSlot(slotRec).some(
      (ck) => (simState.cards_by_slot[ck] ?? null) !== (cardRecommendations.cards_by_slot[ck]?.card_id ?? null)
    );
  };

  const updateBaseStat = (stat: StatKey, nextRaw: number) => {
    if (!simState || !onChangeSimState) return;
    let clamped = Math.max(1, Math.min(statCap, Math.round(nextRaw)));
    const cur = simState.base_stats[stat] ?? 1;
    if (enforceBudget && clamped > cur) {
      const otherCost = STAT_KEYS.reduce(
        (acc, k) => (k === stat ? acc : acc + calcCumulativeStatCost(simState.base_stats[k] ?? 1)),
        0
      );
      while (clamped > cur && otherCost + calcCumulativeStatCost(clamped) > totalBudget) {
        clamped -= 1;
      }
    }
    if (clamped === cur) return;
    onChangeSimState((prev) => ({
      ...prev,
      base_stats: { ...prev.base_stats, [stat]: clamped },
    }));
  };

  const updateSlotGear = (slotKey: string, updater: (cur: SlotGearSim) => SlotGearSim) => {
    if (!onChangeSimState) return;
    onChangeSimState((prev) => {
      const cur = prev.slot_gear[slotKey];
      if (!cur) return prev;
      return {
        ...prev,
        slot_gear: {
          ...prev.slot_gear,
          [slotKey]: updater(cur),
        },
      };
    });
  };

  const resetSingleSlot = (slotKey: string) => {
    if (!onChangeSimState) return;
    onChangeSimState((prev) => {
      const base = prev.baseline_slot_gear[slotKey];
      if (!base) return prev;
      const nextCards = { ...prev.cards_by_slot };
      const rec = slotMap.get(slotKey);
      if (rec && !rec.blocked_by_two_handed) {
        for (const ck of getCardKeysForSlot(rec)) {
          nextCards[ck] = cardRecommendations.cards_by_slot[ck]?.card_id ?? null;
        }
      }
      const nextSlotArmorSets = isArmorSlot(slotKey)
        ? {
            ...prev.slot_armor_sets,
            [slotKey]: prev.baseline_slot_armor_sets[slotKey] ?? '',
          }
        : prev.slot_armor_sets;
      const nextActiveCombo =
        isArmorSlot(slotKey) && allArmorSets.length > 0
          ? summarizeEquippedArmorSets(nextSlotArmorSets, allArmorSets).activeCombo
          : prev.armor_sets;
      return {
        ...prev,
        slot_gear: {
          ...prev.slot_gear,
          [slotKey]: { ...base },
        },
        cards_by_slot: nextCards,
        slot_armor_sets: nextSlotArmorSets,
        armor_sets: nextActiveCombo,
        ...(slotKey === 'weapon'
          ? {
              weapon_refine: prev.baseline_gear_mods.weapon_refine,
              weapon_coating: prev.baseline_gear_mods.weapon_coating,
            }
          : {}),
      };
    });
  };

  const zeroSingleSlotStats = (slotKey: string) => {
    updateSlotGear(slotKey, (cur) => ({
      ...cur,
      val1: 0,
      val2: 0,
    }));
  };

  const getSlotDisplayStatPills = (slotRec: GearAffixSlotRec): string[] => {
    const slotSim = simState?.slot_gear[slotRec.slot];
    if (slotSim && !slotSim.blocked) {
      const out: string[] = [];
      if (slotSim.stat1 && slotSim.val1 > 0) {
        out.push(`${slotSim.stat1.toUpperCase()} +${slotSim.val1}`);
      }
      if (slotSim.stat2 && slotSim.stat2 !== slotSim.stat1 && slotSim.val2 > 0) {
        out.push(`${slotSim.stat2.toUpperCase()} +${slotSim.val2}`);
      }
      if (slotSim.hitDelta !== 0) {
        out.push(`HIT ${slotSim.hitDelta > 0 ? `+${slotSim.hitDelta}` : slotSim.hitDelta}`);
      }
      if (slotSim.fleeDelta !== 0) {
        out.push(`FLEE ${slotSim.fleeDelta > 0 ? `+${slotSim.fleeDelta}` : slotSim.fleeDelta}`);
      }
      if (slotSim.hpDelta !== 0) {
        out.push(`HP ${slotSim.hpDelta > 0 ? `+${slotSim.hpDelta}` : slotSim.hpDelta}`);
      }
      return out.length > 0 ? out : ['6 維 +0 (空條)'];
    }

    const alloc = slotRec.allocated_stats;
    if (alloc && Object.keys(alloc).length > 0) {
      return Object.entries(alloc)
        .filter(([, v]) => Number(v) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 2)
        .map(([k, v]) => `${k.toUpperCase()} +${v}`);
    }
    return (slotRec.primary_stat_targets || slotRec.recommended_substats || [])
      .slice(0, 2)
      .map(formatStatTargetShort);
  };

  const getSlotSpecialAffixLabel = (slotRec: GearAffixSlotRec): string | null => {
    const slotSim = simState?.slot_gear[slotRec.slot];
    if (slotSim && !slotSim.blocked) {
      if (!slotSim.affixKey) return null;
      return (
        getSpecialAffixDef(
          slotRec.slot,
          slotSim.affixKey,
          job.is_two_handed,
          job.offhand_type,
          slotSim.tier,
          job.primary_dmg_type
        )?.shortLabel ?? slotSim.affixKey
      );
    }
    if (slotRec.recommended_special_affix && slotRec.affix_key) {
      return slotRec.tier_vi_max_value || slotRec.recommended_special_affix;
    }
    return null;
  };

  const getSlotDisplayName = (slotRec: GearAffixSlotRec): string => {
    const slotSim = simState?.slot_gear[slotRec.slot];
    if (slotSim && isAccessorySlot(slotRec.slot)) {
      return getRingBaseShortLabel(slotSim.ringBase, slotSim.ringBaseValue);
    }
    return slotRec.recommended_item_name || slotRec.template_name;
  };

  // Breakpoint pills for Center Character Combat Sheet
  const breakpointPills: Array<{ label: string; ok: boolean }> = [];
  const totalVit = build.stats.vit?.total ?? 0;
  const totalInt = build.stats.int?.total ?? 0;
  const totalDex = build.stats.dex?.total ?? 0;
  if (job.id === 'templar') {
    breakpointPills.push({
      label: `VIT ${totalVit} · GLD ${cm.gld_vit_mult}×`,
      ok: totalVit >= 300,
    });
  }
  if (job.id === 'necromancer') {
    breakpointPills.push({
      label: `Total INT ${totalInt} (${totalInt >= 300 ? '1s 黑貓週期' : totalInt >= 200 ? '2s 週期' : '常規週期'})`,
      ok: totalInt >= 300,
    });
  }
  if (job.id === 'king' && bp?.king_str_eq_int_ok !== null && bp?.king_str_eq_int_ok !== undefined) {
    const totalStr = build.stats.str?.total ?? 0;
    const eqOk = totalStr === totalInt;
    breakpointPills.push({
      label: eqOk ? 'STR = INT 共鳴達成' : `STR ${totalStr} ≠ INT ${totalInt}`,
      ok: eqOk,
    });
  }
  if (isCaster || totalDex >= 150) {
    breakpointPills.push({
      label: totalDex >= 150 ? `DEX ${totalDex} · 瞬詠達成` : `DEX ${totalDex} / 150 瞬詠`,
      ok: totalDex >= 150,
    });
  }
  breakpointPills.push({
    label: cm.hit_chance_pct >= 99.9 ? '命中 100%' : `命中 ${cm.hit_chance_pct.toFixed(1)}%`,
    ok: cm.hit_chance_pct >= 99.9,
  });

  const hasBaseStatDiff =
    Boolean(simState) &&
    STAT_KEYS.some((k) => (simState?.base_stats[k] ?? 1) !== (bench.stats[k]?.base ?? 1));

  const anyArmorSetDiff =
    Boolean(simState) &&
    ARMOR_SET_SLOTS.some(
      (sk) => (simState?.slot_armor_sets?.[sk] ?? '') !== (simState?.baseline_slot_armor_sets?.[sk] ?? '')
    );

  const anyBuildModified =
    Boolean(simState) &&
    (Math.abs(dpsDiffPct) >= 0.05 ||
      Object.keys(simState?.slot_gear || {}).some((sk) => {
        const rec = slotMap.get(sk);
        return (
          isSlotModified(simState?.slot_gear[sk], simState?.baseline_slot_gear[sk]) ||
          (rec ? isSlotCardsModified(rec) : false)
        );
      }) ||
      hasBaseStatDiff ||
      anyArmorSetDiff ||
      simState?.weapon_refine !== simState?.baseline_gear_mods.weapon_refine ||
      simState?.weapon_coating !== simState?.baseline_gear_mods.weapon_coating);

  const renderSlotTile = (slotKey: string) => {
    const rec = slotMap.get(slotKey);
    if (!rec) return null;
    const zh = SLOT_ZH_MAP[slotKey] || { label: rec.slot_label, sub: slotKey };
    const isBlocked = rec.blocked_by_two_handed;
    const isSelected = selectedSlot?.slot === slotKey;
    const slotCards = getFullCardsForSlot(rec);
    const statPills = getSlotDisplayStatPills(rec);
    const specialAffixLabel = getSlotSpecialAffixLabel(rec);
    const slotSim = simState?.slot_gear[slotKey];
    const baseSlotSim = simState?.baseline_slot_gear[slotKey];
    const weaponExtraModified =
      slotKey === 'weapon' &&
      Boolean(simState) &&
      (simState?.weapon_refine !== simState?.baseline_gear_mods.weapon_refine ||
        simState?.weapon_coating !== simState?.baseline_gear_mods.weapon_coating);
    const armorSetModified =
      isArmorSlot(slotKey) &&
      Boolean(simState) &&
      (simState?.slot_armor_sets?.[slotKey] ?? '') !== (simState?.baseline_slot_armor_sets?.[slotKey] ?? '');
    const slotModified =
      isSlotModified(slotSim, baseSlotSim) ||
      isSlotCardsModified(rec) ||
      weaponExtraModified ||
      armorSetModified;
    const liveArmorSetId =
      isArmorSlot(slotKey) && simState
        ? resolveArmorSetId(simState.slot_armor_sets?.[slotKey], allArmorSets)
        : '';
    const liveArmorSetMeta = liveArmorSetId
      ? allArmorSets.find((s) => s.id === liveArmorSetId)
      : undefined;
    const displaySetBadge = isArmorSlot(slotKey)
      ? liveArmorSetMeta?.zh_name || (liveArmorSetId || (simState ? '' : rec.set_assignment || ''))
      : rec.set_assignment;

    return (
      <button
        key={slotKey}
        type="button"
        onClick={() => setSelectedSlotKey(slotKey)}
        className={`w-full text-left rounded-md border p-2.5 transition cursor-pointer ${
          isBlocked
            ? isSelected
              ? 'bg-[#EDE5D5] border-[#9A6B22] opacity-85'
              : 'bg-[#EDE5D5]/55 border-[#D3C6B0] opacity-75 hover:opacity-95'
            : isSelected
            ? 'bg-[#FAF6EE] border-[#9A6B22] ring-1 ring-[#9A6B22]/40'
            : slotModified
            ? 'bg-[#FFFDF8] border-[#9A6B22]/60 hover:bg-[#FAF6EE]'
            : 'bg-[#F5F0E6] border-[#D3C6B0] hover:bg-[#FAF6EE] hover:border-[#9A6B22]/60'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`p-1 rounded border shrink-0 ${
                isBlocked
                  ? 'bg-[#EDE5D5] border-[#C5B69D] text-[#5C4E3C]'
                  : isSelected
                  ? 'bg-[#9A6B22] border-[#9A6B22] text-[#FAF6EE]'
                  : 'bg-[#EDE5D5] border-[#C5B69D] text-[#9A6B22]'
              }`}
            >
              {isBlocked ? <Lock className="w-3 h-3" /> : <SlotIcon slot={slotKey} className="w-3 h-3" />}
            </span>
            <span className="text-xs font-bold text-[#1E1914] shrink-0 whitespace-nowrap">{zh.label}</span>
            {slotSim && !isBlocked && (
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold border shrink-0 ${
                  slotSim.tier === 6
                    ? 'bg-[#EDE5D5] text-[#5C4E3C] border-[#C5B69D]'
                    : 'bg-[#2B5B84]/12 text-[#2B5B84] border-[#2B5B84]/35'
                }`}
              >
                {getTierRomanLabel(slotSim.tier)}
              </span>
            )}
            {slotKey === 'weapon' && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-[#9A6B22]/12 text-[#9A6B22] border border-[#9A6B22]/30 font-mono shrink-0">
                +{liveRefine} {job.is_two_handed ? '雙手' : '單手'}
              </span>
            )}
            {slotModified && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#9E2A2B]/12 text-[#9E2A2B] border border-[#9E2A2B]/35 font-bold shrink-0">
                已改
              </span>
            )}
          </div>
          {displaySetBadge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2B5B84]/12 text-[#2B5B84] border border-[#2B5B84]/30 font-medium truncate max-w-[100px]">
              {displaySetBadge}
            </span>
          )}
        </div>

        <div className={`text-xs font-semibold truncate ${isBlocked ? 'text-[#5C4E3C]' : 'text-[#1E1914]'}`}>
          {getSlotDisplayName(rec)}
        </div>

        {!isBlocked && (
          <div className="mt-1.5 space-y-1">
            <div className="flex flex-wrap gap-1">
              {specialAffixLabel && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2D6A4F]/12 text-[#2D6A4F] border border-[#2D6A4F]/30 font-medium">
                  {specialAffixLabel}
                </span>
              )}
              {statPills.map((pill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-[#EDE5D5] text-[#3E3529] border border-[#D3C6B0] font-mono font-semibold"
                >
                  {pill}
                </span>
              ))}
            </div>

            {slotCards.length > 0 && (
              <div className="pt-1 border-t border-[#D3C6B0]/70 space-y-0.5">
                {slotCards.map((c, idx) => (
                  <div key={`${c.card_id}-${idx}`} className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`px-1 rounded text-[9px] font-bold border shrink-0 ${tierBadgeClass(c.tier)}`}>
                        {c.tier}
                      </span>
                      <span className="text-[#1E1914] truncate font-medium">{c.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#2D6A4F] shrink-0">
                      +{c.marginal_dps_gain_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </button>
    );
  };

  const selectedSlotSim = selectedSlot ? simState?.slot_gear[selectedSlot.slot] : undefined;
  const selectedSlotBase = selectedSlot ? simState?.baseline_slot_gear[selectedSlot.slot] : undefined;
  const selectedSlotArmorSetDiff =
    Boolean(selectedSlot) &&
    isArmorSlot(selectedSlot!.slot) &&
    Boolean(simState) &&
    (simState?.slot_armor_sets?.[selectedSlot!.slot] ?? '') !==
      (simState?.baseline_slot_armor_sets?.[selectedSlot!.slot] ?? '');
  const selectedSlotDirty =
    Boolean(selectedSlot) &&
    (isSlotModified(selectedSlotSim, selectedSlotBase) ||
      (selectedSlot ? isSlotCardsModified(selectedSlot) : false) ||
      selectedSlotArmorSetDiff ||
      (selectedSlot?.slot === 'weapon' &&
        Boolean(simState) &&
        (simState?.weapon_refine !== simState?.baseline_gear_mods.weapon_refine ||
          simState?.weapon_coating !== simState?.baseline_gear_mods.weapon_coating)));

  const hpDiffStr = formatDiffText(cm.max_hp - benchCm.max_hp);
  const aspdDiffStr = formatDiffText(cm.aspd - benchCm.aspd, '', 1);
  const hitDiffStr = formatDiffText(cm.hit_chance_pct - benchCm.hit_chance_pct, '%', 1);
  const activePierce = isCaster ? cm.magic_pierce_pct : cm.phys_pierce_pct;
  const benchPierce = isCaster ? benchCm.magic_pierce_pct : benchCm.phys_pierce_pct;
  const pierceDiffStr = formatDiffText(activePierce - benchPierce, '%', 1);

  return (
    <section className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] p-4 space-y-3">
      {/* Header + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#D3C6B0]">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#9A6B22]" />
            <h3 className="text-sm font-bold text-[#1E1914]">角色裝備面板與互動配裝模擬器</h3>
            {isSimulating && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9A6B22]/15 text-[#9A6B22] font-mono animate-pulse">
                重新驗算中...
              </span>
            )}
          </div>
          <p className="text-xs text-[#5C4E3C] mt-0.5">
            預設已填入 #{bench.rank} 最佳配置；直接拖拉中間角色配點或點擊任一裝備格微調 6 維／特詞／精煉／插卡，即時計算與推薦配裝的 DPS 落差
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {simState && onOpenBuildJsonModal && (
            <>
              <button
                type="button"
                onClick={() => onOpenBuildJsonModal('export')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D3C6B0] bg-[#F5F0E6] text-[#1E1914] hover:border-[#9A6B22] font-medium cursor-pointer transition"
                title="將目前角色 6 維、10 部位裝備詞綴、套裝、卡片與被動匯出為 JSON"
              >
                <Download className="w-3.5 h-3.5 text-[#9A6B22]" />
                匯出 JSON
              </button>
              <button
                type="button"
                onClick={() => onOpenBuildJsonModal('import')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D3C6B0] bg-[#F5F0E6] text-[#1E1914] hover:border-[#2E6F40] font-medium cursor-pointer transition"
                title="從 JSON 文字或 .json 檔案匯入角色裝備與配點配置"
              >
                <Upload className="w-3.5 h-3.5 text-[#2E6F40]" />
                匯入 JSON
              </button>
            </>
          )}
          {simState && onZeroAllGearStats && (
            <button
              type="button"
              onClick={onZeroAllGearStats}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D3C6B0] bg-[#F5F0E6] text-[#5C4E3C] hover:text-[#1E1914] hover:border-[#9A6B22] font-medium cursor-pointer transition"
              title="將 10 件裝備的 6 維詞綴全歸零，保留卡片與穿透設定，從零測試實際裝備"
            >
              <Trash2 className="w-3.5 h-3.5" />
              全裝 6 維歸零
            </button>
          )}
          {simState && onResetToBenchmark && (
            <button
              type="button"
              onClick={onResetToBenchmark}
              disabled={!anyBuildModified && !isSimulating}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-semibold transition ${
                anyBuildModified
                  ? 'border-[#9A6B22]/60 bg-[#9A6B22] text-[#FAF6EE] hover:bg-[#825819] cursor-pointer'
                  : 'border-[#D3C6B0] bg-[#EDE5D5] text-[#8A7963] cursor-default'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置全部回推薦
            </button>
          )}
        </div>
      </div>

      {importNotice && (
        <div className="rounded-md border border-[#2E6F40]/40 bg-[#2E6F40]/10 px-3 py-1.5 text-xs font-medium text-[#2E6F40]">
          {importNotice}
        </div>
      )}

      {/* Slim Top Scoreboard: Live DPS vs Benchmark & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        <div className="lg:col-span-5 rounded-md bg-[#F5F0E6] border border-[#D3C6B0] px-3 py-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold text-[#5C4E3C]">
              目前模擬 DPS vs #{bench.rank} 推薦最佳 ({job.zh_name} Lv.{level})
            </div>
            <div className="flex items-baseline gap-2 mt-0.5 font-mono tabular-nums">
              <span className="text-xl font-extrabold text-[#9E2A2B]">
                {Math.round(simDps).toLocaleString()}
              </span>
              <span className="text-xs text-[#8A7963]">/ {Math.round(benchDps).toLocaleString()}</span>
            </div>
          </div>
          <div
            className={`px-2.5 py-1 rounded-md border font-mono tabular-nums text-xs font-bold text-right ${
              Math.abs(dpsDiffPct) < 0.05
                ? 'bg-[#EDE5D5] border-[#D3C6B0] text-[#5C4E3C]'
                : dpsDiff >= 0
                ? 'bg-[#2D6A4F]/12 border-[#2D6A4F]/40 text-[#2D6A4F]'
                : 'bg-[#9E2A2B]/10 border-[#9E2A2B]/35 text-[#9E2A2B]'
            }`}
          >
            {Math.abs(dpsDiffPct) < 0.05 ? (
              <span>與推薦一致 (0.0%)</span>
            ) : (
              <>
                <div>
                  {dpsDiff >= 0 ? '+' : ''}
                  {Math.round(dpsDiff).toLocaleString()} DPS
                </div>
                <div className="text-[10px]">
                  ({dpsDiffPct >= 0 ? '+' : ''}
                  {dpsDiffPct.toFixed(2)}%)
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] px-2.5 py-1.5 font-mono tabular-nums">
            <div className="text-[10px] text-[#5C4E3C]">最大生命 MaxHP</div>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[#1E1914]">
                {Math.round(cm.max_hp).toLocaleString()}
              </span>
              {hpDiffStr && (
                <span className={`text-[10px] font-bold ${cm.max_hp >= benchCm.max_hp ? 'text-[#2D6A4F]' : 'text-[#9E2A2B]'}`}>
                  {hpDiffStr}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] px-2.5 py-1.5 font-mono tabular-nums">
            <div className="text-[10px] text-[#5C4E3C]">攻速 ASPD (上限 193)</div>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[#1E1914]">{cm.aspd.toFixed(1)}</span>
              <span className="text-[10px] text-[#5C4E3C]">
                {aspdDiffStr ?? `${cm.attacks_per_sec.toFixed(2)} APS`}
              </span>
            </div>
          </div>
          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] px-2.5 py-1.5 font-mono tabular-nums">
            <div className="text-[10px] text-[#5C4E3C]">實際命中率</div>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[#1E1914]">{cm.hit_chance_pct.toFixed(1)}%</span>
              {hitDiffStr && (
                <span className={`text-[10px] font-bold ${cm.hit_chance_pct >= benchCm.hit_chance_pct ? 'text-[#2D6A4F]' : 'text-[#9E2A2B]'}`}>
                  {hitDiffStr}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] px-2.5 py-1.5 font-mono tabular-nums">
            <div className="text-[10px] text-[#5C4E3C]">{isCaster ? '魔法穿透' : '物理穿透'}</div>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[#2D6A4F]">{activePierce.toFixed(1)}%</span>
              {pierceDiffStr ? (
                <span className={`text-[10px] font-bold ${activePierce >= benchPierce ? 'text-[#2D6A4F]' : 'text-[#9E2A2B]'}`}>
                  {pierceDiffStr}
                </span>
              ) : (
                <span className="text-[10px] text-[#5C4E3C]">
                  目標減傷 {(isCaster ? cm.target_magic_dr_pct : cm.target_phys_dr_pct).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 8 Cols = 3-Column In-Game Paperdoll | Right 4 Cols = Docked Slot Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* 3-Column Paperdoll */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Left 5 Slots */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-[11px] font-semibold text-[#5C4E3C] px-0.5">防具部位 (頭 / 身 / 披風)</div>
            {LEFT_SLOTS.map((k) => renderSlotTile(k))}
          </div>

          {/* Center Character Combat Sheet with Inline Draggable Base Stats */}
          <div className="md:col-span-4 rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-3 space-y-2.5">
            <div className="space-y-1 border-b border-[#D3C6B0] pb-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="text-[10px] font-semibold tracking-wider text-[#9A6B22]">
                  角色素質（可拖拉微調）
                </div>
                {simState && onChangeSimState && (
                  <button
                    type="button"
                    disabled={!hasBaseStatDiff}
                    onClick={() =>
                      onChangeSimState((prev) => ({
                        ...prev,
                        base_stats: {
                          vit: bench.stats.vit?.base ?? 1,
                          str: bench.stats.str?.base ?? 1,
                          agi: bench.stats.agi?.base ?? 1,
                          dex: bench.stats.dex?.base ?? 1,
                          int: bench.stats.int?.base ?? 1,
                          luk: bench.stats.luk?.base ?? 1,
                        },
                      }))
                    }
                    title="僅將左側 6 維人物配點還原至目前推薦方案，保留裝備與卡片調整"
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold shrink-0 transition ${
                      hasBaseStatDiff
                        ? 'border-[#9A6B22]/60 bg-[#9A6B22] text-[#FAF6EE] hover:bg-[#825819] cursor-pointer'
                        : 'border-[#D3C6B0] bg-[#EDE5D5] text-[#8A7963] cursor-default'
                    }`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    還原配點
                  </button>
                )}
              </div>
              {allJobs.length > 0 && onChangeJob ? (
                <div className="space-y-1.5 pt-1">
                  <select
                    aria-label="角色職業選擇"
                    value={selectedJobId ?? job.id}
                    onChange={(e) => onChangeJob(e.target.value)}
                    className="w-full rounded border border-[#C5B69D] bg-[#FAF6EE] px-2 py-1 text-xs font-bold text-[#1E1914] focus:outline-none focus:border-[#9A6B22]"
                  >
                    {allJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.zh_name} — {j.weapon_name} ({j.is_two_handed ? '雙手' : `單手+${j.offhand_type}`})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-1 text-[10px] text-[#5C4E3C]">
                    <span className="truncate font-medium text-[#9A6B22]">
                      {job.innate_passive_name || job.role}
                    </span>
                    <span className="font-mono shrink-0">基礎 ASPD {job.base_aspd}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-[#1E1914] truncate">{job.zh_name}</div>
              )}

              {onChangeLevel && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[#1E1914]">等級 Lv.</span>
                      <input
                        type="number"
                        aria-label="角色等級"
                        min={1}
                        max={150}
                        value={levelInput ?? level}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          if (!Number.isFinite(raw)) return;
                          onChangeLevel(Math.max(1, Math.min(150, Math.round(raw))));
                        }}
                        className="w-13 rounded border border-[#C5B69D] bg-[#FAF6EE] px-1.5 py-0.5 text-center font-mono text-xs font-bold text-[#9E2A2B] focus:outline-none focus:border-[#9A6B22]"
                      />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/30">
                      上限 {(levelInput ?? level) >= 119 ? 119 : 99}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[118, 121, 130, 140, 150].map((lv) => {
                      const activeLv = (levelInput ?? level) === lv;
                      return (
                        <button
                          key={lv}
                          type="button"
                          onClick={() => onChangeLevel(lv)}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition cursor-pointer ${
                            activeLv
                              ? 'bg-[#9A6B22] text-[#FAF6EE] border-[#9A6B22] font-bold'
                              : 'bg-[#FAF6EE] hover:bg-[#EDE5D5] text-[#5C4E3C] border-[#D3C6B0]'
                          }`}
                        >
                          {lv}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-[11px] font-mono font-bold text-[#9E2A2B] pt-0.5">
                {isCaster ? 'MATK' : 'ATK'} {Math.round(isCaster ? cm.total_matk : cm.total_atk).toLocaleString()} · HP{' '}
                {Math.round(cm.max_hp).toLocaleString()}
              </div>
            </div>

            {/* Upgrade Point Budget + Enforce Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
              <span
                className={`px-1.5 py-0.5 rounded border font-bold ${
                  pointsRemaining < 0
                    ? 'bg-[#9E2A2B]/12 border-[#9E2A2B]/40 text-[#9E2A2B]'
                    : pointsRemaining > 0
                    ? 'bg-[#9A6B22]/12 border-[#9A6B22]/40 text-[#9A6B22]'
                    : 'bg-[#2D6A4F]/12 border-[#2D6A4F]/35 text-[#2D6A4F]'
                }`}
              >
                點數 {pointsSpent}/{totalBudget} (剩 {pointsRemaining})
              </span>
              {simState && onChangeSimState && (
                <label className="inline-flex items-center gap-1 text-[10px] text-[#5C4E3C] cursor-pointer select-none font-sans">
                  <input
                    type="checkbox"
                    checked={enforceBudget}
                    onChange={(e) => setEnforceBudget(e.target.checked)}
                    className="rounded border-[#C5B69D] accent-[#9A6B22]"
                  />
                  限制上限
                </label>
              )}
            </div>

            {pointsRemaining < 0 && (
              <div className="flex items-center gap-1 rounded bg-[#9E2A2B]/10 border border-[#9E2A2B]/35 px-2 py-1 text-[10px] text-[#9E2A2B]">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>已超出 Lv.{level} 可配點數 {Math.abs(pointsRemaining)} 點</span>
              </div>
            )}

            {/* 6 Stats with Inline Base Sliders */}
            <div className="space-y-1.5">
              {STAT_KEYS.map((k) => {
                const st = build.stats[k];
                const total = st?.total ?? 1;
                const base = activeBaseStats[k] ?? st?.base ?? 1;
                const bonus = total - base;
                const benchBase = bench.stats[k]?.base ?? base;
                const diffBase = base - benchBase;
                const nextCost = base < statCap ? calcSingleStepCost(base) : 0;

                return (
                  <div key={k} className="rounded bg-[#FAF6EE] border border-[#D3C6B0] px-2 py-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-[#1E1914] uppercase">{k}</span>
                        <span className="text-xs font-extrabold text-[#1E1914]">{total}</span>
                        {diffBase !== 0 && (
                          <span
                            className={`text-[9px] px-1 rounded font-bold ${
                              diffBase > 0 ? 'bg-[#2D6A4F]/12 text-[#2D6A4F]' : 'bg-[#9E2A2B]/10 text-[#9E2A2B]'
                            }`}
                          >
                            {diffBase > 0 ? `+${diffBase}` : diffBase}
                          </span>
                        )}
                      </div>
                      {simState && onChangeSimState && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`減少 ${k.toUpperCase()} 配點`}
                            onClick={() => updateBaseStat(k, base - 1)}
                            className="w-4 h-4 leading-none rounded border border-[#C5B69D] bg-[#F5F0E6] hover:border-[#9A6B22] font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            aria-label={`增加 ${k.toUpperCase()} 配點`}
                            onClick={() => updateBaseStat(k, base + 1)}
                            className="w-4 h-4 leading-none rounded border border-[#C5B69D] bg-[#F5F0E6] hover:border-[#9A6B22] font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#9A6B22]">
                      <span>
                        配點 {base} + 加成 {bonus}
                      </span>
                      <span className="text-[9px] text-[#8A7963]">
                        {base < statCap ? `下點 ${nextCost}pt` : 'MAX'}
                      </span>
                    </div>
                    {simState && onChangeSimState && (
                      <input
                        type="range"
                        aria-label={`${k.toUpperCase()} 人物基礎配點`}
                        min={1}
                        max={statCap}
                        value={base}
                        onChange={(e) => updateBaseStat(k, Number(e.target.value))}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#9A6B22]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Breakpoint Pills */}
            <div className="flex flex-wrap gap-1">
              {breakpointPills.map((pill, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${
                    pill.ok
                      ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/30'
                      : 'bg-[#9E2A2B]/10 text-[#9E2A2B] border-[#9E2A2B]/30'
                  }`}
                >
                  {pill.label}
                </span>
              ))}
            </div>

            {/* Separated HIT vs ASPD + Pierce */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-[#FAF6EE] border border-[#2B5B84]/35 rounded p-1.5">
                <div className="text-[10px] font-semibold text-[#2B5B84]">命中 HIT vs FLEE</div>
                <div className="font-mono font-bold text-[#1E1914]">
                  {cm.hit_total} / {cm.target_flee}
                </div>
                <div className="text-[10px] font-mono text-[#5C4E3C]">{cm.hit_chance_pct.toFixed(1)}%</div>
              </div>
              <div className="bg-[#FAF6EE] border border-[#9A6B22]/35 rounded p-1.5">
                <div className="text-[10px] font-semibold text-[#9A6B22]">攻速 ASPD (上限193)</div>
                <div className="font-mono font-bold text-[#1E1914]">{cm.aspd.toFixed(1)}</div>
                <div className="text-[10px] font-mono text-[#5C4E3C]">{cm.attacks_per_sec.toFixed(2)} 下/秒</div>
              </div>
            </div>

            {/* Quick 4/4 Passive Swap Drawer inside Character Sheet */}
            {simState && onChangeSimState && allPassives.length > 0 && (
              <div className="pt-1 border-t border-[#D3C6B0]">
                <button
                  type="button"
                  onClick={() => setShowPassiveDrawer((v) => !v)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#1E1914] hover:text-[#9A6B22] cursor-pointer py-0.5"
                >
                  <span>跨職被動微調 ({simState.passives.length}/4)</span>
                  <span className="text-[10px] text-[#9A6B22] font-normal">
                    {showPassiveDrawer ? '收合' : '展開修改'}
                  </span>
                </button>
                {showPassiveDrawer && (
                  <div className="mt-1.5 space-y-1">
                    {[0, 1, 2, 3].map((slotIdx) => (
                      <select
                        key={slotIdx}
                        value={simState.passives[slotIdx] ?? ''}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          onChangeSimState((prev) => {
                            const next = [...prev.passives];
                            next[slotIdx] = nextVal;
                            return { ...prev, passives: Array.from(new Set(next.filter(Boolean))) };
                          });
                        }}
                        className="w-full rounded border border-[#C5B69D] bg-[#FAF6EE] px-1.5 py-1 text-[11px] text-[#1E1914]"
                      >
                        <option value="">（空被動槽）</option>
                        {allPassives.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.zh_name} ({p.origin_job})
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stat Allocation Priority */}
            <div className="space-y-1 pt-1 border-t border-[#D3C6B0]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#1E1914]">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#9A6B22]" />
                  屬性投資優先度
                </span>
                <span className="text-[10px] font-mono text-[#5C4E3C]">+12點增傷</span>
              </div>
              <div className="space-y-1">
                {statPriority.slice(0, 4).map((sp) => (
                  <div
                    key={sp.stat}
                    className="flex items-center justify-between gap-1.5 bg-[#FAF6EE] border border-[#D3C6B0] rounded px-2 py-1 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-[#1E1914] w-7">{sp.stat}</span>
                      <span className={`text-[9px] px-1 rounded border shrink-0 ${priorityBadgeClass(sp.priority_tier)}`}>
                        {sp.priority_tier.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-[#5C4E3C] truncate">{sp.role}</span>
                    </div>
                    <span className="font-mono font-bold text-[#2D6A4F] shrink-0">
                      +{sp.marginal_dps_pct_per_12.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {ringRec && (
              <div className="bg-[#EDE5D5]/60 border border-[#D3C6B0] rounded p-2 text-[11px]">
                <div className="font-semibold text-[#1E1914]">
                  推薦飾品基底：{ringRec.acc1_name} + {ringRec.acc2_name}
                </div>
                <div className="text-[10px] text-[#5C4E3C] mt-0.5 leading-snug">{ringRec.rationale}</div>
              </div>
            )}
          </div>

          {/* Right 5 Slots */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-[11px] font-semibold text-[#5C4E3C] px-0.5">武器與飾品 (主副 / 鞋 / 戒)</div>
            {RIGHT_SLOTS.map((k) => renderSlotTile(k))}
          </div>
        </div>

        {/* Docked Right-Hand Slot Inspector & Interactive Editor */}
        <aside className="xl:col-span-4 rounded-md bg-[#F5F0E6] border border-[#C5B69D] p-3.5 space-y-3 xl:sticky xl:top-16">
          {selectedSlot ? (
            <>
              {/* Slot Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#D3C6B0]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded bg-[#FAF6EE] border border-[#9A6B22]/50 text-[#9A6B22] shrink-0">
                    {selectedSlot.blocked_by_two_handed ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <SlotIcon slot={selectedSlot.slot} className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#9A6B22]">
                      {SLOT_ZH_MAP[selectedSlot.slot]?.label || selectedSlot.slot_label}
                    </div>
                    <h4 className="text-sm font-bold text-[#1E1914] truncate">
                      {getSlotDisplayName(selectedSlot)}
                    </h4>
                  </div>
                </div>
                {!selectedSlot.blocked_by_two_handed && simState && onChangeSimState && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => zeroSingleSlotStats(selectedSlot.slot)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-[#D3C6B0] bg-[#FAF6EE] text-[#5C4E3C] hover:border-[#9A6B22] hover:text-[#1E1914] cursor-pointer"
                      title="只將此部位的 6 維屬性歸零"
                    >
                      此格歸零
                    </button>
                    {selectedSlotDirty && (
                      <button
                        type="button"
                        onClick={() => resetSingleSlot(selectedSlot.slot)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-[#9A6B22]/50 bg-[#9A6B22] text-[#FAF6EE] hover:bg-[#825819] font-semibold cursor-pointer"
                      >
                        還原此格
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Controls for Selected Slot */}
              {selectedSlot.blocked_by_two_handed ? (
                <div className="rounded bg-[#FAF6EE] border border-[#D3C6B0] p-2.5 text-xs text-[#5C4E3C] leading-relaxed">
                  {selectedSlot.rationale}
                </div>
              ) : (
                <>
                  {selectedSlotSim && simState && onChangeSimState && (
                    <div className="rounded bg-[#FAF6EE] border border-[#9A6B22]/40 p-2.5 space-y-2.5 text-xs">
                      {/* Per-Slot Equipment Tier Selector (I ~ VI) */}
                      <div className="space-y-1 pb-2 border-b border-[#D3C6B0]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#1E1914]">裝備階級 (Tier I ~ VI 混搭)</span>
                          <span className="font-mono text-[10px] font-semibold text-[#9A6B22]">
                            單條上限 +{selectedSlotSim.maxPerStat} · 副條 ±
                            {getTierIndepMax(selectedSlotSim.tier, selectedSlot.slot, job.is_two_handed)}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {getGearTiers().map((t) => {
                            const activeTier = selectedSlotSim.tier === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  const nextStatMax = getTierStatMax(t, selectedSlot.slot, job.is_two_handed);
                                  const nextIndepMax = getTierIndepMax(t, selectedSlot.slot, job.is_two_handed);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => {
                                    const nextRingRange = isAccessorySlot(selectedSlot.slot)
                                      ? getRingBaseRange(prevSlot.ringBase, t)
                                      : null;
                                    const clampedRingVal = nextRingRange
                                      ? Math.min(nextRingRange.max, Math.max(nextRingRange.min, prevSlot.ringBaseValue))
                                      : prevSlot.ringBaseValue;
                                    const nextNativeSpec = getSlotNativeBaseSpec(
                                      selectedSlot.slot,
                                      t,
                                      job.is_two_handed,
                                      job.primary_dmg_type,
                                      job.offhand_type
                                    );
                                    const clampedNativeVal = nextNativeSpec
                                      ? Math.min(nextNativeSpec.max, Math.max(nextNativeSpec.min, prevSlot.nativeVal))
                                      : prevSlot.nativeVal;
                                    const clampedExtraVal =
                                      nextNativeSpec?.extraMin !== undefined && nextNativeSpec?.extraMax !== undefined
                                        ? Math.min(
                                            nextNativeSpec.extraMax,
                                            Math.max(nextNativeSpec.extraMin, prevSlot.offhandExtraVal)
                                          )
                                        : prevSlot.offhandExtraVal;
                                    return {
                                      ...prevSlot,
                                      tier: t,
                                      maxPerStat: nextStatMax,
                                      val1: Math.min(nextStatMax, prevSlot.val1),
                                      val2: Math.min(nextStatMax, prevSlot.val2),
                                      hitDelta: Math.min(nextIndepMax, Math.max(-nextIndepMax, prevSlot.hitDelta)),
                                      fleeDelta: Math.min(nextIndepMax, Math.max(-nextIndepMax, prevSlot.fleeDelta)),
                                      ringBaseValue: clampedRingVal,
                                      nativeVal: clampedNativeVal,
                                      offhandExtraVal: clampedExtraVal,
                                    };
                                  });
                                }}
                                className={`py-0.5 rounded border text-[11px] font-mono font-bold transition cursor-pointer ${
                                  activeTier
                                    ? 'bg-[#9A6B22] border-[#9A6B22] text-[#FAF6EE]'
                                    : 'bg-[#F5F0E6] border-[#D3C6B0] text-[#5C4E3C] hover:bg-[#EDE5D5]'
                                }`}
                              >
                                {getTierRomanLabel(t)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#9A6B22]">
                          此部位雙 6 維屬性編輯 (Tier {getTierRomanLabel(selectedSlotSim.tier)} 上限 {selectedSlotSim.maxPerStat}/條)
                        </span>
                        <span className="text-[10px] font-mono text-[#5C4E3C]">單件上限 2 種</span>
                      </div>

                      {/* Stat Line 1 */}
                      {([1, 2] as const).map((lineIdx) => {
                        const statField = lineIdx === 1 ? 'stat1' : 'stat2';
                        const valField = lineIdx === 1 ? 'val1' : 'val2';
                        const otherStat = lineIdx === 1 ? selectedSlotSim.stat2 : selectedSlotSim.stat1;
                        const curStat = selectedSlotSim[statField];
                        const curVal = selectedSlotSim[valField];
                        const baseStatVal = selectedSlotBase
                          ? selectedSlotBase[statField] === curStat
                            ? selectedSlotBase[valField]
                            : 0
                          : 0;

                        return (
                          <div key={lineIdx} className="rounded bg-[#F5F0E6] border border-[#D3C6B0] p-2 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <select
                                aria-label={`詞綴第 ${lineIdx} 條屬性`}
                                value={curStat}
                                onChange={(e) => {
                                  const nextStat = e.target.value as StatKey | '';
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    [statField]: nextStat,
                                    [valField]: nextStat
                                      ? Math.min(prevSlot.maxPerStat, prevSlot[valField] || Math.min(12, prevSlot.maxPerStat))
                                      : 0,
                                  }));
                                }}
                                className="rounded border border-[#C5B69D] bg-[#FAF6EE] px-2 py-0.5 text-xs font-semibold text-[#1E1914]"
                              >
                                <option value="">（無第 {lineIdx} 條）</option>
                                {STAT_KEYS.filter((k) => k !== otherStat).map((k) => (
                                  <option key={k} value={k}>
                                    {STAT_LABELS[k]}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-xs font-extrabold text-[#1E1914]">
                                  +{curStat ? curVal : 0}
                                </span>
                                {curStat && curVal !== baseStatVal && (
                                  <span className="text-[10px] text-[#8A7963]">(推 +{baseStatVal})</span>
                                )}
                              </div>
                            </div>
                            <input
                              type="range"
                              aria-label={`詞綴第 ${lineIdx} 條數值`}
                              disabled={!curStat}
                              min={0}
                              max={selectedSlotSim.maxPerStat}
                              value={curStat ? curVal : 0}
                              onChange={(e) => {
                                const nextV = Number(e.target.value);
                                updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                  ...prevSlot,
                                  [valField]: nextV,
                                }));
                              }}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#9A6B22] disabled:opacity-40"
                            />
                          </div>
                        );
                      })}

                      {/* Special Affix Selector (per-slot & per-tier Wiki pool) */}
                      {(() => {
                        const slotSpecialOpts = getSpecialAffixOptionsForSlot(
                          selectedSlot.slot,
                          job.is_two_handed,
                          job.offhand_type,
                          selectedSlotSim.tier,
                          job.primary_dmg_type
                        );
                        const tierRoman = getTierRomanLabel(selectedSlotSim.tier);
                        if (slotSpecialOpts.length > 1) {
                          return (
                            <div className="space-y-1 pt-1 border-t border-[#D3C6B0]">
                              <div className="text-[11px] font-semibold text-[#2B5B84]">
                                特別詞綴 (Tier {tierRoman}
                                {selectedSlot.slot === 'weapon' && job.is_two_handed ? ' · 雙手 2×' : ''})
                              </div>
                              <select
                                aria-label="特別詞綴選擇"
                                value={selectedSlotSim.affixKey}
                                onChange={(e) => {
                                  const nextKey = e.target.value;
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    affixKey: nextKey,
                                  }));
                                }}
                                className="w-full rounded border border-[#C5B69D] bg-[#F5F0E6] px-2 py-1 text-xs font-semibold text-[#1E1914]"
                              >
                                {slotSpecialOpts.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isArmorSlot(selectedSlot.slot) && (
                                <div className="text-[10px] text-[#5C4E3C]">
                                  註：防具與實際盾牌無攻擊特詞，可選 Blood ({slotSpecialOpts.find((o) => o.key === 'hp')?.shortLabel ?? '+180 MaxHP'})。
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="text-[10px] text-[#5C4E3C] pt-1 border-t border-[#D3C6B0]">
                            註：鞋子無攻擊或 HP 特詞（可洗雙 6 維與獨立 HIT / FLEE / MaxHP）。
                          </div>
                        );
                      })()}

                      {/* Non-Accessory Native Base Roll Sliders (Weapon ATK/MATK, Armor DEF/MDEF, Offhand MATK/MaxSP/Crit/ASPD) */}
                      {(() => {
                        const nativeSpec = getSlotNativeBaseSpec(
                          selectedSlot.slot,
                          selectedSlotSim.tier,
                          job.is_two_handed,
                          job.primary_dmg_type,
                          job.offhand_type
                        );
                        if (!nativeSpec) return null;
                        return (
                          <div className="space-y-2 pt-1 border-t border-[#D3C6B0]">
                            <div className="rounded bg-[#F5F0E6] border border-[#D3C6B0] p-2 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-[#1E1914]">
                                  {nativeSpec.label} (+{nativeSpec.min} ~ +{nativeSpec.max})
                                </span>
                                <span className="font-mono font-extrabold text-[#9A6B22]">
                                  +{selectedSlotSim.nativeVal}
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="部位原生白字主數值滑桿"
                                min={nativeSpec.min}
                                max={nativeSpec.max}
                                value={selectedSlotSim.nativeVal}
                                onChange={(e) => {
                                  const nextVal = Number(e.target.value);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    nativeVal: nextVal,
                                  }));
                                }}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#9A6B22]"
                              />
                              {nativeSpec.fixedNote && (
                                <div className="text-[10px] text-[#2B5B84] font-medium">
                                  {nativeSpec.fixedNote}
                                </div>
                              )}
                            </div>

                            {nativeSpec.extraLabel &&
                              nativeSpec.extraMin !== undefined &&
                              nativeSpec.extraMax !== undefined && (
                                <div className="rounded bg-[#F5F0E6] border border-[#D3C6B0] p-2 space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-[#1E1914]">
                                      {nativeSpec.extraLabel} (+{nativeSpec.extraMin} ~ +{nativeSpec.extraMax})
                                    </span>
                                    <span className="font-mono font-extrabold text-[#2B5B84]">
                                      +{selectedSlotSim.offhandExtraVal}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    aria-label="副手白字 MaxSP 滑桿"
                                    min={nativeSpec.extraMin}
                                    max={nativeSpec.extraMax}
                                    value={selectedSlotSim.offhandExtraVal}
                                    onChange={(e) => {
                                      const nextExtra = Number(e.target.value);
                                      updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                        ...prevSlot,
                                        offhandExtraVal: nextExtra,
                                      }));
                                    }}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#2B5B84]"
                                  />
                                </div>
                              )}
                          </div>
                        );
                      })()}

                      {/* Ring Native Base Selector + Adjustable Roll Value (Accessory 1 & 2) */}
                      {isAccessorySlot(selectedSlot.slot) && (() => {
                        const ringOpts = getRingBaseOptionsForTier(selectedSlotSim.tier);
                        const ringRange = getRingBaseRange(selectedSlotSim.ringBase, selectedSlotSim.tier);
                        return (
                          <div className="space-y-2 pt-1 border-t border-[#D3C6B0]">
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-[#9A6B22]">
                                飾品原生白字基底 (Tier {getTierRomanLabel(selectedSlotSim.tier)})
                              </div>
                              <select
                                aria-label="飾品白字基底選擇"
                                value={selectedSlotSim.ringBase}
                                onChange={(e) => {
                                  const nextRing = e.target.value as RingBaseType;
                                  const nextRange = getRingBaseRange(nextRing, selectedSlotSim.tier);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    ringBase: nextRing,
                                    ringBaseValue: nextRange.defaultVal,
                                  }));
                                }}
                                className="w-full rounded border border-[#C5B69D] bg-[#F5F0E6] px-2 py-1 text-xs font-semibold text-[#1E1914]"
                              >
                                {ringOpts.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedSlotSim.ringBase !== 'none' && (
                              <div className="rounded bg-[#F5F0E6] border border-[#D3C6B0] p-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-[#1E1914]">
                                    白字 {ringRange.statLabel} 微調 (+{ringRange.min}
                                    {ringRange.unit === 'pct' ? '%' : ''} ~ +{ringRange.max}
                                    {ringRange.unit === 'pct' ? '%' : ''})
                                  </span>
                                  <span className="font-mono font-extrabold text-[#9A6B22]">
                                    +{selectedSlotSim.ringBaseValue}
                                    {ringRange.unit === 'pct' ? '%' : ''}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  aria-label="飾品白字基底數值滑桿"
                                  min={ringRange.min}
                                  max={ringRange.max}
                                  step={1}
                                  value={selectedSlotSim.ringBaseValue}
                                  onChange={(e) => {
                                    const nextVal = Number(e.target.value);
                                    updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                      ...prevSlot,
                                      ringBaseValue: nextVal,
                                    }));
                                  }}
                                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#9A6B22]"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Weapon-Only Controls: Refine + Coating + 2H Toggle */}
                      {selectedSlot.slot === 'weapon' && (
                        <div className="space-y-2 pt-1 border-t border-[#D3C6B0]">
                          <div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#1E1914]">
                                武器精煉度 ({job.is_two_handed ? '雙手 2× 穿透/ATK' : '單手'})
                              </span>
                              <span className="font-mono font-bold text-[#9A6B22]">+{simState.weapon_refine}</span>
                            </div>
                            <input
                              type="range"
                              aria-label="武器精煉滑桿"
                              min={0}
                              max={10}
                              value={simState.weapon_refine}
                              onChange={(e) => {
                                const nextRef = Number(e.target.value);
                                onChangeSimState((prev) => ({
                                  ...prev,
                                  weapon_refine: nextRef,
                                }));
                              }}
                              className="w-full h-1.5 mt-1 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#9A6B22]"
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-[#1E1914] mb-1">武器屬性塗層</div>
                            <select
                              aria-label="武器塗層選擇"
                              value={simState.weapon_coating ?? ''}
                              onChange={(e) => {
                                const nextCoat = (e.target.value || null) as ElementType | null;
                                onChangeSimState((prev) => ({
                                  ...prev,
                                  weapon_coating: nextCoat,
                                }));
                              }}
                              className="w-full rounded border border-[#C5B69D] bg-[#F5F0E6] px-2 py-1 text-xs text-[#1E1914]"
                            >
                              {COATING_OPTIONS.map((opt) => (
                                <option key={String(opt.value)} value={opt.value ?? ''}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {gearConfig && onChangeGearConfig && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#1E1914] bg-[#F5F0E6] px-2 py-1 rounded border border-[#D3C6B0] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={gearConfig.is_two_handed}
                                  onChange={(e) =>
                                    onChangeGearConfig({
                                      ...gearConfig,
                                      is_two_handed: e.target.checked,
                                    })
                                  }
                                  className="rounded accent-[#9A6B22]"
                                />
                                <span>雙手武器 (2卡槽)</span>
                              </label>
                              {(simState.weapon_refine !== gearConfig.weapon_refine ||
                                simState.weapon_coating !== gearConfig.weapon_coating) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onChangeGearConfig(
                                      {
                                        ...gearConfig,
                                        weapon_refine: simState.weapon_refine,
                                        weapon_coating: simState.weapon_coating,
                                      },
                                      true
                                    )
                                  }
                                  className="px-2 py-1 rounded bg-[#9A6B22] hover:bg-[#825819] text-[#FAF6EE] text-[10px] font-semibold cursor-pointer transition"
                                >
                                  以此精煉/塗層重算 Top 5
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Per-Slot Armor Set Selector (1 set per armor slot, 6 slots total) */}
                      {isArmorSlot(selectedSlot.slot) && allArmorSets.length > 0 && (() => {
                        const slotZh = SLOT_ZH_MAP[selectedSlot.slot]?.label ?? selectedSlot.slot;
                        const summary = summarizeEquippedArmorSets(simState.slot_armor_sets || {}, allArmorSets);
                        const currentSetId = resolveArmorSetId(
                          simState.slot_armor_sets?.[selectedSlot.slot],
                          allArmorSets
                        );
                        return (
                          <div className="space-y-1.5 pt-1 border-t border-[#D3C6B0]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#2B5B84]">
                                此部位防具套裝（{slotZh} · 單格選 1 套）
                              </span>
                            </div>
                            <select
                              aria-label={`${slotZh}防具套裝選擇`}
                              value={currentSetId}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                onChangeSimState((prev) => {
                                  const nextSlotSets = {
                                    ...prev.slot_armor_sets,
                                    [selectedSlot.slot]: nextVal,
                                  };
                                  const nextActive = summarizeEquippedArmorSets(
                                    nextSlotSets,
                                    allArmorSets
                                  ).activeCombo;
                                  return {
                                    ...prev,
                                    slot_armor_sets: nextSlotSets,
                                    armor_sets: nextActive,
                                  };
                                });
                              }}
                              className="w-full rounded border border-[#C5B69D] bg-[#F5F0E6] px-2 py-1 text-xs font-semibold text-[#1E1914]"
                            >
                              <option value="">（無套裝）</option>
                              {allArmorSets.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.zh_name} ({s.pieces_required}件套)
                                </option>
                              ))}
                            </select>
                            {summary.entries.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {summary.entries.map((entry) => (
                                  <span
                                    key={entry.id}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                      entry.stacks > 0
                                        ? 'bg-[#2B5B84]/12 border-[#2B5B84]/35 text-[#2B5B84]'
                                        : 'bg-[#EDE5D5] border-[#D3C6B0] text-[#5C4E3C]'
                                    }`}
                                  >
                                    {entry.zh_name} {entry.count}/
                                    {entry.reqPieces === 6
                                      ? 6
                                      : Math.max(2, Math.ceil(entry.count / 2) * 2)}
                                    {entry.stacks > 0
                                      ? ` · 發動 ${entry.stacks} 層`
                                      : ` (未滿 ${entry.reqPieces} 件)`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Independent Substat Sliders: HIT, FLEE, Extra MaxHP */}
                      {(() => {
                        const indepMax = getTierIndepMax(
                          selectedSlotSim.tier,
                          selectedSlot.slot,
                          job.is_two_handed
                        );
                        return (
                          <div className="space-y-2 pt-1 border-t border-[#D3C6B0]">
                            <div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-[#2B5B84]">
                                  獨立副條 HIT 微調（0 ~ +{indepMax}）
                                </span>
                                <span className="font-mono font-bold text-[#1E1914]">
                                  {selectedSlotSim.hitDelta >= 0
                                    ? `+${selectedSlotSim.hitDelta}`
                                    : selectedSlotSim.hitDelta}
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="獨立 HIT 詞綴微調"
                                min={-indepMax}
                                max={indepMax}
                                value={selectedSlotSim.hitDelta}
                                onChange={(e) => {
                                  const nextHit = Number(e.target.value);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    hitDelta: nextHit,
                                  }));
                                }}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#2B5B84]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-[#2B5B84]">
                                  獨立副條 FLEE 微調（0 ~ +{indepMax}）
                                </span>
                                <span className="font-mono font-bold text-[#1E1914]">
                                  {selectedSlotSim.fleeDelta >= 0
                                    ? `+${selectedSlotSim.fleeDelta}`
                                    : selectedSlotSim.fleeDelta}
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="獨立 FLEE 詞綴微調"
                                min={-indepMax}
                                max={indepMax}
                                value={selectedSlotSim.fleeDelta}
                                onChange={(e) => {
                                  const nextFlee = Number(e.target.value);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    fleeDelta: nextFlee,
                                  }));
                                }}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#2B5B84]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-[#2D6A4F]">
                                  額外 +MaxHP 微調（裝備 / 附魔基底）
                                </span>
                                <span className="font-mono font-bold text-[#1E1914]">
                                  {selectedSlotSim.hpDelta >= 0
                                    ? `+${selectedSlotSim.hpDelta}`
                                    : selectedSlotSim.hpDelta}
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="額外 MaxHP 微調"
                                min={-300}
                                max={600}
                                step={10}
                                value={selectedSlotSim.hpDelta}
                                onChange={(e) => {
                                  const nextHp = Number(e.target.value);
                                  updateSlotGear(selectedSlot.slot, (prevSlot) => ({
                                    ...prevSlot,
                                    hpDelta: nextHp,
                                  }));
                                }}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#D3C6B0] accent-[#2D6A4F]"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Reference Guidance & Independent Targets */}
                  <div className="rounded bg-[#FAF6EE] border border-[#D3C6B0] p-2.5 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-[#1E1914]">推薦說明與備選詞綴</div>
                    <p className="text-[#5C4E3C] leading-relaxed">{selectedSlot.rationale}</p>
                    {selectedSlot.runner_up_affixes.length > 0 && (
                      <div className="text-[#5C4E3C]">
                        <span className="font-semibold">次選特詞：</span>
                        {selectedSlot.runner_up_affixes.join(' / ')}
                      </div>
                    )}
                    {selectedSlot.fallback_stat_target && (
                      <div className="text-[10px] text-[#5C4E3C]">
                        <span className="font-semibold">第 3 備選順位：</span>
                        {selectedSlot.fallback_stat_target}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Factual VIT +12 vs Flat HP +180 Box for non-weapon active slots */}
              {vitComp && !selectedSlot.blocked_by_two_handed && selectedSlot.slot !== 'weapon' && (
                <div className="rounded bg-[#FAF6EE] border border-[#9A6B22]/40 p-2.5 text-[11px] space-y-1">
                  <div className="font-bold text-[#9A6B22]">
                    詞綴效益比對：VIT +{vitComp.vit_delta} vs 固定 HP +{vitComp.flat_hp_delta}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono">
                    <div className="bg-[#F5F0E6] border border-[#2D6A4F]/35 rounded p-1.5">
                      <div className="font-bold text-[#2D6A4F]">VIT +{vitComp.vit_delta}</div>
                      <div className="text-[#1E1914]">+{Math.round(vitComp.vit_hp_gain).toLocaleString()} HP</div>
                      <div className="text-[#2D6A4F]">+{Math.round(vitComp.vit_12_dps_gain).toLocaleString()} DPS</div>
                    </div>
                    <div className="bg-[#F5F0E6] border border-[#D3C6B0] rounded p-1.5">
                      <div className="font-bold text-[#5C4E3C]">HP +{vitComp.flat_hp_delta}</div>
                      <div className="text-[#5C4E3C]">+{Math.round(vitComp.flat_hp_gain).toLocaleString()} HP</div>
                      <div className="text-[#5C4E3C]">+{Math.round(vitComp.flat_hp_180_dps_gain).toLocaleString()} DPS</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Embedded Cards Detail */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#1E1914]">此部位插卡配置</div>
                  {onOpenCardPicker &&
                    !selectedSlot.blocked_by_two_handed &&
                    getCardKeysForSlot(selectedSlot).map((ckey, idx) => (
                      <button
                        key={ckey}
                        type="button"
                        onClick={() => onOpenCardPicker(ckey)}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#9A6B22]/50 bg-[#9A6B22]/10 text-[#9A6B22] font-bold hover:bg-[#9A6B22] hover:text-[#FAF6EE] transition cursor-pointer"
                      >
                        {getCardKeysForSlot(selectedSlot).length > 1
                          ? `搜卡替換卡槽 ${idx + 1}`
                          : '搜尋 / 替換卡片'}
                      </button>
                    ))}
                </div>
                {getFullCardsForSlot(selectedSlot).length === 0 ? (
                  <div className="rounded bg-[#FAF6EE] border border-[#D3C6B0] p-2.5 text-xs text-[#5C4E3C]">
                    此部位無插卡或尚未裝備卡片。
                  </div>
                ) : (
                  getFullCardsForSlot(selectedSlot).map((card, idx) => (
                    <div
                      key={`${card.card_id}-${idx}`}
                      className="rounded bg-[#FAF6EE] border border-[#D3C6B0] p-2.5 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border shrink-0 ${tierBadgeClass(card.tier)}`}>
                            {card.tier}
                          </span>
                          <span className="font-bold text-[#1E1914] truncate">{card.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[#2D6A4F] shrink-0">
                          +{card.marginal_dps_gain_pct.toFixed(2)}%
                        </span>
                      </div>

                      <div className="text-[11px] text-[#5C4E3C] font-mono">
                        來源：{card.source_monsters.length > 0 ? card.source_monsters.join(', ') : '卡包 / 活動'} ·{' '}
                        {card.removable ? '可拆卸' : '不可拆卸'} · +{Math.round(card.marginal_dps_gain).toLocaleString()} DPS
                      </div>

                      {(card.mechanics || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(card.mechanics || []).map((mk) => {
                            const meta = cardMechanics?.[mk];
                            return (
                              <span
                                key={mk}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#6B4C7B]/12 text-[#6B4C7B] border border-[#6B4C7B]/30"
                              >
                                {meta?.title || mk}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-[11px] text-[#3E3529] leading-snug">{card.description}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[#5C4E3C] py-8 text-center">請點擊左側或中間的裝備格查看與編輯明細。</div>
          )}
        </aside>
      </div>
    </section>
  );
};
