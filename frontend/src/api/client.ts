// ============================================================================
// Lumivara Online — Frontend API Client & Wiki-Verified Fallback Engine
// Strictly adheres to backend/engine/combat_math.py & data/wiki_ground_truth.json
// ============================================================================

import {
  FallbackArmorSetSpec,
  FallbackCardSpec,
  FallbackJobSpec,
  FallbackPassiveSpec,
  FallbackSkillSpec,
  WIKI_ARMOR_SETS,
  WIKI_CARD_MECHANICS,
  WIKI_CARDS,
  WIKI_EQUIPMENT_AFFIX_SYSTEM,
  WIKI_JOBS,
  WIKI_PASSIVES,
  WIKI_TARGET_PRESETS,
} from './wikiFallbackData';

export type ElementType = 'neutral' | 'light' | 'dark' | 'fire' | 'water' | 'wind' | 'earth';

export interface SkillMeta {
  id: string;
  name: string;
  zh_name: string;
  dmg_type: 'physical' | 'magic' | 'hybrid';
  atk_scale: number;
  matk_scale: number;
  hp_scale: number;
  vit_tier_hp_scale: boolean;
  element: ElementType;
  uses_weapon_coating: boolean;
  cooldown: number;
  effective_uptime_cd: number | null;
  cast_time: number;
  fixed_cast: number;
  hits: number;
  cooldown_from_aspd: boolean;
  aspd_scaling_type?: string;
  multi_hit_spell: boolean;
  never_misses: boolean;
  can_crit: boolean;
  ignores_def: boolean;
  monster_mult: number;
  atk_monster_mult?: number;
  description: string;
}

export interface JobSkillSlotItem {
  id: string;
  name: string;
  zh_name: string;
  skill_type: 'active' | 'passive';
  description: string;
}

export interface JobMeta {
  id: string;
  name: string;
  zh_name: string;
  tier: string;
  role: string;
  weapon_type: string;
  weapon_name: string;
  offhand_type: string;
  is_two_handed: boolean;
  primary_dmg_type: 'physical' | 'magic' | 'hybrid';
  is_melee: boolean;
  is_ranged_dex_atk: boolean;
  uses_matk_basic_attack: boolean;
  uses_tablet_hybrid_basic: boolean;
  requires_str_eq_int: boolean;
  base_aspd: number;
  auto_atk_scale: number;
  auto_matk_scale: number;
  auto_hp_scale: number;
  hp_bonus_pct: number;
  sp_bonus_pct: number;
  max_job_level?: number;
  job_bonuses: Record<string, number>;
  innate_stats: Record<string, number>;
  innate_passive_name: string;
  innate_passive_desc: string;
  innate_class_passives?: string[];
  active_stats: string[];
  skills: SkillMeta[];
  job_skills?: JobSkillSlotItem[];
}

export interface PassiveMeta {
  id: string;
  name: string;
  zh_name: string;
  origin_job: string;
  restriction: string;
  category: 'Melee' | 'Ranged' | 'Magic' | 'Universal' | 'Conditional';
  condition_desc: string;
  melee_only?: boolean;
  ranged_only?: boolean;
  katana_only?: boolean;
  kunai_only?: boolean;
  cestus_only?: boolean;
  aegis_only?: boolean;
  str_eq_int_only?: boolean;
  handoff_default?: boolean;
  bonuses: Record<string, number>;
  summary: string;
}

export interface ArmorSetMeta {
  id: string;
  name: string;
  zh_name: string;
  pieces_required: number;
  rarity: string;
  max_stacks: number;
  two_piece_effect: string;
  bonuses: Record<string, number>;
  eligible_slots: string[];
}

export interface CardMechanicMeta {
  key: string;
  title: string;
  description: string;
  dps_impact?: {
    effect?: string;
    pve_only?: boolean;
  };
}

export interface CardMeta {
  id: string;
  name: string;
  slot: string;
  slots: string[];
  tier: string | null;
  is_limited: boolean;
  removable: boolean;
  max_per_item: number;
  bonuses: Record<string, number>;
  mechanics?: string[];
  source_monsters: string[];
  description: string;
}

export interface CardSlotEntry {
  equip_slot: string;
  slot_label: string;
  card_id: string;
  name: string;
  tier: string;
  is_limited: boolean;
  removable: boolean;
  bonuses: Record<string, number>;
  mechanics?: string[];
  source_monsters: string[];
  description: string;
  marginal_dps_gain: number;
  marginal_dps_gain_pct: number;
}

export interface CardRecommendations {
  cards_by_slot: Record<string, CardSlotEntry | null>;
  recommendations: CardSlotEntry[];
  two_handed_weapon_slots: number;
  dps_without_cards: number;
  dps_with_cards: number;
  card_dps_gain: number;
  card_dps_gain_pct: number;
}

export interface VitVsFlatHpComparison {
  vit_delta: number;
  flat_hp_delta: number;
  vit_hp_gain: number;
  flat_hp_gain: number;
  vit_hp_ratio: number;
  vit_def_gain: number;
  vit_12_dps_gain: number;
  flat_hp_180_dps_gain: number;
  dps_advantage_ratio: number;
  verdict: string;
}

export interface StatPriorityEntry {
  stat: string;
  current_total: number;
  role: string;
  marginal_dps_per_12: number;
  marginal_dps_pct_per_12: number;
  priority_tier: string;
}

export interface RingRecommendation {
  acc1_name: string;
  acc2_name: string;
  obsidian_ring_delta_dps: number;
  emerald_ring_delta_dps: number;
  rationale: string;
}

export interface GearAffixCardEntry {
  equip_slot: string;
  card_id: string;
  name: string;
  tier: string;
  mechanics?: string[];
  marginal_dps_gain_pct: number;
}

export interface GearAffixSlotRec {
  slot: string;
  slot_label: string;
  template_name: string;
  recommended_item_name?: string;
  set_assignment?: string | null;
  blocked_by_two_handed: boolean;
  recommended_special_affix: string | null;
  special_affix_target?: string | null;
  affix_key?: string | null;
  affix_prefix: string | null;
  tier_vi_max_value: string | null;
  runner_up_affixes: string[];
  allocated_stats?: Record<string, number>;
  primary_stat_targets?: string[];
  recommended_substats: string[];
  fallback_stat_target?: string | null;
  independent_roll_targets?: string[];
  cards?: GearAffixCardEntry[];
  rationale: string;
}

export interface GearAffixBreakpointsStatus {
  hit_status: string;
  hit_deficit: number;
  aspd_status: string;
  aspd_deficit: number;
  phys_pierce_headroom_pct: number;
  magic_pierce_headroom_pct: number;
  dex_cast_deficit: number;
  templar_vit_300_deficit: number;
  king_str_eq_int_ok: boolean | null;
  active_card_mechanics?: string[];
}

export interface GearAffixRecommendations {
  breakpoints_status: GearAffixBreakpointsStatus;
  vit_vs_flat_hp_comparison?: VitVsFlatHpComparison;
  stat_priority_guide?: StatPriorityEntry[];
  ring_recommendation?: RingRecommendation;
  slots: GearAffixSlotRec[];
}

export interface CdcChangeRecord {
  id: number;
  sync_batch_id: string;
  detected_at: string;
  patch_version: string;
  entity_type: 'SKILL' | 'PASSIVE' | 'CARD' | 'FORMULA' | 'ARMOR_SET';
  entity_id: string;
  entity_name: string;
  change_type: 'MODIFIED' | 'ADDED' | 'REMOVED';
  old_hash: string;
  new_hash: string;
  affected_jobs: string[];
  summary: string;
  impact_level: 'HIGH' | 'MEDIUM' | 'INFO';
  diff_json: Record<string, { old: string | number; new: string | number }>;
}

export interface CdcStatusResponse {
  last_sync_at: string;
  sync_batch_id: string;
  wiki_url: string;
  changelog_url: string;
  tracked_entities_count: number;
  total_changes_detected: number;
  active_patch_version: string;
  db_engine: string;
  backend_online: boolean;
}

export interface StatRollBucket {
  chance: number;
  low_mult?: number;
  high_mult_excl?: number;
  exact_mult?: number;
}

export interface EquipmentAffixSystemMeta {
  tiers: string[];
  tier_count: number;
  tier_level_thresholds?: number[];
  affix_name_prefixes: Record<string, string>;
  special_affix_pools: Record<string, string[]>;
  special_affix_values: Record<string, number[]>;
  special_affix_chance?: number[];
  accessory_atk_matk_mults: number[];
  ring_crit_mult: number;
  shuriken_aspd_per_tier: number[];
  saya_crit_per_tier: number[];
  stat_roll_distribution?: {
    buckets?: StatRollBucket[];
    description?: string;
  };
  flee_and_hit_roll_weights?: {
    bucket_weights?: number[];
    description?: string;
  };
  non_dps_affixes?: string[];
  two_handed_rules?: {
    blocks_shield_slot: boolean;
    card_slots: number;
    refine_gain_multiplier: number;
    refine_pierce_multiplier: number;
    stats_multiplier: number;
    tablet_exception?: string;
  };
  two_handed_templates?: string[];
}

export interface MetaResponse {
  jobs: JobMeta[];
  passives: PassiveMeta[];
  armor_sets: ArmorSetMeta[];
  cards: CardMeta[];
  target_presets: TargetInput[];
  elements: ElementType[];
  card_mechanics?: Record<string, CardMechanicMeta>;
  equipment_affix_system?: EquipmentAffixSystemMeta;
}

export interface GearInput {
  weapon_refine: number;
  is_two_handed: boolean;
  offhand_type?: string;
  weapon_coating: ElementType | null;
  phys_pierce: number;
  magic_pierce: number;
  vit: number;
  str: number;
  agi: number;
  dex: number;
  int: number;
  luk: number;
  flat_atk: number;
  flat_matk: number;
  atk_pct: number;
  matk_pct: number;
  crit: number;
  mcrit: number;
  crit_dmg: number;
  hit: number;
  flee?: number;
  aspd_flat?: number;
  aspd_pct?: number;
  gear_def: number;
  gear_mdef: number;
  flat_hp: number;
  hp_pct: number;
  flat_sp: number;
  sp_pct: number;
}

export interface TargetInput {
  preset_id: string;
  name: string;
  level?: number;
  target_def: number;
  target_mdef: number;
  target_flee: number;
  element: ElementType;
  is_monster: boolean;
  is_party?: boolean;
}

export const PERSISTENT_STATUS_JOBS = new Set([
  'mamushi',
  'thief',
  'nekobaku',
  'mage',
  'swordman',
  'ironfist',
]);
export const MOB_CC_STATUS_JOBS = new Set([
  'kensei',
  'archer',
  'king',
  'sinister',
  'necromancer',
  'merchant',
]);

export function getCardMechanicWarning(
  card: CardMeta,
  ctx: {
    jobId: string;
    isMelee: boolean;
    isParty?: boolean;
    isMonster?: boolean;
    targetName?: string;
    targetDef?: number;
  }
): string | null {
  const mechs = new Set<string>(card.mechanics || []);
  for (const k of Object.keys(card.bonuses || {})) {
    if (k.startsWith('m') && Number(card.bonuses[k]) > 0 && !['mdef', 'matk', 'matk_pct', 'mcrit', 'max_hp'].includes(k)) {
      mechs.add(k);
    }
  }
  if (mechs.size === 0) return null;

  const isMonster = ctx.isMonster ?? true;
  const isParty = Boolean(ctx.isParty);
  const tName = (ctx.targetName || '').toLowerCase();
  const isBoss =
    tName.includes('boss') ||
    tName.includes('mvp') ||
    tName.includes('leader') ||
    (ctx.targetDef ?? 0) >= 150;

  if (!isMonster) {
    return '機制效果僅對怪物有效（PvP 不觸發）';
  }
  if (mechs.has('mWeakSpot')) {
    if (!isParty && !PERSISTENT_STATUS_JOBS.has(ctx.jobId)) {
      if (!isBoss && MOB_CC_STATUS_JOBS.has(ctx.jobId)) {
        return '對 Boss 常駐度較低（需組隊或異常技）';
      }
      return '單人無異常狀態技能（僅組隊或搭配異常詞綴/卡觸發）';
    }
  }
  if (mechs.has('mOpener')) {
    if (isParty) {
      return '組隊多人搶先手時無法觸發（僅單人刷怪有效）';
    }
    if (isBoss) {
      return '僅第一下有效，長期打王幾乎無持續 DPS';
    }
  }
  if (mechs.has('mFarShot') && ctx.isMelee) {
    return '近戰職業（120px 內）觸發減傷 -10%';
  }
  if (mechs.has('mTitan') && !isBoss) {
    return '打一般小怪反而減傷 -10%';
  }
  if (mechs.has('mSurprise')) {
    return '需 6 秒完全不放技能才會觸發（連打無效益）';
  }
  if (mechs.has('mCocoa')) {
    return '對怪物技能傷害 -10%（僅補師向）';
  }
  return null;
}

export interface OptimizeRequest {
  job_id: string;
  level: number;
  unlocked_passives: string[];
  gear: GearInput;
  target: TargetInput;
  card_budget_mode?: 'limited' | 'budget';
  auto_gear_stats?: boolean;
}

export interface EvaluateRequest {
  job_id: string;
  level: number;
  base_stats: Record<string, number>;
  gear_stats: Record<string, number>;
  gear_mods: Record<string, unknown>;
  passives: string[];
  armor_sets: string[];
  cards_by_slot: Record<string, string | null>;
  disabled_skills?: string[];
  target: TargetInput;
}

export interface EvaluateResponse {
  total_dps: number;
  auto_dps: number;
  skill_dps: number;
  dps_breakdown: Record<string, number>;
  base_stats: Record<string, number>;
  gear_stats: Record<string, number>;
  gear_mods: Record<string, unknown>;
  total_stats: Record<string, number>;
  stat_sources: {
    base: Record<string, number>;
    job: Record<string, number>;
    innate: Record<string, number>;
    gear: Record<string, number>;
    cards: Record<string, number>;
    sets: Record<string, number>;
    passives: Record<string, number>;
  };
  card_bonuses: Record<string, number>;
  cards_by_slot: Record<string, CardSlotEntry | null>;
  passives: string[];
  armor_sets: string[];
  disabled_skills?: string[];
  points_spent: number;
  total_stat_points: number;
  points_remaining: number;
  stat_cap: number;
  active_thresholds: string[];
  active_card_mechanics: string[];
  combat_metrics: CombatMetrics;
  skill_breakdown: SkillDpsDetail[];
  coating_comparison?: OptimizeResponse['coating_comparison'];
  computed_by: 'backend_api' | 'local_fallback_engine';
}

export interface StatAllocationDetail {
  stat: 'vit' | 'str' | 'agi' | 'dex' | 'int' | 'luk';
  label: string;
  base: number;
  job_bonus: number;
  innate_bonus: number;
  gear_bonus: number;
  card_bonus?: number;
  set_bonus?: number;
  passive_bonus: number;
  total: number;
  points_spent: number;
  next_step_cost: number;
  marginal_dps_per_point: number;
  marginal_dps_per_cost: number;
  threshold_badges: string[];
}

export interface SkillDpsDetail {
  skill_id: string;
  name: string;
  zh_name: string;
  dmg_type: string;
  element: ElementType;
  uses_coating: boolean;
  expected_dmg_per_cast: number;
  base_cd: number;
  effective_cd: number;
  dps: number;
  share_pct: number;
  hit_chance: number;
  crit_chance: number;
  elem_mult: number;
  def_mult: number;
  notes: string;
}

export interface CombatMetrics {
  max_hp: number;
  max_sp: number;
  total_atk: number;
  total_matk: number;
  phys_pierce_pct: number;
  magic_pierce_pct: number;
  target_phys_dr_pct: number;
  target_magic_dr_pct: number;
  effective_phys_mult: number;
  effective_magic_mult: number;
  crit_rate_pct: number;
  mcrit_rate_pct: number;
  crit_dmg_mult: number;
  // Separated HIT metrics
  hit_total: number;
  player_flee: number;
  target_flee: number;
  hit_chance_pct: number;
  hit_formula_note: string;
  // Separated ASPD metrics
  aspd: number;
  aspd_cap: number;
  attacks_per_sec: number;
  attack_interval_ms: number;
  high_aspd_basic_bonus_pct: number;
  aspd_formula_note: string;
  // Defense & misc
  double_hit_chance_pct: number;
  player_def: number;
  player_mdef: number;
  player_phys_dr_pct: number;
  player_magic_dr_pct: number;
  cast_time_reduction_pct: number;
  multi_hit_speedup_pct: number;
  cd_reduction_pct: number;
  gld_vit_mult: number;
}

export interface BuildCandidate {
  rank: number;
  total_dps: number;
  dps_with_cards?: number;
  base_dps_no_cards?: number;
  auto_dps: number;
  skill_dps: number;
  diff_from_top_pct: number;
  points_used: number;
  points_budget: number;
  stat_cap: number;
  stats: Record<string, StatAllocationDetail>;
  gear_stats?: Record<string, number>;
  gear_mods?: Record<string, unknown>;
  card_bonuses?: Record<string, number>;
  card_recommendations?: CardRecommendations;
  gear_affix_recommendations?: GearAffixRecommendations;
  passives: PassiveMeta[];
  innate_class_passives?: string[];
  armor_sets: {
    combo: string[];
    summary: Array<{ name: string; zh_name: string; count: number; pieces: number; effect: string }>;
  };
  active_thresholds: string[];
  skill_breakdown: SkillDpsDetail[];
  combat_metrics: CombatMetrics;
  commentary: string[];
}

export interface ArmorSetAlternative {
  armor_sets: string[];
  armor_set_summary: string;
  total_dps: number;
  dps_delta_pct: number;
  is_recommended: boolean;
}

export interface OptimizeResponse {
  job: JobMeta;
  level: number;
  points_budget: number;
  stat_cap: number;
  weapon_coating: ElementType | null;
  refine_pierce_bonus_pct: number;
  target: TargetInput & { phys_dr_pct?: number; magic_dr_pct?: number };
  top_builds: BuildCandidate[];
  armor_set_alternatives?: ArmorSetAlternative[];
  card_recommendations: CardRecommendations;
  gear_affix_recommendations: GearAffixRecommendations;
  coating_comparison: {
    with_light_coating_dps: number;
    without_coating_dps: number;
    gain_pct: number;
    light_and_shadow_active: boolean;
  };
  computed_by: 'backend_api' | 'local_fallback_engine';
}

// ============================================================================
// 1. Exact Wiki Domain Formulas (Matching backend/engine/combat_math.py 100%)
// ============================================================================

export const CLASS_BASE_ASPD: Record<string, number> = {
  novice: 148.0,
  swordman: 150.0,
  mage: 145.0,
  archer: 147.0,
  acolyte: 150.0,
  merchant: 148.0,
  thief: 152.0,
  mamushi: 152.0,
  nekobaku: 150.0,
  kensei: 152.0,
  ironfist: 152.0,
  necromancer: 148.0,
  king: 148.0,
  sinister: 150.0,
  templar: 148.0,
};

export const WEAPON_ASPD_OFFSET: Record<string, number> = {
  knife: 2.0,
  dagger_pair: 2.0,
  kunai: 2.0,
  flask: 0.0,
  katana: 1.0,
  cestus: 1.0,
  grimoire: -2.0,
  tablet: -2.0,
  pistols: 1.0,
  aegis: -2.0,
  sword: 0.0,
  hammer: -2.0,
  rod: -8.0,
  staff: -10.0,
  quarterstaff: -5.0,
  bow: -4.0,
};

export const NON_SHIELD_OFFHANDS = new Set([
  'none',
  'orb',
  'catalyst',
  'lantern',
  'shuriken',
  'saya',
  'ammo',
  'quiver',
]);

const WEAPON_REFINE_STEPS = [2, 2, 2, 2, 3, 3, 3, 4, 4, 5]; // +30 at +10 (1H), +60 (2H)
const OFFHAND_REFINE_STEPS = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3]; // +17 at +10

export function calcTotalStatPoints(level: number): number {
  let pts = 0;
  for (let lv = 2; lv <= level; lv++) {
    pts += Math.floor(lv / 5) + 3;
  }
  return pts;
}

export function calcSingleStepCost(curVal: number): number {
  if (curVal < 1) return 2;
  return Math.floor((curVal - 1) / 10) + 2;
}

const STAT_COST_CACHE: number[] = new Array(151).fill(0);
for (let v = 2; v <= 150; v++) {
  STAT_COST_CACHE[v] = STAT_COST_CACHE[v - 1] + (Math.floor((v - 2) / 10) + 2);
}

export function calcCumulativeStatCost(val: number): number {
  const clamped = Math.max(1, Math.min(150, Math.floor(val)));
  return STAT_COST_CACHE[clamped] ?? 0;
}

export interface AspdDetails {
  class_base_aspd: number;
  weapon_aspd_offset: number;
  shield_penalty: number;
  base_aspd: number;
  agi_dex_factor: number;
  raw_aspd: number;
  with_pct_aspd: number;
  max_card_aspd: number;
  flat_sum_aspd: number;
  soft_capped_aspd: number;
  aspd: number;
  attack_interval_ms: number;
  attacks_per_sec: number;
  high_aspd_basic_bonus: number;
}

