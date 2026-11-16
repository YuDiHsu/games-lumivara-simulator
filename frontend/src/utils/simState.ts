import {
  ArmorSetMeta,
  BuildCandidate,
  CardMeta,
  CardRecommendations,
  ElementType,
  EvaluateRequest,
  GearAffixRecommendations,
  GearAffixSlotRec,
  JobMeta,
  PassiveMeta,
  calcCumulativeStatCost,
  calcRefineAtkMatk,
  calcTotalStatPoints,
  calcWeaponRefinePierceBonus,
  getEquipmentAffixSystem,
} from '../api/client';

export const STAT_KEYS = ['vit', 'str', 'agi', 'dex', 'int', 'luk'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  vit: 'VIT 體質',
  str: 'STR 力量',
  agi: 'AGI 敏捷',
  dex: 'DEX 靈巧',
  int: 'INT 智力',
  luk: 'LUK 幸運',
};

export const ARMOR_SET_SLOTS = ['head', 'face', 'mouth', 'armor', 'garment', 'shoes'] as const;
export type ArmorSetSlotKey = (typeof ARMOR_SET_SLOTS)[number];

const DEFAULT_ROMAN_TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export function getMaxTierCount(): number {
  const sys = getEquipmentAffixSystem();
  return Math.max(1, Number(sys.tier_count ?? sys.tiers?.length ?? 6));
}

export function getGearTiers(): number[] {
  const count = getMaxTierCount();
  return Array.from({ length: count }, (_, i) => i + 1);
}

export function getTierRomanLabel(tier: number): string {
  const sys = getEquipmentAffixSystem();
  const idx = clampTier(tier) - 1;
  return sys.tiers?.[idx] ?? DEFAULT_ROMAN_TIERS[idx] ?? `T${idx + 1}`;
}

export type RingBaseType = 'physical_atk' | 'obsidian' | 'magic_matk' | 'emerald' | 'none';

export interface SlotGearSim {
  slot: string;
  tier: number;
  blocked: boolean;
  stat1: StatKey | '';
  val1: number;
  stat2: StatKey | '';
  val2: number;
  affixKey: string;
  ringBase: RingBaseType;
  ringBaseValue: number;
  nativeVal: number;
  offhandExtraVal: number;
  hitDelta: number;
  fleeDelta: number;
  hpDelta: number;
  maxPerStat: number;
}

export interface GearModsBaseline {
  weapon_refine: number;
  shield_refine: number;
  armor_refine_total: number;
  weapon_coating: ElementType | null;
  phys_pierce: number;
  magic_pierce: number;
  flat_atk: number;
  flat_matk: number;
  atk_pct: number;
  matk_pct: number;
  crit: number;
  mcrit: number;
  crit_dmg: number;
  hit: number;
  flee: number;
  aspd_flat: number;
  aspd_pct: number;
  gear_def: number;
  gear_mdef: number;
  flat_hp: number;
  hp_pct: number;
  flat_sp: number;
  sp_pct: number;
}

export interface SimState {
  base_stats: Record<StatKey, number>;
  slot_gear: Record<string, SlotGearSim>;
  baseline_slot_gear: Record<string, SlotGearSim>;
  gear_stats_offset: Record<StatKey, number>;
  baseline_gear_mods: GearModsBaseline;
  weapon_refine: number;
  weapon_coating: ElementType | null;
  passives: string[];
  disabled_skills: string[];
  armor_sets: string[];
  slot_armor_sets: Record<string, string>;
  baseline_slot_armor_sets: Record<string, string>;
  cards_by_slot: Record<string, string | null>;
}

export interface AffixEffectDef {
  key: string;
  label: string;
  shortLabel: string;
  mods: Partial<Record<keyof GearModsBaseline, number>>;
}

function getStatMaxMultFromWiki(): number {
  const buckets = getEquipmentAffixSystem().stat_roll_distribution?.buckets;
  if (!buckets || buckets.length === 0) return 3;
  const maxVal = Math.max(...buckets.map((b) => Number(b.exact_mult ?? b.high_mult_excl ?? 0)));
  return maxVal > 0 ? maxVal : 3;
}

function getIndepMaxMultFromWiki(): number {
  const weights = getEquipmentAffixSystem().flee_and_hit_roll_weights?.bucket_weights;
  if (!weights || weights.length < 2) return 4;
  return weights.length - 1;
}

function getTwoHandedStatsMultFromWiki(): number {
  return Math.max(1, Number(getEquipmentAffixSystem().two_handed_rules?.stats_multiplier ?? 2));
}

export interface SlotNativeBaseSpec {
  label: string;
  modKey: keyof GearModsBaseline;
  min: number;
  max: number;
  defaultVal: number;
  extraLabel?: string;
  extraModKey?: keyof GearModsBaseline;
  extraMin?: number;
  extraMax?: number;
  extraDefault?: number;
  fixedNote?: string;
}

export function getSlotNativeBaseSpec(
  slotKey: string,
  tier: number,
  isTwoHanded: boolean,
  primaryDmgType?: string,
  offhandType?: string
): SlotNativeBaseSpec | null {
  const t = clampTier(tier);
  if (isAccessorySlot(slotKey)) return null;
  const sys = getEquipmentAffixSystem();
  const statMaxMult = getStatMaxMultFromWiki();
  const m2h = isTwoHanded ? getTwoHandedStatsMultFromWiki() : 1;

  if (slotKey === 'weapon') {
    const isMagic = primaryDmgType === 'magic';
    return {
      label: isMagic ? '武器白字 MATK' : '武器白字 ATK',
      modKey: isMagic ? 'flat_matk' : 'flat_atk',
      min: 2 * t * m2h,
      max: 2 * statMaxMult * t * m2h,
      defaultVal: 4 * t * m2h,
    };
  }

  if (slotKey === 'head' || slotKey === 'armor' || slotKey === 'garment' || slotKey === 'shoes') {
    return {
      label: '防具白字 DEF',
      modKey: 'gear_def',
      min: t,
      max: statMaxMult * t,
      defaultVal: 2 * t,
    };
  }

  if (slotKey === 'face' || slotKey === 'mouth') {
    return {
      label: '白字 MDEF',
      modKey: 'gear_mdef',
      min: t,
      max: statMaxMult * t,
      defaultVal: 2 * t,
    };
  }

  if (slotKey === 'shield') {
    if (isTwoHanded) return null;
    const off = (offhandType || 'shield').toLowerCase();
    if (off === 'shield' || off === 'none') {
      return {
        label: '盾牌白字 DEF',
        modKey: 'gear_def',
        min: t,
        max: statMaxMult * t,
        defaultVal: 2 * t,
      };
    }
    if (off === 'orb' || off === 'lantern') {
      return {
        label: '副手白字 MATK',
        modKey: 'flat_matk',
        min: t,
        max: statMaxMult * t,
        defaultVal: 2 * t,
        extraLabel: '副手白字 MaxSP',
        extraModKey: 'flat_sp',
        extraMin: 5 * t,
        extraMax: 20 * t,
        extraDefault: 12 * t,
        fixedNote: `固定附帶 MDEF +${t}`,
      };
    }
    if (off === 'saya') {
      const sayaCrit = Number(sys.saya_crit_per_tier?.[t - 1] ?? 2 * t);
      return {
        label: '刀鞘白字 ATK',
        modKey: 'flat_atk',
        min: t,
        max: statMaxMult * t,
        defaultVal: 2 * t,
        fixedNote: `固有 CRIT +${sayaCrit}%`,
      };
    }
    if (off === 'shuriken') {
      const shurikenAspd = Number(sys.shuriken_aspd_per_tier?.[t - 1] ?? Math.ceil(t / 2));
      return {
        label: '手裡劍白字 ATK',
        modKey: 'flat_atk',
        min: t,
        max: statMaxMult * t,
        defaultVal: 2 * t,
        fixedNote: `固有 ASPD +${shurikenAspd}`,
      };
    }
    return {
      label: '副手白字 ATK',
      modKey: 'flat_atk',
      min: t,
      max: statMaxMult * t,
      defaultVal: 2 * t,
    };
  }

  return null;
}

export function clampTier(tier: number): number {
  const maxTier = getMaxTierCount();
  return Math.max(1, Math.min(maxTier, Math.round(Number(tier) || maxTier)));
}

export function getTierStatMax(tier: number, slotKey: string, isTwoHanded: boolean): number {
  const t = clampTier(tier);
  const m2h = slotKey === 'weapon' && isTwoHanded ? getTwoHandedStatsMultFromWiki() : 1;
  return getStatMaxMultFromWiki() * t * m2h;
}

export function getTierIndepMax(tier: number, slotKey: string, isTwoHanded: boolean): number {
  const t = clampTier(tier);
  const m2h = slotKey === 'weapon' && isTwoHanded ? getTwoHandedStatsMultFromWiki() : 1;
  return getIndepMaxMultFromWiki() * t * m2h;
}

export function getRingBaseRange(
  ringBase: RingBaseType,
  tier: number
): { min: number; max: number; defaultVal: number; unit: 'flat' | 'pct'; statLabel: string } {
  const sys = getEquipmentAffixSystem();
  const maxTier = getMaxTierCount();
  const t = clampTier(tier);
  if (ringBase === 'physical_atk' || ringBase === 'magic_matk') {
    const mults = sys.accessory_atk_matk_mults;
    const mult = Number(mults?.[t - 1] ?? [4, 7, 12, 20, 30, 42][t - 1] ?? 42);
    const statMaxMult = getStatMaxMultFromWiki();
    const min = mult;
    const max = mult * statMaxMult;
    const defaultVal = t === maxTier && mult === 42 ? 80 : mult * 2;
    return {
      min,
      max,
      defaultVal,
      unit: 'flat',
      statLabel: ringBase === 'physical_atk' ? 'ATK' : 'MATK',
    };
  }
  if (ringBase === 'obsidian' || ringBase === 'emerald') {
    const ringCritMult = Math.max(1, Number(sys.ring_crit_mult ?? 2));
    const min = t;
    const max = t * ringCritMult;
    const defaultVal = t === maxTier && ringCritMult === 2 ? Math.min(max, 9) : Math.round((min + max) / 2);
    return {
      min,
      max,
      defaultVal,
      unit: 'pct',
      statLabel: ringBase === 'obsidian' ? 'CRIT' : 'M.CRIT',
    };
  }
  return { min: 0, max: 0, defaultVal: 0, unit: 'flat', statLabel: '' };
}

export function getRingBaseMods(
  ringBase: RingBaseType,
  ringBaseValue: number
): Partial<Record<keyof GearModsBaseline, number>> {
  const v = Math.max(0, Number(ringBaseValue) || 0);
  switch (ringBase) {
    case 'physical_atk':
      return { flat_atk: v };
    case 'magic_matk':
      return { flat_matk: v };
    case 'obsidian':
      return { crit: v / 100 };
    case 'emerald':
      return { mcrit: v / 100 };
    default:
      return {};
  }
}

export function getRingBaseShortLabel(ringBase: RingBaseType, ringBaseValue: number): string {
  switch (ringBase) {
    case 'physical_atk':
      return `Platinum (+${Math.round(ringBaseValue)} ATK)`;
    case 'obsidian':
      return `Obsidian (+${Math.round(ringBaseValue)}% CRIT)`;
    case 'magic_matk':
      return `Diamond (+${Math.round(ringBaseValue)} MATK)`;
    case 'emerald':
      return `Emerald (+${Math.round(ringBaseValue)}% M.CRIT)`;
    default:
      return '無戒指白字';
  }
}

interface AffixEffectMeta {
  zhName: string;
  unit: string;
  modKey?: keyof GearModsBaseline;
  divisor?: number;
  scale2h?: boolean;
}

const AFFIX_EFFECT_META: Record<string, AffixEffectMeta> = {
  pierce: { zhName: '物穿', unit: '%', modKey: 'phys_pierce', divisor: 100, scale2h: true },
  mpierce: { zhName: '魔穿', unit: '%', modKey: 'magic_pierce', divisor: 100, scale2h: true },
  atkPct: { zhName: 'ATK', unit: '%', modKey: 'atk_pct', divisor: 100, scale2h: true },
  matkPct: { zhName: 'MATK', unit: '%', modKey: 'matk_pct', divisor: 100, scale2h: true },
  critDmg: { zhName: '爆傷', unit: '%', modKey: 'crit_dmg', divisor: 100, scale2h: true },
  hp: { zhName: 'MaxHP', unit: '', modKey: 'flat_hp', divisor: 1, scale2h: false },
  moveSpeed: { zhName: '跑速', unit: '%', scale2h: false },
  spRegen: { zhName: 'SP回復', unit: '%', scale2h: false },
  hpRegen: { zhName: 'HP回復', unit: '%', scale2h: false },
  resBleed: { zhName: '抗流血', unit: '%', scale2h: false },
  resStun: { zhName: '抗暈眩', unit: '%', scale2h: false },
  resFreeze: { zhName: '抗冰凍', unit: '%', scale2h: false },
  bleedHit: { zhName: '附加流血', unit: '%', scale2h: true },
  crushHit: { zhName: '附加破甲', unit: '%', scale2h: true },
  freezeHit: { zhName: '附加冰凍', unit: '%', scale2h: true },
  stunHit: { zhName: '附加暈眩', unit: '%', scale2h: true },
};

function buildAffixDefForTier(key: string, tier: number, isTwoHandedWeapon: boolean): AffixEffectDef {
  if (!key) {
    return { key: '', label: '無特別詞綴', shortLabel: '無特詞', mods: {} };
  }
  const sys = getEquipmentAffixSystem();
  const t = clampTier(tier);
  const meta = AFFIX_EFFECT_META[key];
  const m2h = isTwoHandedWeapon && meta?.scale2h ? getTwoHandedStatsMultFromWiki() : 1;
  const baseVal = Number(sys.special_affix_values?.[key]?.[t - 1] ?? 0);
  const raw = baseVal * m2h;
  const prefix = sys.affix_name_prefixes?.[key] ?? key;
  const suffix2h = m2h > 1 ? ` · 雙手 ${m2h}×` : '';

  if (meta) {
    const valStr = `+${raw}${meta.unit}`;
    const mods: Partial<Record<keyof GearModsBaseline, number>> = {};
    if (meta.modKey) {
      mods[meta.modKey] = raw / (meta.divisor ?? 1);
    }
    return {
      key,
      label: `${prefix} (${valStr} ${meta.zhName}${suffix2h})`,
      shortLabel: `${valStr} ${meta.zhName}`,
      mods,
    };
  }

  return {
    key,
    label: `${prefix} (+${raw}${suffix2h})`,
    shortLabel: `${prefix} +${raw}`,
    mods: {},
  };
}