export function calcAspdDetails(params: {
  jobId: string;
  weaponType: string;
  totalAgi: number;
  totalDex: number;
  aspdPct?: number;
  flatGearSetPotionAspd?: number;
  cardAspdValues?: number[];
  hasActualShield?: boolean;
}): AspdDetails {
  const classBase = CLASS_BASE_ASPD[(params.jobId || 'novice').toLowerCase()] ?? 148.0;
  const weaponOffset = WEAPON_ASPD_OFFSET[(params.weaponType || 'sword').toLowerCase()] ?? 0.0;
  const shieldPen = params.hasActualShield ? 8.0 : 0.0;
  const baseAspd = classBase + weaponOffset - shieldPen;

  const factor = 1.0 - (baseAspd - 144.0) / 50.0;
  const raw =
    baseAspd + (Math.max(0, params.totalAgi) * 0.3 + Math.max(0, params.totalDex) * 0.02) * factor;
  const withPct = raw + Math.max(0, 200.0 - raw) * Math.max(0, params.aspdPct ?? 0);

  const cardVals = (params.cardAspdValues ?? []).filter((v) => v > 0);
  const maxCardAspd = cardVals.length > 0 ? Math.max(...cardVals) : 0;
  const flatSum = withPct + (params.flatGearSetPotionAspd ?? 0) + maxCardAspd;

  const softCapped = flatSum <= 180.0 ? flatSum : 180.0 + (flatSum - 180.0) * 0.5;
  const finalAspd = Math.min(193.0, Math.max(50.0, Math.round(softCapped * 10.0) / 10.0));
  const attackIntervalMs = Math.max(140, Math.round((200.0 - finalAspd) * 20.0));
  const attacksPerSec = 1000.0 / attackIntervalMs;
  const highAspdBasicBonus = 1.0 + Math.max(0.0, finalAspd - 170.0) * 0.015;

  return {
    class_base_aspd: classBase,
    weapon_aspd_offset: weaponOffset,
    shield_penalty: -shieldPen,
    base_aspd: Math.round(baseAspd * 100) / 100,
    agi_dex_factor: Math.round(factor * 10000) / 10000,
    raw_aspd: Math.round(raw * 100) / 100,
    with_pct_aspd: Math.round(withPct * 100) / 100,
    max_card_aspd: maxCardAspd,
    flat_sum_aspd: Math.round(flatSum * 100) / 100,
    soft_capped_aspd: Math.round(softCapped * 100) / 100,
    aspd: finalAspd,
    attack_interval_ms: attackIntervalMs,
    attacks_per_sec: Math.round(attacksPerSec * 1000) / 1000,
    high_aspd_basic_bonus: Math.round(highAspdBasicBonus * 10000) / 10000,
  };
}

export function calcHit(params: {
  level: number;
  totalDex: number;
  totalLuk: number;
  flatPassiveHit?: number;
  gearCardSetHit?: number;
  passiveHitPct?: number;
  hasQuakeCard?: boolean;
}): number {
  const base =
    100 + params.level + params.totalDex * 2 + Math.floor(params.totalLuk / 3);
  const raw = base + (params.flatPassiveHit ?? 0) + (params.gearCardSetHit ?? 0);
  const mult = (1.0 + Math.max(0, params.passiveHitPct ?? 0)) * (params.hasQuakeCard ? 0.85 : 1.0);
  return Math.floor(raw * mult);
}

export function calcFlee(params: {
  level: number;
  totalAgi: number;
  totalLuk: number;
  gearCardSetFlee?: number;
  passiveFleePct?: number;
  buffFleePct?: number;
  buffFlee?: number;
}): number {
  const raw =
    params.level +
    params.totalAgi * 2 +
    Math.floor(params.totalLuk / 5) +
    (params.gearCardSetFlee ?? 0);
  const mult = 1.0 + Math.max(0, (params.passiveFleePct ?? 0) + (params.buffFleePct ?? 0));
  return Math.floor(raw * mult) + (params.buffFlee ?? 0);
}

export function calcHitChance(totalHit: number, targetFlee: number, neverMisses = false): number {
  if (neverMisses) return 1.0;
  return Math.max(0.4, Math.min(1.0, 1.0 + (totalHit - targetFlee) * 0.0025));
}

export function calcMaxHp(params: {
  level: number;
  baseVit: number;
  totalVit: number;
  jobHpPct?: number;
  gearCardSetHp?: number;
  passiveHpPct?: number;
  aegisHpPct?: number;
  buffHpPct?: number;
  isPvp?: boolean;
  hasNagaCard?: boolean;
}): { maxHp: number; bodyHp: number } {
  const jobHpPct = params.jobHpPct ?? 0;
  const baseCore = Math.floor(
    (100 + Math.max(0, params.level - 1) * 5 + params.totalVit * 10) * (1.0 + jobHpPct)
  );
  const bodyHp = Math.floor(
    (baseCore + (params.gearCardSetHp ?? 0)) *
      (1.0 + (params.passiveHpPct ?? 0) + (params.aegisHpPct ?? 0) + (params.buffHpPct ?? 0))
  );
  const refund =
    Math.max(0, params.baseVit - 1) * Math.max(0, 30.0 - 10.0 * (1.0 + jobHpPct));
  const tv = Math.max(0, params.totalVit);
  const vitMult = params.isPvp
    ? tv <= 100
      ? 1.0 + tv * 0.003
      : 1.3 + (tv - 100) * 0.001
    : tv <= 100
    ? 1.0 + tv * 0.006
    : 1.6 + (tv - 100) * 0.002;
  const nagaMult = params.hasNagaCard ? 1.07 : 1.0;
  return {
    bodyHp,
    maxHp: Math.floor((bodyHp + refund) * vitMult * nagaMult),
  };
}

export function calcMaxSp(params: {
  level: number;
  totalInt: number;
  jobSpPct?: number;
  gearCardSetSp?: number;
  passiveSpPct?: number;
}): number {
  const baseCore = Math.floor(
    (20 + Math.max(0, params.level - 1) + params.totalInt * 5) * (1.0 + (params.jobSpPct ?? 0))
  );
  return Math.floor((baseCore + (params.gearCardSetSp ?? 0)) * (1.0 + (params.passiveSpPct ?? 0)));
}

export function calcElementMultiplier(
  atkElem: ElementType,
  tgtElem: ElementType,
  hasEclipseCard = false
): number {
  let mult = 1.0;
  if (atkElem === 'neutral' || tgtElem === 'neutral' || atkElem === tgtElem) {
    mult = 1.0;
  } else if (
    (atkElem === 'light' && tgtElem === 'dark') ||
    (atkElem === 'dark' && tgtElem === 'light')
  ) {
    mult = 1.5;
  } else if (
    (atkElem === 'light' || atkElem === 'dark') &&
    ['fire', 'water', 'wind', 'earth'].includes(tgtElem)
  ) {
    mult = 1.0;
  } else if (
    ['fire', 'water', 'wind', 'earth'].includes(atkElem) &&
    (tgtElem === 'light' || tgtElem === 'dark')
  ) {
    mult = 0.75;
  } else {
    const cycle: Record<string, ElementType> = {
      wind: 'water',
      water: 'fire',
      fire: 'earth',
      earth: 'wind',
    };
    if (cycle[atkElem] === tgtElem) mult = 1.25;
    else if (cycle[tgtElem] === atkElem) mult = 0.75;
  }
  if (hasEclipseCard) {
    mult = Math.min(1.15, Math.max(1.0, mult));
  }
  return mult;
}

export function calcGldVitMultiplier(totalVit: number): number {
  if (totalVit >= 300) return 15.0;
  if (totalVit >= 200) return 10.0;
  if (totalVit >= 100) return 7.0;
  return 5.0;
}

export function calcWeaponRefinePierceBonus(refine: number, isTwoHanded: boolean): number {
  const lv = Math.max(0, Math.min(10, Math.floor(refine)));
  if (lv <= 5) return 0.0;
  return (lv - 5) * 0.01 * (isTwoHanded ? 2.0 : 1.0);
}

export function calcRefineAtkMatk(
  refine: number,
  isTwoHanded: boolean,
  isOffhand = false
): number {
  const lv = Math.max(0, Math.min(10, Math.floor(refine)));
  if (lv === 0) return 0;
  if (isOffhand) {
    return OFFHAND_REFINE_STEPS.slice(0, lv).reduce((a, b) => a + b, 0);
  }
  const base = WEAPON_REFINE_STEPS.slice(0, lv).reduce((a, b) => a + b, 0);
  return base * (isTwoHanded ? 2 : 1);
}

export function calcDefReduction(defOrMdef: number): number {
  return Math.min(255, Math.max(0, Math.floor(defOrMdef))) / 300.0;
}

export function calcDamageAfterDef(
  rawDmg: number,
  targetDefOrMdef: number,
  pierce: number
): number {
  const dr = calcDefReduction(targetDefOrMdef);
  const clampedPierce = Math.min(1.0, Math.max(0.0, pierce));
  const effDr = Math.max(0.0, dr - clampedPierce);
  return rawDmg * (1.0 - effDr);
}

// ============================================================================
// 2. Wiki-Verified Metadata Builders & Built-in Fallback Catalogs
// ============================================================================

export const JOB_ZH_LABELS: Record<string, string> = {
  templar: 'Templar (聖殿騎士)',
  kensei: 'Kensei (劍聖)',
  king: 'The King (國王)',
  necromancer: 'Wicked Necromancer (邪惡死靈法師)',
  mamushi: 'Mamushi (蝮蛇忍者)',
  nekobaku: 'Nekobaku (爆彈貓靈)',
  ironfist: 'Iron Fist (鐵拳武僧)',
  sinister: 'Sinister (邪惡神槍手)',
  swordman: 'Swordsman (劍士)',
  mage: 'Mage (法師)',
  archer: 'Archer (弓箭手)',
  acolyte: 'Cleric (牧師)',
  merchant: 'Merchant (商人)',
  thief: 'Thief (盜賊)',
  novice: 'Novice (初心者)',
};

const RESTRICTION_ZH_LABELS: Record<string, string> = {
  all: '全職業通用',
  melee: '限近戰武器',
  ranged: '限遠程武器',
  katana: '限太刀',
  kunai: '限苦無',
  knuckle: '限拳套 (Cestus)',
  lionheart_aegis: '限聖盾 Lionheart Aegis',
  str_eq_int: '限 STR = INT 共鳴',
};

const PASSIVE_ZH_NAMES: Record<string, string> = {
  swordmastery: '近戰精通 (Close-Combat Mastery)',
  hprecovery: '生命活力 (Vigor)',
  ironbody: '鋼鐵之軀 (Iron Body)',
  unyieldinggrit: '堅毅不屈 (Unyielding Grit)',
  zanshin: '殘心 (Zanshin)',
  lightshadow: '光與影 (Light & Shadow)',
  weighttraining: '負重訓練 (Weight Training)',
  cartwheels: '強化推車輪 (Reinforced Cart Wheels)',
  heavycart: '重裝推車 (Heavy Cart Armor)',
  fatalsense: '致命直覺 (Fatal Sense)',
  doubleattack: '二連擊 (Twin Strike)',
  improvedodge: '迅捷步伐 (Fleet Foot)',
  counterstep: '反擊墊步 (Evasive Counterstep)',
  combofinisher: '連擊終結 (Combo Point Finisher)',
  owleye: '銳利鷹眼 (Keen Eye)',
  demonbane: '神聖之力 (Sacred & Divine)',
  blessedjudgment: '祝福灼熱審判 (Blessed Searing Judgment)',
  solarijudgment: '索拉里審判 (Solari Judgment)',
  twilightequilibrium: '暮光平衡 (Twilight Equilibrium)',
  mentality: '精神集中 (Mentality)',
  arcaneconduit: '奧術導管 (Arcane Conduit)',
  alchemymastery: '煉金精通 (Alchemy Mastery)',
  soullantern: '魂燈收割 (Soul-Lantern Harvest)',
  grimpurr: '兇貓附身 (Grim Purr-session)',
  felinepact: '黑貓契約 (Feline Pact)',
  spellweave: '法術編織 (Spellweave Synergy)',
  sp_recovery: '冥想 (Meditation)',
  peratio: '公允價值 (Fair Value)',
  priceceiling: '高頻交易 (HFT)',
  pricefloor: '現金流 (Cash Flow)',
  circuitbreaker: '市場熔斷 (Market Circuit-Breaker)',
  sovereigndividend: '主權股息 (Sovereign Dividend Yield)',
  colossusbash: '巨像聖擊 (Colossus Radiant Bash)',
  sacredguillotine: '聖斷鎖鏈 (Sacred Guillotine Chain)',
  katanamastery: '太刀精通 (Katana Mastery)',
  battlemomentum: '戰鬥動能 (Battle Momentum)',
  shukuchi: '縮地 (Shukuchi)',
  kasumiedge: '霞之刃 (Kasumi Edge)',
  akatsukikenki: '曉之劍氣 (Akatsuki Kenki)',
  vultureeye: '遠距視界 (Far Sight)',
  numbingtoxin: '麻痺毒素 (Numbing Toxin)',
  venommastery: '毒術精通 (Venom Mastery)',
  predator: '掠食者耐心 (Predator\'s Patience)',
  coldblooded: '冷血精準 (Cold-Blooded Precision)',
  sheddingskin: '蛻皮淨化 (Shedding Skin)',
  ironcladknuckle: '鐵壁拳勁 (Ironclad Knuckle)',
  ironhide: '初血壓制 (Fresh Blood)',
  pistonrhythm: '活塞節奏 (Piston Rhythm)',
  fivetriple: '背水一戰 (Last Stand)',
  catreflex: '貓科反射 (Feline Reflex)',
  unstableconcoction: '不穩定藥劑 (Unstable Concoction)',
  ninelives: '九命 (Nine Lives)',
  elementalquiver: '元素箭袋 (Elemental Quiver)',
  elementalresonance: '元素共鳴 (Elemental Resonance)',
  callpoon: '召喚碰碰 (Call of Poon-poon)',
  ankleclamp: '碰碰踝夾 (Poon-poon Ankle Clamp)',
};

export const SKILL_ZH_LABELS: Record<string, string> = {
  'Basic Auto-Attack': '基礎普攻 (Basic Auto-Attack)',
  'Auto-Attack (+Procs)': '普攻與連段觸發 (Auto-Attack)',
  'Sacred Guillotine Chain': '聖斷鎖鏈 (Sacred Guillotine Chain)',
  'Colossus Radiant Bash': '巨像聖擊 (Colossus Radiant Bash)',
  'Templar Mastery': '聖殿騎士專精 (Templar Mastery)',
  'Bastion Shield': '堡壘巨盾 (Bastion Shield)',
  'Undying Dawn': '不滅晨曦 (Undying Dawn)',
  'Shield Sacrificial Strike': '聖光奉獻盾擊 (Shield Sacrificial Strike)',
  'Grand Light Devastation': '聖光毀滅裁決 (Grand Light Devastation)',
  "Light's Embrace": "聖光牽引 (Light's Embrace)",
  'Guardian Light Soul-Link': '守護者靈魂連結 (Guardian Light Soul-Link)',
  'Light-Reflect Barrier': '聖光反射屏障 (Light-Reflect Barrier)',
  sacredguillotine: '聖斷鎖鏈 (Sacred Guillotine Chain)',
  colossusbash: '巨像聖擊 (Colossus Radiant Bash)',
  templarmastery: '聖殿騎士專精 (Templar Mastery)',
  bastionshield: '堡壘巨盾 (Bastion Shield)',
  undyingdawn: '不滅晨曦 (Undying Dawn)',
  sacrificestrike: '聖光奉獻盾擊 (Shield Sacrificial Strike)',
  lightdevastation: '聖光毀滅裁決 (Grand Light Devastation)',
  lightsembrace: "聖光牽引 (Light's Embrace)",
  soullink: '守護者靈魂連結 (Guardian Light Soul-Link)',
  lightbarrier: '聖光反射屏障 (Light-Reflect Barrier)',
};

export function getSkillZhLabel(idOrName: string, fallbackName?: string): string {
  return (
    SKILL_ZH_LABELS[idOrName] ??
    SKILL_ZH_LABELS[idOrName.toLowerCase()] ??
    (fallbackName ? SKILL_ZH_LABELS[fallbackName] : undefined) ??
    PASSIVE_ZH_NAMES[idOrName.toLowerCase()] ??
    fallbackName ??
    idOrName
  );
}

const ARMOR_SET_ZH_NAMES: Record<string, string> = {
  might: 'Warlord (戰神 2件套)',
  arcana: 'Archmage (大法師 2件套)',
  fortune: 'Lucky Star (幸運星 2件套)',
  executioner: 'Executioner (處刑者 2件套)',
  breaker: 'Armor Breaker (破甲者 2件套)',
  spellbreaker: 'Spell Breaker (破魔者 2件套)',
  bastion: 'Iron Bastion (鋼鐵堡壘 2件套)',
  hawkeye: 'Hawkeye (鷹眼 4件套)',
  phantom: 'Phantom Dancer (幻影舞者 4件套)',
  sage: 'Mystic Sage (秘法賢者 4件套)',
  bloodlord: 'Blood Lord (血領主 6件套)',
};

const SLOT_LABELS: Record<string, string> = {
  weapon_1: '武器槽 #1 (Weapon 1)',
  weapon_2: '武器槽 #2 (2H Second Slot)',
  shield: '副手 / 盾牌 (Off-Hand / Shield)',
  head_upper: '頭上 (Head Upper)',
  head_mid: '頭中 (Head Mid)',
  head_lower: '頭下 (Head Lower)',
  body: '身體防具 (Body Armor)',
  garment: '披風 (Garment)',
  shoes: '鞋子 (Shoes)',
  accessory_1: '飾品 1 (Accessory 1)',
  accessory_2: '飾品 2 (Accessory 2)',
};

const STAT_LABELS: Record<string, string> = {
  vit: 'VIT (體質 / MaxHP & 減傷)',
  str: 'STR (力量 / 物理 ATK)',
  agi: 'AGI (敏捷 / ASPD & FLEE)',
  dex: 'DEX (靈巧 / HIT & 詠唱)',
  int: 'INT (智力 / MATK & MDEF)',
  luk: 'LUK (幸運 / 暴擊率 & HIT)',
};

const BONUS_KEY_ZH_LABELS: Record<string, string> = {
  atk_pct: 'ATK',
  matk_pct: 'MATK',
  phys_pierce: '物理穿透',
  magic_pierce: '魔法穿透',
  crit: '暴擊率',
  mcrit: '法術暴擊',
  crit_dmg: '暴擊傷害',
  aspd_pct: '攻速',
  aspd_flat: '固定攻速',
  hit: 'HIT 命中',
  hit_pct: 'HIT 命中',
  flee: 'FLEE 閃避',
  flee_pct: 'FLEE 閃避',
  def: 'DEF 物防',
  mdef: 'MDEF 魔防',
  hp_pct: 'MaxHP',
  sp_pct: 'MaxSP',
  flat_hp: 'MaxHP',
  cd_red: '技能冷卻',
  cast_reduce_pct: '詠唱時間',
  sp_cost_red: 'SP 消耗',
  light_dark_dmg: '光/暗屬性傷害',
  elem_dmg: '元素傷害',
  coated_dmg: '附魔增傷',
  double_hit_chance: '二連擊機率',
  lifesteal_pct: '吸血',
  dealt_cut_pct: '造成傷害變化',
  vit: 'VIT',
  str: 'STR',
  agi: 'AGI',
  dex: 'DEX',
  int: 'INT',
  luk: 'LUK',
  hp_regen_pct: '自然回血',
  potion_boost_pct: '藥水回血',
  sp_regen: 'SP 恢復',
  move_speed_pct: '移動速度',
  ranged_dmg_pct: '遠程傷害',
  bow_dmg_pct: '弓系傷害',
  all_stats: '全 6 維屬性',
};

const NEGATIVE_PCT_KEYS = new Set(['cd_red', 'cast_reduce_pct', 'sp_cost_red', 'dealt_cut_pct']);

function formatBonusMap(bonuses: Record<string, number | boolean>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(bonuses || {})) {
    const label = BONUS_KEY_ZH_LABELS[k] ?? k;
    if (typeof v === 'boolean') {
      if (v && k !== 'melee_only' && k !== 'ranged_only' && k !== 'requires_str_eq_int') {
        parts.push(label);
      }
      continue;
    }
    const isPct =
      k.endsWith('_pct') ||
      k.includes('pierce') ||
      k === 'crit' ||
      k === 'mcrit' ||
      k === 'crit_dmg' ||
      k === 'cd_red' ||
      k === 'sp_cost_red' ||
      k === 'light_dark_dmg' ||
      k === 'elem_dmg' ||
      k === 'coated_dmg' ||
      k === 'double_hit_chance';
    if (isPct) {
      const pctVal = Math.round(v * 100);
      const sign = NEGATIVE_PCT_KEYS.has(k) && pctVal > 0 ? '-' : pctVal >= 0 ? '+' : '';
      parts.push(`${label} ${sign}${pctVal}%`);
    } else {
      parts.push(`${label} ${v >= 0 ? '+' : ''}${v}`);
    }
  }
  return parts.join(' · ');
}

function toSkillMeta(s: FallbackSkillSpec): SkillMeta {
  return {
    ...s,
    zh_name: getSkillZhLabel(s.id, s.name),
  };
}

function buildFallbackJobSkills(j: FallbackJobSpec): JobSkillSlotItem[] {
  const out: JobSkillSlotItem[] = [];
  const seen = new Set<string>();
  for (const s of j.skills || []) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({
      id: s.id,
      name: s.name,
      zh_name: getSkillZhLabel(s.id, s.name),
      skill_type: 'active',
      description: s.description || '',
    });
  }
  for (const pname of j.innate_class_passives || []) {
    const pid = pname.toLowerCase().replace(/[^a-z0-9]/g, '');
    const knownId =
      pid === 'templar_mastery' || pid === 'templarmastery'
        ? 'templarmastery'
        : pid.includes('sacredguillotine')
        ? 'sacredguillotine'
        : pid.includes('colossus')
        ? 'colossusbash'
        : pid;
    if (seen.has(knownId)) continue;
    seen.add(knownId);
    out.push({
      id: knownId,
      name: pname,
      zh_name: getSkillZhLabel(knownId, pname),
      skill_type: 'passive',
      description: `本職固有／可修習被動：${pname}`,
    });
  }
  return out;
}