function resolveSlotPoolKeys(
  slotKey: string,
  offhandType?: string,
  primaryDmgType?: string
): string[] {
  if (slotKey === 'weapon') {
    if (primaryDmgType === 'magic') return ['sword_caster'];
    if (primaryDmgType === 'physical') return ['sword_melee'];
    return ['sword_melee', 'sword_caster'];
  }
  if (isAccessorySlot(slotKey)) {
    if (primaryDmgType === 'magic') return ['accessory2'];
    if (primaryDmgType === 'physical') return ['accessory1'];
    return ['accessory1', 'accessory2'];
  }
  if (slotKey === 'shield') {
    const off = (offhandType || 'shield').toLowerCase();
    if (off === 'orb' || off === 'lantern') return ['shield_orb'];
    if (off === 'saya') return ['shield_saya'];
    if (off === 'shuriken') return ['shield_shuriken'];
    if (off === 'ammo') return ['ammo'];
    return ['shield_actual'];
  }
  return [slotKey];
}

export function getSpecialAffixOptionsForSlot(
  slotKey: string,
  isTwoHanded: boolean,
  offhandType?: string,
  tier = getMaxTierCount(),
  primaryDmgType?: string
): AffixEffectDef[] {
  const emptyOpt = buildAffixDefForTier('', tier, false);
  const pools = getEquipmentAffixSystem().special_affix_pools || {};
  const poolKeys = resolveSlotPoolKeys(slotKey, offhandType, primaryDmgType);
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const pk of poolKeys) {
    for (const k of pools[pk] || []) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  const apply2h = slotKey === 'weapon' && isTwoHanded;
  return [emptyOpt, ...keys.map((k) => buildAffixDefForTier(k, tier, apply2h))];
}

export function getSpecialAffixDef(
  slotKey: string,
  affixKey: string,
  isTwoHanded: boolean,
  offhandType?: string,
  tier = getMaxTierCount(),
  primaryDmgType?: string
): AffixEffectDef | undefined {
  const opts = getSpecialAffixOptionsForSlot(slotKey, isTwoHanded, offhandType, tier, primaryDmgType);
  return opts.find((o) => o.key === affixKey);
}

export function getRingBaseOptionsForTier(tier: number): Array<{
  key: RingBaseType;
  label: string;
}> {
  const t = clampTier(tier);
  const p = getRingBaseRange('physical_atk', t);
  const o = getRingBaseRange('obsidian', t);
  const m = getRingBaseRange('magic_matk', t);
  const e = getRingBaseRange('emerald', t);
  return [
    { key: 'physical_atk', label: `Platinum Ring (ATK +${p.min} ~ +${p.max})` },
    { key: 'obsidian', label: `Obsidian Ring (CRIT +${o.min}% ~ +${o.max}%)` },
    { key: 'magic_matk', label: `Diamond Ring (MATK +${m.min} ~ +${m.max})` },
    { key: 'emerald', label: `Emerald Ring (M.CRIT +${e.min}% ~ +${e.max}%)` },
    { key: 'none', label: '無戒指白字 (純詞綴)' },
  ];
}

export const COATING_OPTIONS: Array<{ value: ElementType | null; label: string }> = [
  { value: null, label: '無附魔' },
  { value: 'light', label: '聖屬性附魔 (Light)' },
  { value: 'dark', label: '暗屬性附魔 (Dark)' },
  { value: 'fire', label: '火屬性附魔 (Fire)' },
  { value: 'water', label: '水屬性附魔 (Water)' },
  { value: 'wind', label: '風屬性附魔 (Wind)' },
  { value: 'earth', label: '地屬性附魔 (Earth)' },
];

const DEFAULT_PAPERDOLL_SLOTS = [
  'head',
  'face',
  'mouth',
  'armor',
  'garment',
  'weapon',
  'shield',
  'shoes',
  'accessory1',
  'accessory2',
] as const;

export function slotAllowsSpecialAffix(slotKey: string, blocked: boolean): boolean {
  if (blocked) return false;
  const pools = getEquipmentAffixSystem().special_affix_pools || {};
  return resolveSlotPoolKeys(slotKey).some((pk) => (pools[pk]?.length ?? 0) > 0);
}

export function isAccessorySlot(slotKey: string): boolean {
  return slotKey === 'accessory1' || slotKey === 'accessory2';
}

export function isArmorSlot(slotKey: string): boolean {
  return (
    slotKey === 'head' ||
    slotKey === 'face' ||
    slotKey === 'mouth' ||
    slotKey === 'armor' ||
    slotKey === 'garment' ||
    slotKey === 'shoes'
  );
}

export function resolveArmorSetId(raw: string | null | undefined, allArmorSets: ArmorSetMeta[]): string {
  if (!raw) return '';
  const cleaned = raw.replace(/\s*\(\d+pc\)\s*$/i, '').trim();
  if (!cleaned) return '';
  const low = cleaned.toLowerCase();
  const match = allArmorSets.find(
    (s) => s.id === cleaned || s.id.toLowerCase() === low || s.name.toLowerCase() === low || s.zh_name === cleaned
  );
  return match?.id ?? cleaned;
}

export function summarizeEquippedArmorSets(
  slotArmorSets: Record<string, string>,
  allArmorSets: ArmorSetMeta[]
): {
  activeCombo: string[];
  entries: Array<{
    id: string;
    name: string;
    zh_name: string;
    count: number;
    reqPieces: number;
    stacks: number;
  }>;
} {
  const byId = new Map(allArmorSets.map((s) => [s.id, s]));
  const countMap = new Map<string, number>();
  for (const sk of ARMOR_SET_SLOTS) {
    const sid = resolveArmorSetId(slotArmorSets[sk], allArmorSets);
    if (!sid) continue;
    countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
  }
  const activeCombo: string[] = [];
  const entries: Array<{
    id: string;
    name: string;
    zh_name: string;
    count: number;
    reqPieces: number;
    stacks: number;
  }> = [];

  for (const [sid, count] of countMap.entries()) {
    const meta = byId.get(sid);
    const reqPieces = Math.max(1, meta?.pieces_required ?? 2);
    const stacks = Math.floor(count / reqPieces);
    for (let i = 0; i < stacks; i++) {
      activeCombo.push(sid);
    }
    entries.push({
      id: sid,
      name: meta?.name ?? sid,
      zh_name: meta?.zh_name ?? meta?.name ?? sid,
      count,
      reqPieces,
      stacks,
    });
  }
  return { activeCombo, entries };
}