function toJobMeta(j: FallbackJobSpec): JobMeta {
  return {
    ...j,
    zh_name: JOB_ZH_LABELS[j.id] ?? j.name,
    max_job_level: 70,
    skills: (j.skills || []).map(toSkillMeta),
    job_skills: buildFallbackJobSkills(j),
  };
}

function derivePassiveCategory(p: FallbackPassiveSpec): PassiveMeta['category'] {
  if (p.melee_only) return 'Melee';
  if (p.ranged_only) return 'Ranged';
  if (p.str_eq_int_only || p.katana_only || p.kunai_only || p.cestus_only || p.aegis_only) {
    return 'Conditional';
  }
  const s = p.stats || {};
  if ('matk_pct' in s || 'sp_to_matk' in s || 'cast_reduce_pct' in s) return 'Magic';
  return 'Universal';
}

const DEFAULT_HANDOFF_IDS = new Set([
  'swordmastery',
  'hprecovery',
  'ironbody',
  'zanshin',
  'lightshadow',
  'weighttraining',
  'fatalsense',
  'doubleattack',
  'owleye',
  'demonbane',
  'mentality',
  'alchemymastery',
  'soullantern',
  'spellweave',
  'sp_recovery',
  'peratio',
  'priceceiling',
  'katanamastery',
  'battlemomentum',
  'vultureeye',
  'numbingtoxin',
  'venommastery',
  'ironcladknuckle',
  'catreflex',
  'elementalquiver',
  'elementalresonance',
]);

function toPassiveMeta(p: FallbackPassiveSpec): PassiveMeta {
  const numBonuses: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.stats || {})) {
    if (typeof v === 'number') numBonuses[k] = v;
  }
  return {
    id: p.id,
    name: p.name,
    zh_name: PASSIVE_ZH_NAMES[p.id] ?? p.name,
    origin_job: p.source_job,
    restriction: p.restriction,
    category: derivePassiveCategory(p),
    condition_desc: RESTRICTION_ZH_LABELS[p.restriction] ?? `限 ${p.restriction}`,
    melee_only: p.melee_only,
    ranged_only: p.ranged_only,
    katana_only: p.katana_only,
    kunai_only: p.kunai_only,
    cestus_only: p.cestus_only,
    aegis_only: p.aegis_only,
    str_eq_int_only: p.str_eq_int_only,
    handoff_default: DEFAULT_HANDOFF_IDS.has(p.id),
    bonuses: numBonuses,
    summary:
      (p.description || '').replace(/^被動\s*·\s*/, '').trim() ||
      formatBonusMap(p.stats),
  };
}

function toArmorSetMeta(s: FallbackArmorSetSpec): ArmorSetMeta {
  const bonusStr = formatBonusMap(s.bonuses);
  return {
    id: s.id,
    name: s.name,
    zh_name: ARMOR_SET_ZH_NAMES[s.id] ?? `${s.name} (${s.pieces_required}件套)`,
    pieces_required: s.pieces_required,
    rarity: s.rarity,
    max_stacks: s.max_stacks,
    two_piece_effect: `${s.pieces_required}件套 (最多${s.max_stacks}組): ${bonusStr}`,
    bonuses: s.bonuses,
    eligible_slots: s.eligible_slots,
  };
}

export const BUILTIN_JOBS: JobMeta[] = WIKI_JOBS.map(toJobMeta);
export const BUILTIN_PASSIVES: PassiveMeta[] = WIKI_PASSIVES.map(toPassiveMeta);
export const BUILTIN_ARMOR_SETS: ArmorSetMeta[] = WIKI_ARMOR_SETS.map(toArmorSetMeta);
export const BUILTIN_CARDS: CardMeta[] = WIKI_CARDS as CardMeta[];
export const BUILTIN_TARGET_PRESETS: TargetInput[] = WIKI_TARGET_PRESETS.map((p) => ({
  preset_id: p.preset_id,
  name: p.name,
  level: p.level,
  target_def: p.target_def,
  target_mdef: p.target_mdef,
  target_flee: p.target_flee,
  element: p.element,
  is_monster: p.is_monster,
}));

// Runtime metadata cache updated when `/api/meta` succeeds
let LIVE_JOBS_CACHE: JobMeta[] = BUILTIN_JOBS;
let LIVE_PASSIVES_CACHE: PassiveMeta[] = BUILTIN_PASSIVES;
let LIVE_ARMOR_SETS_CACHE: ArmorSetMeta[] = BUILTIN_ARMOR_SETS;
let LIVE_CARDS_CACHE: CardMeta[] = BUILTIN_CARDS;
let LIVE_PRESETS_CACHE: TargetInput[] = BUILTIN_TARGET_PRESETS;
let LIVE_CARD_MECHANICS_CACHE: Record<string, CardMechanicMeta> =
  WIKI_CARD_MECHANICS as unknown as Record<string, CardMechanicMeta>;
let LIVE_AFFIX_SYSTEM_CACHE: EquipmentAffixSystemMeta =
  WIKI_EQUIPMENT_AFFIX_SYSTEM as unknown as EquipmentAffixSystemMeta;

export function getEquipmentAffixSystem(): EquipmentAffixSystemMeta {
  return LIVE_AFFIX_SYSTEM_CACHE;
}

export function getCachedMeta(): MetaResponse {
  return {
    jobs: LIVE_JOBS_CACHE,
    passives: LIVE_PASSIVES_CACHE,
    armor_sets: LIVE_ARMOR_SETS_CACHE,
    cards: LIVE_CARDS_CACHE,
    target_presets: LIVE_PRESETS_CACHE,
    elements: ['neutral', 'light', 'dark', 'fire', 'water', 'wind', 'earth'],
    card_mechanics: LIVE_CARD_MECHANICS_CACHE,
    equipment_affix_system: LIVE_AFFIX_SYSTEM_CACHE,
  };
}

// ============================================================================
// 3. Built-in CDC Change Records (Wiki-Aligned Baseline + Simulation)
// ============================================================================

let SIMULATED_PATCH_ACTIVE = false;

export const INITIAL_CDC_CHANGES: CdcChangeRecord[] = [
  {
    id: 1,
    sync_batch_id: 'cdc-2026-11-15',
    detected_at: '2026-11-15 07:00:00 UTC',
    patch_version: '2026-11-15',
    entity_type: 'CARD',
    entity_id: 'colossus_card',
    entity_name: 'Sunfire Colossus Card',
    change_type: 'MODIFIED',
    old_hash: 'legacy_stub_01',
    new_hash: 'wiki_verified_colossus',
    affected_jobs: ['all', 'templar', 'kensei', 'swordman', 'ironfist'],
    summary:
      'Wiki 校準：Sunfire Colossus Card 為 Tier S 武器卡 — STR +8, ATK +3%, 物理穿透 +5% (不可拆卸, 掉落自 Sunfire Colossus)。',
    impact_level: 'HIGH',
    diff_json: {
      tier: { old: 'Budget', new: 'S' },
      bonuses: { old: 'legacy', new: 'STR +8, ATK +3%, Physical Pierce +5%' },
    },
  },
  {
    id: 2,
    sync_batch_id: 'cdc-2026-11-15',
    detected_at: '2026-11-13 18:30:00 UTC',
    patch_version: '2026-11-13',
    entity_type: 'FORMULA',
    entity_id: 'nov13_vit_rebalance',
    entity_name: 'Nov 13 VIT HP Rebalance & GLD Scaling',
    change_type: 'MODIFIED',
    old_hash: 'pre_nov13_hp',
    new_hash: 'nov13_vit_hp',
    affected_jobs: ['all', 'templar'],
    summary:
      'VIT 血量重平衡：PvE 1-100 VIT 每點 +0.6% MaxHP、>100 每點 +0.2%，並計入基礎 VIT 點數補償 (vit_rebalance_refund)。',
    impact_level: 'HIGH',
    diff_json: {
      vit_hp_mult_pve: { old: 'linear', new: '1 + VIT*0.006 (<=100) / 1.6 + (VIT-100)*0.002' },
    },
  },
];

const SIMULATED_PATCH_RECORD: CdcChangeRecord = {
  id: 999,
  sync_batch_id: 'cdc-20261115-sim',
  detected_at: '2026-11-15 14:30:00 UTC',
  patch_version: '2026-11-15-sim',
  entity_type: 'SKILL',
  entity_id: 'lightdevastation',
  entity_name: 'Grand Light Devastation',
  change_type: 'MODIFIED',
  old_hash: 'a1b2c3d4',
  new_hash: 'f9e8d7c6',
  affected_jobs: ['templar'],
  summary: '【CDC 模擬測試】檢測到 Grand Light Devastation / Critical King Card 雜湊異動。',
  impact_level: 'HIGH',
  diff_json: {
    vit_tier_300: { old: '15.0x MaxHP', new: '15.0x MaxHP (Simulated Patch Check)' },
  },
};