function inferRingBase(slotRec?: GearAffixSlotRec): RingBaseType {
  if (!slotRec || !isAccessorySlot(slotRec.slot)) return 'none';
  const name = slotRec.recommended_item_name || slotRec.template_name || '';
  if (name.includes('Obsidian')) return 'obsidian';
  if (name.includes('Emerald')) return 'emerald';
  if (name.includes('Magic') || name.includes('Diamond')) return 'magic_matk';
  if (name.includes('Physical') || name.includes('Platinum')) return 'physical_atk';
  return 'physical_atk';
}

function parseSlotStatsFromRec(
  slotRec: GearAffixSlotRec | undefined,
  isTwoHanded: boolean,
  slotKey: string,
  tier = 6
): { stat1: StatKey | ''; val1: number; stat2: StatKey | ''; val2: number; maxPerStat: number } {
  const maxPerStat = getTierStatMax(tier, slotKey, isTwoHanded);
  const alloc = slotRec?.allocated_stats;
  if (!alloc || Object.keys(alloc).length === 0) {
    return { stat1: '', val1: 0, stat2: '', val2: 0, maxPerStat };
  }
  const entries = Object.entries(alloc)
    .filter(([k, v]) => STAT_KEYS.includes(k as StatKey) && Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const stat1 = (entries[0]?.[0] as StatKey | undefined) ?? '';
  const val1 = Math.min(maxPerStat, Math.max(0, Math.round(Number(entries[0]?.[1] ?? 0))));
  const stat2 = (entries[1]?.[0] as StatKey | undefined) ?? '';
  const val2 = Math.min(maxPerStat, Math.max(0, Math.round(Number(entries[1]?.[1] ?? 0))));
  return { stat1, val1, stat2, val2, maxPerStat };
}

function cloneSlotGearMap(src: Record<string, SlotGearSim>): Record<string, SlotGearSim> {
  const out: Record<string, SlotGearSim> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = { ...v };
  }
  return out;
}

export function sumSlotGearStats(
  slotGear: Record<string, SlotGearSim>,
  offset?: Record<StatKey, number>
): Record<StatKey, number> {
  const totals: Record<StatKey, number> = { vit: 0, str: 0, agi: 0, dex: 0, int: 0, luk: 0 };
  for (const entry of Object.values(slotGear)) {
    if (entry.blocked) continue;
    if (entry.stat1 && entry.val1 > 0) {
      totals[entry.stat1] += entry.val1;
    }
    if (entry.stat2 && entry.stat2 !== entry.stat1 && entry.val2 > 0) {
      totals[entry.stat2] += entry.val2;
    }
  }
  if (offset) {
    for (const k of STAT_KEYS) {
      totals[k] = Math.max(0, totals[k] + (offset[k] ?? 0));
    }
  }
  return totals;
}

export function isSlotModified(cur: SlotGearSim | undefined, base: SlotGearSim | undefined): boolean {
  if (!cur || !base) return false;
  return (
    cur.tier !== base.tier ||
    cur.stat1 !== base.stat1 ||
    cur.val1 !== base.val1 ||
    cur.stat2 !== base.stat2 ||
    cur.val2 !== base.val2 ||
    cur.affixKey !== base.affixKey ||
    cur.ringBase !== base.ringBase ||
    cur.ringBaseValue !== base.ringBaseValue ||
    cur.nativeVal !== base.nativeVal ||
    cur.offhandExtraVal !== base.offhandExtraVal ||
    cur.hitDelta !== base.hitDelta ||
    cur.fleeDelta !== base.fleeDelta ||
    cur.hpDelta !== base.hpDelta
  );
}