// ============================================================================
// 4. Local Fallback Engine (100% Aligned with combat_math.py & optimizer.py)
// ============================================================================

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  function backtrack(start: number, cur: T[]) {
    if (cur.length === k) {
      result.push([...cur]);
      return;
    }
    for (let i = start; i <= arr.length - (k - cur.length); i++) {
      cur.push(arr[i]);
      backtrack(i + 1, cur);
      cur.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function generateValidSetCombos(sets: ArmorSetMeta[], job?: JobMeta, isPvp = false): string[][] {
  const isSetCompatible = (s: ArmorSetMeta) => {
    const b = s.bonuses || {};
    const atk = Number(b.atk_pct ?? 0);
    const matk = Number(b.matk_pct ?? 0);
    const pp = Number(b.phys_pierce ?? 0);
    const mp = Number(b.magic_pierce ?? 0);
    if (job?.primary_dmg_type === 'physical' && (matk > 0 || mp > 0) && atk === 0) {
      return false;
    }
    if (job?.primary_dmg_type === 'magic' && (atk > 0 || pp > 0) && matk === 0) {
      return false;
    }
    if (s.id === 'bastion' && job?.id !== 'templar' && !isPvp) {
      return false;
    }
    return true;
  };

  const twoPc = sets.filter((s) => s.pieces_required === 2 && isSetCompatible(s));
  const fourPc = sets.filter((s) => s.pieces_required === 4 && isSetCompatible(s));
  const sixPc = sets.filter((s) => s.pieces_required === 6);
  const combos: string[][] = [];

  // 3 x 2-piece sets (with max_stacks check)
  for (let i = 0; i < twoPc.length; i++) {
    for (let j = i; j < twoPc.length; j++) {
      for (let k = j; k < twoPc.length; k++) {
        const c = [twoPc[i].id, twoPc[j].id, twoPc[k].id];
        combos.push(c);
      }
    }
  }
  // 1 x 4-piece + 1 x 2-piece
  for (const s4 of fourPc) {
    for (const s2 of twoPc) {
      combos.push([s4.id, s2.id]);
    }
  }
  // 1 x 6-piece
  for (const s6 of sixPc) {
    combos.push([s6.id]);
  }
  return combos;
}

function isPassiveCompatible(p: PassiveMeta, job: JobMeta): boolean {
  const originLower = (p.origin_job || '').toLowerCase();
  if (originLower === job.id.toLowerCase() || originLower === job.name.toLowerCase()) {
    return false;
  }
  if (p.melee_only && !job.is_melee) return false;
  if (p.ranged_only && job.is_melee) return false;
  if (p.katana_only && job.weapon_type !== 'katana') return false;
  if (p.kunai_only && job.weapon_type !== 'kunai') return false;
  if (p.cestus_only && job.weapon_type !== 'cestus') return false;
  if (p.aegis_only && job.weapon_type !== 'aegis') return false;
  if (p.str_eq_int_only && job.id !== 'king') return false;
  return true;
}

function cardMatchesSlot(card: CardMeta, equipSlot: string): boolean {
  const tags = new Set((card.slots && card.slots.length > 0 ? card.slots : [card.slot]).map((s) => s.toLowerCase()));
  if (tags.has('all')) return true;
  if (equipSlot === 'weapon_1' || equipSlot === 'weapon_2') return tags.has('sword') || tags.has('weapon');
  if (equipSlot === 'shield') return tags.has('shield') || tags.has('offhand');
  if (equipSlot === 'head_upper') return tags.has('head') || tags.has('head_upper') || tags.has('headgear');
  if (equipSlot === 'head_mid') return tags.has('face') || tags.has('head_mid') || tags.has('headgear') || tags.has('head');
  if (equipSlot === 'head_lower') return tags.has('mouth') || tags.has('head_lower') || tags.has('headgear') || tags.has('head');
  if (equipSlot === 'body') return tags.has('armor') || tags.has('body');
  if (equipSlot === 'garment') return tags.has('garment');
  if (equipSlot === 'shoes') return tags.has('shoes');
  if (equipSlot === 'accessory_1' || equipSlot === 'accessory_2') {
    return tags.has('accessory') || tags.has('accessory_1') || tags.has('accessory_2');
  }
  return false;
}

interface RawEvalResult {
  total_dps: number;
  auto_dps: number;
  skill_dps: number;
  skill_breakdown: SkillDpsDetail[];
  combat_metrics: CombatMetrics;
  totals: Record<string, number>;
  passive_bonuses: Record<string, number>;
  gld_vit_mult: number;
  king_balanced: boolean;
  active_card_mechanics: string[];
}

export function evaluateBuildDps(
  baseStats: Record<string, number>,
  passiveIds: string[],
  setIds: string[],
  job: JobMeta,
  level: number,
  gear: GearInput,
  target: TargetInput,
  cardsLoadout: CardMeta[] = [],
  disabledSkills: string[] = []
): RawEvalResult {
  const disabledSet = new Set(disabledSkills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const disabledNorm = new Set(Array.from(disabledSet).map((s) => s.replace(/[^a-z0-9]/g, '')));
  const isSkillDisabled = (id: string, name = '') => {
    if (disabledSet.size === 0) return false;
    if (disabledSet.has(id.toLowerCase()) || (name && disabledSet.has(name.toLowerCase()))) return true;
    const nId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nNm = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    return disabledNorm.has(nId) || (Boolean(nNm) && disabledNorm.has(nNm));
  };
  const passiveMap = new Map<string, PassiveMeta>();
  for (const p of LIVE_PASSIVES_CACHE) {
    passiveMap.set(p.id, p);
    passiveMap.set(p.id.toLowerCase(), p);
    passiveMap.set(p.name, p);
    passiveMap.set(p.name.toLowerCase(), p);
  }
  const setMap = new Map<string, ArmorSetMeta>();
  for (const s of LIVE_ARMOR_SETS_CACHE) {
    setMap.set(s.id, s);
    setMap.set(s.id.toLowerCase(), s);
    setMap.set(s.name, s);
    setMap.set(s.name.toLowerCase(), s);
  }

  const p: Record<string, number> = {
    atk_pct: 0,
    matk_pct: 0,
    vit: 0,
    str: 0,
    dex: 0,
    int: 0,
    agi: 0,
    luk: 0,
    hp_pct: 0,
    sp_pct: 0,
    crit: 0,
    mcrit: 0,
    crit_dmg: 0,
    agi_to_atk: 0,
    hp_to_atk: 0,
    dex_to_atk: 0,
    hit_to_atk: 0,
    sp_to_matk: 0,
    dex_to_matk: 0,
    agi_to_matk: 0,
    def_to_atk: 0,
    def: 0,
    mdef: 0,
    light_dark_dmg: 0,
    cd_red: 0,
    flat_cd_red: 0,
    aspd_pct: 0,
    hit: 0,
    hit_pct: 0,
    flee_pct: 0,
    coated_dmg: 0,
    elem_dmg: 0,
    double_hit_chance: 0,
    phys_pierce: 0,
    magic_pierce: 0,
    cast_reduce_pct: 0,
  };

  for (const pid of passiveIds) {
    const pmeta = passiveMap.get(pid);
    if (!pmeta || !isPassiveCompatible(pmeta, job)) continue;
    for (const [k, v] of Object.entries(pmeta.bonuses)) {
      p[k] = (p[k] ?? 0) + v;
    }
  }

  const s: Record<string, number> = {
    phys_pierce: 0,
    magic_pierce: 0,
    atk_pct: 0,
    matk_pct: 0,
    crit: 0,
    mcrit: 0,
    crit_dmg: 0,
    flat_hp: 0,
    def: 0,
    mdef: 0,
    hit: 0,
    flee: 0,
    dex: 0,
  };

  for (const sid of setIds) {
    const smeta = setMap.get(sid);
    if (!smeta) continue;
    for (const [k, v] of Object.entries(smeta.bonuses)) {
      s[k] = (s[k] ?? 0) + v;
    }
  }

  const c: Record<string, number> = {
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    dex: 0,
    luk: 0,
    flat_atk: 0,
    flat_matk: 0,
    atk_pct: 0,
    matk_pct: 0,
    phys_pierce: 0,
    magic_pierce: 0,
    crit: 0,
    mcrit: 0,
    crit_dmg: 0,
    flat_hp: 0,
    hp_pct: 0,
    flat_sp: 0,
    sp_pct: 0,
    hit: 0,
    flee: 0,
    def: 0,
    mdef: 0,
    aspd_pct: 0,
    cast_reduce_pct: 0,
  };
  const cardAspdValues: number[] = [];
  let hasNagaCard = false;
  let hasEclipseCard = false;
  let hasQuakeCard = false;
  const activeMechanics = new Set<string>();

  for (const card of cardsLoadout) {
    if (card.id.includes('naga')) hasNagaCard = true;
    if (card.id.includes('eclipse')) hasEclipseCard = true;
    if (card.id.includes('quake')) hasQuakeCard = true;
    for (const mech of card.mechanics || []) {
      activeMechanics.add(mech);
    }
    for (const [k, v] of Object.entries(card.bonuses || {})) {
      if (k.startsWith('m') && v > 0 && k !== 'matk_pct' && k !== 'magic_pierce' && k !== 'mcrit' && k !== 'mdef' && k !== 'max_hp') {
        activeMechanics.add(k);
      }
      if (k === 'aspd_flat' || k === 'aspd') {
        cardAspdValues.push(v);
      } else {
        c[k] = (c[k] ?? 0) + v;
      }
    }
  }
  if (activeMechanics.has('mNaga')) hasNagaCard = true;
  if (activeMechanics.has('mEclipse')) hasEclipseCard = true;
  if (activeMechanics.has('mQuake')) hasQuakeCard = true;

  const jb = job.job_bonuses || {};
  const inn =
    job.id === 'templar' && isSkillDisabled('templarmastery', 'Templar Mastery')
      ? {}
      : job.innate_stats || {};

  const total_vit = (baseStats.vit ?? 1) + (jb.vit ?? 0) + (inn.vit ?? 0) + gear.vit + p.vit + c.vit;
  const total_str = (baseStats.str ?? 1) + (jb.str ?? 0) + (inn.str ?? 0) + gear.str + p.str + c.str;
  const total_agi = (baseStats.agi ?? 1) + (jb.agi ?? 0) + (inn.agi ?? 0) + gear.agi + p.agi + c.agi;
  const total_dex = (baseStats.dex ?? 1) + (jb.dex ?? 0) + (inn.dex ?? 0) + gear.dex + p.dex + s.dex + c.dex;
  const total_int = (baseStats.int ?? 1) + (jb.int ?? 0) + (inn.int ?? 0) + gear.int + p.int + c.int;
  const total_luk = (baseStats.luk ?? 1) + (jb.luk ?? 0) + (inn.luk ?? 0) + gear.luk + p.luk + c.luk;

  const isKingBalanced =
    job.id === 'king' && (baseStats.str ?? 1) === (baseStats.int ?? 1) && (baseStats.str ?? 1) > 10;
  const kingDmgMult = isKingBalanced ? 1.3 : 1.0;
  const kingPierceBonus = isKingBalanced ? 0.1 : 0.0;

  // MaxHP & MaxSP (Nov 13 VIT Rebalance)
  const { maxHp: max_hp, bodyHp } = calcMaxHp({
    level,
    baseVit: baseStats.vit ?? 1,
    totalVit: total_vit,
    jobHpPct: job.hp_bonus_pct ?? 0,
    gearCardSetHp: gear.flat_hp + s.flat_hp + c.flat_hp,
    passiveHpPct: (inn.hp_pct ?? 0) + gear.hp_pct + p.hp_pct + c.hp_pct,
    isPvp: !target.is_monster,
    hasNagaCard,
  });

  const max_sp = calcMaxSp({
    level,
    totalInt: total_int,
    jobSpPct: job.sp_bonus_pct ?? 0,
    gearCardSetSp: gear.flat_sp + c.flat_sp,
    passiveSpPct: (inn.sp_pct ?? 0) + gear.sp_pct + p.sp_pct + c.sp_pct,
  });

  // HIT & FLEE (completely independent from ASPD!)
  const total_hit = calcHit({
    level,
    totalDex: total_dex,
    totalLuk: total_luk,
    flatPassiveHit: p.hit,
    gearCardSetHit: gear.hit + s.hit + c.hit,
    passiveHitPct: p.hit_pct,
    hasQuakeCard,
  });

  const player_flee = calcFlee({
    level,
    totalAgi: total_agi,
    totalLuk: total_luk,
    gearCardSetFlee: (gear.flee ?? 0) + s.flee + c.flee,
    passiveFleePct: p.flee_pct,
  });

  const hit_rate = calcHitChance(total_hit, target.target_flee, false);

  // Player DEF & MDEF (Cap 255 -> 85% DR)
  const player_def = Math.min(
    255,
    Math.floor(gear.gear_def + (inn.def ?? 0) + p.def + s.def + c.def + Math.floor(total_vit / 15))
  );
  const player_mdef = Math.min(
    255,
    Math.floor(gear.gear_mdef + (inn.mdef ?? 0) + p.mdef + s.mdef + c.mdef + Math.floor(total_int / 10))
  );

  // ATK & MATK (Exact Wiki scaling + refine ATK)
  const refineAtk = calcRefineAtkMatk(gear.weapon_refine, gear.is_two_handed);
  const atkStatScale = job.is_ranged_dex_atk
    ? total_dex * 3.0 + Math.floor(total_str / 5.0)
    : total_str * 3.0 + Math.floor(total_dex / 5.0);
  const atkConv = Math.floor(
    bodyHp * p.hp_to_atk +
      total_hit * p.hit_to_atk +
      total_dex * p.dex_to_atk +
      total_agi * p.agi_to_atk
  );
  const ironcladAtk = Math.round(player_def * p.def_to_atk);
  const atkBase =
    10.0 + atkStatScale + Math.floor(total_luk / 10.0) + Math.max(0, level - 1) * 0.3 + atkConv;
  const total_atk =
    (atkBase + ironcladAtk + gear.flat_atk + refineAtk + c.flat_atk) *
    (1.0 + (inn.atk_pct ?? 0) + gear.atk_pct + p.atk_pct + s.atk_pct + c.atk_pct);

  const matkConv = Math.floor(
    max_sp * p.sp_to_matk + total_dex * p.dex_to_matk + total_agi * p.agi_to_matk
  );
  const matkBase =
    5.0 + total_int * 3.0 + Math.floor(total_dex / 5.0) + Math.max(0, level - 1) * 0.3 + matkConv;
  const refineMatk = job.primary_dmg_type !== 'physical' ? refineAtk : 0;
  const total_matk =
    (matkBase + gear.flat_matk + refineMatk + c.flat_matk) *
    (1.0 + (inn.matk_pct ?? 0) + gear.matk_pct + p.matk_pct + s.matk_pct + c.matk_pct);

  // CRIT (Physical vs Spell) & Multiplier (2.0x base)
  const isThiefKnife =
    job.id === 'thief' && (job.weapon_type === 'knife' || job.weapon_type === 'dagger_pair');
  const critPct = Math.min(
    100,
    (Math.floor(total_luk / 3) + Math.max(0, level - 1) * 0.1 + gear.crit * 100 + s.crit * 100 + c.crit * 100 + p.crit * 100) *
      (isThiefKnife ? 2.0 : 1.0)
  );
  const crit_rate = critPct / 100.0;

  const mcritPct = Math.min(
    100,
    Math.floor(total_luk / 3) + gear.mcrit * 100 + s.mcrit * 100 + c.mcrit * 100 + (inn.mcrit ?? 0) * 100
  );
  const mcrit_rate = mcritPct / 100.0;

  const crit_dmg_mult = 2.0 * (1.0 + (inn.crit_dmg ?? 0) + gear.crit_dmg + p.crit_dmg + s.crit_dmg + c.crit_dmg);
  const phys_crit_ev = 1.0 - crit_rate + crit_rate * crit_dmg_mult;
  const magic_crit_ev = 1.0 - mcrit_rate + mcrit_rate * crit_dmg_mult;

  // Pierce & Target DR (Crits do NOT bypass DEF/MDEF!)
  const refine_pierce = calcWeaponRefinePierceBonus(gear.weapon_refine, gear.is_two_handed);
  const phys_pierce = gear.phys_pierce + s.phys_pierce + c.phys_pierce + p.phys_pierce + refine_pierce + kingPierceBonus;
  const magic_pierce = gear.magic_pierce + s.magic_pierce + c.magic_pierce + p.magic_pierce + refine_pierce + kingPierceBonus;

  const target_phys_dr = calcDefReduction(target.target_def);
  const target_magic_dr = calcDefReduction(target.target_mdef);
  const phys_def_mult = 1.0 - Math.max(0.0, target_phys_dr - Math.min(1.0, phys_pierce));
  const magic_def_mult = 1.0 - Math.max(0.0, target_magic_dr - Math.min(1.0, magic_pierce));

  // ASPD (Completely distinct from HIT!)
  const offType = (gear.offhand_type || job.offhand_type || 'none').toLowerCase();
  const hasActualShield = !gear.is_two_handed && !NON_SHIELD_OFFHANDS.has(offType);
  const aspdInfo = calcAspdDetails({
    jobId: job.id,
    weaponType: job.weapon_type,
    totalAgi: total_agi,
    totalDex: total_dex,
    aspdPct: (inn.aspd_pct ?? 0) + (gear.aspd_pct ?? 0) + p.aspd_pct + c.aspd_pct,
    flatGearSetPotionAspd: gear.aspd_flat ?? 5.0,
    cardAspdValues,
    hasActualShield,
  });

  // Auto-Attack DPS
  const double_mult = 1.0 + p.double_hit_chance;
  const auto_elem: ElementType = gear.weapon_coating ?? 'neutral';
  let auto_elem_mult = calcElementMultiplier(auto_elem, target.element, hasEclipseCard);
  if (auto_elem === 'light' || auto_elem === 'dark') auto_elem_mult *= 1.0 + p.light_dark_dmg;
  if (auto_elem !== 'neutral') auto_elem_mult *= 1.0 + p.elem_dmg;
  if (gear.weapon_coating) auto_elem_mult *= 1.0 + p.coated_dmg;

  // Card mechanics multiplicative damage bonuses (matching backend optimizer.py)
  let cardMechMult = 1.0;
  let cardSkillPenaltyMult = 1.0;
  const isParty = Boolean(target.is_party);
  const tLow = (target.name || '').toLowerCase();
  const isBossTarget =
    tLow.includes('boss') ||
    tLow.includes('mvp') ||
    tLow.includes('leader') ||
    target.target_def >= 150;

  if (target.is_monster) {
    if (activeMechanics.has('mTitan')) {
      cardMechMult *= isBossTarget ? 1.25 : 0.9;
    }
    if (activeMechanics.has('mExecute')) {
      cardMechMult *= isParty ? 1.06 : 1.088;
    }
    if (activeMechanics.has('mOpener') && !isParty && !isBossTarget) {
      cardMechMult *= 1.08;
    }
    if (activeMechanics.has('mWeakSpot')) {
      if (isParty || PERSISTENT_STATUS_JOBS.has(job.id)) {
        cardMechMult *= 1.1;
      } else if (activeMechanics.has('mLantern') || activeMechanics.has('mGrasp')) {
        cardMechMult *= 1.06;
      } else if (!isBossTarget && (MOB_CC_STATUS_JOBS.has(job.id) || activeMechanics.has('mCrack') || activeMechanics.has('mMelt'))) {
        cardMechMult *= 1.07;
      }
    }
    if (activeMechanics.has('mFarShot')) {
      cardMechMult *= !job.is_melee ? 1.12 : 0.9;
    }
    if (activeMechanics.has('mSwarm')) {
      if (aspdInfo.aspd >= 192.9) cardMechMult *= 1.1;
      else if (aspdInfo.aspd >= 188) cardMechMult *= 1.06;
      else if (aspdInfo.aspd >= 180) cardMechMult *= 1.02;
    }
    if (activeMechanics.has('mRage')) {
      // Rage scales atk_pct/matk_pct linearly (~+7.5% melee / +2.5% ranged)
      cardMechMult *= job.is_melee ? 1.05 : 1.015;
    }
    if (activeMechanics.has('mCocoa')) {
      cardSkillPenaltyMult *= 0.9;
    }
  }

  const isTemplar = job.id === 'templar';
  const guillotineScale = isTemplar && !isSkillDisabled('sacredguillotine', 'Sacred Guillotine Chain') ? 1.748 : 0;
  const colossusAtkScale = isTemplar && !isSkillDisabled('colossusbash', 'Colossus Radiant Bash') ? 0.4025 : 0;
  const colossusHpScale = isTemplar && !isSkillDisabled('colossusbash', 'Colossus Radiant Bash') ? 0.021 : 0;
  const templarBaseAutoScale = isTemplar ? Math.max(0, job.auto_atk_scale - 1.748 - 0.4025) : job.auto_atk_scale;

  const autoCommonMult =
    aspdInfo.high_aspd_basic_bonus *
    auto_elem_mult *
    hit_rate *
    (job.uses_matk_basic_attack ? magic_crit_ev : phys_crit_ev) *
    (job.uses_matk_basic_attack ? magic_def_mult : phys_def_mult) *
    kingDmgMult *
    cardMechMult *
    aspdInfo.attacks_per_sec *
    double_mult;

  const effectiveAutoAtkScale = isTemplar ? templarBaseAutoScale + guillotineScale + colossusAtkScale : job.auto_atk_scale;
  const effectiveAutoHpScale = isTemplar ? colossusHpScale : job.auto_hp_scale;

  const autoBaseDmg =
    ((job.uses_matk_basic_attack && !job.uses_tablet_hybrid_basic ? 0 : total_atk * effectiveAutoAtkScale) +
      total_matk * (job.auto_matk_scale || (job.uses_matk_basic_attack ? 1.0 : 0)) +
      max_hp * effectiveAutoHpScale) *
    aspdInfo.high_aspd_basic_bonus;

  const auto_hit_dmg =
    autoBaseDmg *
    auto_elem_mult *
    hit_rate *
    (job.uses_matk_basic_attack ? magic_crit_ev : phys_crit_ev) *
    (job.uses_matk_basic_attack ? magic_def_mult : phys_def_mult) *
    kingDmgMult *
    cardMechMult;
  const auto_dps = auto_hit_dmg * aspdInfo.attacks_per_sec * double_mult;

  // Cast time & DEX > 150 multi-hit acceleration
  const cast_factor = total_dex < 150 ? Math.max(0.0, 1.0 - total_dex / 150.0) : 0.0;
  const multi_hit_speedup = total_dex > 150 ? Math.min(0.6, (total_dex - 150) * 0.006) : 0.0;
  const castCut = Math.max(0, 1.0 - Math.min(0.3, c.cast_reduce_pct) - p.cast_reduce_pct);

  const skillDetails: SkillDpsDetail[] = [];
  let total_skill_dps = 0;

  for (const sk of job.skills) {
    if (sk.aspd_scaling_type === 'normal_attack_proc') {
      continue; // Already accounted in Auto-Attack / Procs
    }
    if (isSkillDisabled(sk.id, sk.name)) {
      continue;
    }
    if (sk.atk_scale <= 0 && sk.matk_scale <= 0 && sk.hp_scale <= 0 && !sk.vit_tier_hp_scale) {
      continue;
    }
    const eff_elem: ElementType =
      sk.uses_weapon_coating && sk.element === 'neutral' ? gear.weapon_coating ?? 'neutral' : sk.element;
    let e_mult = calcElementMultiplier(eff_elem, target.element, hasEclipseCard);
    if (eff_elem === 'light' || eff_elem === 'dark') e_mult *= 1.0 + p.light_dark_dmg;
    if (eff_elem !== 'neutral') e_mult *= 1.0 + p.elem_dmg;
    if (sk.uses_weapon_coating && gear.weapon_coating) e_mult *= 1.0 + p.coated_dmg;

    const gldMult = sk.vit_tier_hp_scale ? calcGldVitMultiplier(Math.floor(total_vit)) : sk.hp_scale;
    const atkPortionMult = target.is_monster ? (sk.atk_monster_mult ?? 1.0) : 1.0;
    let raw_dmg =
      (total_atk * sk.atk_scale * atkPortionMult +
      total_matk * sk.matk_scale +
      max_hp * gldMult) * cardSkillPenaltyMult;
    if (target.is_monster) raw_dmg *= sk.monster_mult;

    const h_mult = sk.never_misses ? 1.0 : hit_rate;
    let c_mult = 1.0;
    let d_mult = 1.0;
    let sk_crit_chance = crit_rate;

    if (sk.dmg_type === 'magic') {
      c_mult = sk.can_crit ? magic_crit_ev : 1.0;
      d_mult = sk.ignores_def ? 1.0 : magic_def_mult;
      sk_crit_chance = mcrit_rate;
    } else if (sk.dmg_type === 'hybrid') {
      c_mult = sk.can_crit ? (phys_crit_ev + magic_crit_ev) * 0.5 : 1.0;
      d_mult = sk.ignores_def ? 1.0 : (phys_def_mult + magic_def_mult) * 0.5;
      sk_crit_chance = (crit_rate + mcrit_rate) * 0.5;
    } else {
      c_mult = sk.can_crit ? phys_crit_ev : 1.0;
      d_mult = sk.ignores_def ? 1.0 : phys_def_mult;
      sk_crit_chance = crit_rate;
    }

    const expected_dmg = raw_dmg * e_mult * h_mult * c_mult * d_mult * kingDmgMult * cardMechMult;
    const base_cd = sk.effective_uptime_cd ?? sk.cooldown;
    const eff_cast = sk.cast_time * cast_factor * castCut + (sk.fixed_cast ?? 0);
    let eff_cd = sk.cooldown_from_aspd
      ? Math.max(0.25, 1.0 / aspdInfo.attacks_per_sec)
      : Math.max(0.5, Math.max(0.2, base_cd - (p.flat_cd_red ?? 0)) * (1.0 - Math.min(0.8, p.cd_red)) + eff_cast);
    if (sk.multi_hit_spell && total_dex > 150) {
      eff_cd = Math.max(0.5, eff_cd * (1.0 - multi_hit_speedup * 0.35));
    }
    const sk_dps = expected_dmg / eff_cd;
    total_skill_dps += sk_dps;

    skillDetails.push({
      skill_id: sk.id,
      name: sk.name,
      zh_name: sk.zh_name,
      dmg_type: sk.dmg_type,
      element: eff_elem,
      uses_coating: sk.uses_weapon_coating,
      expected_dmg_per_cast: expected_dmg,
      base_cd,
      effective_cd: eff_cd,
      dps: sk_dps,
      share_pct: 0,
      hit_chance: h_mult * 100,
      crit_chance: sk_crit_chance * 100,
      elem_mult: e_mult,
      def_mult: d_mult,
      notes: sk.vit_tier_hp_scale
        ? `VIT ${Math.floor(total_vit)} -> ${gldMult}×MaxHP 檔位${target.is_monster ? ' (+50% 對怪)' : ''}`
        : sk.uses_weapon_coating
        ? `跟隨武器附魔 (${eff_elem.toUpperCase()})`
        : `固定 ${eff_elem.toUpperCase()} 屬性`,
    });
  }

  // Wicked Necromancer 3 Black Cat Summons (INT 100/200/300 tiers, inheriting ASPD, M.CRIT & Dark element)
  if (job.id === 'necromancer') {
    const intTierMult = total_int >= 300 ? 1.45 : total_int >= 200 ? 1.25 : total_int >= 100 ? 1.1 : 1.0;
    const summonMult = 1.6 * intTierMult; // Soul-Lantern Harvest (+50%) + Summon Mastery (+10%)
    const darkMult =
      calcElementMultiplier('dark', target.element, hasEclipseCard) *
      (1.0 + p.light_dark_dmg) *
      (1.0 + p.elem_dmg);
    const catDefs = [
      { id: 'cat_knight', name: 'Black Cat Knight', scale: 1.85 },
      { id: 'cat_archer', name: 'Black Cat Archer', scale: 2.15 },
      { id: 'cat_cleric', name: 'Black Cat Cleric', scale: 1.45 },
    ];
    const catCd = Math.max(0.35, 1.0 / aspdInfo.attacks_per_sec);
    for (const cat of catDefs) {
      const catHitDmg =
        total_matk *
        cat.scale *
        summonMult *
        darkMult *
        magic_crit_ev *
        magic_def_mult *
        cardMechMult;
      const catDps = catHitDmg / catCd;
      total_skill_dps += catDps;
      skillDetails.push({
        skill_id: cat.id,
        name: cat.name,
        zh_name: cat.name,
        dmg_type: 'magic',
        element: 'dark',
        uses_coating: false,
        expected_dmg_per_cast: catHitDmg,
        base_cd: catCd,
        effective_cd: catCd,
        dps: catDps,
        share_pct: 0,
        hit_chance: 100,
        crit_chance: mcrit_rate * 100,
        elem_mult: darkMult,
        def_mult: magic_def_mult,
        notes: `召喚黑貓 · INT ${Math.floor(total_int)} 檔位 × 繼承 ASPD & M.CRIT`,
      });
    }
  }

  const total_dps = auto_dps + total_skill_dps;
  const autoHitEntries: SkillDpsDetail[] = isTemplar
    ? [
        {
          skill_id: 'basic_auto',
          name: 'Basic Auto-Attack',
          zh_name: '基礎普攻 (Basic Auto-Attack)',
          dmg_type: 'physical',
          element: auto_elem,
          uses_coating: true,
          expected_dmg_per_cast: total_atk * templarBaseAutoScale * (autoCommonMult / Math.max(0.001, aspdInfo.attacks_per_sec)),
          base_cd: 1 / aspdInfo.attacks_per_sec,
          effective_cd: 1 / aspdInfo.attacks_per_sec,
          dps: total_atk * templarBaseAutoScale * autoCommonMult,
          share_pct: total_dps > 0 ? ((total_atk * templarBaseAutoScale * autoCommonMult) / total_dps) * 100 : 0,
          hit_chance: hit_rate * 100,
          crit_chance: crit_rate * 100,
          elem_mult: auto_elem_mult,
          def_mult: phys_def_mult,
          notes: `ASPD ${aspdInfo.aspd.toFixed(1)} (${aspdInfo.attacks_per_sec.toFixed(2)} 下/秒, ${aspdInfo.attack_interval_ms}ms)`,
        },
        ...(guillotineScale > 0
          ? [
              {
                skill_id: 'sacredguillotine',
                name: 'Sacred Guillotine Chain',
                zh_name: '聖斷鎖鏈 (Sacred Guillotine Chain)',
                dmg_type: 'physical',
                element: auto_elem,
                uses_coating: true,
                expected_dmg_per_cast: total_atk * guillotineScale * (autoCommonMult / Math.max(0.001, aspdInfo.attacks_per_sec)),
                base_cd: 5 / aspdInfo.attacks_per_sec,
                effective_cd: 5 / aspdInfo.attacks_per_sec,
                dps: total_atk * guillotineScale * autoCommonMult,
                share_pct: total_dps > 0 ? ((total_atk * guillotineScale * autoCommonMult) / total_dps) * 100 : 0,
                hit_chance: hit_rate * 100,
                crit_chance: crit_rate * 100,
                elem_mult: auto_elem_mult,
                def_mult: phys_def_mult,
                notes: '每 5 次普攻觸發 4 段鎖鏈 (均攤 +174.8% ATK/下)',
              } as SkillDpsDetail,
            ]
          : []),
        ...(colossusAtkScale > 0 || colossusHpScale > 0
          ? [
              {
                skill_id: 'colossusbash',
                name: 'Colossus Radiant Bash',
                zh_name: '巨像聖擊 (Colossus Radiant Bash)',
                dmg_type: 'physical',
                element: auto_elem,
                uses_coating: true,
                expected_dmg_per_cast: (total_atk * colossusAtkScale + max_hp * colossusHpScale) * (autoCommonMult / Math.max(0.001, aspdInfo.attacks_per_sec)),
                base_cd: 1 / Math.max(0.001, 0.35 * aspdInfo.attacks_per_sec),
                effective_cd: 1 / Math.max(0.001, 0.35 * aspdInfo.attacks_per_sec),
                dps: (total_atk * colossusAtkScale + max_hp * colossusHpScale) * autoCommonMult,
                share_pct: total_dps > 0 ? (((total_atk * colossusAtkScale + max_hp * colossusHpScale) * autoCommonMult) / total_dps) * 100 : 0,
                hit_chance: hit_rate * 100,
                crit_chance: crit_rate * 100,
                elem_mult: auto_elem_mult,
                def_mult: phys_def_mult,
                notes: '普攻 35% 機率重擊 115% ATK + 6% MaxHP',
              } as SkillDpsDetail,
            ]
          : []),
      ]
    : [
        {
          skill_id: 'auto_attack',
          name: 'Auto-Attack (+Procs)',
          zh_name: '普攻與連段觸發 (Auto-Attack)',
          dmg_type: job.uses_matk_basic_attack ? 'magic' : 'physical',
          element: auto_elem,
          uses_coating: true,
          expected_dmg_per_cast: auto_hit_dmg * double_mult,
          base_cd: 1 / aspdInfo.attacks_per_sec,
          effective_cd: 1 / aspdInfo.attacks_per_sec,
          dps: auto_dps,
          share_pct: total_dps > 0 ? (auto_dps / total_dps) * 100 : 0,
          hit_chance: hit_rate * 100,
          crit_chance: crit_rate * 100,
          elem_mult: auto_elem_mult,
          def_mult: job.uses_matk_basic_attack ? magic_def_mult : phys_def_mult,
          notes: `ASPD ${aspdInfo.aspd.toFixed(1)} (${aspdInfo.attacks_per_sec.toFixed(2)} 下/秒, ${aspdInfo.attack_interval_ms}ms)`,
        },
      ];

  const fullBreakdown: SkillDpsDetail[] = [
    ...autoHitEntries,
    ...skillDetails.map((item) => ({
      ...item,
      share_pct: total_dps > 0 ? (item.dps / total_dps) * 100 : 0,
    })),
  ];

  const hitFormulaNote = `HIT = floor((100 + Lv${level} + DEX(${Math.floor(total_dex)})×2 + ⌊LUK(${Math.floor(total_luk)})/3⌋ + Gear/Passive) × (1 + Hit%)) vs Target FLEE ${target.target_flee}`;
  const aspdFormulaNote = `ASPD = min(193, softcap180((Base ${aspdInfo.class_base_aspd} + Offset ${aspdInfo.weapon_aspd_offset}${aspdInfo.shield_penalty !== 0 ? ` ${aspdInfo.shield_penalty}` : ''} + (AGI×0.3+DEX×0.02)×${aspdInfo.agi_dex_factor.toFixed(2)}) + ASPD% + Gear/Potion + CardMax ${aspdInfo.max_card_aspd}))`;

  return {
    total_dps,
    auto_dps,
    skill_dps: total_skill_dps,
    skill_breakdown: fullBreakdown,
    combat_metrics: {
      max_hp,
      max_sp,
      total_atk,
      total_matk,
      phys_pierce_pct: phys_pierce * 100,
      magic_pierce_pct: magic_pierce * 100,
      target_phys_dr_pct: target_phys_dr * 100,
      target_magic_dr_pct: target_magic_dr * 100,
      effective_phys_mult: phys_def_mult,
      effective_magic_mult: magic_def_mult,
      crit_rate_pct: crit_rate * 100,
      mcrit_rate_pct: mcrit_rate * 100,
      crit_dmg_mult,
      hit_total: total_hit,
      player_flee,
      target_flee: target.target_flee,
      hit_chance_pct: hit_rate * 100,
      hit_formula_note: hitFormulaNote,
      aspd: aspdInfo.aspd,
      aspd_cap: 193,
      attacks_per_sec: aspdInfo.attacks_per_sec,
      attack_interval_ms: aspdInfo.attack_interval_ms,
      high_aspd_basic_bonus_pct: Math.round((aspdInfo.high_aspd_basic_bonus - 1) * 1000) / 10,
      aspd_formula_note: aspdFormulaNote,
      double_hit_chance_pct: p.double_hit_chance * 100,
      player_def,
      player_mdef,
      player_phys_dr_pct: (player_def / 300.0) * 100,
      player_magic_dr_pct: (player_mdef / 300.0) * 100,
      cast_time_reduction_pct: (1.0 - cast_factor * castCut) * 100,
      multi_hit_speedup_pct: multi_hit_speedup * 100,
      cd_reduction_pct: p.cd_red * 100,
      gld_vit_mult: calcGldVitMultiplier(Math.floor(total_vit)),
    },
    totals: {
      vit: total_vit,
      str: total_str,
      agi: total_agi,
      dex: total_dex,
      int: total_int,
      luk: total_luk,
    },
    passive_bonuses: p,
    gld_vit_mult: calcGldVitMultiplier(Math.floor(total_vit)),
    king_balanced: isKingBalanced,
    active_card_mechanics: Array.from(activeMechanics),
  };
}

function buildLocalCardRecommendations(
  baseStats: Record<string, number>,
  pCombo: string[],
  sCombo: string[],
  job: JobMeta,
  level: number,
  gear: GearInput,
  target: TargetInput,
  budgetMode: 'limited' | 'budget' = 'limited'
): CardRecommendations {
  const baseEval = evaluateBuildDps(baseStats, pCombo, sCombo, job, level, gear, target, []);
  const baseDps = baseEval.total_dps;
  const equipSlots = gear.is_two_handed
    ? ['weapon_1', 'weapon_2', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2']
    : ['weapon_1', 'shield', 'head_upper', 'head_mid', 'head_lower', 'body', 'garment', 'shoes', 'accessory_1', 'accessory_2'];

  const pool = LIVE_CARDS_CACHE.filter((c) => (budgetMode === 'budget' ? !c.is_limited : true));
  const chosen: CardMeta[] = [];
  const weaponChosen = new Set<string>();
  const cardsBySlot: Record<string, CardSlotEntry | null> = {};
  const recommendations: CardSlotEntry[] = [];
  let currentDps = baseDps;

  for (const slot of equipSlots) {
    let slotCands = pool.filter((c) => cardMatchesSlot(c, slot));
    if (slot === 'weapon_2') {
      slotCands = slotCands.filter((c) => !weaponChosen.has(c.id) || c.max_per_item > 1);
    }
    let bestCard: CardMeta | null = null;
    let bestDps = currentDps;
    for (const cand of slotCands) {
      const r = evaluateBuildDps(baseStats, pCombo, sCombo, job, level, gear, target, [...chosen, cand]);
      if (r.total_dps > bestDps + 1e-6) {
        bestDps = r.total_dps;
        bestCard = cand;
      }
    }
    if (bestCard) {
      chosen.push(bestCard);
      if (slot === 'weapon_1' || slot === 'weapon_2') weaponChosen.add(bestCard.id);
      const gain = Math.round((bestDps - currentDps) * 100) / 100;
      const gainPct = Math.round((gain / Math.max(1, currentDps)) * 10000) / 100;
      currentDps = bestDps;
      const entry: CardSlotEntry = {
        equip_slot: slot,
        slot_label: SLOT_LABELS[slot] ?? slot,
        card_id: bestCard.id,
        name: bestCard.name,
        tier: bestCard.tier ?? 'Special',
        is_limited: bestCard.is_limited,
        removable: bestCard.removable,
        bonuses: bestCard.bonuses,
        mechanics: bestCard.mechanics ?? [],
        source_monsters: bestCard.source_monsters,
        description: bestCard.description,
        marginal_dps_gain: gain,
        marginal_dps_gain_pct: gainPct,
      };
      cardsBySlot[slot] = entry;
      recommendations.push(entry);
    } else {
      cardsBySlot[slot] = null;
    }
  }
  if (gear.is_two_handed) cardsBySlot.shield = null;

  return {
    cards_by_slot: cardsBySlot,
    recommendations,
    two_handed_weapon_slots: gear.is_two_handed ? 2 : 1,
    dps_without_cards: Math.round(baseDps * 100) / 100,
    dps_with_cards: Math.round(currentDps * 100) / 100,
    card_dps_gain: Math.round((currentDps - baseDps) * 100) / 100,
    card_dps_gain_pct: Math.round(((currentDps - baseDps) / Math.max(1, baseDps)) * 10000) / 100,
  };
}

function buildLocalGearAffixRecommendations(
  baseStats: Record<string, number>,
  pCombo: string[],
  sCombo: string[],
  job: JobMeta,
  level: number,
  gear: GearInput,
  target: TargetInput,
  evalRes: RawEvalResult,
  cardRecs: CardRecommendations
): GearAffixRecommendations {
  const cm = evalRes.combat_metrics;
  const tot = evalRes.totals;
  const isCaster = job.primary_dmg_type === 'magic';
  const hitDeficit = !isCaster && cm.hit_chance_pct < 100 ? Math.max(0, Math.round(target.target_flee - cm.hit_total)) : 0;
  const aspdDeficit = Math.round(Math.max(0, 193 - cm.aspd) * 10) / 10;
  const physPierceHeadroom = Math.round(Math.max(0, cm.target_phys_dr_pct - cm.phys_pierce_pct) * 10) / 10;
  const magicPierceHeadroom = Math.round(Math.max(0, cm.target_magic_dr_pct - cm.magic_pierce_pct) * 10) / 10;
  const dexCastDeficit = Math.max(0, 150 - Math.floor(tot.dex ?? 0));

  const chosenCards = cardRecs.recommendations
    .map((r) => LIVE_CARDS_CACHE.find((c) => c.id === r.card_id))
    .filter((c): c is CardMeta => Boolean(c));

  // Marginal DPS per +12 primary stat (Tier VI substat roll comparison)
  const statRoles: Record<string, string> = {
    vit: job.id === 'templar' ? 'MaxHP & GLD 25x Scaling' : 'MaxHP & DEF',
    str: job.id === 'king' ? 'Hybrid ATK & STR=INT Resonance' : 'Melee ATK (+3/pt)',
    agi: 'ASPD -> 193 Cap (7.14 APS + 1.5%/pt Basic Dmg)',
    dex: isCaster ? 'Variable Cast (150 Instant) & Multi-hit' : 'HIT (+2/pt) & Min/Ranged ATK',
    int: job.id === 'king' ? 'Hybrid MATK & STR=INT Resonance' : 'MATK (+3/pt) & MDEF/MaxSP',
    luk: 'CRIT / M.CRIT (+0.33%/pt) & HIT/FLEE',
  };

  const baseEvalWithCards = evaluateBuildDps(baseStats, pCombo, sCombo, job, level, gear, target, chosenCards);
  const statPriorityGuide: StatPriorityEntry[] = (['vit', 'luk', 'str', 'agi', 'dex', 'int'] as const)
    .map((st) => {
      const plus12 = evaluateBuildDps(
        baseStats,
        pCombo,
        sCombo,
        job,
        level,
        { ...gear, [st]: (gear[st] ?? 0) + 12 },
        target,
        chosenCards
      );
      const dGain = Math.max(0, Math.round((plus12.total_dps - baseEvalWithCards.total_dps) * 100) / 100);
      const dPct = Math.round((dGain / Math.max(1, baseEvalWithCards.total_dps)) * 10000) / 100;
      return {
        stat: st.toUpperCase(),
        current_total: Math.floor(tot[st] ?? 0),
        role: statRoles[st],
        marginal_dps_per_12: dGain,
        marginal_dps_pct_per_12: dPct,
        priority_tier: dPct >= 2.0 ? 'S (Core DPS)' : dPct >= 0.5 ? 'A (Strong)' : dPct >= 0.05 ? 'B (Support)' : 'C (Skip for DPS)',
      };
    })
    .sort((a, b) => b.marginal_dps_per_12 - a.marginal_dps_per_12);

  // Quantitative VIT +12 vs Blood +180 Flat HP comparison
  const vit12Eval = evaluateBuildDps(
    baseStats,
    pCombo,
    sCombo,
    job,
    level,
    { ...gear, vit: gear.vit + 12 },
    target,
    chosenCards
  );
  const flatHp180Eval = evaluateBuildDps(
    baseStats,
    pCombo,
    sCombo,
    job,
    level,
    { ...gear, flat_hp: gear.flat_hp + 180 },
    target,
    chosenCards
  );
  const vitHpGain = Math.round((vit12Eval.combat_metrics.max_hp - baseEvalWithCards.combat_metrics.max_hp) * 10) / 10;
  const flatHpGain = Math.round((flatHp180Eval.combat_metrics.max_hp - baseEvalWithCards.combat_metrics.max_hp) * 10) / 10;
  const vit12DpsGain = Math.round(Math.max(0, vit12Eval.total_dps - baseEvalWithCards.total_dps) * 100) / 100;
  const flat180DpsGain = Math.round(Math.max(0, flatHp180Eval.total_dps - baseEvalWithCards.total_dps) * 100) / 100;
  const hpRatio = Math.round((vitHpGain / Math.max(1, flatHpGain)) * 100) / 100;
  const dpsAdvRatio = flat180DpsGain > 0 ? Math.round((vit12DpsGain / flat180DpsGain) * 100) / 100 : hpRatio;

  const vitVsFlatHp: VitVsFlatHpComparison = {
    vit_delta: 12,
    flat_hp_delta: 180,
    vit_hp_gain: vitHpGain,
    flat_hp_gain: flatHpGain,
    vit_hp_ratio: hpRatio,
    vit_def_gain: Math.max(0, vit12Eval.combat_metrics.player_def - baseEvalWithCards.combat_metrics.player_def),
    vit_12_dps_gain: vit12DpsGain,
    flat_hp_180_dps_gain: flat180DpsGain,
    dps_advantage_ratio: dpsAdvRatio,
    verdict: `VIT +12 grants +${vitHpGain} MaxHP vs Blood +180 Flat HP's +${flatHpGain} MaxHP (${hpRatio}x more HP). Never pick flat HP over primary VIT.`,
  };

  const topStatTargets = statPriorityGuide
    .filter((s) => s.priority_tier.startsWith('S') || s.priority_tier.startsWith('A') || s.priority_tier.startsWith('B'))
    .slice(0, 3)
    .map((s) => `${s.stat} +12 ~ +18 (${s.role})`);
  const coreSubs =
    job.id === 'king'
      ? ['STR +12 ~ +18 (維持 STR=INT 共鳴)', 'INT +12 ~ +18 (維持 STR=INT 共鳴)']
      : topStatTargets.length >= 2
      ? topStatTargets.slice(0, 2)
      : ['STR +12 ~ +18', 'DEX +12 ~ +18'];
  const fallbackSub = topStatTargets[2] ?? 'LUK +12 ~ +18';
  const hitIndepList = hitDeficit > 0 ? [`HIT (0 ~ +24 獨立副條，不佔 2 格 6 維；尚缺 +${hitDeficit})`] : [];

  const bestWeaponAffix = isCaster
    ? magicPierceHeadroom >= 6
      ? 'Runic (Magic Pierce)'
      : 'Occult (MATK%)'
    : physPierceHeadroom >= 6
    ? 'Piercing (Physical Pierce)'
    : 'Savage (ATK%)';
  const bestWeaponTarget = isCaster
    ? magicPierceHeadroom >= 6
      ? 'Runic (+6% M.Pierce (Tier VI))'
      : 'Occult (+12% MATK (Tier VI))'
    : physPierceHeadroom >= 6
    ? 'Piercing (+6% P.Pierce (Tier VI))'
    : 'Savage (+12% ATK (Tier VI))';

  // Map 6 armor slots to active set combo cleanly
  const setMetaMap = new Map(LIVE_ARMOR_SETS_CACHE.map((s) => [s.id, s]));
  const armorSlotKeys = ['head', 'face', 'mouth', 'armor', 'garment', 'shoes'];
  const slotSetAssignments: Record<string, string | null> = {};
  let cursor = 0;
  for (const sid of sCombo) {
    const sm = setMetaMap.get(sid);
    const pcs = sm?.pieces_required ?? 2;
    const label = `${sm?.name ?? sid} (${pcs}pc)`;
    for (let i = 0; i < pcs && cursor < armorSlotKeys.length; i++) {
      slotSetAssignments[armorSlotKeys[cursor++]] = label;
    }
  }

  const slotCards = (equipSlotKeys: string[]): GearAffixCardEntry[] =>
    equipSlotKeys
      .map((k) => cardRecs.cards_by_slot[k])
      .filter((c): c is CardSlotEntry => Boolean(c))
      .map((c) => ({
        equip_slot: c.equip_slot,
        card_id: c.card_id,
        name: c.name,
        tier: c.tier,
        mechanics: c.mechanics ?? [],
        marginal_dps_gain_pct: c.marginal_dps_gain_pct,
      }));

  const weaponPrefix = bestWeaponAffix.split(' ')[0];
  const obsEval = evaluateBuildDps(
    baseStats,
    pCombo,
    sCombo,
    job,
    level,
    { ...gear, crit: gear.crit + 0.12, flat_atk: Math.max(0, gear.flat_atk - 80) },
    target,
    chosenCards
  );
  const emeEval = evaluateBuildDps(
    baseStats,
    pCombo,
    sCombo,
    job,
    level,
    { ...gear, mcrit: gear.mcrit + 0.12, flat_matk: Math.max(0, gear.flat_matk - 80) },
    target,
    chosenCards
  );
  const obsDelta = Math.round((obsEval.total_dps - baseEvalWithCards.total_dps) * 100) / 100;
  const emeDelta = Math.round((emeEval.total_dps - baseEvalWithCards.total_dps) * 100) / 100;
  const isHybrid = job.primary_dmg_type === 'hybrid' || job.id === 'king';
  const physRingName = obsDelta > 0 ? 'Obsidian Ring' : 'Physical ATK Ring';
  const magicRingName = emeDelta > 0 ? 'Emerald Ring' : 'Magic MATK Ring';
  const acc1Name = isCaster ? magicRingName : physRingName;
  const acc2Name = isCaster || isHybrid ? magicRingName : physRingName;

  let remPhysPierce = physPierceHeadroom;
  let remMagicPierce = magicPierceHeadroom;
  const pickOffenseAffix = (casterPool: boolean) => {
    if (casterPool) {
      if (remMagicPierce >= 1) {
        remMagicPierce = Math.max(0, remMagicPierce - 6);
        return { key: 'mpierce', prefix: 'Runic', name: 'Runic (Magic Pierce)', target: 'Runic (+6% M.Pierce (Tier VI))', tierVi: '+6% M.Pierce (Tier VI)', runners: ['Occult (+12% MATK (Tier VI))', 'Lethal (+12% Crit Dmg (Tier VI))'] };
      }
      return { key: 'matkPct', prefix: 'Occult', name: 'Occult (MATK%)', target: 'Occult (+12% MATK (Tier VI))', tierVi: '+12% MATK (Tier VI)', runners: ['Lethal (+12% Crit Dmg (Tier VI))'] };
    }
    if (remPhysPierce >= 1) {
      remPhysPierce = Math.max(0, remPhysPierce - 6);
      return { key: 'pierce', prefix: 'Piercing', name: 'Piercing (Physical Pierce)', target: 'Piercing (+6% P.Pierce (Tier VI))', tierVi: '+6% P.Pierce (Tier VI)', runners: ['Savage (+12% ATK (Tier VI))', 'Lethal (+12% Crit Dmg (Tier VI))'] };
    }
    return { key: 'atkPct', prefix: 'Savage', name: 'Savage (ATK%)', target: 'Savage (+12% ATK (Tier VI))', tierVi: '+12% ATK (Tier VI)', runners: ['Lethal (+12% Crit Dmg (Tier VI))'] };
  };

  const weaponPick = pickOffenseAffix(isCaster);
  const offhandIsShield = job.offhand_type.toLowerCase() === 'shield';
  const offhandPick = !gear.is_two_handed && !offhandIsShield ? pickOffenseAffix(isCaster) : null;
  const acc1IsMagic = isCaster;
  const acc2IsMagic = isCaster || isHybrid;
  const acc1Pick = pickOffenseAffix(acc1IsMagic);
  const acc2Pick = pickOffenseAffix(acc2IsMagic);

  const buildRingSlot = (
    slot: 'accessory1' | 'accessory2',
    num: 1 | 2,
    isMagicPool: boolean,
    ringName: string,
    pick: ReturnType<typeof pickOffenseAffix>,
    cardSlotKey: string
  ): GearAffixSlotRec => {
    const ringNative =
      ringName === 'Emerald Ring'
        ? 'M.CRIT (+6 ~ +12 Emerald 原生自帶，不佔 2 格 6 維)'
        : ringName === 'Obsidian Ring'
        ? 'CRIT (+6 ~ +12 Obsidian 原生自帶，不佔 2 格 6 維)'
        : isMagicPool
        ? 'MATK (+42 ~ +126 Diamond 原生自帶，不佔 2 格 6 維)'
        : 'ATK (+42 ~ +126 Platinum 原生自帶，不佔 2 格 6 維)';
    return {
      slot,
      slot_label: `Accessory ${num} (${isMagicPool ? 'Magic Ring' : 'Physical Ring'})`,
      template_name: ringName,
      recommended_item_name: `${pick.prefix} ${ringName}`,
      set_assignment: null,
      blocked_by_two_handed: false,
      recommended_special_affix: pick.name,
      special_affix_target: pick.target,
      affix_key: pick.key,
      affix_prefix: pick.prefix,
      tier_vi_max_value: pick.tierVi,
      runner_up_affixes: pick.runners,
      primary_stat_targets: coreSubs,
      recommended_substats: coreSubs,
      fallback_stat_target: fallbackSub,
      independent_roll_targets: [ringNative, ...hitIndepList],
      cards: slotCards([cardSlotKey]),
      rationale: isMagicPool
        ? `${ringName}：法系職業兩個飾品格皆可穿戴法系戒指（固定出 2 種 6 維屬性；Tier VI 可選 Runic +6% M.Pierce / Occult +12% MATK / Lethal +12% Crit Dmg）。`
        : `${ringName}：物理職業兩個飾品格皆可穿戴物理戒指（固定出 2 種 6 維屬性；Tier VI 可選 Piercing +6% P.Pierce / Savage +12% ATK / Lethal +12% Crit Dmg）。`,
    };
  };

  const slots: GearAffixSlotRec[] = [
    {
      slot: 'weapon',
      slot_label: `Weapon (${job.weapon_name})`,
      template_name: job.weapon_name,
      recommended_item_name: `${weaponPick.prefix} ${job.weapon_name}`,
      set_assignment: null,
      blocked_by_two_handed: false,
      recommended_special_affix: weaponPick.name,
      special_affix_target: weaponPick.target,
      affix_key: weaponPick.key,
      affix_prefix: weaponPick.prefix,
      tier_vi_max_value: weaponPick.tierVi,
      runner_up_affixes: weaponPick.runners,
      primary_stat_targets: coreSubs,
      recommended_substats: coreSubs,
      fallback_stat_target: fallbackSub,
      independent_roll_targets: hitIndepList,
      cards: slotCards(['weapon_1', 'weapon_2']),
      rationale: gear.is_two_handed
        ? `2H ${job.weapon_name}: 2x base stats, +60 refine ATK/MATK, +10% refine Pierce, and 2 Card Slots. Target DR leaves ${isCaster ? magicPierceHeadroom : physPierceHeadroom}% pierce headroom.`
        : `1H ${job.weapon_name}: +30 refine ATK/MATK, +5% refine Pierce, paired with ${job.offhand_type}.`,
    },
    gear.is_two_handed
      ? {
          slot: 'shield',
          slot_label: 'Shield / Off-Hand',
          template_name: 'Blocked (2H Equipped)',
          recommended_item_name: 'Blocked (2H Equipped)',
          set_assignment: null,
          blocked_by_two_handed: true,
          recommended_special_affix: null,
          special_affix_target: null,
          affix_key: null,
          affix_prefix: null,
          tier_vi_max_value: null,
          runner_up_affixes: [],
          primary_stat_targets: [],
          recommended_substats: [],
          fallback_stat_target: null,
          independent_roll_targets: [],
          cards: [],
          rationale: `Blocked because ${job.weapon_name} is Two-Handed (2x stats, 2x refine, 2 weapon card slots).`,
        }
      : offhandPick
      ? {
          slot: 'shield',
          slot_label: `Off-Hand (${job.offhand_type})`,
          template_name: job.offhand_type,
          recommended_item_name: `${offhandPick.prefix} ${job.offhand_type}`,
          set_assignment: null,
          blocked_by_two_handed: false,
          recommended_special_affix: offhandPick.name,
          special_affix_target: offhandPick.target,
          affix_key: offhandPick.key,
          affix_prefix: offhandPick.prefix,
          tier_vi_max_value: offhandPick.tierVi,
          runner_up_affixes: offhandPick.runners,
          primary_stat_targets: coreSubs,
          recommended_substats: coreSubs,
          fallback_stat_target: fallbackSub,
          independent_roll_targets: hitIndepList,
          cards: slotCards(['shield']),
          rationale: `Non-shield off-hand (${job.offhand_type}) carries DPS special affixes without -8 ASPD shield penalty.`,
        }
      : {
          slot: 'shield',
          slot_label: `Off-Hand (${job.offhand_type})`,
          template_name: job.offhand_type,
          recommended_item_name: job.offhand_type,
          set_assignment: null,
          blocked_by_two_handed: false,
          recommended_special_affix: null,
          special_affix_target: '無攻擊特詞（單件最多洗 2 種 6 維屬性 +12 ~ +18；HIT/FLEE 為獨立副條）',
          affix_key: null,
          affix_prefix: null,
          tier_vi_max_value: null,
          runner_up_affixes: [],
          primary_stat_targets: coreSubs,
          recommended_substats: coreSubs,
          fallback_stat_target: fallbackSub,
          independent_roll_targets: hitIndepList,
          cards: slotCards(['shield']),
          rationale: 'Actual Shield has -8 ASPD penalty and no DPS special affix; prioritize top 2 core stats.',
        },
    ...(
      [
        ['head', 'Headgear (Upper)', 'Helm / Cap', 'head_upper'],
        ['face', 'Headgear (Mid / Face)', 'Facegear', 'head_mid'],
        ['mouth', 'Headgear (Lower / Mouth)', 'Mouthgear', 'head_lower'],
        ['armor', 'Body Armor', 'Coat', 'body'],
        ['garment', 'Garment', 'Muffler', 'garment'],
        ['shoes', 'Shoes', 'Shoes', 'shoes'],
      ] as const
    ).map(([slotKey, label, tmpl, cardSlotKey]) => {
      const setLabel = slotSetAssignments[slotKey] ?? null;
      return {
        slot: slotKey,
        slot_label: label,
        template_name: tmpl,
        recommended_item_name: setLabel ? `${setLabel} ${tmpl}` : tmpl,
        set_assignment: setLabel,
        blocked_by_two_handed: false,
        recommended_special_affix: null,
        special_affix_target: '無攻擊特詞（單件最多洗 2 種 6 維屬性 +12 ~ +18；HIT/FLEE 為獨立副條）',
        affix_key: null,
        affix_prefix: null,
        tier_vi_max_value: null,
        runner_up_affixes: [],
        primary_stat_targets: coreSubs,
        recommended_substats: coreSubs,
        fallback_stat_target: fallbackSub,
        independent_roll_targets: hitIndepList,
        cards: slotCards([cardSlotKey]),
        rationale:
          '防具無攻擊特詞，單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並湊齊套裝件數。',
      };
    }),
    buildRingSlot('accessory1', 1, acc1IsMagic, acc1Name, acc1Pick, 'accessory_1'),
    buildRingSlot('accessory2', 2, acc2IsMagic, acc2Name, acc2Pick, 'accessory_2'),
  ];

  return {
    breakpoints_status: {
      hit_status: hitDeficit === 0 ? '100% Capped' : `需再補 +${hitDeficit} HIT 達 100% 命中`,
      hit_deficit: hitDeficit,
      aspd_status: `${cm.aspd.toFixed(1)} / 193 (${cm.aspd >= 192.9 ? 'Capped' : `${aspdDeficit} below cap`})`,
      aspd_deficit: aspdDeficit,
      phys_pierce_headroom_pct: physPierceHeadroom,
      magic_pierce_headroom_pct: magicPierceHeadroom,
      dex_cast_deficit: dexCastDeficit,
      templar_vit_300_deficit: job.id === 'templar' ? Math.max(0, 300 - Math.floor(tot.vit ?? 0)) : 0,
      king_str_eq_int_ok: job.id === 'king' ? evalRes.king_balanced : null,
      active_card_mechanics: baseEvalWithCards.active_card_mechanics,
    },
    vit_vs_flat_hp_comparison: vitVsFlatHp,
    stat_priority_guide: statPriorityGuide,
    ring_recommendation: {
      acc1_name: acc1Name,
      acc2_name: acc2Name,
      obsidian_ring_delta_dps: obsDelta,
      emerald_ring_delta_dps: emeDelta,
      rationale: `Obsidian Ring (+CRIT vs -80 ATK) delta: ${obsDelta >= 0 ? '+' : ''}${obsDelta.toFixed(1)} DPS; Emerald Ring (+M.CRIT vs -80 MATK) delta: ${emeDelta >= 0 ? '+' : ''}${emeDelta.toFixed(1)} DPS.`,
    },
    slots,
  };
}

function optimizeStatsForCombo(
  passiveIds: string[],
  setIds: string[],
  job: JobMeta,
  level: number,
  gear: GearInput,
  target: TargetInput
): Record<string, number> {
  const availPts = calcTotalStatPoints(level);
  const cap = level >= 119 ? 119 : 99;
  const allStats = ['vit', 'str', 'agi', 'dex', 'int', 'luk'];
  const cur: Record<string, number> = { vit: 1, str: 1, agi: 1, dex: 1, int: 1, luk: 1 };
  const activeStats = job.active_stats.length > 0 ? job.active_stats : allStats;
  const isKing = job.id === 'king';

  const getSpent = (st: Record<string, number>) =>
    allStats.reduce((acc, k) => acc + calcCumulativeStatCost(st[k] ?? 1), 0);

  let step = 12;
  while (step >= 1) {
    let improved = true;
    while (improved) {
      improved = false;
      let bestStat: string | null = null;
      let bestPair = false;
      let bestDps = evaluateBuildDps(cur, passiveIds, setIds, job, level, gear, target).total_dps;

      if (isKing && cur.str + step <= cap && cur.int + step <= cap) {
        const cand = { ...cur, str: cur.str + step, int: cur.int + step };
        if (getSpent(cand) <= availPts) {
          const d = evaluateBuildDps(cand, passiveIds, setIds, job, level, gear, target).total_dps;
          if (d > bestDps) {
            bestDps = d;
            bestPair = true;
          }
        }
      }

      for (const k of activeStats) {
        if (isKing && (k === 'str' || k === 'int') && bestPair) continue;
        if (cur[k] + step <= cap) {
          const cand = { ...cur, [k]: cur[k] + step };
          if (getSpent(cand) <= availPts) {
            const d = evaluateBuildDps(cand, passiveIds, setIds, job, level, gear, target).total_dps;
            if (d > bestDps) {
              bestDps = d;
              bestStat = k;
              bestPair = false;
            }
          }
        }
      }

      if (bestPair) {
        cur.str += step;
        cur.int += step;
        improved = true;
      } else if (bestStat) {
        cur[bestStat] += step;
        improved = true;
      }
    }
    step = Math.floor(step / 3);
  }
  return cur;
}

export function runLocalOptimizer(req: OptimizeRequest): OptimizeResponse {
  const job = LIVE_JOBS_CACHE.find((j) => j.id === req.job_id) ?? LIVE_JOBS_CACHE[0];
  const level = Math.max(1, Math.min(150, req.level));
  const pointsBudget = calcTotalStatPoints(level);
  const statCap = level >= 119 ? 119 : 99;

  const compatPassives = LIVE_PASSIVES_CACHE.filter(
    (p) => req.unlocked_passives.includes(p.id) && isPassiveCompatible(p, job)
  );
  const effectivePool =
    compatPassives.length >= 4
      ? compatPassives
      : LIVE_PASSIVES_CACHE.filter((p) => isPassiveCompatible(p, job));

  // Score individual passives on a probe build so combinations stay fast
  const probeStats: Record<string, number> = { vit: 1, str: 1, agi: 1, dex: 1, int: 1, luk: 1 };
  for (const k of job.active_stats) {
    probeStats[k] = Math.min(statCap, Math.max(25, Math.floor(level * 0.55)));
  }
  const scoredPassives = effectivePool
    .map((p) => ({
      id: p.id,
      dps: evaluateBuildDps(probeStats, [p.id], [], job, level, req.gear, req.target).total_dps,
    }))
    .sort((a, b) => b.dps - a.dps)
    .slice(0, 10)
    .map((x) => x.id);

  const passiveCombos = combinations(scoredPassives, Math.min(4, scoredPassives.length));
  const setCombos = generateValidSetCombos(LIVE_ARMOR_SETS_CACHE, job, !req.target.is_monster);

  const coarseList: Array<{ dps: number; pCombo: string[]; sCombo: string[] }> = [];
  for (const pCombo of passiveCombos.slice(0, 60)) {
    for (const sCombo of setCombos) {
      const r = evaluateBuildDps(probeStats, pCombo, sCombo, job, level, req.gear, req.target);
      coarseList.push({ dps: r.total_dps, pCombo, sCombo });
    }
  }
  coarseList.sort((a, b) => b.dps - a.dps);

  const selectedCoarse: Array<{ pCombo: string[]; sCombo: string[] }> = [];
  const seenSig = new Set<string>();
  for (const item of coarseList) {
    const sig = item.pCombo.join('|') + '::' + item.sCombo.join('|');
    if (!seenSig.has(sig)) {
      seenSig.add(sig);
      selectedCoarse.push({ pCombo: item.pCombo, sCombo: item.sCombo });
    }
    if (selectedCoarse.length >= 5) break;
  }

  const finalRaw = selectedCoarse.map((cand) => {
    const stats = optimizeStatsForCombo(cand.pCombo, cand.sCombo, job, level, req.gear, req.target);
    const evalRes = evaluateBuildDps(stats, cand.pCombo, cand.sCombo, job, level, req.gear, req.target);
    return { stats, pCombo: cand.pCombo, sCombo: cand.sCombo, evalRes };
  });

  finalRaw.sort((a, b) => b.evalRes.total_dps - a.evalRes.total_dps);
  const rank1Dps = finalRaw[0]?.evalRes.total_dps ?? 1;

  const passiveMap = new Map<string, PassiveMeta>();
  for (const p of LIVE_PASSIVES_CACHE) {
    passiveMap.set(p.id, p);
    passiveMap.set(p.id.toLowerCase(), p);
    passiveMap.set(p.name, p);
    passiveMap.set(p.name.toLowerCase(), p);
  }
  const setMap = new Map<string, ArmorSetMeta>();
  for (const s of LIVE_ARMOR_SETS_CACHE) {
    setMap.set(s.id, s);
    setMap.set(s.id.toLowerCase(), s);
    setMap.set(s.name, s);
    setMap.set(s.name.toLowerCase(), s);
  }

  const topBuilds: BuildCandidate[] = finalRaw.map((item, idx) => {
    const { stats, pCombo, sCombo, evalRes } = item;
    const pointsUsed = Object.values(stats).reduce((acc, v) => acc + calcCumulativeStatCost(v), 0);
    const statsDetail: Record<string, StatAllocationDetail> = {};

    for (const k of ['vit', 'str', 'agi', 'dex', 'int', 'luk'] as const) {
      const base = stats[k] ?? 1;
      const jb = job.job_bonuses[k] ?? 0;
      const inn = job.innate_stats[k] ?? 0;
      const gearB = req.gear[k] ?? 0;
      const passB = evalRes.passive_bonuses[k] ?? 0;
      const total = evalRes.totals[k] ?? base;
      const nextStepCost = base < statCap ? calcSingleStepCost(base) : 0;

      const plusOneEval = evaluateBuildDps(
        { ...stats, [k]: base + 1 },
        pCombo,
        sCombo,
        job,
        level,
        req.gear,
        req.target
      );
      const marginalDps = Math.max(0, plusOneEval.total_dps - evalRes.total_dps);

      const badges: string[] = [];
      if (k === 'vit' && job.id === 'templar') {
        badges.push(`GLD ${calcGldVitMultiplier(Math.floor(total))}×MaxHP`);
      }
      if (k === 'dex' && total >= 150) {
        badges.push('DEX 150+ 瞬間詠唱');
      }
      if ((k === 'str' || k === 'int') && job.id === 'king' && stats.str === stats.int) {
        badges.push('STR = INT 皇權共鳴');
      }
      if (base === statCap) badges.push(`已達上限 (${statCap})`);

      statsDetail[k] = {
        stat: k,
        label: STAT_LABELS[k],
        base,
        job_bonus: jb,
        innate_bonus: inn,
        gear_bonus: gearB,
        passive_bonus: passB,
        total,
        points_spent: calcCumulativeStatCost(base),
        next_step_cost: nextStepCost,
        marginal_dps_per_point: marginalDps,
        marginal_dps_per_cost: nextStepCost > 0 ? marginalDps / nextStepCost : 0,
        threshold_badges: badges,
      };
    }

    const countMap = new Map<string, number>();
    for (const sId of sCombo) countMap.set(sId, (countMap.get(sId) ?? 0) + 1);
    const setSummary = Array.from(countMap.entries()).map(([sId, count]) => {
      const meta = setMap.get(sId);
      const reqPc = meta?.pieces_required ?? 2;
      return {
        name: meta?.name ?? sId,
        zh_name: meta?.zh_name ?? sId,
        count,
        pieces: count * reqPc,
        effect: meta?.two_piece_effect ?? '',
      };
    });

    return {
      rank: idx + 1,
      total_dps: evalRes.total_dps,
      auto_dps: evalRes.auto_dps,
      skill_dps: evalRes.skill_dps,
      diff_from_top_pct: idx === 0 ? 0 : ((evalRes.total_dps - rank1Dps) / rank1Dps) * 100,
      points_used: pointsUsed,
      points_budget: pointsBudget,
      stat_cap: statCap,
      stats: statsDetail,
      passives: pCombo.map((pid) => passiveMap.get(pid)!).filter(Boolean),
      armor_sets: { combo: sCombo, summary: setSummary },
      active_thresholds: [],
      skill_breakdown: evalRes.skill_breakdown,
      combat_metrics: evalRes.combat_metrics,
      commentary: [
        `HIT ${evalRes.combat_metrics.hit_total} (${evalRes.combat_metrics.hit_chance_pct.toFixed(1)}%) · ASPD ${evalRes.combat_metrics.aspd.toFixed(1)}/193 (${evalRes.combat_metrics.attacks_per_sec.toFixed(2)}/s)`,
      ],
    };
  });

  const rank1 = finalRaw[0];
  const cardRecs = buildLocalCardRecommendations(
    rank1.stats,
    rank1.pCombo,
    rank1.sCombo,
    job,
    level,
    req.gear,
    req.target,
    req.card_budget_mode ?? 'limited'
  );
  const gearAffixRecs = buildLocalGearAffixRecommendations(
    rank1.stats,
    rank1.pCombo,
    rank1.sCombo,
    job,
    level,
    req.gear,
    req.target,
    rank1.evalRes,
    cardRecs
  );
  if (topBuilds[0]) {
    topBuilds[0].base_dps_no_cards = cardRecs.dps_without_cards;
    topBuilds[0].dps_with_cards = cardRecs.dps_with_cards;
  }

  const lightEval = evaluateBuildDps(
    rank1.stats,
    rank1.pCombo,
    rank1.sCombo,
    job,
    level,
    { ...req.gear, weapon_coating: 'light' },
    req.target
  );
  const noCoatingEval = evaluateBuildDps(
    rank1.stats,
    rank1.pCombo,
    rank1.sCombo,
    job,
    level,
    { ...req.gear, weapon_coating: null },
    req.target
  );

  return {
    job,
    level,
    points_budget: pointsBudget,
    stat_cap: statCap,
    weapon_coating: req.gear.weapon_coating,
    refine_pierce_bonus_pct: calcWeaponRefinePierceBonus(req.gear.weapon_refine, req.gear.is_two_handed) * 100,
    target: {
      ...req.target,
      phys_dr_pct: Math.round(calcDefReduction(req.target.target_def) * 1000) / 10,
      magic_dr_pct: Math.round(calcDefReduction(req.target.target_mdef) * 1000) / 10,
    },
    top_builds: topBuilds,
    card_recommendations: cardRecs,
    gear_affix_recommendations: gearAffixRecs,
    coating_comparison: {
      with_light_coating_dps: lightEval.total_dps,
      without_coating_dps: noCoatingEval.total_dps,
      gain_pct:
        noCoatingEval.total_dps > 0
          ? ((lightEval.total_dps - noCoatingEval.total_dps) / noCoatingEval.total_dps) * 100
          : 0,
      light_and_shadow_active: rank1.pCombo.includes('lightshadow'),
    },
    computed_by: 'local_fallback_engine',
  };
}

// ============================================================================
// 5. Direct Lossless Adapter for Backend `/api/optimize` & `/api/evaluate`
// ============================================================================

function mapCardSlotEntry(slotKey: string, entry: Record<string, unknown>): CardSlotEntry {
  return {
    equip_slot: String(entry.equip_slot ?? slotKey),
    slot_label: SLOT_LABELS[String(entry.equip_slot ?? slotKey)] ?? slotKey,
    card_id: String(entry.card_id ?? ''),
    name: String(entry.name ?? ''),
    tier: String(entry.tier ?? 'S'),
    is_limited: Boolean(entry.is_limited),
    removable: Boolean(entry.removable),
    bonuses: (entry.bonuses as Record<string, number>) || {},
    mechanics: Array.isArray(entry.mechanics) ? (entry.mechanics as string[]) : [],
    source_monsters: Array.isArray(entry.source_monsters) ? (entry.source_monsters as string[]) : [],
    description: String(entry.description ?? ''),
    marginal_dps_gain: Number(entry.marginal_dps_gain ?? 0),
    marginal_dps_gain_pct: Number(entry.marginal_dps_gain_pct ?? 0),
  };
}

function mapCardRecommendations(
  rawCards: Record<string, unknown> | undefined,
  isTwoHanded: boolean
): CardRecommendations {
  const safe = rawCards || {};
  const rawBySlot = (safe.cards_by_slot as Record<string, Record<string, unknown> | null>) || {};
  const cardsBySlot: Record<string, CardSlotEntry | null> = {};
  for (const [slotKey, entry] of Object.entries(rawBySlot)) {
    cardsBySlot[slotKey] = entry ? mapCardSlotEntry(slotKey, entry) : null;
  }
  const recommendations = Array.isArray(safe.recommendations)
    ? (safe.recommendations as Array<Record<string, unknown>>).map((r) =>
        mapCardSlotEntry(String(r.equip_slot ?? ''), r)
      )
    : [];

  return {
    cards_by_slot: cardsBySlot,
    recommendations,
    two_handed_weapon_slots: Number(safe.two_handed_weapon_slots ?? (isTwoHanded ? 2 : 1)),
    dps_without_cards: Number(safe.dps_without_cards ?? 0),
    dps_with_cards: Number(safe.dps_with_cards ?? 0),
    card_dps_gain: Number(safe.card_dps_gain ?? 0),
    card_dps_gain_pct: Number(safe.card_dps_gain_pct ?? 0),
  };
}

function mapSkillBreakdown(
  rawBreakdown: Record<string, number>,
  totalDps: number,
  ps: Record<string, unknown>,
  jobMeta: JobMeta,
  target: TargetInput,
  weaponCoating: ElementType | null
): SkillDpsDetail[] {
  return Object.entries(rawBreakdown).map(([skName, skDps]) => {
    const lowName = skName.toLowerCase();
    const isAuto =
      lowName.includes('auto-attack') ||
      lowName.includes('sacred guillotine') ||
      lowName.includes('colossus radiant');
    const matchedSkill = jobMeta.skills.find((s) => s.name === skName);
    const effElem: ElementType = matchedSkill
      ? matchedSkill.uses_weapon_coating && matchedSkill.element === 'neutral'
        ? weaponCoating ?? 'neutral'
        : matchedSkill.element
      : isAuto
      ? weaponCoating ?? 'neutral'
      : 'neutral';
    const elemMult = calcElementMultiplier(effElem, target.element);
    const effCd = isAuto
      ? 1 / Math.max(0.1, Number(ps.attacks_per_sec ?? ps.aps ?? 1))
      : matchedSkill?.effective_uptime_cd ?? matchedSkill?.cooldown ?? 1;
    const dmgPerCast = Number(skDps) * effCd;

    const noteText =
      skName === 'Sacred Guillotine Chain'
        ? '每 5 次普攻觸發 4 段聖光鎖鏈 (+174.8% ATK/下)'
        : skName === 'Colossus Radiant Bash'
        ? '普攻 35% 機率觸發 115% ATK + 6% MaxHP'
        : isAuto
        ? `ASPD ${Number(ps.aspd ?? 150).toFixed(1)} (${Number(ps.attacks_per_sec ?? 1).toFixed(2)}/s, ${Number(ps.attack_interval_ms ?? 400)}ms)`
        : matchedSkill?.description?.slice(0, 60) || (matchedSkill?.uses_weapon_coating ? `隨附魔 (${effElem.toUpperCase()})` : `固定 ${effElem.toUpperCase()}`);

    return {
      skill_id: isAuto
        ? lowName.replace(/[^a-z0-9]+/g, '_')
        : matchedSkill?.id ?? skName.toLowerCase().replace(/\s+/g, '_'),
      name: skName,
      zh_name: getSkillZhLabel(skName, matchedSkill?.zh_name ?? skName),
      dmg_type: isAuto ? (jobMeta.uses_matk_basic_attack ? 'magic' : 'physical') : matchedSkill?.dmg_type ?? 'physical',
      element: effElem,
      uses_coating: isAuto || Boolean(matchedSkill?.uses_weapon_coating),
      expected_dmg_per_cast: dmgPerCast,
      base_cd: matchedSkill?.cooldown ?? effCd,
      effective_cd: effCd,
      dps: Number(skDps),
      share_pct: totalDps > 0 ? (Number(skDps) / totalDps) * 100 : 0,
      hit_chance: matchedSkill?.never_misses ? 100 : Number(ps.hit_chance_pct ?? ps.hit_rate_pct ?? 100),
      crit_chance:
        matchedSkill?.dmg_type === 'magic'
          ? Number(ps.spell_crit_rate_pct ?? 0)
          : Number(ps.phys_crit_rate_pct ?? 0),
      elem_mult: elemMult,
      def_mult: 1,
      notes: noteText,
    };
  });
}

function mapCombatMetrics(
  ps: Record<string, unknown>,
  tStats: Record<string, number>,
  passiveIds: string[],
  target: TargetInput & { phys_dr_pct?: number; magic_dr_pct?: number }
): CombatMetrics {
  const physDrPct = target.phys_dr_pct ?? Math.round(calcDefReduction(target.target_def) * 1000) / 10;
  const magicDrPct = target.magic_dr_pct ?? Math.round(calcDefReduction(target.target_mdef) * 1000) / 10;
  const physPiercePct = Number(ps.phys_pierce_pct ?? 0);
  const magicPiercePct = Number(ps.magic_pierce_pct ?? 0);
  const playerDef = Number(ps.player_def ?? 0);
  const playerMdef = Number(ps.player_mdef ?? 0);
  const aspdVal = Number(ps.aspd ?? 150);

  return {
    max_hp: Number(ps.max_hp ?? 0),
    max_sp: Number(ps.max_sp ?? 0),
    total_atk: Number(ps.total_atk ?? 0),
    total_matk: Number(ps.total_matk ?? 0),
    phys_pierce_pct: physPiercePct,
    magic_pierce_pct: magicPiercePct,
    target_phys_dr_pct: physDrPct,
    target_magic_dr_pct: magicDrPct,
    effective_phys_mult: 1.0 - Math.max(0, physDrPct - physPiercePct) / 100.0,
    effective_magic_mult: 1.0 - Math.max(0, magicDrPct - magicPiercePct) / 100.0,
    crit_rate_pct: Number(ps.phys_crit_rate_pct ?? 0),
    mcrit_rate_pct: Number(ps.spell_crit_rate_pct ?? 0),
    crit_dmg_mult: Number(ps.crit_mult ?? 2.0),
    hit_total: Number(ps.player_hit ?? ps.hit ?? 0),
    player_flee: Number(ps.player_flee ?? 0),
    target_flee: Number(ps.target_flee ?? target.target_flee),
    hit_chance_pct: Number(ps.hit_chance_pct ?? ps.hit_rate_pct ?? 100),
    hit_formula_note: String(ps.hit_formula_note ?? ''),
    aspd: aspdVal,
    aspd_cap: Number(ps.aspd_cap ?? 193),
    attacks_per_sec: Number(ps.attacks_per_sec ?? ps.aps ?? 1),
    attack_interval_ms: Number(ps.attack_interval_ms ?? 400),
    high_aspd_basic_bonus_pct: Math.round(Math.max(0, aspdVal - 170) * 1.5 * 10) / 10,
    aspd_formula_note: String(ps.aspd_formula_note ?? ''),
    double_hit_chance_pct: passiveIds.includes('doubleattack') ? 50 : 0,
    player_def: playerDef,
    player_mdef: playerMdef,
    player_phys_dr_pct: (playerDef / 300.0) * 100,
    player_magic_dr_pct: (playerMdef / 300.0) * 100,
    cast_time_reduction_pct: Number(tStats.dex ?? 0) >= 150 ? 100 : Math.min(100, (Number(tStats.dex ?? 0) / 150) * 100),
    multi_hit_speedup_pct: Number(tStats.dex ?? 0) > 150 ? Math.min(60, (Number(tStats.dex ?? 0) - 150) * 0.6) : 0,
    cd_reduction_pct: (passiveIds.includes('lightshadow') ? 10 : 0) + (passiveIds.includes('priceceiling') ? 15 : 0),
    gld_vit_mult: Number(ps.gld_vit_mult ?? 5),
  };
}

function buildLookupMaps() {
  const passiveMap = new Map<string, PassiveMeta>();
  for (const p of LIVE_PASSIVES_CACHE) {
    passiveMap.set(p.id, p);
    passiveMap.set(p.id.toLowerCase(), p);
    passiveMap.set(p.name, p);
    passiveMap.set(p.name.toLowerCase(), p);
  }
  const setMap = new Map<string, ArmorSetMeta>();
  for (const s of LIVE_ARMOR_SETS_CACHE) {
    setMap.set(s.id, s);
    setMap.set(s.id.toLowerCase(), s);
    setMap.set(s.name, s);
    setMap.set(s.name.toLowerCase(), s);
  }
  return { passiveMap, setMap };
}

function normalizeBackendOptimizeResponse(
  data: Record<string, unknown>,
  payload: OptimizeRequest
): OptimizeResponse {
  const jobInfo = (data.job as Record<string, unknown>) || {};
  const resolvedJobId = String(jobInfo.job_id || jobInfo.id || payload.job_id);
  const jobMeta =
    LIVE_JOBS_CACHE.find((j) => j.id === resolvedJobId) ??
    LIVE_JOBS_CACHE.find((j) => j.id === payload.job_id) ??
    LIVE_JOBS_CACHE[0];

  const cfg = (data.config as Record<string, unknown>) || {};
  const level = Number(cfg.level ?? payload.level);
  const statCap = Number(cfg.stat_cap ?? jobInfo.max_stat_cap ?? (level >= 119 ? 119 : 99));
  const pointsBudget = Number(cfg.total_stat_points ?? calcTotalStatPoints(level));
  const weaponCoating = (cfg.weapon_coating ?? payload.gear.weapon_coating ?? null) as ElementType | null;
  const refineLevel = Number(cfg.refine_level ?? payload.gear.weapon_refine);
  const isTwoHanded = Boolean(cfg.is_two_handed ?? jobInfo.is_two_handed ?? jobMeta.is_two_handed);

  const tgtRaw = (data.target as Record<string, unknown>) || {};
  const target: TargetInput & { phys_dr_pct?: number; magic_dr_pct?: number } = {
    preset_id: payload.target.preset_id,
    name: String(tgtRaw.name ?? payload.target.name),
    level: Number(tgtRaw.level ?? payload.target.level ?? 120),
    target_def: Number(tgtRaw.phys_def ?? payload.target.target_def),
    target_mdef: Number(tgtRaw.magic_def ?? payload.target.target_mdef),
    target_flee: Number(tgtRaw.flee ?? payload.target.target_flee),
    element: (tgtRaw.element as ElementType) ?? payload.target.element,
    is_monster: tgtRaw.is_pvp !== undefined ? !Boolean(tgtRaw.is_pvp) : payload.target.is_monster,
    phys_dr_pct: Number(tgtRaw.phys_dr_pct ?? Math.round(calcDefReduction(payload.target.target_def) * 1000) / 10),
    magic_dr_pct: Number(tgtRaw.magic_dr_pct ?? Math.round(calcDefReduction(payload.target.target_mdef) * 1000) / 10),
  };

  const { passiveMap, setMap } = buildLookupMaps();
  const rawBuilds = (data.top_builds as Array<Record<string, unknown>>) || [];
  const rank1Dps = Number(rawBuilds[0]?.total_dps ?? 1);

  const topBuilds: BuildCandidate[] = rawBuilds.map((b, idx) => {
    const ps = (b.panel_stats as Record<string, unknown>) || {};
    const totalDps = Number(b.total_dps ?? 0);
    const autoDps = Number(b.auto_dps ?? 0);
    const skillDps = Number(b.skill_dps ?? 0);

    const bStats = (b.base_stats as Record<string, number>) || {};
    const tStats = (b.total_stats as Record<string, number>) || {};
    const ss = (b.stat_sources as Record<string, Record<string, number>> | undefined);
    const passiveIds = Array.isArray(b.passives) ? (b.passives as string[]) : [];
    const rawSetIds = Array.isArray(b.armor_sets) ? (b.armor_sets as string[]) : [];
    const setIds = rawSetIds.map((rawSid) => {
      const s = String(rawSid);
      return (setMap.get(s) ?? setMap.get(s.toLowerCase()))?.id ?? s;
    });

    const passStatBonus: Record<string, number> = {};
    for (const pid of passiveIds) {
      const pm = passiveMap.get(pid);
      if (!pm) continue;
      for (const stKey of ['vit', 'str', 'agi', 'dex', 'int', 'luk']) {
        if (typeof pm.bonuses[stKey] === 'number') {
          passStatBonus[stKey] = (passStatBonus[stKey] ?? 0) + pm.bonuses[stKey];
        }
      }
    }

    const statsDetail: Record<string, StatAllocationDetail> = {};
    for (const k of ['vit', 'str', 'agi', 'dex', 'int', 'luk'] as const) {
      const base = Number(ss?.base?.[k] ?? bStats[k] ?? 1);
      const total = Number(tStats[k] ?? base);
      const jb = Number(ss?.job?.[k] ?? jobMeta.job_bonuses[k] ?? 0);
      const inn = Number(ss?.innate?.[k] ?? jobMeta.innate_stats[k] ?? 0);
      const passB = Number(ss?.passives?.[k] ?? passStatBonus[k] ?? 0);
      const cardB = Number(ss?.cards?.[k] ?? 0);
      const setB = Number(ss?.sets?.[k] ?? 0);
      const gearB = ss?.gear?.[k] !== undefined
        ? Number(ss.gear[k])
        : Math.max(0, total - base - jb - inn - passB - cardB - setB);
      const nextCost = base < statCap ? calcSingleStepCost(base) : 0;

      const badges: string[] = [];
      if (k === 'vit' && resolvedJobId === 'templar') {
        badges.push(`GLD ${Number(ps.gld_vit_mult ?? calcGldVitMultiplier(total))}×MaxHP`);
      }
      if (k === 'dex' && total >= 150) {
        badges.push('DEX 150+ 瞬間詠唱');
      }
      if ((k === 'str' || k === 'int') && resolvedJobId === 'king' && bStats.str === bStats.int) {
        badges.push('STR = INT 皇權共鳴');
      }
      if (base >= statCap) {
        badges.push(`已達上限 (${statCap})`);
      }

      statsDetail[k] = {
        stat: k,
        label: STAT_LABELS[k],
        base,
        job_bonus: jb,
        innate_bonus: inn,
        gear_bonus: gearB,
        card_bonus: cardB,
        set_bonus: setB,
        passive_bonus: passB,
        total,
        points_spent: calcCumulativeStatCost(base),
        next_step_cost: nextCost,
        marginal_dps_per_point: 0,
        marginal_dps_per_cost: 0,
        threshold_badges: badges,
      };
    }

    const rawBreakdown = (b.dps_breakdown as Record<string, number>) || {};
    const skillBreakdown = mapSkillBreakdown(rawBreakdown, totalDps, ps, jobMeta, target, weaponCoating);

    const countMap = new Map<string, number>();
    for (const sid of setIds) countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    const setSummary = Array.from(countMap.entries()).map(([sid, count]) => {
      const sm = setMap.get(sid);
      const reqPc = sm?.pieces_required ?? 2;
      return {
        name: sm?.name ?? sid,
        zh_name: sm?.zh_name ?? sid,
        count,
        pieces: count * reqPc,
        effect: sm?.two_piece_effect ?? String(b.armor_set_summary ?? ''),
      };
    });

    const combatMetrics = mapCombatMetrics(ps, tStats, passiveIds, target);
    const thresholds = Array.isArray(b.active_thresholds) ? (b.active_thresholds as string[]) : [];

    return {
      rank: Number(b.rank ?? idx + 1),
      total_dps: totalDps,
      dps_with_cards: Number(b.dps_with_cards ?? totalDps),
      base_dps_no_cards: Number(b.base_dps_no_cards ?? totalDps),
      auto_dps: autoDps,
      skill_dps: skillDps,
      diff_from_top_pct: idx === 0 ? 0 : ((totalDps - rank1Dps) / Math.max(1, rank1Dps)) * 100,
      points_used: Number(b.points_spent ?? b.stat_points_used ?? 0),
      points_budget: pointsBudget,
      stat_cap: statCap,
      stats: statsDetail,
      gear_stats: (b.gear_stats as Record<string, number>) ?? undefined,
      gear_mods: (b.gear_mods as Record<string, unknown>) ?? undefined,
      card_bonuses: (b.card_bonuses as Record<string, number>) ?? undefined,
      card_recommendations: b.card_recommendations
        ? mapCardRecommendations(b.card_recommendations as Record<string, unknown>, isTwoHanded)
        : undefined,
      gear_affix_recommendations: (b.gear_affix_recommendations as GearAffixRecommendations) ?? undefined,
      passives: passiveIds.map((pid) => passiveMap.get(pid) ?? passiveMap.get(pid.toLowerCase()) ?? {
        id: pid,
        name: pid,
        zh_name: pid,
        origin_job: 'unknown',
        restriction: 'all',
        category: 'Universal' as const,
        condition_desc: '',
        bonuses: {},
        summary: '',
      }),
      innate_class_passives: Array.isArray(b.innate_class_passives)
        ? (b.innate_class_passives as string[])
        : jobMeta.innate_class_passives ?? [],
      armor_sets: {
        combo: setIds,
        summary: setSummary,
      },
      active_thresholds: thresholds,
      skill_breakdown: skillBreakdown,
      combat_metrics: combatMetrics,
      commentary: thresholds.length > 0
        ? [`達成門檻：${thresholds.join(' ｜ ')}`]
        : [],
    };
  });

  const cardRecommendations = mapCardRecommendations(
    (data.card_recommendations as Record<string, unknown>) || {},
    isTwoHanded
  );

  // Gear affix recommendations directly from backend
  const rawAffix = (data.gear_affix_recommendations as GearAffixRecommendations) || {
    breakpoints_status: {
      hit_status: 'N/A',
      hit_deficit: 0,
      aspd_status: 'N/A',
      aspd_deficit: 0,
      phys_pierce_headroom_pct: 0,
      magic_pierce_headroom_pct: 0,
      dex_cast_deficit: 0,
      templar_vit_300_deficit: 0,
      king_str_eq_int_ok: null,
    },
    slots: [],
  };

  const rawCoat = (data.coating_comparison as Record<string, unknown>) || {};
  const rawSetAlts = Array.isArray(data.armor_set_alternatives)
    ? (data.armor_set_alternatives as ArmorSetAlternative[])
    : [];

  return {
    job: {
      ...jobMeta,
      is_two_handed: isTwoHanded,
      offhand_type: String(jobInfo.offhand_type ?? jobMeta.offhand_type),
      innate_class_passives: Array.isArray(jobInfo.innate_class_passives)
        ? (jobInfo.innate_class_passives as string[])
        : jobMeta.innate_class_passives ?? [],
    },
    level,
    points_budget: pointsBudget,
    stat_cap: statCap,
    weapon_coating: weaponCoating,
    refine_pierce_bonus_pct: calcWeaponRefinePierceBonus(refineLevel, isTwoHanded) * 100,
    target,
    top_builds: topBuilds,
    armor_set_alternatives: rawSetAlts,
    card_recommendations: cardRecommendations,
    gear_affix_recommendations: rawAffix,
    coating_comparison: {
      with_light_coating_dps: Number(rawCoat.coated_dps ?? topBuilds[0]?.total_dps ?? 0),
      without_coating_dps: Number(rawCoat.uncoated_dps ?? 0),
      gain_pct: Number(rawCoat.light_coating_gain_pct ?? 0),
      light_and_shadow_active: Boolean(
        rawBuilds[0] && Array.isArray(rawBuilds[0].passives) && (rawBuilds[0].passives as string[]).includes('lightshadow')
      ),
    },
    computed_by: 'backend_api',
  };
}

// ============================================================================
// 6. HTTP API Calls with Real Data Passthrough & Graceful Offline Fallback
// ============================================================================

export async function fetchMeta(): Promise<MetaResponse> {
  try {
    const res = await fetch('/api/meta');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        const jobs: JobMeta[] = data.jobs.map((j: Record<string, unknown>) => {
          const jid = String(j.id);
          const fallbackJob = BUILTIN_JOBS.find((fj) => fj.id === jid);
          const rawSkills = Array.isArray(j.job_skills) ? (j.job_skills as Array<Record<string, unknown>>) : [];
          return {
            id: jid,
            name: String(j.name ?? fallbackJob?.name ?? jid),
            zh_name: JOB_ZH_LABELS[jid] ?? String(j.name ?? jid),
            tier: String(j.tier ?? fallbackJob?.tier ?? 'Second Class'),
            role: String(j.role ?? j.role_summary ?? fallbackJob?.role ?? ''),
            weapon_type: String(j.weapon_type ?? fallbackJob?.weapon_type ?? 'sword'),
            weapon_name: String(j.weapon_name ?? fallbackJob?.weapon_name ?? 'Weapon'),
            offhand_type: String(j.offhand_type ?? fallbackJob?.offhand_type ?? 'none'),
            is_two_handed: Boolean(j.is_two_handed ?? fallbackJob?.is_two_handed ?? false),
            primary_dmg_type: (j.primary_dmg_type as JobMeta['primary_dmg_type']) ?? fallbackJob?.primary_dmg_type ?? 'physical',
            is_melee: Boolean(j.is_melee ?? fallbackJob?.is_melee ?? true),
            is_ranged_dex_atk: fallbackJob?.is_ranged_dex_atk ?? false,
            uses_matk_basic_attack: fallbackJob?.uses_matk_basic_attack ?? false,
            uses_tablet_hybrid_basic: fallbackJob?.uses_tablet_hybrid_basic ?? false,
            requires_str_eq_int: fallbackJob?.requires_str_eq_int ?? false,
            base_aspd: Number(j.base_aspd ?? fallbackJob?.base_aspd ?? 148),
            auto_atk_scale: Number(j.auto_atk_scale ?? fallbackJob?.auto_atk_scale ?? 1.0),
            auto_matk_scale: fallbackJob?.auto_matk_scale ?? 0,
            auto_hp_scale: Number(j.auto_hp_scale ?? fallbackJob?.auto_hp_scale ?? 0),
            hp_bonus_pct: Number(j.hp_bonus_pct ?? fallbackJob?.hp_bonus_pct ?? 0),
            sp_bonus_pct: Number(j.sp_bonus_pct ?? fallbackJob?.sp_bonus_pct ?? 0),
            max_job_level: Number(j.max_job_level ?? fallbackJob?.max_job_level ?? 70),
            job_bonuses: (j.job_bonuses as Record<string, number>) ?? fallbackJob?.job_bonuses ?? {},
            innate_stats: (j.innate_stats as Record<string, number>) ?? fallbackJob?.innate_stats ?? {},
            innate_passive_name: String(j.innate_passive_name ?? fallbackJob?.innate_passive_name ?? ''),
            innate_passive_desc: String(j.innate_passive_desc ?? fallbackJob?.innate_passive_desc ?? ''),
            innate_class_passives: Array.isArray(j.innate_class_passives)
              ? (j.innate_class_passives as string[])
              : fallbackJob?.innate_class_passives ?? [],
            active_stats: Array.isArray(j.active_stats) ? (j.active_stats as string[]) : fallbackJob?.active_stats ?? ['str', 'agi', 'vit', 'dex', 'luk'],
            job_skills:
              rawSkills.length > 0
                ? rawSkills.map((sk) => {
                    const sid = String(sk.id ?? sk.name ?? '');
                    const sname = String(sk.name ?? sid);
                    return {
                      id: sid,
                      name: sname,
                      zh_name: getSkillZhLabel(sid, sname),
                      skill_type: (sk.skill_type === 'passive' ? 'passive' : 'active') as 'active' | 'passive',
                      description: String(sk.description ?? ''),
                    };
                  })
                : fallbackJob?.job_skills ?? [],
            skills: fallbackJob?.skills && fallbackJob.skills.length > 0
              ? fallbackJob.skills
              : rawSkills.map((sk) => ({
                  id: String(sk.id ?? sk.name),
                  name: String(sk.name ?? ''),
                  zh_name: String(sk.name ?? ''),
                  dmg_type: (sk.dmg_type as SkillMeta['dmg_type']) ?? 'physical',
                  atk_scale: Number(sk.atk_scale ?? 0),
                  matk_scale: Number(sk.matk_scale ?? 0),
                  hp_scale: Number(sk.hp_scale ?? 0),
                  vit_tier_hp_scale: Boolean(sk.vit_tier_hp_scale),
                  element: (sk.element as ElementType) ?? 'neutral',
                  uses_weapon_coating: Boolean(sk.uses_weapon_coating),
                  cooldown: Number(sk.cooldown ?? 1),
                  effective_uptime_cd: sk.effective_uptime_cd ? Number(sk.effective_uptime_cd) : null,
                  cast_time: Number(sk.cast_time ?? 0),
                  fixed_cast: 0,
                  hits: Number(sk.hits ?? 1),
                  cooldown_from_aspd: false,
                  multi_hit_spell: false,
                  never_misses: Boolean(sk.never_misses),
                  can_crit: Boolean(sk.can_crit),
                  ignores_def: false,
                  monster_mult: Number(sk.monster_mult ?? 1),
                  description: String(sk.description ?? ''),
                })),
          };
        });

        const rawPassives = Array.isArray(data.cross_passives)
          ? (data.cross_passives as Array<Record<string, unknown>>)
          : [];
        const passives: PassiveMeta[] =
          rawPassives.length > 0
            ? rawPassives.map((rp) => {
                const pid = String(rp.id);
                const fb = BUILTIN_PASSIVES.find((p) => p.id === pid);
                const rawStats = (rp.stats as Record<string, number | boolean>) || {};
                const numStats: Record<string, number> = {};
                for (const [k, v] of Object.entries(rawStats)) {
                  if (typeof v === 'number') numStats[k] = v;
                }
                const restr = String(rp.restriction ?? fb?.restriction ?? 'all');
                return {
                  id: pid,
                  name: String(rp.name ?? fb?.name ?? pid),
                  zh_name: PASSIVE_ZH_NAMES[pid] ?? String(rp.name ?? pid),
                  origin_job: String(rp.source_job ?? fb?.origin_job ?? 'all'),
                  restriction: restr,
                  category: fb?.category ?? 'Universal',
                  condition_desc: RESTRICTION_ZH_LABELS[restr] ?? fb?.condition_desc ?? `限 ${restr}`,
                  melee_only: fb?.melee_only ?? restr === 'melee',
                  ranged_only: fb?.ranged_only ?? restr === 'ranged',
                  katana_only: fb?.katana_only ?? restr.includes('katana'),
                  kunai_only: fb?.kunai_only ?? restr.includes('kunai'),
                  cestus_only: fb?.cestus_only ?? restr.includes('knuckle'),
                  aegis_only: fb?.aegis_only ?? restr.includes('aegis'),
                  str_eq_int_only: fb?.str_eq_int_only ?? restr.includes('str_eq_int'),
                  handoff_default: fb?.handoff_default ?? DEFAULT_HANDOFF_IDS.has(pid),
                  bonuses: numStats,
                  summary:
                    String(rp.description ?? '').replace(/^被動\s*·\s*/, '').trim() ||
                    formatBonusMap(rawStats),
                };
              })
            : BUILTIN_PASSIVES;

        const rawSets = Array.isArray(data.armor_sets)
          ? (data.armor_sets as Array<Record<string, unknown>>)
          : [];
        const armorSets: ArmorSetMeta[] =
          rawSets.length > 0
            ? rawSets.map((rs) => {
                const sid = String(rs.id);
                const bonuses = (rs.bonuses as Record<string, number>) || {};
                const pcReq = Number(rs.pieces_required ?? 2);
                const maxStk = Number(rs.max_stacks ?? 3);
                return {
                  id: sid,
                  name: String(rs.name ?? sid),
                  zh_name: ARMOR_SET_ZH_NAMES[sid] ?? `${rs.name} (${pcReq}件套)`,
                  pieces_required: pcReq,
                  rarity: String(rs.rarity ?? 'common'),
                  max_stacks: maxStk,
                  two_piece_effect: `${pcReq}件套 (最多${maxStk}組): ${formatBonusMap(bonuses)}`,
                  bonuses,
                  eligible_slots: Array.isArray(rs.eligible_slots) ? (rs.eligible_slots as string[]) : ['head', 'face', 'mouth', 'armor', 'garment', 'shoes'],
                };
              })
            : BUILTIN_ARMOR_SETS;

        const cards: CardMeta[] = Array.isArray(data.cards) && data.cards.length > 0
          ? (data.cards as CardMeta[])
          : BUILTIN_CARDS;

        const presetsMap = (data.monster_presets as Record<string, Record<string, unknown>>) || {};
        const targetPresets: TargetInput[] = Object.keys(presetsMap).length > 0
          ? Object.values(presetsMap).map((mp) => ({
              preset_id: String(mp.preset_id ?? ''),
              name: String(mp.name ?? ''),
              level: Number(mp.level ?? 120),
              target_def: Number(mp.target_def ?? 120),
              target_mdef: Number(mp.target_mdef ?? 120),
              target_flee: Number(mp.target_flee ?? 300),
              element: (mp.element as ElementType) ?? 'neutral',
              is_monster: Boolean(mp.is_monster ?? true),
            }))
          : BUILTIN_TARGET_PRESETS;

        const cardMechanics =
          (data.card_mechanics as Record<string, CardMechanicMeta>) ||
          (WIKI_CARD_MECHANICS as unknown as Record<string, CardMechanicMeta>);
        const affixSystem =
          (data.equipment_affix_system as unknown as EquipmentAffixSystemMeta) ||
          (WIKI_EQUIPMENT_AFFIX_SYSTEM as unknown as EquipmentAffixSystemMeta);

        LIVE_JOBS_CACHE = jobs;
        LIVE_PASSIVES_CACHE = passives;
        LIVE_ARMOR_SETS_CACHE = armorSets;
        LIVE_CARDS_CACHE = cards;
        LIVE_PRESETS_CACHE = targetPresets;
        LIVE_CARD_MECHANICS_CACHE = cardMechanics;
        LIVE_AFFIX_SYSTEM_CACHE = affixSystem;

        return {
          jobs,
          passives,
          armor_sets: armorSets,
          cards,
          target_presets: targetPresets,
          elements: ['neutral', 'light', 'dark', 'fire', 'water', 'wind', 'earth'],
          card_mechanics: cardMechanics,
          equipment_affix_system: affixSystem,
        };
      }
    }
  } catch {
    // Fallback to Wiki-verified built-in metadata
  }
  return getCachedMeta();
}

export async function fetchCdcStatus(): Promise<CdcStatusResponse> {
  try {
    const res = await fetch('/api/cdc/status');
    if (res.ok) {
      const d = await res.json();
      return {
        last_sync_at: d.last_sync_at || d.last_sync || '2026-11-15 07:00:00 UTC',
        sync_batch_id: d.sync_batch_id || 'cdc-2026-11-15',
        wiki_url: d.wiki_url || 'https://lumivaraonline.com/wiki/',
        changelog_url: d.changelog_url || 'https://lumivaraonline.com/changelog/',
        tracked_entities_count: d.tracked_entities_count ?? d.tracked_entities ?? 467,
        total_changes_detected:
          d.total_changes_detected ??
          d.changes_count ??
          (SIMULATED_PATCH_ACTIVE ? INITIAL_CDC_CHANGES.length + 1 : INITIAL_CDC_CHANGES.length),
        active_patch_version: d.active_patch_version || '2026-11-15',
        db_engine: d.db_engine || 'SQLite3 + Canonical JSON SHA-256 CDC',
        backend_online: true,
      };
    }
  } catch {
    // Offline fallback
  }
  return {
    last_sync_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    sync_batch_id: SIMULATED_PATCH_ACTIVE ? 'cdc-20261115-sim' : 'cdc-2026-11-15',
    wiki_url: 'https://lumivaraonline.com/wiki/',
    changelog_url: 'https://lumivaraonline.com/changelog/',
    tracked_entities_count: 467,
    total_changes_detected: SIMULATED_PATCH_ACTIVE ? INITIAL_CDC_CHANGES.length + 1 : INITIAL_CDC_CHANGES.length,
    active_patch_version: SIMULATED_PATCH_ACTIVE ? '2026-11-15-sim' : '2026-11-15',
    db_engine: 'SQLite3 + Canonical JSON SHA-256 CDC (Offline Fallback)',
    backend_online: false,
  };
}

export async function fetchCdcChanges(jobId?: string): Promise<CdcChangeRecord[]> {
  try {
    const url = jobId ? `/api/cdc/changes?job_id=${encodeURIComponent(jobId)}` : '/api/cdc/changes';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : Array.isArray(data.changes) ? data.changes : [];
      if (rawList.length > 0) {
        return rawList.map((item: Record<string, unknown>, idx: number) => ({
          id: Number(item.id ?? idx + 1),
          sync_batch_id: String(item.sync_batch_id || 'cdc-2026-11-15'),
          detected_at: String(item.detected_at || item.created_at || '2026-11-15 07:00:00 UTC'),
          patch_version: String(item.patch_version || '2026-11-15'),
          entity_type: (item.entity_type as CdcChangeRecord['entity_type']) || 'SKILL',
          entity_id: String(item.entity_id || item.entity_name || ''),
          entity_name: String(item.entity_name || item.entity_id || ''),
          change_type: (item.change_type as CdcChangeRecord['change_type']) || 'MODIFIED',
          old_hash: String(item.old_hash || ''),
          new_hash: String(item.new_hash || ''),
          affected_jobs: Array.isArray(item.affected_jobs) ? (item.affected_jobs as string[]) : ['all'],
          summary: String(item.summary || item.diff_summary || ''),
          impact_level: (item.impact_level as CdcChangeRecord['impact_level']) || 'HIGH',
          diff_json: (item.diff_json as Record<string, { old: string | number; new: string | number }>) || {},
        }));
      }
    }
  } catch {
    // Fallback
  }
  return SIMULATED_PATCH_ACTIVE
    ? [SIMULATED_PATCH_RECORD, ...INITIAL_CDC_CHANGES]
    : [...INITIAL_CDC_CHANGES];
}

export async function triggerCdcSync(simulatePatch = false): Promise<{
  status: CdcStatusResponse;
  changes: CdcChangeRecord[];
  message: string;
}> {
  if (simulatePatch) {
    SIMULATED_PATCH_ACTIVE = !SIMULATED_PATCH_ACTIVE;
  }

  try {
    const res = await fetch('/api/cdc/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulate_patch: simulatePatch }),
    });
    if (res.ok) {
      const data = await res.json();
      const status = await fetchCdcStatus();
      const changes = await fetchCdcChanges();
      return {
        status,
        changes,
        message:
          data.message ||
          (simulatePatch
            ? '已觸發模擬平衡改版並完成 SHA-256 雜湊比對！'
            : '已完成 Lumivara Wiki 與 Changelog 同步檢查。'),
      };
    }
  } catch {
    // Offline fallback
  }

  const status = await fetchCdcStatus();
  const changes = await fetchCdcChanges();
  return {
    status,
    changes,
    message: simulatePatch
      ? '已切換模擬平衡改版狀態。'
      : '已完成離線基準資料檢查。',
  };
}

export async function runOptimize(
  payload: OptimizeRequest,
  signal?: AbortSignal
): Promise<OptimizeResponse> {
  try {
    const bodyPayload = {
      ...payload,
      gear: payload.auto_gear_stats
        ? {
            weapon_refine: payload.gear.weapon_refine,
            is_two_handed: payload.gear.is_two_handed,
            offhand_type: payload.gear.offhand_type,
            weapon_coating: payload.gear.weapon_coating,
          }
        : payload.gear,
      card_mode: payload.card_budget_mode === 'budget' ? 'budget' : 'optimal',
      card_tier_filter: payload.card_budget_mode === 'budget' ? 'standard_only' : 'all',
    };
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.top_builds) && data.top_builds.length > 0) {
        return normalizeBackendOptimizeResponse(data as Record<string, unknown>, payload);
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    // Fallback only when backend is unreachable
  }

  return runLocalOptimizer(payload);
}

function normalizeEvaluateResponse(
  data: Record<string, unknown>,
  payload: EvaluateRequest
): EvaluateResponse {
  const jobMeta = LIVE_JOBS_CACHE.find((j) => j.id === payload.job_id) ?? LIVE_JOBS_CACHE[0];
  const ps = (data.panel_stats as Record<string, unknown>) || {};
  const tStats = (data.total_stats as Record<string, number>) || {};
  const bStats = (data.base_stats as Record<string, number>) || payload.base_stats;
  const gStats = (data.gear_stats as Record<string, number>) || payload.gear_stats;
  const passiveIds = Array.isArray(data.passives) ? (data.passives as string[]) : payload.passives;
  const totalDps = Number(data.total_dps ?? 0);
  const weaponCoating = ((payload.gear_mods?.weapon_coating ?? null) as ElementType | null);

  const rawBySlot = (data.cards_by_slot as Record<string, Record<string, unknown> | null>) || {};
  const cardsBySlot: Record<string, CardSlotEntry | null> = {};
  for (const [slotKey, entry] of Object.entries(rawBySlot)) {
    cardsBySlot[slotKey] = entry ? mapCardSlotEntry(slotKey, entry) : null;
  }

  const ssRaw = (data.stat_sources as EvaluateResponse['stat_sources']) || {
    base: bStats,
    job: {},
    innate: {},
    gear: gStats,
    cards: {},
    sets: {},
    passives: {},
  };

  const rawCoat = (data.coating_comparison as Record<string, unknown>) || {};
  const coatedDps = Number(rawCoat.coated_dps ?? 0);
  const uncoatedDps = Number(rawCoat.uncoated_dps ?? 0);

  return {
    total_dps: totalDps,
    auto_dps: Number(data.auto_dps ?? 0),
    skill_dps: Number(data.skill_dps ?? 0),
    dps_breakdown: (data.dps_breakdown as Record<string, number>) || {},
    base_stats: bStats,
    gear_stats: gStats,
    gear_mods: (data.gear_mods as Record<string, unknown>) || payload.gear_mods,
    total_stats: tStats,
    stat_sources: ssRaw,
    card_bonuses: (data.card_bonuses as Record<string, number>) || {},
    cards_by_slot: cardsBySlot,
    passives: passiveIds,
    armor_sets: Array.isArray(data.armor_sets) ? (data.armor_sets as string[]) : payload.armor_sets,
    disabled_skills: Array.isArray(data.disabled_skills)
      ? (data.disabled_skills as string[])
      : payload.disabled_skills ?? [],
    points_spent: Number(data.points_spent ?? 0),
    total_stat_points: Number(data.total_stat_points ?? calcTotalStatPoints(payload.level)),
    points_remaining: Number(data.points_remaining ?? 0),
    stat_cap: Number(data.stat_cap ?? (payload.level >= 119 ? 119 : 99)),
    active_thresholds: Array.isArray(data.active_thresholds) ? (data.active_thresholds as string[]) : [],
    active_card_mechanics: Array.isArray(data.active_card_mechanics)
      ? (data.active_card_mechanics as string[])
      : [],
    combat_metrics: mapCombatMetrics(ps, tStats, passiveIds, payload.target),
    skill_breakdown: mapSkillBreakdown(
      (data.dps_breakdown as Record<string, number>) || {},
      totalDps,
      ps,
      jobMeta,
      payload.target,
      weaponCoating
    ),
    coating_comparison:
      coatedDps > 0 || uncoatedDps > 0
        ? {
            with_light_coating_dps: coatedDps,
            without_coating_dps: uncoatedDps,
            gain_pct: Number(rawCoat.light_coating_gain_pct ?? 0),
            light_and_shadow_active: passiveIds.some((p) => p.toLowerCase().includes('light')),
          }
        : undefined,
    computed_by: 'backend_api',
  };
}