export function buildInitialSimState(
  benchmarkBuild: BuildCandidate,
  fallbackCardRecs: CardRecommendations,
  affixRecs: GearAffixRecommendations | undefined,
  weaponRefine: number,
  weaponCoating: ElementType | null,
  isTwoHanded: boolean,
  allArmorSets: ArmorSetMeta[] = [],
  primaryDmgType?: string,
  offhandType?: string
): SimState {
  const base_stats = {} as Record<StatKey, number>;
  const targetGearStats = {} as Record<StatKey, number>;
  const bGear = benchmarkBuild.gear_stats || {};
  for (const k of STAT_KEYS) {
    base_stats[k] = Number(benchmarkBuild.stats[k]?.base ?? 1);
    targetGearStats[k] = Number(bGear[k] ?? benchmarkBuild.stats[k]?.gear_bonus ?? 0);
  }

  const slotRecMap = new Map<string, GearAffixSlotRec>(
    (affixRecs?.slots || []).map((s) => [s.slot, s])
  );

  const slot_gear: Record<string, SlotGearSim> = {};
  for (const sk of DEFAULT_PAPERDOLL_SLOTS) {
    const rec = slotRecMap.get(sk);
    const blocked = Boolean(rec?.blocked_by_two_handed ?? (sk === 'shield' && isTwoHanded));
    const tier = getMaxTierCount();
    const parsed = parseSlotStatsFromRec(rec, isTwoHanded, sk, tier);
    const ringBase = inferRingBase(rec);
    const ringBaseValue = isAccessorySlot(sk) ? getRingBaseRange(ringBase, tier).defaultVal : 0;
    const nativeSpec = blocked
      ? null
      : getSlotNativeBaseSpec(sk, tier, isTwoHanded, primaryDmgType, offhandType);
    slot_gear[sk] = {
      slot: sk,
      tier,
      blocked,
      stat1: blocked ? '' : parsed.stat1,
      val1: blocked ? 0 : parsed.val1,
      stat2: blocked ? '' : parsed.stat2,
      val2: blocked ? 0 : parsed.val2,
      affixKey: !blocked && slotAllowsSpecialAffix(sk, blocked) ? rec?.affix_key || '' : '',
      ringBase,
      ringBaseValue,
      nativeVal: nativeSpec?.defaultVal ?? 0,
      offhandExtraVal: nativeSpec?.extraDefault ?? 0,
      hitDelta: 0,
      fleeDelta: 0,
      hpDelta: 0,
      maxPerStat: parsed.maxPerStat,
    };
  }

  // Per-slot armor sets: resolve from affixRecs.slots set_assignment, else backfill from combo
  const setById = new Map(allArmorSets.map((s) => [s.id, s]));
  const slot_armor_sets: Record<string, string> = {};
  let hasSlotSetAssignment = false;
  for (const sk of ARMOR_SET_SLOTS) {
    const rawAssign = slotRecMap.get(sk)?.set_assignment;
    const resolved = resolveArmorSetId(rawAssign, allArmorSets);
    if (resolved) hasSlotSetAssignment = true;
    slot_armor_sets[sk] = resolved;
  }
  const normalizedCombo = (benchmarkBuild.armor_sets?.combo || []).map((raw) =>
    resolveArmorSetId(raw, allArmorSets)
  );
  if (!hasSlotSetAssignment && normalizedCombo.length > 0) {
    let cursor = 0;
    for (const sid of normalizedCombo) {
      const req = setById.get(sid)?.pieces_required ?? 2;
      for (let i = 0; i < req && cursor < ARMOR_SET_SLOTS.length; i++) {
        slot_armor_sets[ARMOR_SET_SLOTS[cursor++]] = sid;
      }
    }
  }

  // Reconcile any offline-fallback difference between per-slot allocated_stats and aggregate gear_stats
  const summed = sumSlotGearStats(slot_gear);
  const gear_stats_offset = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    gear_stats_offset[k] = targetGearStats[k] - summed[k];
  }

  const gm = (benchmarkBuild.gear_mods || {}) as Record<string, unknown>;
  const resolvedRefine = Number(gm.weapon_refine ?? weaponRefine);
  const resolvedCoating =
    gm.weapon_coating !== undefined
      ? ((gm.weapon_coating as ElementType | null) ?? null)
      : (weaponCoating ?? null);

  const baseline_gear_mods: GearModsBaseline = {
    weapon_refine: resolvedRefine,
    shield_refine: Number(gm.shield_refine ?? resolvedRefine),
    armor_refine_total: Number(gm.armor_refine_total ?? resolvedRefine * 5),
    weapon_coating: resolvedCoating,
    phys_pierce: Number(gm.phys_pierce ?? 0),
    magic_pierce: Number(gm.magic_pierce ?? 0),
    flat_atk: Number(gm.flat_atk ?? 240),
    flat_matk: Number(gm.flat_matk ?? 240),
    atk_pct: Number(gm.atk_pct ?? 0),
    matk_pct: Number(gm.matk_pct ?? 0),
    crit: Number(gm.crit ?? 0),
    mcrit: Number(gm.mcrit ?? 0),
    crit_dmg: Number(gm.crit_dmg ?? 0),
    hit: Number(gm.hit ?? 0),
    flee: Number(gm.flee ?? 0),
    aspd_flat: Number(gm.aspd_flat ?? 0),
    aspd_pct: Number(gm.aspd_pct ?? 0),
    gear_def: Number(gm.gear_def ?? 40),
    gear_mdef: Number(gm.gear_mdef ?? 30),
    flat_hp: Number(gm.flat_hp ?? 0),
    hp_pct: Number(gm.hp_pct ?? 0),
    flat_sp: Number(gm.flat_sp ?? 0),
    sp_pct: Number(gm.sp_pct ?? 0),
  };

  const cardRecs = benchmarkBuild.card_recommendations ?? fallbackCardRecs;
  const activeCardSlotKeys = isTwoHanded
    ? ['weapon_1', 'weapon_2', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2']
    : ['weapon_1', 'shield', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2'];

  const cards_by_slot: Record<string, string | null> = {};
  for (const sk of activeCardSlotKeys) {
    cards_by_slot[sk] = cardRecs?.cards_by_slot?.[sk]?.card_id ?? null;
  }

  return {
    base_stats,
    slot_gear,
    baseline_slot_gear: cloneSlotGearMap(slot_gear),
    gear_stats_offset,
    baseline_gear_mods,
    weapon_refine: resolvedRefine,
    weapon_coating: resolvedCoating,
    passives: benchmarkBuild.passives.map((p) => p.id),
    disabled_skills: [],
    armor_sets: allArmorSets.length > 0 ? summarizeEquippedArmorSets(slot_armor_sets, allArmorSets).activeCombo : normalizedCombo,
    slot_armor_sets: { ...slot_armor_sets },
    baseline_slot_armor_sets: { ...slot_armor_sets },
    cards_by_slot,
  };
}

export function deriveEvaluateArgs(
  simState: SimState,
  job: JobMeta,
  allArmorSets: ArmorSetMeta[] = []
): Omit<EvaluateRequest, 'job_id' | 'level' | 'target'> {
  const gear_stats = sumSlotGearStats(simState.slot_gear, simState.gear_stats_offset);
  const gm: GearModsBaseline = {
    ...simState.baseline_gear_mods,
    weapon_refine: simState.weapon_refine,
    weapon_coating: simState.weapon_coating,
  };

  // Apply weapon refine ATK/MATK & pierce delta relative to baseline_gear_mods.weapon_refine
  const baseRef = simState.baseline_gear_mods.weapon_refine;
  if (simState.weapon_refine !== baseRef) {
    const atkDelta =
      calcRefineAtkMatk(simState.weapon_refine, job.is_two_handed, false) -
      calcRefineAtkMatk(baseRef, job.is_two_handed, false);
    const pierceDelta =
      calcWeaponRefinePierceBonus(simState.weapon_refine, job.is_two_handed) -
      calcWeaponRefinePierceBonus(baseRef, job.is_two_handed);
    gm.flat_atk = Math.max(0, gm.flat_atk + atkDelta);
    gm.flat_matk = Math.max(0, gm.flat_matk + atkDelta);
    gm.phys_pierce = Math.max(0, gm.phys_pierce + pierceDelta);
    gm.magic_pierce = Math.max(0, gm.magic_pierce + pierceDelta);
  }

  // Apply per-slot deltas from Tier-scaled Special Affix, Ring Base (type + roll value), and HIT/FLEE/MaxHP
  const numericModKeys = [
    'phys_pierce',
    'magic_pierce',
    'flat_atk',
    'flat_matk',
    'atk_pct',
    'matk_pct',
    'crit',
    'mcrit',
    'crit_dmg',
    'aspd_pct',
    'flat_hp',
  ] as const;

  for (const slotKey of Object.keys(simState.slot_gear)) {
    const cur = simState.slot_gear[slotKey];
    const base = simState.baseline_slot_gear[slotKey];
    if (!cur || !base || cur.blocked) continue;

    if (cur.hitDelta !== base.hitDelta) {
      gm.hit = Math.max(0, gm.hit + (cur.hitDelta - base.hitDelta));
    }
    if (cur.fleeDelta !== base.fleeDelta) {
      gm.flee = Math.max(0, gm.flee + (cur.fleeDelta - base.fleeDelta));
    }
    if (cur.hpDelta !== base.hpDelta) {
      gm.flat_hp = Math.max(0, gm.flat_hp + (cur.hpDelta - base.hpDelta));
    }

    if (cur.affixKey !== base.affixKey || cur.tier !== base.tier) {
      const curMods =
        getSpecialAffixDef(
          slotKey,
          cur.affixKey,
          job.is_two_handed,
          job.offhand_type,
          cur.tier,
          job.primary_dmg_type
        )?.mods ?? {};
      const baseMods =
        getSpecialAffixDef(
          slotKey,
          base.affixKey,
          job.is_two_handed,
          job.offhand_type,
          base.tier,
          job.primary_dmg_type
        )?.mods ?? {};
      for (const mk of numericModKeys) {
        const diff = Number(curMods[mk] ?? 0) - Number(baseMods[mk] ?? 0);
        if (diff !== 0) {
          gm[mk] = Math.max(0, gm[mk] + diff);
        }
      }
    }

    if (isAccessorySlot(slotKey) && (cur.ringBase !== base.ringBase || cur.ringBaseValue !== base.ringBaseValue)) {
      const curRing = getRingBaseMods(cur.ringBase, cur.ringBaseValue);
      const baseRing = getRingBaseMods(base.ringBase, base.ringBaseValue);
      for (const mk of numericModKeys) {
        const diff = Number(curRing[mk] ?? 0) - Number(baseRing[mk] ?? 0);
        if (diff !== 0) {
          gm[mk] = Math.max(0, gm[mk] + diff);
        }
      }
    }

    if (!isAccessorySlot(slotKey)) {
      const nativeSpec = getSlotNativeBaseSpec(
        slotKey,
        cur.tier,
        job.is_two_handed,
        job.primary_dmg_type,
        job.offhand_type
      );
      if (nativeSpec) {
        if (cur.nativeVal !== base.nativeVal) {
          const k = nativeSpec.modKey;
          gm[k] = Math.max(0, Number(gm[k] ?? 0) + (cur.nativeVal - base.nativeVal)) as never;
        }
        if (nativeSpec.extraModKey && cur.offhandExtraVal !== base.offhandExtraVal) {
          const ek = nativeSpec.extraModKey;
          gm[ek] = Math.max(0, Number(gm[ek] ?? 0) + (cur.offhandExtraVal - base.offhandExtraVal)) as never;
        }
      }
      if (slotKey === 'shield' && cur.tier !== base.tier) {
        const sys = getEquipmentAffixSystem();
        const off = (job.offhand_type || 'shield').toLowerCase();
        const curIdx = clampTier(cur.tier) - 1;
        const baseIdx = clampTier(base.tier) - 1;
        if (off === 'saya') {
          const curSaya = Number(sys.saya_crit_per_tier?.[curIdx] ?? 2 * (curIdx + 1));
          const baseSaya = Number(sys.saya_crit_per_tier?.[baseIdx] ?? 2 * (baseIdx + 1));
          gm.crit = Math.max(0, gm.crit + (curSaya - baseSaya) / 100);
        } else if (off === 'shuriken') {
          const curShuriken = Number(sys.shuriken_aspd_per_tier?.[curIdx] ?? Math.ceil((curIdx + 1) / 2));
          const baseShuriken = Number(sys.shuriken_aspd_per_tier?.[baseIdx] ?? Math.ceil((baseIdx + 1) / 2));
          gm.aspd_flat = Math.max(0, gm.aspd_flat + (curShuriken - baseShuriken));
        } else if (off === 'orb' || off === 'lantern') {
          gm.gear_mdef = Math.max(0, gm.gear_mdef + (clampTier(cur.tier) - clampTier(base.tier)));
        }
      }
    }
  }

  const resolvedArmorSets =
    allArmorSets.length > 0
      ? summarizeEquippedArmorSets(simState.slot_armor_sets, allArmorSets).activeCombo
      : [...simState.armor_sets];

  return {
    base_stats: { ...simState.base_stats },
    gear_stats,
    gear_mods: gm as unknown as Record<string, unknown>,
    passives: [...simState.passives],
    armor_sets: resolvedArmorSets,
    cards_by_slot: { ...simState.cards_by_slot },
    disabled_skills: [...(simState.disabled_skills || [])],
  };
}

export const BUILD_EXPORT_SCHEMA = 'lumivara-build-v1';

export interface SlotGearExportEntry {
  tier: number;
  blocked?: boolean;
  stat1: StatKey | '';
  val1: number;
  stat2: StatKey | '';
  val2: number;
  affixKey: string;
  ringBase: RingBaseType;
  ringBaseValue: number;
  nativeVal: number;
  offhandExtraVal: number;
  hitDelta: number;
  fleeDelta: number;
  hpDelta: number;
}

export interface LumivaraBuildExportV1 {
  schema: string;
  exported_at: string;
  job_id: string;
  job_name?: string;
  level: number;
  base_stats: Record<StatKey, number>;
  weapon_refine: number;
  weapon_coating: ElementType | null;
  passives: string[];
  disabled_skills?: string[];
  slot_armor_sets: Record<string, string>;
  cards_by_slot: Record<string, string | null>;
  slot_gear: Record<string, SlotGearExportEntry>;
}

const VALID_ELEMENTS = new Set<ElementType>([
  'neutral',
  'light',
  'dark',
  'fire',
  'water',
  'wind',
  'earth',
]);

const VALID_RING_BASES = new Set<RingBaseType>([
  'physical_atk',
  'obsidian',
  'magic_matk',
  'emerald',
  'none',
]);

export function exportSimBuildToJsonObj(
  simState: SimState,
  job: JobMeta,
  level: number
): LumivaraBuildExportV1 {
  const slot_gear: Record<string, SlotGearExportEntry> = {};
  for (const sk of DEFAULT_PAPERDOLL_SLOTS) {
    const s = simState.slot_gear[sk];
    if (!s) continue;
    slot_gear[sk] = {
      tier: clampTier(s.tier),
      blocked: s.blocked,
      stat1: s.stat1,
      val1: Math.round(s.val1),
      stat2: s.stat2,
      val2: Math.round(s.val2),
      affixKey: s.affixKey,
      ringBase: s.ringBase,
      ringBaseValue: Math.round(s.ringBaseValue),
      nativeVal: Math.round(s.nativeVal),
      offhandExtraVal: Math.round(s.offhandExtraVal),
      hitDelta: Math.round(s.hitDelta),
      fleeDelta: Math.round(s.fleeDelta),
      hpDelta: Math.round(s.hpDelta),
    };
  }
  const slot_armor_sets: Record<string, string> = {};
  for (const sk of ARMOR_SET_SLOTS) {
    slot_armor_sets[sk] = simState.slot_armor_sets[sk] ?? '';
  }
  return {
    schema: BUILD_EXPORT_SCHEMA,
    exported_at: new Date().toISOString(),
    job_id: job.id,
    job_name: job.zh_name,
    level: Math.max(1, Math.min(150, Math.round(level))),
    base_stats: {
      vit: Math.round(simState.base_stats.vit ?? 1),
      str: Math.round(simState.base_stats.str ?? 1),
      agi: Math.round(simState.base_stats.agi ?? 1),
      dex: Math.round(simState.base_stats.dex ?? 1),
      int: Math.round(simState.base_stats.int ?? 1),
      luk: Math.round(simState.base_stats.luk ?? 1),
    },
    weapon_refine: Math.max(0, Math.min(10, Math.round(simState.weapon_refine))),
    weapon_coating: simState.weapon_coating ?? null,
    passives: [...simState.passives].slice(0, 4),
    disabled_skills: [...(simState.disabled_skills || [])],
    slot_armor_sets,
    cards_by_slot: { ...simState.cards_by_slot },
    slot_gear,
  };
}

export function parseAndValidateBuildImport(
  rawText: string,
  allJobs: JobMeta[],
  fallbackJobId: string,
  fallbackLevel: number
):
  | { ok: true; data: LumivaraBuildExportV1; targetJob: JobMeta; warnings: string[] }
  | { ok: false; error: string } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: '請先貼上配裝 JSON 內容或選擇 .json 檔案。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '語法不正確';
    return { ok: false, error: `JSON 格式錯誤：${msg}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '匯入的 JSON 必須是一個物件（{ ... }）。' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.schema !== undefined && obj.schema !== BUILD_EXPORT_SCHEMA) {
    return {
      ok: false,
      error: `不支援的格式版本 "${String(obj.schema)}"（目前支援 ${BUILD_EXPORT_SCHEMA}）。`,
    };
  }

  if (!obj.base_stats && !obj.slot_gear && !obj.cards_by_slot && !obj.passives) {
    return { ok: false, error: 'JSON 缺少角色素質或裝備格位資料（base_stats / slot_gear）。' };
  }

  const warnings: string[] = [];
  const rawJobId = typeof obj.job_id === 'string' && obj.job_id.trim() ? obj.job_id.trim() : fallbackJobId;
  const targetJob = allJobs.find(
    (j) => j.id.toLowerCase() === rawJobId.toLowerCase() || j.name.toLowerCase() === rawJobId.toLowerCase()
  );
  if (!targetJob) {
    return { ok: false, error: `找不到對應的職業 "${rawJobId}"，請確認職業 ID 是否正確。` };
  }

  const rawLv = Number(obj.level ?? fallbackLevel);
  const level = Number.isFinite(rawLv) ? Math.max(1, Math.min(150, Math.round(rawLv))) : fallbackLevel;
  if (Number.isFinite(rawLv) && rawLv !== level) {
    warnings.push(`等級已限制在 1 ~ 150 範圍內（套用 Lv.${level}）。`);
  }

  const maxCap = level >= 119 ? 119 : 99;
  const rawBase = (obj.base_stats && typeof obj.base_stats === 'object' ? obj.base_stats : {}) as Record<
    string,
    unknown
  >;
  const base_stats = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    const v = Number(rawBase[k] ?? 1);
    base_stats[k] = Number.isFinite(v) ? Math.max(1, Math.min(maxCap, Math.round(v))) : 1;
  }

  const rawRef = Number(obj.weapon_refine ?? 4);
  const weapon_refine = Number.isFinite(rawRef) ? Math.max(0, Math.min(10, Math.round(rawRef))) : 4;

  const rawCoat = obj.weapon_coating;
  const weapon_coating: ElementType | null =
    typeof rawCoat === 'string' && VALID_ELEMENTS.has(rawCoat as ElementType)
      ? (rawCoat as ElementType)
      : null;

  const passives = Array.isArray(obj.passives)
    ? obj.passives.filter((p): p is string => typeof p === 'string' && p.length > 0).slice(0, 4)
    : [];

  const rawArmorSets = (
    obj.slot_armor_sets && typeof obj.slot_armor_sets === 'object' ? obj.slot_armor_sets : {}
  ) as Record<string, unknown>;
  const slot_armor_sets: Record<string, string> = {};
  for (const sk of ARMOR_SET_SLOTS) {
    slot_armor_sets[sk] = typeof rawArmorSets[sk] === 'string' ? rawArmorSets[sk] : '';
  }

  const rawCards = (
    obj.cards_by_slot && typeof obj.cards_by_slot === 'object' ? obj.cards_by_slot : {}
  ) as Record<string, unknown>;
  const cards_by_slot: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(rawCards)) {
    cards_by_slot[k] = typeof v === 'string' && v.trim() ? v.trim() : null;
  }

  const rawSlots = (
    obj.slot_gear && typeof obj.slot_gear === 'object' ? obj.slot_gear : {}
  ) as Record<string, unknown>;
  const slot_gear: Record<string, SlotGearExportEntry> = {};
  for (const sk of DEFAULT_PAPERDOLL_SLOTS) {
    const rawEntry = (
      rawSlots[sk] && typeof rawSlots[sk] === 'object' ? rawSlots[sk] : null
    ) as Record<string, unknown> | null;
    if (!rawEntry) continue;
    const tier = clampTier(Number(rawEntry.tier ?? getMaxTierCount()));
    const stat1 = STAT_KEYS.includes(rawEntry.stat1 as StatKey) ? (rawEntry.stat1 as StatKey) : '';
    const stat2Raw = STAT_KEYS.includes(rawEntry.stat2 as StatKey) ? (rawEntry.stat2 as StatKey) : '';
    const stat2 = stat2Raw && stat2Raw !== stat1 ? stat2Raw : '';
    const ringBase = VALID_RING_BASES.has(rawEntry.ringBase as RingBaseType)
      ? (rawEntry.ringBase as RingBaseType)
      : 'none';
    slot_gear[sk] = {
      tier,
      blocked: Boolean(rawEntry.blocked),
      stat1,
      val1: Math.max(0, Math.round(Number(rawEntry.val1 ?? 0) || 0)),
      stat2,
      val2: stat2 ? Math.max(0, Math.round(Number(rawEntry.val2 ?? 0) || 0)) : 0,
      affixKey: typeof rawEntry.affixKey === 'string' ? rawEntry.affixKey : '',
      ringBase,
      ringBaseValue: Math.max(0, Math.round(Number(rawEntry.ringBaseValue ?? 0) || 0)),
      nativeVal: Math.max(0, Math.round(Number(rawEntry.nativeVal ?? 0) || 0)),
      offhandExtraVal: Math.max(0, Math.round(Number(rawEntry.offhandExtraVal ?? 0) || 0)),
      hitDelta: Math.max(0, Math.round(Number(rawEntry.hitDelta ?? 0) || 0)),
      fleeDelta: Math.max(0, Math.round(Number(rawEntry.fleeDelta ?? 0) || 0)),
      hpDelta: Math.max(0, Math.round(Number(rawEntry.hpDelta ?? 0) || 0)),
    };
  }

  const disabled_skills = Array.isArray(obj.disabled_skills)
    ? obj.disabled_skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  return {
    ok: true,
    targetJob,
    warnings,
    data: {
      schema: BUILD_EXPORT_SCHEMA,
      exported_at: typeof obj.exported_at === 'string' ? obj.exported_at : new Date().toISOString(),
      job_id: targetJob.id,
      job_name: targetJob.zh_name,
      level,
      base_stats,
      weapon_refine,
      weapon_coating,
      passives,
      disabled_skills,
      slot_armor_sets,
      cards_by_slot,
      slot_gear,
    },
  };
}

export function applyImportedBuildToSimState(
  baseSimState: SimState,
  payload: LumivaraBuildExportV1,
  job: JobMeta,
  level: number,
  allArmorSets: ArmorSetMeta[],
  allPassives: PassiveMeta[],
  allCards: CardMeta[]
): { simState: SimState; warnings: string[] } {
  const warnings: string[] = [];
  const maxCap = level >= 119 ? 119 : 99;
  const totalBudget = calcTotalStatPoints(level);

  const base_stats = { ...baseSimState.base_stats };
  for (const k of STAT_KEYS) {
    base_stats[k] = Math.max(1, Math.min(maxCap, Math.round(payload.base_stats[k] ?? 1)));
  }
  const calcUsed = () => STAT_KEYS.reduce((sum, k) => sum + calcCumulativeStatCost(base_stats[k]), 0);
  if (calcUsed() > totalBudget) {
    warnings.push(`匯入的 6 維配點超過 Lv.${level} 點數上限（${totalBudget}），已自動微幅下調以符合規則。`);
    while (calcUsed() > totalBudget) {
      let bestKey: StatKey | null = null;
      let bestVal = 1;
      for (const k of STAT_KEYS) {
        if (base_stats[k] > bestVal) {
          bestVal = base_stats[k];
          bestKey = k;
        }
      }
      if (!bestKey) break;
      base_stats[bestKey] -= 1;
    }
  }

  const slot_gear: Record<string, SlotGearSim> = cloneSlotGearMap(baseSimState.slot_gear);
  for (const sk of DEFAULT_PAPERDOLL_SLOTS) {
    const baseEntry = slot_gear[sk];
    if (!baseEntry) continue;
    const imp = payload.slot_gear[sk];
    if (!imp) continue;
    const blocked = sk === 'shield' ? Boolean(job.is_two_handed) : false;
    if (blocked) {
      slot_gear[sk] = { ...baseEntry, blocked: true };
      continue;
    }

    const tier = clampTier(imp.tier);
    const maxPerStat = getTierStatMax(tier, sk, job.is_two_handed);
    const maxIndep = getTierIndepMax(tier, sk, job.is_two_handed);
    const stat1 = imp.stat1;
    const stat2 = imp.stat2 && imp.stat2 !== stat1 ? imp.stat2 : '';
    const val1 = stat1 ? Math.max(0, Math.min(maxPerStat, imp.val1)) : 0;
    const val2 = stat2 ? Math.max(0, Math.min(maxPerStat, imp.val2)) : 0;

    let affixKey = '';
    if (imp.affixKey) {
      const validAffix = getSpecialAffixDef(
        sk,
        imp.affixKey,
        job.is_two_handed,
        job.offhand_type,
        tier,
        job.primary_dmg_type
      );
      if (validAffix) {
        affixKey = validAffix.key;
      } else {
        warnings.push(`${sk} 部位特別詞綴 "${imp.affixKey}" 不符合目前職業/詞池，已重設為無。`);
      }
    }

    let ringBase: RingBaseType = 'none';
    let ringBaseValue = 0;
    if (isAccessorySlot(sk)) {
      ringBase = imp.ringBase;
      const rRange = getRingBaseRange(ringBase, tier);
      ringBaseValue =
        ringBase === 'none' ? 0 : Math.max(rRange.min, Math.min(rRange.max, imp.ringBaseValue));
    }

    const nativeSpec = getSlotNativeBaseSpec(
      sk,
      tier,
      job.is_two_handed,
      job.primary_dmg_type,
      job.offhand_type
    );
    const nativeVal = nativeSpec
      ? Math.max(nativeSpec.min, Math.min(nativeSpec.max, imp.nativeVal))
      : 0;
    const offhandExtraVal =
      nativeSpec && nativeSpec.extraMin !== undefined && nativeSpec.extraMax !== undefined
        ? Math.max(nativeSpec.extraMin, Math.min(nativeSpec.extraMax, imp.offhandExtraVal))
        : 0;

    slot_gear[sk] = {
      slot: sk,
      tier,
      blocked: false,
      stat1,
      val1,
      stat2,
      val2,
      affixKey,
      ringBase,
      ringBaseValue,
      nativeVal,
      offhandExtraVal,
      hitDelta: Math.max(0, Math.min(maxIndep, imp.hitDelta)),
      fleeDelta: Math.max(0, Math.min(maxIndep, imp.fleeDelta)),
      hpDelta: Math.max(0, Math.min(600, imp.hpDelta)),
      maxPerStat,
    };
  }

  const slot_armor_sets: Record<string, string> = {};
  for (const sk of ARMOR_SET_SLOTS) {
    const rawSet = payload.slot_armor_sets[sk] ?? '';
    slot_armor_sets[sk] = rawSet ? resolveArmorSetId(rawSet, allArmorSets) : '';
  }

  const passiveIdSet = new Set(allPassives.map((p) => p.id));
  const passives = payload.passives.filter((pid) => passiveIdSet.size === 0 || passiveIdSet.has(pid)).slice(0, 4);

  const cardIdSet = new Set(allCards.map((c) => c.id));
  const activeCardSlotKeys = job.is_two_handed
    ? ['weapon_1', 'weapon_2', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2']
    : ['weapon_1', 'shield', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2'];
  const cards_by_slot: Record<string, string | null> = {};
  for (const ck of activeCardSlotKeys) {
    const cid = payload.cards_by_slot[ck] ?? null;
    if (cid && cardIdSet.size > 0 && !cardIdSet.has(cid)) {
      warnings.push(`卡片槽 ${ck} 的卡片 "${cid}" 不在資料庫中，已保留空槽。`);
      cards_by_slot[ck] = null;
    } else {
      cards_by_slot[ck] = cid;
    }
  }

  const resolvedSets =
    allArmorSets.length > 0
      ? summarizeEquippedArmorSets(slot_armor_sets, allArmorSets).activeCombo
      : [];

  return {
    warnings,
    simState: {
      ...baseSimState,
      base_stats,
      slot_gear,
      gear_stats_offset: { vit: 0, str: 0, agi: 0, dex: 0, int: 0, luk: 0 },
      weapon_refine: Math.max(0, Math.min(10, Math.round(payload.weapon_refine))),
      weapon_coating: payload.weapon_coating ?? null,
      passives,
      disabled_skills: [...(payload.disabled_skills || [])],
      armor_sets: resolvedSets,
      slot_armor_sets,
      cards_by_slot,
    },
  };
}

/**
 * Re-anchors benchmark baseline references (`baseline_slot_gear`, `baseline_gear_mods`,
 * `baseline_slot_armor_sets`) when target (PvE/PvP/monster), passive pool, card mode,
 * or level changes on the same job, while preserving all user-customized simulator values.
 */
export function preserveSimStateWithNewBenchmark(
  prevSim: SimState,
  freshBase: SimState,
  level: number
): SimState {
  const maxCap = level >= 119 ? 119 : 99;
  const totalBudget = calcTotalStatPoints(level);

  const base_stats = { ...prevSim.base_stats };
  for (const k of STAT_KEYS) {
    base_stats[k] = Math.max(1, Math.min(maxCap, Math.round(base_stats[k] ?? 1)));
  }

  const calcUsed = () => STAT_KEYS.reduce((sum, k) => sum + calcCumulativeStatCost(base_stats[k]), 0);
  while (calcUsed() > totalBudget) {
    let bestKey: StatKey | null = null;
    let bestVal = 1;
    for (const k of STAT_KEYS) {
      if (base_stats[k] > bestVal) {
        bestVal = base_stats[k];
        bestKey = k;
      }
    }
    if (!bestKey) break;
    base_stats[bestKey] -= 1;
  }

  return {
    ...prevSim,
    base_stats,
    baseline_slot_gear: freshBase.baseline_slot_gear,
    baseline_gear_mods: freshBase.baseline_gear_mods,
    baseline_slot_armor_sets: freshBase.baseline_slot_armor_sets,
  };
}