function runLocalEvaluate(payload: EvaluateRequest): EvaluateResponse {
  const job = LIVE_JOBS_CACHE.find((j) => j.id === payload.job_id) ?? LIVE_JOBS_CACHE[0];
  const level = Math.max(1, Math.min(150, payload.level));
  const statCap = level >= 119 ? 119 : 99;
  const totalPts = calcTotalStatPoints(level);
  const gm = payload.gear_mods || {};

  const cardMap = new Map<string, CardMeta>();
  for (const c of LIVE_CARDS_CACHE) {
    cardMap.set(c.id, c);
    cardMap.set(c.id.toLowerCase(), c);
  }
  const selectedCards: CardMeta[] = [];
  const cardsBySlot: Record<string, CardSlotEntry | null> = {};
  const cardBonuses: Record<string, number> = {};
  for (const [slotKey, cid] of Object.entries(payload.cards_by_slot || {})) {
    if (!cid) {
      cardsBySlot[slotKey] = null;
      continue;
    }
    const cm = cardMap.get(cid) ?? cardMap.get(cid.toLowerCase());
    if (!cm) {
      cardsBySlot[slotKey] = null;
      continue;
    }
    selectedCards.push(cm);
    for (const [bk, bv] of Object.entries(cm.bonuses || {})) {
      if (typeof bv === 'number') {
        cardBonuses[bk] = (cardBonuses[bk] ?? 0) + bv;
      }
    }
    cardsBySlot[slotKey] = {
      equip_slot: slotKey,
      slot_label: SLOT_LABELS[slotKey] ?? slotKey,
      card_id: cm.id,
      name: cm.name,
      tier: cm.tier ?? 'S',
      is_limited: cm.is_limited,
      removable: cm.removable,
      bonuses: cm.bonuses,
      mechanics: cm.mechanics,
      source_monsters: cm.source_monsters,
      description: cm.description,
      marginal_dps_gain: 0,
      marginal_dps_gain_pct: 0,
    };
  }

  const gearInput: GearInput = {
    weapon_refine: Number(gm.weapon_refine ?? 4),
    is_two_handed: job.is_two_handed,
    weapon_coating: (gm.weapon_coating as ElementType | null) ?? null,
    phys_pierce: Number(gm.phys_pierce ?? 0),
    magic_pierce: Number(gm.magic_pierce ?? 0),
    vit: Number(payload.gear_stats.vit ?? 0),
    str: Number(payload.gear_stats.str ?? 0),
    agi: Number(payload.gear_stats.agi ?? 0),
    dex: Number(payload.gear_stats.dex ?? 0),
    int: Number(payload.gear_stats.int ?? 0),
    luk: Number(payload.gear_stats.luk ?? 0),
    flat_atk: Number(gm.flat_atk ?? 120),
    flat_matk: Number(gm.flat_matk ?? 120),
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

  const disabledSkills = payload.disabled_skills ?? [];
  const res = evaluateBuildDps(
    payload.base_stats,
    payload.passives,
    payload.armor_sets,
    job,
    level,
    gearInput,
    payload.target,
    selectedCards,
    disabledSkills
  );
  const lightEvalLocal =
    gearInput.weapon_coating === 'light'
      ? res
      : evaluateBuildDps(
          payload.base_stats,
          payload.passives,
          payload.armor_sets,
          job,
          level,
          { ...gearInput, weapon_coating: 'light' },
          payload.target,
          selectedCards,
          disabledSkills
        );
  const noEnchantLocal =
    gearInput.weapon_coating === null
      ? res
      : evaluateBuildDps(
          payload.base_stats,
          payload.passives,
          payload.armor_sets,
          job,
          level,
          { ...gearInput, weapon_coating: null },
          payload.target,
          selectedCards,
          disabledSkills
        );

  let pointsSpent = 0;
  for (const k of ['vit', 'str', 'agi', 'dex', 'int', 'luk']) {
    pointsSpent += calcCumulativeStatCost(payload.base_stats[k] ?? 1);
  }
  const dpsBreakdown: Record<string, number> = {};
  for (const sk of res.skill_breakdown) {
    dpsBreakdown[sk.name] = sk.dps;
  }
  const passiveStats: Record<string, number> = {};
  const cardStats: Record<string, number> = {};
  for (const k of ['vit', 'str', 'agi', 'dex', 'int', 'luk']) {
    passiveStats[k] = res.passive_bonuses[k] ?? 0;
    cardStats[k] = cardBonuses[k] ?? 0;
  }

  return {
    total_dps: res.total_dps,
    auto_dps: res.auto_dps,
    skill_dps: res.skill_dps,
    dps_breakdown: dpsBreakdown,
    base_stats: payload.base_stats,
    gear_stats: payload.gear_stats,
    gear_mods: gm,
    total_stats: res.totals,
    stat_sources: {
      base: payload.base_stats,
      job: job.job_bonuses,
      innate: job.innate_stats,
      gear: payload.gear_stats,
      cards: cardStats,
      sets: {},
      passives: passiveStats,
    },
    card_bonuses: cardBonuses,
    cards_by_slot: cardsBySlot,
    passives: payload.passives,
    armor_sets: payload.armor_sets,
    points_spent: pointsSpent,
    total_stat_points: totalPts,
    points_remaining: totalPts - pointsSpent,
    stat_cap: statCap,
    active_thresholds: [],
    active_card_mechanics: res.active_card_mechanics,
    combat_metrics: res.combat_metrics,
    skill_breakdown: res.skill_breakdown,
    disabled_skills: [...disabledSkills],
    coating_comparison: {
      with_light_coating_dps: lightEvalLocal.total_dps,
      without_coating_dps: noEnchantLocal.total_dps,
      gain_pct:
        noEnchantLocal.total_dps > 0
          ? ((lightEvalLocal.total_dps - noEnchantLocal.total_dps) / noEnchantLocal.total_dps) * 100
          : 0,
      light_and_shadow_active: payload.passives.some((p) => p.toLowerCase().includes('light')),
    },
    computed_by: 'local_fallback_engine',
  };
}

export async function runEvaluate(
  payload: EvaluateRequest,
  signal?: AbortSignal
): Promise<EvaluateResponse> {
  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      return normalizeEvaluateResponse(data, payload);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  }
  return runLocalEvaluate(payload);
}
