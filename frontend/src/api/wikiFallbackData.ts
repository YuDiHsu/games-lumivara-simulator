// Auto-generated from data/lumivara.db & backend/engine/job_specs.py (v2.1)
// Do not edit manually; regenerate from SQLite/engine ground truth if Wiki updates.

export interface FallbackSkillSpec {
  id: string;
  name: string;
  dmg_type: 'physical' | 'magic' | 'hybrid';
  atk_scale: number;
  matk_scale: number;
  hp_scale: number;
  vit_tier_hp_scale: boolean;
  element: 'neutral' | 'light' | 'dark' | 'fire' | 'water' | 'wind' | 'earth';
  uses_weapon_coating: boolean;
  cooldown: number;
  effective_uptime_cd: number | null;
  cast_time: number;
  fixed_cast: number;
  hits: number;
  cooldown_from_aspd: boolean;
  aspd_scaling_type: string;
  multi_hit_spell: boolean;
  never_misses: boolean;
  can_crit: boolean;
  ignores_def: boolean;
  monster_mult: number;
  atk_monster_mult: number;
  description: string;
}

export interface FallbackJobSpec {
  id: string;
  name: string;
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
  job_bonuses: Record<string, number>;
  innate_stats: Record<string, number>;
  active_stats: string[];
  innate_passive_name: string;
  innate_passive_desc: string;
  innate_class_passives?: string[];
  skills: FallbackSkillSpec[];
}

export interface FallbackPassiveSpec {
  id: string;
  name: string;
  source_job: string;
  restriction: string;
  description: string;
  stats: Record<string, number | boolean>;
  melee_only?: boolean;
  ranged_only?: boolean;
  katana_only?: boolean;
  kunai_only?: boolean;
  cestus_only?: boolean;
  aegis_only?: boolean;
  str_eq_int_only?: boolean;
}

export interface FallbackArmorSetSpec {
  id: string;
  name: string;
  pieces_required: number;
  rarity: string;
  max_stacks: number;
  description: string;
  bonuses: Record<string, number>;
  eligible_slots: string[];
}

export interface FallbackCardSpec {
  id: string;
  name: string;
  slot: string;
  slots: string[];
  tier: string | null;
  is_limited: boolean;
  removable: boolean;
  max_per_item: number;
  bonuses: Record<string, number>;
  mechanics: string[];
  source_monsters: string[];
  description: string;
}

export interface FallbackTargetPreset {
  preset_id: string;
  name: string;
  level: number;
  target_def: number;
  target_mdef: number;
  target_flee: number;
  element: 'neutral' | 'light' | 'dark' | 'fire' | 'water' | 'wind' | 'earth';
  is_monster: boolean;
}

export const WIKI_JOBS: FallbackJobSpec[] = [
  {
    "id": "templar",
    "name": "Templar",
    "tier": "second",
    "role": "Physical / MaxHP Tank-Burst",
    "weapon_type": "aegis",
    "weapon_name": "Lionheart Aegis",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 148.0,
    "auto_atk_scale": 3.1505,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.021,
    "hp_bonus_pct": 1.35,
    "sp_bonus_pct": 0.45,
    "job_bonuses": {
      "vit": 5,
      "str": 1
    },
    "innate_stats": {
      "vit": 60,
      "def": 30,
      "mdef": 30,
      "hp_pct": 0.1
    },
    "active_stats": [
      "vit",
      "str",
      "agi",
      "dex",
      "luk"
    ],
    "innate_passive_name": "Templar Mastery & Innate Aegis Passives",
    "innate_passive_desc": "2H Lionheart Aegis (+60 VIT, +30 DEF/MDEF, +10% MaxHP) + Sacred Guillotine Chain (+1.748x ATK) + Colossus Radiant Bash (+0.4025x ATK + 2.1% MaxHP).",
    "innate_class_passives": [
      "Templar Mastery",
      "Sacred Guillotine Chain",
      "Colossus Radiant Bash"
    ],
    "skills": [
      {
        "id": "sacrificestrike",
        "name": "Shield Sacrificial Strike",
        "dmg_type": "physical",
        "atk_scale": 29.0,
        "matk_scale": 0.0,
        "hp_scale": 0.4,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 2.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 2,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 3.0,
        "description": "以太陽聖光包覆盾牌橫掃半徑 170 周圍敵人，造成 1,450% ATK × 2 段 + 40% MaxHP 傷害（對怪物施放時技能 ATK 部分傷害 ×3）；隨武器塗層屬性；可暴擊、必中；消耗自身 3% MaxHP。每次命中疊加 1 層聖印（上限 6 層、持續 8 秒），帶聖印敵人陣亡時引爆半徑 170 造成每層 400% ATK + 20% Templar MaxHP 傷害並擴散 2 層聖印；擊殺任意敵人立即重置本技能冷卻；對玩家不觸發吸血。"
      },
      {
        "id": "lightdevastation",
        "name": "Grand Light Devastation",
        "dmg_type": "physical",
        "atk_scale": 50.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": true,
        "element": "light",
        "uses_weapon_coating": false,
        "cooldown": 10.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.5,
        "atk_monster_mult": 1.0,
        "description": "將盾牌重插地面定身半徑 150 內所有敵人 1.5 秒後引爆 5 段十字聖光柱：總傷害為 10 / 15 / 20 / 25 倍自身 MaxHP（依自身總 VIT <100 / 100+ / 200+ / 300+ 分階）+ 5,000% ATK；光屬性（Apollo）；計算 DEF、可暴擊並依 HIT/FLEE 判定命中；消耗 35% MaxHP；對怪物傷害 +50%。"
      },
      {
        "id": "lightsembrace",
        "name": "Light's Embrace",
        "dmg_type": "physical",
        "atk_scale": 5.5,
        "matk_scale": 0.0,
        "hp_scale": 0.15,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 15.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "揮出長 270 寬 40 的聖光鎖鏈（末端半徑 40），穿牆將沿途所有敵人拉至身前並造成 550% ATK + 15% MaxHP 傷害；隨武器塗層屬性；可暴擊、必中；強制挑釁怪物 5 秒（仇恨置頂 +500 並鎖定攻擊自身；對 Leader 僅挑釁不拉動）；對遠處怪物施放以 2 倍跑速衝近。"
      }
    ]
  },
  {
    "id": "kensei",
    "name": "Kensei",
    "tier": "second",
    "role": "Katana Critical / AGI-STR Burst",
    "weapon_type": "katana",
    "weapon_name": "Katana",
    "offhand_type": "saya",
    "is_two_handed": false,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 152.0,
    "auto_atk_scale": 1.2,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.85,
    "sp_bonus_pct": 0.3,
    "job_bonuses": {
      "agi": 3,
      "str": 2,
      "vit": 1
    },
    "innate_stats": {
      "crit_dmg": 0.4,
      "atk_pct": 0.4,
      "crit": 0.1,
      "agi_to_atk": 0.5,
      "auto_atk_proc_scale": 0.5,
      "flee_pct": 0.1,
      "move_speed_pct": 0.2
    },
    "active_stats": [
      "str",
      "agi",
      "dex",
      "luk",
      "vit"
    ],
    "innate_passive_name": "Katana & Saya Iaido + Kensei Mastery",
    "innate_passive_desc": "1H Katana + Saya (+17 refine ATK, +5% Pierce) + innate Katana Mastery, Zanshin, Meikyo Shisui, Kasumi Edge & Akatsuki Kenki.",
    "innate_class_passives": [
      "Meikyo Shisui",
      "Katana Mastery",
      "Zanshin",
      "Kasumi Edge",
      "Akatsuki Kenki",
      "Shukuchi"
    ],
    "skills": [
      {
        "id": "oboro",
        "name": "Oboro Ranbu",
        "dmg_type": "physical",
        "atk_scale": 49.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 2.1,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 7,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "aspd_floor",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "0.6 秒內於周圍半徑 220 隨機瞬移斬擊 7 次（可重複命中同一目標），每次 700% ATK；施放期間處於無敵狀態；距離 220；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      },
      {
        "id": "issen",
        "name": "Issen",
        "dmg_type": "physical",
        "atk_scale": 6.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 0.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "aspd_floor",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "瞬間突進穿刺目標路徑，對沿途所有敵人造成 600% ATK 傷害；距離 220；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      },
      {
        "id": "iaigiri",
        "name": "Iaigiri",
        "dmg_type": "physical",
        "atk_scale": 4.8,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 2.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體居合拔刀斬 480% ATK，距離 72；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      }
    ]
  },
  {
    "id": "king",
    "name": "The King",
    "tier": "second",
    "role": "Hybrid Royal Tablet (STR = INT Synergy)",
    "weapon_type": "tablet",
    "weapon_name": "Royal Tablet",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "hybrid",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": true,
    "uses_tablet_hybrid_basic": true,
    "requires_str_eq_int": true,
    "base_aspd": 148.0,
    "auto_atk_scale": 1.0,
    "auto_matk_scale": 1.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.85,
    "sp_bonus_pct": 0.85,
    "job_bonuses": {
      "int": 3,
      "str": 3
    },
    "innate_stats": {
      "dmg_pct": 0.25
    },
    "active_stats": [
      "str",
      "int",
      "dex",
      "luk",
      "agi"
    ],
    "innate_passive_name": "Royal Tablet Equilibrium (STR = INT)",
    "innate_passive_desc": "2H Royal Tablet (ATK+MATK hybrid basic attack, +10% P./M.Pierce at +10). Innate Fair Value, HFT & Sovereign Dividend Yield when STR == INT.",
    "innate_class_passives": [
      "Royal Tablet Equilibrium",
      "Fair Value",
      "HFT",
      "Cash Flow",
      "Sovereign Dividend Yield",
      "Market Circuit-Breaker"
    ],
    "skills": [
      {
        "id": "btcsoul",
        "name": "BTC Soul",
        "dmg_type": "hybrid",
        "atk_scale": 22.0,
        "matk_scale": 22.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 1.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.2,
        "atk_monster_mult": 1.0,
        "description": "彈射金幣攻擊敵人並於最近目標間乒乓反彈：依總 STR 與 INT 動態切換公式——STR 主導為 280% ATK + 160% MATK（物理，不回彈同目標，最多 4 段）；INT 主導為 280% MATK + 160% ATK（魔法，可回彈，最多 4 段）；STR = INT 為 440% ATK + 440% MATK（魔法，可回彈且不衰減，最多 5 段，全段附緩速 20% 1 秒且對已緩速目標 +20% 傷害）；若無可彈射目標金幣回手且開啟 Dividend Yield 時回報 +10%；必中、距離 200（開光環 350）；對怪物傷害 ×1.2；隨武器塗層屬性。"
      },
      {
        "id": "bullishcandle",
        "name": "Bullish Breakout Candle",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 10.3,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 6.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.2,
        "atk_monster_mult": 1.0,
        "description": "射出長 320 直線貫穿綠色 K 線造成 1,030% MATK 傷害：每貫穿 1 名敵人傷害 +10%（上限 +50%）；40% 機率施加爆倉狀態（MDEF −15%，持續 5 秒）；可魔法暴擊；對怪物傷害 ×1.2；隨武器塗層屬性。"
      },
      {
        "id": "takeprofit",
        "name": "Take Profit",
        "dmg_type": "hybrid",
        "atk_scale": 4.4,
        "matk_scale": 4.4,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 10.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 3,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.2,
        "atk_monster_mult": 1.0,
        "description": "三段連招第 3 段（於 Break Out 後 1.5 秒內連按）：於帶有 FOMO 敵人間彈射共 3 段（半徑 100，傷害不衰減；無 FOMO 目標時集中打鎖定目標 3 段），STR 主導 560% ATK + 320% MATK、INT 主導 560% MATK + 320% ATK、STR = INT 每段 880% ATK + 880% MATK；對 FOMO 目標傷害 +30%；對怪物傷害 ×1.2；隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "necromancer",
    "name": "Wicked Necromancer",
    "tier": "second",
    "role": "Dark Magic & Black Cat Summoner",
    "weapon_type": "grimoire",
    "weapon_name": "Rune Grimoire",
    "offhand_type": "lantern",
    "is_two_handed": false,
    "primary_dmg_type": "magic",
    "is_melee": false,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": true,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 148.0,
    "auto_atk_scale": 0.0,
    "auto_matk_scale": 1.15,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.7,
    "sp_bonus_pct": 0.85,
    "job_bonuses": {
      "int": 2,
      "agi": 2,
      "luk": 2
    },
    "innate_stats": {
      "matk_pct": 0.35,
      "summon_dmg_pct": 0.6,
      "aspd_pct": 0.1
    },
    "active_stats": [
      "int",
      "dex",
      "luk",
      "vit",
      "agi"
    ],
    "innate_passive_name": "Black Cat Coven, Shadow Spirit & Soul-Lantern Harvest",
    "innate_passive_desc": "1H Rune Grimoire + Lantern. Commands Black Cat Knight/Archer/Cleric (INT 100/200/300 tiers) + Soul-Lantern (+35% MATK, +50% Summon DMG) + Summon Mastery (+10%) + Shadow Spirit (+10% ASPD).",
    "innate_class_passives": [
      "Soul-Lantern Harvest",
      "Shadow Spirit",
      "Summon Mastery",
      "Feline Pact",
      "Grim Purr-session"
    ],
    "skills": [
      {
        "id": "blackcatspells",
        "name": "Black Cat Spells",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 11.5,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "dark",
        "uses_weapon_coating": false,
        "cooldown": 1.7,
        "effective_uptime_cd": null,
        "cast_time": 0.82,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "發射 10 枚黑貓靈彈合併為單次 1,150% MATK 傷害；詠唱 0.817 秒（受 DEX 縮減）；距離 240；94% 機率施加衰弱 5 秒（敵人造成傷害 −20%，對世界王無效）；可魔法暴擊；詠唱結束可立即銜接其他技能；暗屬性（Chaos）。"
      }
    ]
  },
  {
    "id": "nekobaku",
    "name": "Nekobaku",
    "tier": "second",
    "role": "Elemental Flask Alchemist (Magic-Crit)",
    "weapon_type": "flask",
    "weapon_name": "Neko Flask",
    "offhand_type": "catalyst",
    "is_two_handed": false,
    "primary_dmg_type": "magic",
    "is_melee": false,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": true,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 150.0,
    "auto_atk_scale": 0.0,
    "auto_matk_scale": 1.1,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.6,
    "sp_bonus_pct": 0.65,
    "job_bonuses": {
      "agi": 3,
      "int": 3
    },
    "innate_stats": {
      "mcrit": 0.15,
      "aspd_pct": 0.3,
      "matk_pct": 0.5,
      "agi_to_matk": 0.4,
      "solari_proc_matk": 0.525
    },
    "active_stats": [
      "int",
      "dex",
      "agi",
      "luk",
      "vit"
    ],
    "innate_passive_name": "Neko Flask & Catalyst Brew",
    "innate_passive_desc": "1H Neko Flask + Catalyst offhand. Innate Alchemy Mastery (+50% MATK), Feline Reflex (+10% ASPD, 40% AGI->MATK), Catalyst Brew (+20% ASPD, +15% MCRIT) & Unstable Concoction.",
    "innate_class_passives": [
      "Catalyst Brew",
      "Alchemy Mastery",
      "Feline Reflex",
      "Unstable Concoction",
      "Nine Lives"
    ],
    "skills": [
      {
        "id": "nekoflask",
        "name": "Fizz Flask",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 3.82,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "water",
        "uses_weapon_coating": false,
        "cooldown": 0.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "投擲魔藥瓶對目標與周圍 1.5 格所有敵人造成等額 382% MATK 傷害；距離 200；對沾油目標傷害 +20%；可魔法暴擊；水屬性（Poseidon）。"
      },
      {
        "id": "tarflask",
        "name": "Tar Flask",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 4.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "earth",
        "uses_weapon_coating": false,
        "cooldown": 1.2,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "aspd_floor",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "朝地面投擲油瓶造成 400% MATK 傷害，半徑 80、施法距離 220；施加沾油狀態 6 秒（移速 −20%）；可魔法暴擊；地屬性（Gaia）。"
      },
      {
        "id": "bigkaboom",
        "name": "Big Kaboom",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 7.2,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "fire",
        "uses_weapon_coating": false,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "aspd_floor",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "引爆火藥桶造成 720% MATK 傷害，半徑 100、施法距離 220；對沾油目標傷害 +100%；50% 機率施加燃燒 5 秒（每秒 −3% HP，上限 ATK/MATK 較高者 200%）；可魔法暴擊；火屬性（Hephaestus）。"
      },
      {
        "id": "gravityvortex",
        "name": "Gravity Vortex Pull",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 8.7,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "dark",
        "uses_weapon_coating": false,
        "cooldown": 5.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "投擲重力瓶至最遠 300 處展開半徑 180 黑洞 3 秒將敵人吸向中心；黑洞坍縮時造成 870% MATK 傷害並緩速 25% 持續 3 秒；可魔法暴擊；暗屬性（Chaos）。"
      }
    ]
  },
  {
    "id": "mamushi",
    "name": "Mamushi",
    "tier": "second",
    "role": "Viper Kunai & Shuriken Ranged Assassin",
    "weapon_type": "kunai",
    "weapon_name": "Viper Kunai",
    "offhand_type": "shuriken",
    "is_two_handed": false,
    "primary_dmg_type": "physical",
    "is_melee": false,
    "is_ranged_dex_atk": true,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 152.0,
    "auto_atk_scale": 1.15,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.7,
    "sp_bonus_pct": 0.35,
    "job_bonuses": {
      "agi": 3,
      "dex": 3
    },
    "innate_stats": {
      "atk_pct": 0.15,
      "hit": 100,
      "dmg_pct": 0.45,
      "crit_dmg": 0.2,
      "phys_pierce": 0.05
    },
    "active_stats": [
      "dex",
      "agi",
      "luk",
      "str",
      "vit"
    ],
    "innate_passive_name": "Viper Kunai, Shuriken & Venom Passives",
    "innate_passive_desc": "1H Viper Kunai (DEX*3 ATK) + Shuriken offhand. Innate Venom Mastery, Numbing Toxin (+100 HIT), Predator's Patience (+45% DMG) & Cold-Blooded Precision.",
    "innate_class_passives": [
      "Viper Kunai & Shuriken",
      "Venom Mastery",
      "Numbing Toxin",
      "Predator's Patience",
      "Cold-Blooded Precision",
      "Shedding Skin"
    ],
    "skills": [
      {
        "id": "viperfang",
        "name": "Viper Fang",
        "dmg_type": "physical",
        "atk_scale": 7.7,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 2.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體投擲 770% ATK，距離 200；50% 機率向周圍半徑 200 內所有敵人（含主目標重複命中）擴散 462% ATK 飛刀（60% 傷害），額外消耗 1 把 Throwing Blades；本身不附蛇毒（開啟 Venom Overload 時觸發）；可暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "viperscoil",
        "name": "Viper's Coil",
        "dmg_type": "physical",
        "atk_scale": 9.1,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 5.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "擲出苦無繩索束縛 240 距離內目標造成 910% ATK 傷害，定身 3 秒（Leader 無效）並使 DEF −5%（已中蛇毒則 −10%）持續 3 秒；可暴擊；隨武器塗層屬性。"
      },
      {
        "id": "shadowdecoy",
        "name": "Shadow Decoy",
        "dmg_type": "physical",
        "atk_scale": 12.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 5.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "在原地召喚繼承本體屬性的影分身持續 2 秒：怪物轉火攻擊分身（不吸引玩家）；分身依本體 ASPD 向半徑 200 內投擲 60% Viper Fang 傷害的飛刀（不消耗 Throwing Blades）；本體進入半透明狀態並獲得 FLEE +200 至分身結束（攻擊不破除）；分身結束或 HP 歸零時於半徑 150 爆裂造成 1,200% ATK 傷害、施加 5 層蛇毒與暈眩 1 秒（Leader 無效）；可暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "bouncingshuriken",
        "name": "Bouncing Shuriken",
        "dmg_type": "physical",
        "atk_scale": 13.42,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 30.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "投擲巨型手裏劍彈射自身半徑 300 內所有敵人（不限數量、傷害不衰減），每個目標造成 1,342% ATK 傷害並施加 5 層蛇毒；每次普攻或攻擊技能命中冷卻 −1 秒；施加緩速 5 秒（移速 −30%）；可暴擊；無屬性，隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "ironfist",
    "name": "Iron Fist",
    "tier": "second",
    "role": "2H Cestus Combo & God Fist Striker",
    "weapon_type": "cestus",
    "weapon_name": "Cestus",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 152.0,
    "auto_atk_scale": 1.2,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 1.05,
    "sp_bonus_pct": 0.35,
    "job_bonuses": {
      "str": 2,
      "agi": 2,
      "vit": 2
    },
    "innate_stats": {
      "atk_pct": 0.6,
      "def_to_atk_pct": 0.6,
      "cd_red": 0.1,
      "dmg_pct": 0.2
    },
    "active_stats": [
      "str",
      "agi",
      "vit",
      "dex",
      "luk"
    ],
    "innate_passive_name": "Knuckles Mastery & Ironclad Conversion (Cestus)",
    "innate_passive_desc": "2H Cestus (+60% ATK, 2x refine & 2 cards) + innate Ironclad Knuckle Conversion (60% DEF->ATK), Piston Rhythm & Fresh Blood.",
    "innate_class_passives": [
      "Knuckles Mastery",
      "Ironclad Knuckle Conversion",
      "Piston Rhythm",
      "Fresh Blood",
      "Last Stand"
    ],
    "skills": [
      {
        "id": "tigerpounce",
        "name": "Flash Dash & Smash",
        "dmg_type": "physical",
        "atk_scale": 12.1,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "第 1 段：朝 250 距離內指定終點直線突進，對寬 44 路徑上敵人造成 1,210% ATK（可空放、撞牆停止），每命中 1 名敵人 Adrenaline +1。第 2 段：1.5 秒內再按一次施放 Smash 躍擊 250 內任一目標造成 1,485% ATK 與暈眩 1 秒（Leader 無效）並獲得 Adrenaline +1；兩段分別耗魔、冷卻自第 1 段起算；附帶燃燒 3 秒（每秒 −0.7% HP）與 Chain Combo（3 秒內連用 Iron Fist 技能每層 +4% 傷害，上限 5 層）；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "groundpound",
        "name": "Smash",
        "dmg_type": "physical",
        "atk_scale": 14.85,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "於 Flash Dash 後 1.5 秒內再次按鍵發動：躍起砸擊 250 內目標造成 1,485% ATK 傷害、Adrenaline +1 與暈眩 1 秒（Leader 無效）；可暴擊；附帶燃燒 3 秒與 Chain Combo（每層 +4%，上限 5 層）；無屬性，隨武器塗層屬性；對遠處怪物以 2 倍跑速衝近。"
      },
      {
        "id": "viciouselbow",
        "name": "Low Sweep Kick",
        "dmg_type": "physical",
        "atk_scale": 13.64,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "橫掃踢擊半徑 130 內所有敵人造成 1,364% ATK 傷害，每命中 1 敵 Adrenaline +1；擊退敵人至距離自身 4 格處（不擊退已暈眩或穿牆，Leader 無效）；最多儲存 2 次充能（每 3 秒恢復 1 次）；施加緩速 1.5 秒（移速與攻速 −50%）；可暴擊；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "ironspirit",
        "name": "God Fist Destroyer",
        "dmg_type": "physical",
        "atk_scale": 136.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 8.0,
        "effective_uptime_cd": 24.0,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "僅於 God Zone 狀態下可用：長按蓄力（可移動，移速 −30%）後釋放衝刺攻擊寬 32 路徑與終點半徑 40（每名敵人受擊 1 次）：未滿 1 秒 2,356.4% ATK（距離 50）、1 秒 3,366.3% ATK（距離 100）、2 秒 6,732.7% ATK（距離 150）、3 秒以上 13,600% ATK（距離 250），撞牆停止並立即結束 God Zone；蓄力遭暈眩將取消；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "sinister",
    "name": "Sinister",
    "tier": "second",
    "role": "Twin Pistols Ranged Gunner & Poon-poon",
    "weapon_type": "pistols",
    "weapon_name": "Twin Pistols",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": false,
    "is_ranged_dex_atk": true,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 150.0,
    "auto_atk_scale": 1.35,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.75,
    "sp_bonus_pct": 0.55,
    "job_bonuses": {
      "dex": 4,
      "agi": 2
    },
    "innate_stats": {
      "atk_pct": 0.45,
      "crit_dmg": 0.15,
      "companion_atk_scale": 0.5
    },
    "active_stats": [
      "dex",
      "agi",
      "luk",
      "str",
      "vit"
    ],
    "innate_passive_name": "Dog's Eye, Dog's Bane & Call of Poon-poon",
    "innate_passive_desc": "2H Twin Pistols (DEX*3 ATK, +45% ATK, +15% CritDmg) + innate Call of Poon-poon companion.",
    "innate_class_passives": [
      "Dog's Eye & Dog's Bane",
      "Call of Poon-poon",
      "Poon-poon Ankle Clamp"
    ],
    "skills": [
      {
        "id": "bulletwaltz",
        "name": "Bullet-Waltz Cyclone",
        "dmg_type": "physical",
        "atk_scale": 25.65,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 3,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "旋轉掃射半徑 180 周圍敵人連續 3 輪，每輪造成 855% ATK 傷害並將近身敵人推離 50 距離；可暴擊；隨武器塗層屬性。"
      },
      {
        "id": "crossfire",
        "name": "Crossfire Eclipse: Alpha Hunt",
        "dmg_type": "physical",
        "atk_scale": 136.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 7.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.2,
        "hits": 14,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "固定詠唱 0.2 秒（不受 DEX 縮減）；與 Poon-poon 繞行單一目標連射：第 1–6 輪 550% ATK × 12 段、第 7 輪終結 3,500% ATK × 2 段，期間無敵 0.7 秒；可暴擊；暴擊傷害 +10%（總 DEX > 200 為 +20%，> 300 為 +30%）；冷卻 7 秒、距離 350；隨武器塗層屬性。"
      },
      {
        "id": "poondestroy",
        "name": "Poon-poon & Destroy",
        "dmg_type": "physical",
        "atk_scale": 5.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "指令 Poon-poon 撲咬目標造成 550% Poon-poon 攻擊力傷害並減速 40% 持續 5 秒；可依角色暴擊率暴擊；距離 340（需 Poon-poon 在場）；隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "swordman",
    "name": "Swordsman",
    "tier": "first",
    "role": "2H Sword Melee Vanguard",
    "weapon_type": "sword",
    "weapon_name": "Sword",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 150.0,
    "auto_atk_scale": 1.0,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 1.15,
    "sp_bonus_pct": 0.25,
    "job_bonuses": {
      "str": 2,
      "vit": 3
    },
    "innate_stats": {
      "atk_pct": 0.6,
      "aspd_pct": 0.7,
      "cd_cut_sec": 0.2,
      "vit": 20,
      "hp_pct": 0.05,
      "hp_to_atk": 0.1
    },
    "active_stats": [
      "str",
      "vit",
      "agi",
      "dex",
      "luk"
    ],
    "innate_passive_name": "2H Sword Vanguard & Swordsman Passives",
    "innate_passive_desc": "2H Sword (2x stats, 2x refine ATK, +10% Pierce) + innate Close-Combat Mastery, Battle Momentum (+50% ASPD, -0.2s CD), Iron Body & Vigor.",
    "innate_class_passives": [
      "Close-Combat Mastery",
      "Battle Momentum",
      "Iron Body",
      "Vigor",
      "Unyielding Grit"
    ],
    "skills": [
      {
        "id": "bash",
        "name": "Power Strike",
        "dmg_type": "physical",
        "atk_scale": 4.2,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 0.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體攻擊造成 420% ATK + 目標 MaxHP 1% 傷害（對 Leader、Morvath 與 Vyrmora 減為 1/10；對 Terragorn 與 Tomb Boss 減為 1/100），總傷害上限 7,000% ATK；攻擊距離 64；37% 機率暈眩 2.5 秒（對 Leader 無效）；可依角色暴擊率暴擊；無屬性，隨普攻與武器塗層屬性；對遠處怪物施放時以 2 倍跑速衝近。"
      },
      {
        "id": "magnum",
        "name": "Flame Smash",
        "dmg_type": "physical",
        "atk_scale": 9.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "fire",
        "uses_weapon_coating": false,
        "cooldown": 1.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 3,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "將劍插入地面引爆周圍火焰，造成 300% ATK × 3 段傷害；範圍 100；37% 機率施加燃燒 5 秒（每秒損失 5% HP；Leader/Morvath/Vyrmora 1/10，Terragorn/Tomb Boss 1/100；每秒不超過 ATK 或 MATK 較高者之 200%）；可依角色暴擊率暴擊；火屬性（Hephaestus）。"
      },
      {
        "id": "vanguardcharge",
        "name": "Vanguard Charge",
        "dmg_type": "physical",
        "atk_scale": 6.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "衝鋒攻擊 220 距離內目標，對路徑上所有敵人造成 650% ATK 傷害並向兩側推開、暈眩 1.5 秒（Leader 無效）；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      }
    ]
  },
  {
    "id": "mage",
    "name": "Mage",
    "tier": "first",
    "role": "Elemental Spellcaster (2H Staff)",
    "weapon_type": "staff",
    "weapon_name": "Staff",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "magic",
    "is_melee": false,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": true,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 145.0,
    "auto_atk_scale": 0.0,
    "auto_matk_scale": 1.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.6,
    "sp_bonus_pct": 0.95,
    "job_bonuses": {
      "int": 5
    },
    "innate_stats": {
      "int": 20,
      "sp_pct": 0.1,
      "sp_to_matk": 0.15,
      "dex_to_matk": 1.5,
      "matk_pct": 0.6,
      "elem_dmg": 0.1,
      "cast_reduce_pct": 0.15,
      "mcrit": 0.1
    },
    "active_stats": [
      "int",
      "dex",
      "luk",
      "vit",
      "agi"
    ],
    "innate_passive_name": "Elemental Arcana & Mage Passives (Staff)",
    "innate_passive_desc": "2H Staff (2x stats, 2x refine MATK, +10% Pierce) + innate Mentality, Elemental Resonance & Spellweave Synergy.",
    "innate_class_passives": [
      "Mentality",
      "Elemental Resonance",
      "Spellweave Synergy",
      "Meditation",
      "Arcane Conduit"
    ],
    "skills": [
      {
        "id": "firebolt",
        "name": "Armageddon Starburst",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 23.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "fire",
        "uses_weapon_coating": false,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；對目標周圍半徑 140 內所有敵人造成傷害，施法距離 240；75% 機率施加燃燒 5 秒（每秒 −5% HP，上限 ATK/MATK 較高者 200%）；依魔法暴擊率（LUK 與裝備 M.CRIT）暴擊；詠唱結束後可立即銜接其他技能；火屬性（Hephaestus）。"
      },
      {
        "id": "coldbolt",
        "name": "Frost Area",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 24.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "water",
        "uses_weapon_coating": false,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "480% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；範圍 150，施法距離 240；55% 機率施加冰凍 2 秒（對 Leader 無效：無法移動、所受魔法傷害 +55%）；可依魔法暴擊率暴擊；詠唱結束後可立即銜接其他技能；對暈眩目標傷害 +50%；水屬性（Poseidon）。"
      },
      {
        "id": "thunderstorm",
        "name": "Stormbreak",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 23.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "wind",
        "uses_weapon_coating": false,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；範圍 120，施法距離 240；55% 機率施加暈眩 1.8 秒（對 Leader 無效）；可依魔法暴擊率暴擊；詠唱結束後可立即銜接其他技能；對冰凍目標傷害 +50%；風屬性（Aeolus）。"
      },
      {
        "id": "tierra",
        "name": "Tierra Bladeburst",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 23.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "earth",
        "uses_weapon_coating": false,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；攻擊目標周圍半徑 130 內所有敵人，施法距離 240；75% 機率降低 MDEF 10% 持續 2.5 秒；可魔法暴擊；詠唱結束後可立即銜接其他技能；地屬性（Gaia）。"
      }
    ]
  },
  {
    "id": "archer",
    "name": "Archer",
    "tier": "first",
    "role": "Ranged Bow Marksman",
    "weapon_type": "bow",
    "weapon_name": "Bow",
    "offhand_type": "quiver",
    "is_two_handed": false,
    "primary_dmg_type": "physical",
    "is_melee": false,
    "is_ranged_dex_atk": true,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 147.0,
    "auto_atk_scale": 1.0,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.65,
    "sp_bonus_pct": 0.45,
    "job_bonuses": {
      "dex": 5
    },
    "innate_stats": {
      "dex": 20,
      "hit_pct": 0.1,
      "dex_to_atk": 0.45,
      "hit_to_atk": 0.2,
      "bow_dmg_pct": 0.6,
      "ranged_dmg_pct": 0.2,
      "coated_dmg": 0.15
    },
    "active_stats": [
      "dex",
      "agi",
      "luk",
      "str",
      "vit"
    ],
    "innate_passive_name": "Bow & Quiver Marksman + Archer Passives",
    "innate_passive_desc": "1H Bow (DEX*3 ATK) + Quiver offhand. Innate Far Sight (+60% Bow DMG), Keen Eye (+20 DEX, +10% HIT) & Elemental Quiver (+15% coated DMG).",
    "innate_class_passives": [
      "Far Sight",
      "Keen Eye",
      "Elemental Quiver"
    ],
    "skills": [
      {
        "id": "doublestrafe",
        "name": "Twin Shot",
        "dmg_type": "physical",
        "atk_scale": 5.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 0.6,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體射擊 250% ATK × 2 段，距離 320；25% 機率改為射出 4 段；不重置 Momentum，命中時如同普攻疊加 1 層 Momentum；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "arrowshower",
        "name": "Arrow Rain",
        "dmg_type": "physical",
        "atk_scale": 15.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 1.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "箭雨造成 310% ATK × 5 段傷害；圓形半徑 7 格、施法距離 280；25% 機率施加緩速 2 秒（移動速度 −50%）；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "piercingshot",
        "name": "Piercing Shot",
        "dmg_type": "physical",
        "atk_scale": 8.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 2.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體貫穿射擊 800% ATK，距離 320；75% 機率施加破甲 5 秒（所受傷害 +20%）；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "briarseed",
        "name": "Briar Seed Trap",
        "dmg_type": "physical",
        "atk_scale": 8.2,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 0.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "投擲荊棘種子至距離 180 處（偵測半徑 50、持續 55 秒、最多同時存在 3 顆，對敵對玩家隱藏）；敵人踩中後藤蔓定身（Root）2.5 秒並造成 220% ATK 傷害，隨後於半徑 110 爆裂造成 820% ATK 傷害並施加破甲 5 秒（所受傷害 +20%）；可暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "leapshot",
        "name": "Leap Shot",
        "dmg_type": "physical",
        "atk_scale": 12.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "wind",
        "uses_weapon_coating": false,
        "cooldown": 2.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "射擊目標造成 1,200% ATK 傷害並引爆疾風，對周圍半徑 200 內敵人造成 100% 濺射傷害（對周圍玩家為 50% 且不擊退）；距離 250；使敵對玩家擊退 5 格（怪物與 Leader 不擊退）；可暴擊；風屬性（Aeolus）。"
      }
    ]
  },
  {
    "id": "acolyte",
    "name": "Cleric",
    "tier": "first",
    "role": "Holy Light Quarterstaff Caster",
    "weapon_type": "quarterstaff",
    "weapon_name": "Quarterstaff",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "magic",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": true,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 150.0,
    "auto_atk_scale": 0.0,
    "auto_matk_scale": 1.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.75,
    "sp_bonus_pct": 0.75,
    "job_bonuses": {
      "int": 3,
      "vit": 2
    },
    "innate_stats": {
      "light_dark_dmg": 0.2,
      "cd_red": 0.1,
      "atk_pct": 0.25,
      "matk_pct": 0.25,
      "def": 20,
      "mdef": 30,
      "skill_dmg_pct": 0.2,
      "solari_proc_matk": 1.5
    },
    "active_stats": [
      "int",
      "dex",
      "vit",
      "luk",
      "str"
    ],
    "innate_passive_name": "Light & Shadow & Acolyte Mastery",
    "innate_passive_desc": "2H Quarterstaff + innate Light & Shadow (+20% Light/Dark, -10% CD), Sacred & Divine (+25% ATK/MATK), Twilight Equilibrium & Solari Judgment.",
    "innate_class_passives": [
      "Light & Shadow",
      "Sacred & Divine",
      "Twilight Equilibrium",
      "Solari Judgment",
      "Blessed Searing Judgment"
    ],
    "skills": [
      {
        "id": "holylight",
        "name": "Radiant Light",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 8.3,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "light",
        "uses_weapon_coating": false,
        "cooldown": 1.3,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "向周圍爆裂聖光造成 830% MATK 傷害（對暗屬性敵人 +88%）；詠唱 2.98 秒（受 DEX 縮減）；半徑 200；25% 機率施加致盲 3 秒（HIT −35%）；依魔法暴擊率暴擊；光屬性（Apollo）。"
      },
      {
        "id": "sacredradiance",
        "name": "Sacred Radiance",
        "dmg_type": "magic",
        "atk_scale": 0.0,
        "matk_scale": 17.5,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "light",
        "uses_weapon_coating": false,
        "cooldown": 4.0,
        "effective_uptime_cd": null,
        "cast_time": 3.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "multi_hit_cast_dex_over_150",
        "multi_hit_spell": true,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "在目標地面召喚聖光法陣（施法距離 150、半徑 200、持續 2.5 秒），每 0.5 秒爆發一次（共 5 次），每次對陣內敵人造成 350% MATK 光屬性傷害並有 25% 機率致盲 5 秒（HIT −25%），同時為陣內自身與隊友恢復 500 + 1×INT + 2×VIT HP；詠唱 2.98 秒（受 DEX 縮減）；可魔法暴擊；光屬性（Apollo）。"
      }
    ]
  },
  {
    "id": "merchant",
    "name": "Merchant",
    "tier": "first",
    "role": "2H Hammer Heavy Striker",
    "weapon_type": "hammer",
    "weapon_name": "Hammer",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 148.0,
    "auto_atk_scale": 1.0,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.95,
    "sp_bonus_pct": 0.35,
    "job_bonuses": {
      "str": 3,
      "vit": 2
    },
    "innate_stats": {
      "flat_hp": 2000,
      "str": 10,
      "atk_pct": 0.45,
      "weight_atk": 45.0,
      "move_speed_pct": 0.2
    },
    "active_stats": [
      "str",
      "vit",
      "agi",
      "dex",
      "luk"
    ],
    "innate_passive_name": "Treasury Vitality & Merchant Passives",
    "innate_passive_desc": "2H Hammer (2x stats, 2x refine ATK, +10% Pierce) + innate Treasury Vitality (+2000 HP), Weight Training (+45% ATK) & Cart passives.",
    "innate_class_passives": [
      "Treasury Vitality",
      "Weight Training",
      "Reinforced Cart Wheels",
      "Heavy Cart Armor"
    ],
    "skills": [
      {
        "id": "mammonite",
        "name": "Gold Strike",
        "dmg_type": "physical",
        "atk_scale": 8.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": true,
        "aspd_scaling_type": "cooldown_from_aspd",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體重擊 800% ATK，距離 72；以此技能擊殺時 50% 機率獲得 1–5 Silver；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放時以 2 倍跑速衝近。"
      },
      {
        "id": "cartstrike",
        "name": "Cart Strike",
        "dmg_type": "physical",
        "atk_scale": 8.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 5.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "駕駛手推車朝指定方向衝鋒 220 距離，對路徑半徑 80 內所有敵人造成 850% ATK 傷害（必中）；90% 機率擊退 3 格並暈眩 2.5 秒（對 Leader 無效）；施加衰弱 5 秒（目標造成傷害 −20%、受到傷害 +20%）；可暴擊；無屬性，隨武器塗層屬性。"
      },
      {
        "id": "hammerfall",
        "name": "Quake Hammer",
        "dmg_type": "physical",
        "atk_scale": 23.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "earth",
        "uses_weapon_coating": false,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 5,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": true,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "震擊周圍造成 470% ATK × 5 段傷害，半徑 180（必中）；35% 機率暈眩 2.5 秒（對 Leader 無效）；可暴擊；地屬性（Gaia）。"
      },
      {
        "id": "decoytotem",
        "name": "Decoy Coin Totem",
        "dmg_type": "physical",
        "atk_scale": 18.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 15.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "於 200 距離內設置存在 5 秒、HP 為自身 50% MaxHP 的金幣圖騰：吸引半徑 180 內怪物攻擊圖騰；時間結束或遭摧毀時對周圍造成 1,800% ATK 爆裂傷害；可暴擊；無屬性，隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "thief",
    "name": "Thief",
    "tier": "first",
    "role": "Dagger Pair Critical Rogue (2x CRIT)",
    "weapon_type": "dagger_pair",
    "weapon_name": "Dagger Pair",
    "offhand_type": "none",
    "is_two_handed": true,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 152.0,
    "auto_atk_scale": 1.1,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.8,
    "sp_bonus_pct": 0.2,
    "job_bonuses": {
      "agi": 3,
      "str": 2
    },
    "innate_stats": {
      "double_hit_chance": 0.5,
      "hit": 10,
      "crit_dmg": 0.2,
      "aspd_pct": 0.1,
      "agi_to_atk": 0.55,
      "flee_pct": 0.2,
      "move_speed_pct": 0.15,
      "skill_dmg_pct": 0.1
    },
    "active_stats": [
      "agi",
      "str",
      "luk",
      "dex",
      "vit"
    ],
    "innate_passive_name": "Dagger Mastery (2x CRIT) & Thief Passives",
    "innate_passive_desc": "2H Dagger Pair (2x Physical CRIT%) + innate Twin Strike, Fatal Sense, Combo Point Finisher & Fleet Foot.",
    "innate_class_passives": [
      "Dagger Mastery (2x Physical CRIT)",
      "Twin Strike",
      "Fatal Sense",
      "Combo Point Finisher",
      "Fleet Foot",
      "Evasive Counterstep"
    ],
    "skills": [
      {
        "id": "twinfang",
        "name": "Shadow Strike",
        "dmg_type": "physical",
        "atk_scale": 7.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 3.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "單體突刺 750% ATK（從背後 60° 內或 Shadow Blink 後 3 秒內對同一目標施放提升至 1,860% ATK；於 Vanish 或 Assassinate 狀態下施放傷害 ×4 並現形）；距離 72；可觸發 Twin Strike 二連擊；目標周圍 1.5 格濺射 30% 傷害；可暴擊；Thief 本人擊殺敵人時立即重置 Thief 全部 4 招冷卻；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      },
      {
        "id": "venomknife",
        "name": "Shadow Blink",
        "dmg_type": "physical",
        "atk_scale": 4.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 5.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "瞬移至目標身後 40 距離面向目標斬擊 450% ATK，施法距離 220；施加破甲切傷 4 秒（DEF −20%）與暈眩 0.5 秒（對 Leader 無效）；可暴擊；Thief 親手擊殺目標時重置 Thief 全部 4 招冷卻；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。"
      },
      {
        "id": "shadowburst",
        "name": "Shadow Bomb",
        "dmg_type": "physical",
        "atk_scale": 6.0,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 8.0,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "引爆煙霧彈對半徑 130 內敵人造成 600% ATK 傷害；施加致盲 5 秒（HIT −25%）；可暴擊；顯現半徑內隱身敵人 5 秒；可在 Vanish 期間施放而不破除隱身；對玩家傷害減為 50%；Thief 親手擊殺目標時重置全部 4 招冷卻；無屬性，隨武器塗層屬性。"
      }
    ]
  },
  {
    "id": "novice",
    "name": "Novice",
    "tier": "novice",
    "role": "Starter Adventurer",
    "weapon_type": "knife",
    "weapon_name": "Knife",
    "offhand_type": "shield",
    "is_two_handed": false,
    "primary_dmg_type": "physical",
    "is_melee": true,
    "is_ranged_dex_atk": false,
    "uses_matk_basic_attack": false,
    "uses_tablet_hybrid_basic": false,
    "requires_str_eq_int": false,
    "base_aspd": 148.0,
    "auto_atk_scale": 1.0,
    "auto_matk_scale": 0.0,
    "auto_hp_scale": 0.0,
    "hp_bonus_pct": 0.0,
    "sp_bonus_pct": 0.0,
    "job_bonuses": {},
    "innate_stats": {},
    "active_stats": [
      "str",
      "agi",
      "vit",
      "dex",
      "luk"
    ],
    "innate_passive_name": "Adventurer's Spirit",
    "innate_passive_desc": "Starter class relying on basic attacks and cross-class passives.",
    "innate_class_passives": [
      "Adventurer's Spirit"
    ],
    "skills": [
      {
        "id": "basic_strike",
        "name": "Basic Strike",
        "dmg_type": "physical",
        "atk_scale": 1.5,
        "matk_scale": 0.0,
        "hp_scale": 0.0,
        "vit_tier_hp_scale": false,
        "element": "neutral",
        "uses_weapon_coating": true,
        "cooldown": 1.5,
        "effective_uptime_cd": null,
        "cast_time": 0.0,
        "fixed_cast": 0.0,
        "hits": 1,
        "cooldown_from_aspd": false,
        "aspd_scaling_type": "fixed_cooldown",
        "multi_hit_spell": false,
        "never_misses": false,
        "can_crit": true,
        "ignores_def": false,
        "monster_mult": 1.0,
        "atk_monster_mult": 1.0,
        "description": "Basic melee strike (150% ATK), inherits weapon coating."
      }
    ]
  }
];

export const WIKI_PASSIVES: FallbackPassiveSpec[] = [
  {
    "id": "akatsukikenki",
    "name": "Akatsuki Kenki",
    "source_job": "kensei",
    "restriction": "all",
    "description": "被動 · 擊殺敵人或累計暴擊 10 次時覺醒 Akatsuki Kenki 10 秒：普攻距離依等級 +15~60，且普攻對目標周圍半徑 90 內敵人造成 25~50% ATK 濺射傷害（Lv.10 為距離 +60、50% ATK 濺射）。",
    "stats": {
      "cleave_atk_pct": 0.5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "alchemymastery",
    "name": "Alchemy Mastery",
    "source_job": "nekobaku",
    "restriction": "all",
    "description": "被動 · 每級 MATK +5%（滿級 +50%，Lv.10）。",
    "stats": {
      "matk_pct": 0.5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "ankleclamp",
    "name": "Poon-poon Ankle Clamp",
    "source_job": "sinister",
    "restriction": "all",
    "description": "被動 · Poon-poon 撲咬時有 5~15% 機率定身目標 0.5~1.5 秒（Leader 無效）並使 FLEE −15~30%（Lv.10 為 15% 機率、定身 1.5 秒、FLEE −30%）。",
    "stats": {
      "proc_chance": 0.15,
      "target_flee_debuff": 0.3
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "arcaneconduit",
    "name": "Arcane Conduit",
    "source_job": "mage",
    "restriction": "all",
    "description": "被動 · 施放技能時恢復 0.3/0.6/0.9/1.2/1.5/1.8/2.1/2.4/2.7/3% MaxHP，冷卻依等級為 5~2.5 秒（Lv.10 為 3% MaxHP、冷卻 2.5 秒）。",
    "stats": {
      "skill_heal_hp_pct": 0.03
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "battlemomentum",
    "name": "Battle Momentum",
    "source_job": "swordman",
    "restriction": "all",
    "description": "被動 · 主動技能命中時獲得 1 層 Battle Momentum（上限 5 層，持續 6 秒）：每層依等級提供 ASPD +1~10%（Lv.10 共 +50% ASPD）且主動技能冷卻 −0.2 秒（Lv.10）。",
    "stats": {
      "aspd_pct": 0.5,
      "cd_cut_sec": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "blessedjudgment",
    "name": "Blessed Searing Judgment",
    "source_job": "acolyte",
    "restriction": "all",
    "description": "被動 · 治療效果（Heal Power）依等級 +5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15%；對致盲敵人傷害依等級 +4/8/12/16/20/24/28/32/36/40%（Lv.10）。",
    "stats": {
      "heal_power_pct": 0.15,
      "vs_blind_dmg_pct": 0.4
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "callpoon",
    "name": "Call of Poon-poon",
    "source_job": "sinister",
    "restriction": "all",
    "description": "職業固有被動（免點數，其他職業亦可裝備於被動欄位召喚 Poon-poon）：召喚無敵且不被選取的 Poon-poon 隨行戰鬥，每 2 次角色攻擊協助撲咬同一目標，距離超過 400 自動瞬移回身旁（Lv.10）。",
    "stats": {
      "companion_poon_poon": true
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "cartwheels",
    "name": "Reinforced Cart Wheels",
    "source_job": "merchant",
    "restriction": "all",
    "description": "被動 · 移動速度依等級 +2/4/6/8/10/12/14/16/18/20%（Lv.10）。",
    "stats": {
      "move_speed_pct": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "catreflex",
    "name": "Feline Reflex",
    "source_job": "nekobaku",
    "restriction": "all",
    "description": "被動 · 每級 ASPD +1%（滿級 +10%），並使 MATK 增加相當於 AGI 的 4%/級（滿級 40% AGI，Lv.10）。",
    "stats": {
      "agi_to_matk": 0.4,
      "aspd_pct": 0.1
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "circuitbreaker",
    "name": "Market Circuit-Breaker",
    "source_job": "king",
    "restriction": "all",
    "description": "被動 · 單次受到超過 MaxHP 45~25% 的傷害時將該次傷害截斷至上限值，冷卻 20 秒（Lv.10 上限為 25% MaxHP）。",
    "stats": {
      "dmg_cap_hp_pct": 0.25
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "coldblooded",
    "name": "Cold-Blooded Precision",
    "source_job": "mamushi",
    "restriction": "all",
    "description": "被動 · 攻擊中毒或蛇毒目標時，暴擊傷害依等級 +2~20%、無視防禦（物理穿透）依等級 +0.5~5%（Lv.10 為暴傷 +20%、物理穿透 +5%）。",
    "stats": {
      "vs_poison_crit_dmg": 0.2,
      "vs_poison_pierce": 0.05
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "colossusbash",
    "name": "Colossus Radiant Bash",
    "source_job": "templar",
    "restriction": "lionheart_aegis",
    "description": "被動 · 僅於裝備 Lionheart Aegis 時生效：普攻有 15~35% 機率重擊盾牌造成 50~115% ATK + 2~6% MaxHP 傷害（Lv.10 為 35% 機率、115% ATK + 6% MaxHP）；可依角色暴擊率暴擊。",
    "stats": {
      "proc_atk_scale": 1.15,
      "proc_chance": 0.35,
      "proc_hp_scale": 0.06
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "combofinisher",
    "name": "Combo Point Finisher",
    "source_job": "thief",
    "restriction": "melee",
    "description": "被動 · Twin Strike 觸發二連擊時獲得 1 點連擊點（上限 5 點）；集滿後下次攻擊技能免消耗 SP、傷害依等級 +5~50% ATK 並恢復 2~7% MaxHP（Lv.10 為 +50% ATK、+7% MaxHP）。",
    "stats": {
      "combo_bonus_atk_scale": 0.5,
      "melee_only": true
    },
    "melee_only": true,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "counterstep",
    "name": "Evasive Counterstep",
    "source_job": "thief",
    "restriction": "all",
    "description": "被動 · 閃避物理攻擊時有 25~75% 機率反擊斬造成 50~150% ATK 傷害並恢復 1~10 SP（冷卻 2 秒；Lv.10 為 75% 機率、150% ATK、+10 SP）。",
    "stats": {
      "counter_atk_scale": 1.5,
      "dodge_counter_chance": 0.75
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "demonbane",
    "name": "Sacred & Divine",
    "source_job": "acolyte",
    "restriction": "all",
    "description": "被動 · 每級 DEF +2、MDEF +3（滿級 DEF +20 / MDEF +30），且 ATK 與 MATK 每級 +2.5%（滿級 +25%，Lv.10）。",
    "stats": {
      "atk_pct": 0.25,
      "def": 20,
      "matk_pct": 0.25,
      "mdef": 30
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "doubleattack",
    "name": "Twin Strike",
    "source_job": "thief",
    "restriction": "melee",
    "description": "被動 · 近戰武器普攻每級獲得 5% 二連擊機率（滿級 50%）與 HIT +1（滿級 +10，Lv.10）。",
    "stats": {
      "double_hit_chance": 0.5,
      "hit": 10,
      "melee_only": true
    },
    "melee_only": true,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "elementalquiver",
    "name": "Elemental Quiver",
    "source_job": "archer",
    "restriction": "all",
    "description": "被動 · 為武器塗層任意屬性後，普攻與攻擊技能傷害依等級 +4/5.2/6.4/7.7/8.9/10.1/11.3/12.6/13.8/15%（未塗層則不生效，Lv.10）。",
    "stats": {
      "coated_dmg": 0.15
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "elementalresonance",
    "name": "Elemental Resonance",
    "source_job": "mage",
    "restriction": "all",
    "description": "全地圖常駐光環：為自身與同地圖所有隊友提升全部屬性攻擊（物理與魔法）傷害，依等級 +3/3.8/4.6/5.3/6.1/6.9/7.7/8.4/9.2/10%（同隊多名法師取最高等級計算，Lv.10）。",
    "stats": {
      "elem_dmg": 0.1
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "fatalsense",
    "name": "Fatal Sense",
    "source_job": "thief",
    "restriction": "all",
    "description": "被動 · 每級暴擊傷害 +2%、ASPD +1%（滿級 +20% / +10%），並使 ATK 增加相當於 AGI 的 5.5%/級（滿級 55% AGI，Lv.10）。",
    "stats": {
      "agi_to_atk": 0.55,
      "aspd_pct": 0.1,
      "crit_dmg": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "felinepact",
    "name": "Feline Pact",
    "source_job": "necromancer",
    "restriction": "all",
    "description": "被動 · 所有召喚物所受傷害依等級減免 2/4/6/8/10/12/14/16/18/20%（Lv.10）。",
    "stats": {
      "summon_dmg_cut": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "fivetriple",
    "name": "Last Stand",
    "source_job": "ironfist",
    "restriction": "all",
    "description": "被動 · 受到致命傷時鎖定 HP 為 1 持續 5 秒並進入無敵（免疫異常，無法回血或使用道具，可正常攻擊與施法），5 秒後死亡（若同時裝備 Nine Lives 則會接續觸發）；冷卻依等級 60/57/53/50/47/43/40/37/33/30 秒；全地圖適用且可跨職裝備（Lv.10）。",
    "stats": {
      "undying_sec": 5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "grimpurr",
    "name": "Grim Purr-session",
    "source_job": "necromancer",
    "restriction": "all",
    "description": "被動 · 魔法攻擊技能命中時有 10~30% 機率詛咒目標 4 秒，期間目標獲得的治療將轉化為該治療量 95~195% 的暗屬性傷害（Lv.10 為 30% 機率、195% 轉傷）。",
    "stats": {
      "curse_chance": 0.3
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "heavycart",
    "name": "Heavy Cart Armor",
    "source_job": "merchant",
    "restriction": "all",
    "description": "被動 · 負重超過 50% 時所受傷害依等級減免 2/3.1/4.2/5.3/6.4/7.6/8.7/9.8/10.9/12%（Lv.10）。",
    "stats": {
      "dmg_cut_overweight": 0.12
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "hprecovery",
    "name": "Vigor",
    "source_job": "swordman",
    "restriction": "all",
    "description": "被動 · 每級使 ATK 增加相當於 MaxHP 1%（滿級 10%）、自然回血與藥水回血效果各提升 10%，且每 2 級 SP 恢復 +1（Lv.10）。",
    "stats": {
      "hp_regen_pct": 1.0,
      "hp_to_atk": 0.1,
      "potion_boost_pct": 1.0,
      "sp_regen": 5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "improvedodge",
    "name": "Fleet Foot",
    "source_job": "thief",
    "restriction": "all",
    "description": "被動 · 每級 FLEE +2%（滿級 +20%）與移動速度 +1.5%（滿級 +15%，Lv.10）。",
    "stats": {
      "flee_pct": 0.2,
      "move_speed_pct": 0.15
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "ironbody",
    "name": "Iron Body",
    "source_job": "swordman",
    "restriction": "all",
    "description": "被動 · 每級 VIT +2、MaxHP +0.5%（滿級 VIT +20 / MaxHP +5%，Lv.10）。",
    "stats": {
      "hp_pct": 0.05,
      "vit": 20
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "ironcladknuckle",
    "name": "Ironclad Knuckle Conversion",
    "source_job": "ironfist",
    "restriction": "all",
    "description": "被動 · 將總 DEF 的 15/20/25/30/35/40/45/50/55/60% 轉化為 ATK（Lv.10 為 60%）。",
    "stats": {
      "def_to_atk": 0.6
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "ironhide",
    "name": "Fresh Blood",
    "source_job": "ironfist",
    "restriction": "knuckle",
    "description": "被動 · 裝備拳套（Cestus）時，對 HP 高於 85% 的敵人傷害依等級 +10/11/12/13/14/16/17/18/19/20%；可跨職業裝備於被動欄位（Lv.10）。",
    "stats": {
      "vs_high_hp_dmg_pct": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "kasumiedge",
    "name": "Kasumi Edge",
    "source_job": "kensei",
    "restriction": "all",
    "description": "被動 · 普攻有 5~20% 機率以刀柄擊暈目標 1.5 秒（Leader 無效）並接續 2 段斬擊，每段 150~450% ATK 且施加流血（冷卻 5 秒；Lv.10 為 20% 機率、每段 450% ATK）。",
    "stats": {
      "proc_atk_hits": 2,
      "proc_atk_scale": 4.5,
      "proc_chance": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "katanamastery",
    "name": "Katana Mastery",
    "source_job": "kensei",
    "restriction": "katana",
    "description": "被動 · 裝備太刀時每級 ATK +4%（滿級 +40%），CRIT 每級 +1（滿級 +10，Lv.10）。",
    "stats": {
      "atk_pct": 0.4,
      "crit": 0.1
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": true,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "lightshadow",
    "name": "Light & Shadow",
    "source_job": "acolyte",
    "restriction": "all",
    "description": "被動 · Cleric 固有 Lv.10 被動（免點數）；光與暗屬性物理及魔法傷害每級 +2%（滿級 +20%），技能冷卻每級 −1%（滿級 −10%，Lv.10）。",
    "stats": {
      "cd_red": 0.1,
      "light_dark_dmg": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "mentality",
    "name": "Mentality",
    "source_job": "mage",
    "restriction": "all",
    "description": "被動 · 每級 INT +2、MaxSP +1%（滿級 +20 / +10%）；MATK 增加相當於 MaxSP 的 1.5% 與 DEX 的 15%/級（滿級 15% SP + 150% DEX）；MATK 每級 +6%（滿級 +60%）；技能耗魔每級 −1%（滿級 −10%，Lv.10）。",
    "stats": {
      "dex_to_matk": 1.5,
      "int": 20,
      "matk_pct": 0.6,
      "sp_cost_red": 0.1,
      "sp_pct": 0.1,
      "sp_to_matk": 0.15
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "ninelives",
    "name": "Nine Lives",
    "source_job": "nekobaku",
    "restriction": "all",
    "description": "被動 · 受到怪物或異常狀態致命傷時免死並恢復 10% + 2%/級 MaxHP（Lv.10 為 30%）；冷卻 10 分鐘每級縮短 30 秒（Lv.10 為 5 分鐘）；決鬥與競技場不觸發（Lv.10）。",
    "stats": {
      "revive_hp_pct": 0.3
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "numbingtoxin",
    "name": "Numbing Toxin",
    "source_job": "mamushi",
    "restriction": "kunai",
    "description": "被動 · 須裝備苦無：中蛇毒的敵人每層 HIT −1/級（滿級每層 −10），自身 HIT 每級 +10（滿級 +100，Lv.10）。",
    "stats": {
      "hit": 100
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": true,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "owleye",
    "name": "Keen Eye",
    "source_job": "archer",
    "restriction": "all",
    "description": "被動 · 每級 DEX +2、HIT +1%（滿級 +20 / +10%）；每級 ATK 增加相當於 HIT 的 2% 與 DEX 的 4.5%（滿級 20% HIT + 45% DEX，Lv.10）。",
    "stats": {
      "dex": 20,
      "dex_to_atk": 0.45,
      "hit_pct": 0.1,
      "hit_to_atk": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "peratio",
    "name": "Fair Value",
    "source_job": "king",
    "restriction": "str_eq_int",
    "description": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：物理穿透與魔法穿透每級 +1%（滿級 +10%）；可跨職業裝備（Lv.10）。",
    "stats": {
      "magic_pierce": 0.1,
      "phys_pierce": 0.1,
      "requires_str_eq_int": true
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": true
  },
  {
    "id": "pistonrhythm",
    "name": "Piston Rhythm",
    "source_job": "ironfist",
    "restriction": "all",
    "description": "被動 · 普攻暴擊時，所有主動技能剩餘冷卻依等級縮短 0.05/0.1/0.15/0.2/0.25/0.3/0.35/0.4/0.45/0.5 秒（Lv.10）。",
    "stats": {
      "crit_cd_cut_sec": 0.5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "predator",
    "name": "Predator's Patience",
    "source_job": "mamushi",
    "restriction": "kunai",
    "description": "被動 · 須裝備苦無：對中蛇毒的敵人物理傷害依等級 +10/13.9/17.8/21.7/25.6/29.4/33.3/37.2/41.1/45%（Lv.10）。",
    "stats": {
      "vs_poisoned_phys_pct": 0.45
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": true,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "priceceiling",
    "name": "HFT",
    "source_job": "king",
    "restriction": "str_eq_int",
    "description": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：全技能冷卻每級 −1.5%、LUK 每級 +3（滿級冷卻 −15% / LUK +30）；可跨職業裝備（Lv.10）。",
    "stats": {
      "cd_red": 0.15,
      "luk": 30,
      "requires_str_eq_int": true
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": true
  },
  {
    "id": "pricefloor",
    "name": "Cash Flow",
    "source_job": "king",
    "restriction": "str_eq_int",
    "description": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：普攻有 (LUK÷3)% 機率恢復 5/7/9/12/14/16/18/21/23/25 點 SP；裝備本被動後無論 STR 是否等於 INT 皆無法從套裝／卡片／裝備吸魔；可跨職裝備（Lv.10）。",
    "stats": {
      "requires_str_eq_int": true,
      "sp_on_hit_max": 25
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": true
  },
  {
    "id": "sacredguillotine",
    "name": "Sacred Guillotine Chain",
    "source_job": "templar",
    "restriction": "all",
    "description": "被動 · 每累計 5 次普攻觸發聖光鎖鏈 4 段連擊：首段造成 90~190% ATK（Lv.10 為 190%），每段遞增 +10% 傷害且最後一段暴擊傷害 +10%（Lv.10）。",
    "stats": {
      "every_5th_hits": 4,
      "first_hit_atk_scale": 1.9
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "sheddingskin",
    "name": "Shedding Skin",
    "source_job": "mamushi",
    "restriction": "all",
    "description": "被動 · 單次受到超過 20% MaxHP 傷害時立即淨化全部異常狀態，並於 5 秒內獲得 FLEE +10~40% 與移速 +5~20%（冷卻 10 秒；Lv.10 為 FLEE +40%、移速 +20%）。",
    "stats": {
      "proc_flee_pct": 0.4
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "shukuchi",
    "name": "Shukuchi",
    "source_job": "kensei",
    "restriction": "all",
    "description": "被動 · 每級移動速度 +2%（滿級 +20%）、FLEE +1%（滿級 +10%，Lv.10）。",
    "stats": {
      "flee_pct": 0.1,
      "move_speed_pct": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "solarijudgment",
    "name": "Solari Judgment",
    "source_job": "acolyte",
    "restriction": "all",
    "description": "被動 · 攻擊技能命中時有 10/12.2/14.4/16.7/18.9/21.1/23.3/25.6/27.8/30% 機率召喚 Solari 光束，對目標造成 250~500% MATK 光屬性傷害（Lv.10 為 30% 機率、500% MATK）。",
    "stats": {
      "proc_chance": 0.3,
      "proc_matk_scale": 5.0
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "soullantern",
    "name": "Soul-Lantern Harvest",
    "source_job": "necromancer",
    "restriction": "all",
    "description": "被動 · 半徑 240 內有敵人或召喚物死亡時獲得 1 盞靈魂燈火（上限 5 盞，持續 15 秒）：每盞使召喚物傷害依等級 +2~10%（Lv.10 每盞 +10%，滿層 +50%）、MATK 依等級 +2~7%（Lv.10 每盞 +7%，滿層 +35%）。",
    "stats": {
      "matk_pct": 0.35
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "sovereigndividend",
    "name": "Sovereign Dividend Yield",
    "source_job": "king",
    "restriction": "all",
    "description": "被動 · 複利滾雪球：連續命中同一目標時每次傷害依等級 +0.5~2.5%（上限 10 層，Lv.10 滿層 +25%），切換目標重新計算。",
    "stats": {
      "consecutive_dmg_pct_max": 0.25
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "sp_recovery",
    "name": "Meditation",
    "source_job": "mage",
    "restriction": "all",
    "description": "被動 · 每 2 級 SP 恢復 +1；每級降低技能 SP 消耗 4%（滿級 −40%，Lv.10）。",
    "stats": {
      "sp_cost_red": 0.4,
      "sp_regen": 5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "spellweave",
    "name": "Spellweave Synergy",
    "source_job": "mage",
    "restriction": "all",
    "description": "被動 · 施放技能後獲得 Spellweave 狀態 5 秒：縮短詠唱時間 5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15% 並提升 M.CRIT +1~10（Lv.10 為 −15% 詠唱、M.CRIT +10）。",
    "stats": {
      "cast_reduce_pct": 0.15,
      "mcrit": 0.1
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "swordmastery",
    "name": "Close-Combat Mastery",
    "source_job": "swordman",
    "restriction": "melee",
    "description": "被動 · 裝備近戰武器（Lionheart Aegis、太刀、劍、匕首、細劍、錘、斧、長槍、爪、拳套；不含法杖／魔杖）時每級 ATK +6%、ASPD +2%（滿級 ATK +60% / ASPD +20%）；對暈眩或燃燒敵人傷害 +40%（僅限物理攻擊，Lv.10）。",
    "stats": {
      "aspd_pct": 0.2,
      "atk_pct": 0.6,
      "melee_only": true,
      "vs_stun_burn_dmg_pct": 0.4
    },
    "melee_only": true,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "twilightequilibrium",
    "name": "Twilight Equilibrium",
    "source_job": "acolyte",
    "restriction": "all",
    "description": "被動 · 施放治療或增益後使下次攻擊技能傷害依等級 +4~20%（Lv.10 +20%）；施放攻擊技能後使下次治療量依等級 +5~20%（Lv.10 +20%）。",
    "stats": {
      "next_skill_dmg_pct": 0.2
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "unstableconcoction",
    "name": "Unstable Concoction",
    "source_job": "nekobaku",
    "restriction": "all",
    "description": "被動 · 攻擊技能有 15~35% 機率觸發隨機異變：冰凍 1.5 秒、MDEF −15% 持續 1.5 秒，或額外引爆 50~150% MATK 傷害（Lv.10 為 35% 機率、150% MATK）。",
    "stats": {
      "proc_chance": 0.35,
      "proc_matk_scale": 1.5
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "unyieldinggrit",
    "name": "Unyielding Grit",
    "source_job": "swordman",
    "restriction": "all",
    "description": "被動 · 當 HP 低於 15/17/19/21/22/24/25/27/28/30% 時，全傷害減免（含物/魔/反傷/真傷）與藥水回血量依等級 +5/7/8/9/10/11/12/13/14/15%（Lv.10）。",
    "stats": {
      "low_hp_dmg_cut": 0.15
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "venommastery",
    "name": "Venom Mastery",
    "source_job": "mamushi",
    "restriction": "kunai",
    "description": "被動 · 須裝備苦無：蛇毒傷害每級 +10%（滿級 +100%），ATK 依等級 +5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15%（Lv.10）。",
    "stats": {
      "atk_pct": 0.15,
      "poison_dmg_pct": 1.0
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": true,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "vultureeye",
    "name": "Far Sight",
    "source_job": "archer",
    "restriction": "ranged",
    "description": "被動 · 每級遠程攻擊距離 +6（跨職減半）；裝備弓類時每級傷害 +6%（滿級 +60%），其他遠程武器跨職上限 +20%（Lv.10）。",
    "stats": {
      "bow_dmg_pct": 0.6,
      "range_bonus": 60,
      "ranged_dmg_pct": 0.2
    },
    "melee_only": false,
    "ranged_only": true,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "weighttraining",
    "name": "Weight Training",
    "source_job": "merchant",
    "restriction": "all",
    "description": "被動 · 每級 STR +1、ATK +4.5%、負重上限 +100（滿級 STR +10 / ATK +45% / 負重 +1,000），並使 ATK 增加相當於最大負重 0.125%/級（滿級 1.25%，Lv.10）。",
    "stats": {
      "atk_pct": 0.45,
      "str": 10,
      "weight": 1000,
      "weight_to_atk_pct": 0.0125
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  },
  {
    "id": "zanshin",
    "name": "Zanshin",
    "source_job": "kensei",
    "restriction": "all",
    "description": "被動 · 每級暴擊傷害 +3%（滿級 +30%），並使 ATK 增加相當於 AGI 的 5%/級（滿級 50% AGI，Lv.10）。",
    "stats": {
      "agi_to_atk": 0.5,
      "crit_dmg": 0.3
    },
    "melee_only": false,
    "ranged_only": false,
    "katana_only": false,
    "kunai_only": false,
    "cestus_only": false,
    "aegis_only": false,
    "str_eq_int_only": false
  }
];

export const WIKI_ARMOR_SETS: FallbackArmorSetSpec[] = [
  {
    "id": "arcana",
    "name": "Archmage",
    "pieces_required": 2,
    "rarity": "common",
    "max_stacks": 3,
    "description": "2-Piece (common, max 3x): matk_pct: 0.1",
    "bonuses": {
      "matk_pct": 0.1
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "bastion",
    "name": "Iron Bastion",
    "pieces_required": 2,
    "rarity": "rare",
    "max_stacks": 3,
    "description": "2-Piece (rare, max 3x): flat_hp: 500, def: 7, mdef: 10",
    "bonuses": {
      "def": 7,
      "flat_hp": 500,
      "mdef": 10
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "breaker",
    "name": "Armor Breaker",
    "pieces_required": 2,
    "rarity": "legend",
    "max_stacks": 3,
    "description": "2-Piece (legend, max 3x): phys_pierce: 0.07",
    "bonuses": {
      "phys_pierce": 0.07
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "executioner",
    "name": "Executioner",
    "pieces_required": 2,
    "rarity": "legend",
    "max_stacks": 3,
    "description": "2-Piece (legend, max 3x): crit_dmg: 0.15",
    "bonuses": {
      "crit_dmg": 0.15
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "fortune",
    "name": "Lucky Star",
    "pieces_required": 2,
    "rarity": "rare",
    "max_stacks": 3,
    "description": "2-Piece (rare, max 3x): crit: 0.1",
    "bonuses": {
      "crit": 0.1
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "might",
    "name": "Warlord",
    "pieces_required": 2,
    "rarity": "common",
    "max_stacks": 3,
    "description": "2-Piece (common, max 3x): atk_pct: 0.1",
    "bonuses": {
      "atk_pct": 0.1
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "spellbreaker",
    "name": "Spell Breaker",
    "pieces_required": 2,
    "rarity": "legend",
    "max_stacks": 3,
    "description": "2-Piece (legend, max 3x): magic_pierce: 0.07",
    "bonuses": {
      "magic_pierce": 0.07
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "hawkeye",
    "name": "Hawkeye",
    "pieces_required": 4,
    "rarity": "common",
    "max_stacks": 1,
    "description": "4-Piece (common, max 1x): hit: 250, atk_pct: 0.1, matk_pct: 0.1, move_speed_pct: 0.07",
    "bonuses": {
      "atk_pct": 0.1,
      "hit": 250,
      "matk_pct": 0.1,
      "move_speed_pct": 0.07
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "phantom",
    "name": "Phantom Dancer",
    "pieces_required": 4,
    "rarity": "common",
    "max_stacks": 1,
    "description": "4-Piece (common, max 1x): flee: 200, atk_pct: 0.1, move_speed_pct: 0.07",
    "bonuses": {
      "atk_pct": 0.1,
      "flee": 200,
      "move_speed_pct": 0.07
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "sage",
    "name": "Mystic Sage",
    "pieces_required": 4,
    "rarity": "common",
    "max_stacks": 1,
    "description": "4-Piece (common, max 1x): dex: 30, matk_pct: 0.1, sp_regen: 5, move_speed_pct: 0.07",
    "bonuses": {
      "dex": 30,
      "matk_pct": 0.1,
      "move_speed_pct": 0.07,
      "sp_regen": 5
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  },
  {
    "id": "bloodlord",
    "name": "Blood Lord",
    "pieces_required": 6,
    "rarity": "rare",
    "max_stacks": 1,
    "description": "6-Piece (rare, max 1x): lifesteal_pct: 1.0, sp_drain: 3, weight: 2000, dealt_cut_pct: 0.3",
    "bonuses": {
      "dealt_cut_pct": 0.3,
      "lifesteal_pct": 1.0,
      "sp_drain": 3,
      "weight": 2000
    },
    "eligible_slots": [
      "head",
      "face",
      "mouth",
      "armor",
      "garment",
      "shoes"
    ]
  }
];

export const WIKI_CARDS: FallbackCardSpec[] = [
  {
    "id": "arcanewisp_card",
    "name": "Arcane Wisp Card",
    "slot": "accessory",
    "slots": [
      "accessory",
      "shoes"
    ],
    "tier": "S",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "cast_reduce_pct": 0.03,
      "sp_regen": 5
    },
    "mechanics": [],
    "source_monsters": [
      "Monster Card Pack (Tier S)"
    ],
    "description": "減詠唱 +3%（合計上限 30%）、SP 自然恢復 +5 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "boss_card",
    "name": "Crowned Prism Hopper Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": null,
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.03,
      "flat_atk": 10,
      "luk": 3,
      "matk_pct": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Crowned Prism Hopper / Rare Drop"
    ],
    "description": "LUK +3、ATK +10、ATK +3%、MATK +3% · 每件裝備限鑲嵌 1 張 · 不可拆卸 · 極稀有頭目掉落卡片"
  },
  {
    "id": "chocogolem_card",
    "name": "Chocolate Golem Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mMelt": 1
    },
    "mechanics": [
      "mMelt"
    ],
    "source_monsters": [
      "Chocolate Golem"
    ],
    "description": "🜂 融化巧克力：以普攻擊殺怪物時留下融化巧克力 3 秒，使 100 px 內其他怪物陷入緩速（Leader 與 Boss 無效；每 3 秒最多 1 攤；技能擊殺不觸發） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "jack_card",
    "name": "Jack-in-the-Box Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mSurprise": 1
    },
    "mechanics": [
      "mSurprise"
    ],
    "source_monsters": [
      "Jack-in-the-Box"
    ],
    "description": "🜂 驚喜突襲！：未施放任何技能達 6 秒後，下一次施放的技能對怪物傷害 +35%（涵蓋該次施放的所有目標與段數） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "kitsune_card",
    "name": "Nine-Tail Kitsune Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mFoxTails": 1
    },
    "mechanics": [
      "mFoxTails"
    ],
    "source_monsters": [
      "Nine-Tail Kitsune"
    ],
    "description": "🜂 九尾之力：在前次擊殺後 4 秒內擊殺怪物獲得 1 條尾（最多 9 條），每條使 ASPD 與移動速度 +1.5% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "siren_card",
    "name": "Tide Siren Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mTideSong": 1
    },
    "mechanics": [
      "mTideSong"
    ],
    "source_monsters": [
      "Tide Siren"
    ],
    "description": "🜂 潮汐之歌：你的治療技能治療量 +10%，並為受治療的隊友恢復 2% MaxSP（不含自身，每名隊友每 5 秒最多觸發 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "warlord_card",
    "name": "Eclipse Warlord Card",
    "slot": "accessory",
    "slots": [
      "accessory"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mEclipse": 1
    },
    "mechanics": [
      "mEclipse"
    ],
    "source_monsters": [
      "Eclipse Warlord"
    ],
    "description": "🜂 日蝕平衡：屬性相剋不會使你的傷害低於 100%，但屬性剋制增傷上限為 115% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "bat_card",
    "name": "Cave Bat Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 4
    },
    "mechanics": [],
    "source_monsters": [
      "Cave Bat"
    ],
    "description": "AGI +4 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "bunny_card",
    "name": "Dew Bunny Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flee": 33
    },
    "mechanics": [],
    "source_monsters": [
      "Dew Bunny"
    ],
    "description": "FLEE +33 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "hollow_card",
    "name": "Hollow Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "int": 2,
      "mdef": 2
    },
    "mechanics": [],
    "source_monsters": [
      "Hollow"
    ],
    "description": "INT +2、MDEF +2 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "hopper_card",
    "name": "Prism Hopper Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "luk": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Prism Hopper"
    ],
    "description": "LUK +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "moth_card",
    "name": "Honey Moth Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "dex": 2,
      "flat_sp": 20,
      "int": 2
    },
    "mechanics": [],
    "source_monsters": [
      "Honey Moth"
    ],
    "description": "INT +2、DEX +2、MaxSP +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "mushroom_card",
    "name": "Moss Mushroom Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "vit": 2
    },
    "mechanics": [],
    "source_monsters": [
      "Moss Mushroom"
    ],
    "description": "VIT +2 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "newt_card",
    "name": "Mud Newt Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_sp": 20,
      "int": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Mud Newt"
    ],
    "description": "INT +3、MaxSP +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "ram_card",
    "name": "Thunder Ram Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.02,
      "flat_hp": 20,
      "matk_pct": 0.02
    },
    "mechanics": [],
    "source_monsters": [
      "Thunder Ram"
    ],
    "description": "ATK +2%、MATK +2%、MaxHP +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "roc_card",
    "name": "Storm Roc Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 5,
      "crit_dmg": 0.01,
      "flee": 20,
      "luk": 6
    },
    "mechanics": [],
    "source_monsters": [
      "Storm Roc"
    ],
    "description": "AGI +5、LUK +6、暴擊傷害 +1%、FLEE +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "sprout_card",
    "name": "Leaf Sprout Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_sp": 30
    },
    "mechanics": [],
    "source_monsters": [
      "Leaf Sprout"
    ],
    "description": "MaxSP +30 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "stormdrake_card",
    "name": "Tempest Drake Card",
    "slot": "all",
    "slots": [
      "all"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_atk": 5,
      "flat_matk": 5,
      "magic_pierce": 0.01,
      "phys_pierce": 0.01
    },
    "mechanics": [],
    "source_monsters": [
      "Tempest Drake"
    ],
    "description": "ATK +5、MATK +5、物理穿透 +1%、魔法穿透 +1% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "behemoth_card",
    "name": "Meteor Behemoth Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mMeteor": 1
    },
    "mechanics": [
      "mMeteor"
    ],
    "source_monsters": [
      "Meteor Behemoth"
    ],
    "description": "🜂 隕石爆裂：擊殺怪物時 20% 機率引爆殘骸，對周圍 120 px 內最多 8 隻怪物造成致死一擊所扣 HP 的 40% 傷害（對 Leader 與 Boss 無效；每次施放最多觸發 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "crab_card",
    "name": "Tide Crab Card",
    "slot": "body",
    "slots": [
      "body",
      "garment",
      "shoes"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_hp": 50
    },
    "mechanics": [],
    "source_monsters": [
      "Tide Crab"
    ],
    "description": "MaxHP +50 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "golem_card",
    "name": "Pebble Golem Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 6,
      "flat_hp": 150,
      "res_stun_pct": 0.25
    },
    "mechanics": [],
    "source_monsters": [
      "Pebble Golem"
    ],
    "description": "DEF +6、MaxHP +150、暈眩抗性 +25%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "hare_card",
    "name": "Bramble Hare Card",
    "slot": "body",
    "slots": [
      "body",
      "garment"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 2,
      "flee": 30
    },
    "mechanics": [],
    "source_monsters": [
      "Bramble Hare"
    ],
    "description": "AGI +2、FLEE +30 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "hound_card",
    "name": "Ember Hound Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 6,
      "crit": 0.03,
      "flat_atk": 9
    },
    "mechanics": [],
    "source_monsters": [
      "Ember Hound"
    ],
    "description": "AGI +6、ATK +9、CRIT +0.03 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "marshmallow_card",
    "name": "Marshmallow Brute Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mSoft": 1
    },
    "mechanics": [
      "mSoft"
    ],
    "source_monsters": [
      "Marshmallow Brute"
    ],
    "description": "🜂 軟綿緩衝：單次受到怪物超過 15% MaxHP 的傷害時，超出部分減免 50%（與其他減傷卡合計上限 30%） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "puff_card",
    "name": "Frost Puff Card",
    "slot": "body",
    "slots": [
      "body",
      "garment",
      "shoes"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mdef": 6,
      "res_freeze_pct": 0.3
    },
    "mechanics": [],
    "source_monsters": [
      "Frost Puff"
    ],
    "description": "MDEF +6、冰凍抗性 +30%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "raven_card",
    "name": "Shade Raven Card",
    "slot": "body",
    "slots": [
      "body",
      "garment",
      "shoes"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 5,
      "crit": 0.01,
      "flee": 30
    },
    "mechanics": [],
    "source_monsters": [
      "Shade Raven"
    ],
    "description": "AGI +5、CRIT +0.01、FLEE +30 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "regolith_card",
    "name": "Regolith Golem Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mLowGravity": 1
    },
    "mechanics": [
      "mLowGravity"
    ],
    "source_monsters": [
      "Regolith Golem"
    ],
    "description": "🜂 低重力緩震：受怪物致命傷時保留 1 HP 並免疫怪物傷害 2 秒，冷卻 90 秒（Nine Lives 或 Last Stand 冷卻期間不觸發） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "rootling_card",
    "name": "Rootling Card",
    "slot": "body",
    "slots": [
      "body",
      "garment",
      "shoes"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 3,
      "flat_hp": 20,
      "vit": 2
    },
    "mechanics": [],
    "source_monsters": [
      "Rootling"
    ],
    "description": "VIT +2、DEF +3、MaxHP +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "toad_card",
    "name": "Bog Toad Card",
    "slot": "body",
    "slots": [
      "body",
      "garment",
      "shoes"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "vit": 15
    },
    "mechanics": [],
    "source_monsters": [
      "Bog Toad"
    ],
    "description": "VIT +15 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "tomb_jack_card",
    "name": "Jack-o'-Lantern Card",
    "slot": "body",
    "slots": [
      "body"
    ],
    "tier": "SS",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_hp": 850,
      "res_stun_pct": 0.3
    },
    "mechanics": [],
    "source_monsters": [
      "Jack-o'-Lantern (Halloween Tomb)"
    ],
    "description": "MaxHP +850、暈眩抗性 +30%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸 · 萬聖節墓園（Halloween Tomb）稀有卡片"
  },
  {
    "id": "griffin_card",
    "name": "Radiant Griffin Card",
    "slot": "garment",
    "slots": [
      "garment",
      "shoes"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 8,
      "flee": 40,
      "move_speed_pct": 0.05
    },
    "mechanics": [],
    "source_monsters": [
      "Radiant Griffin"
    ],
    "description": "AGI +8、FLEE +40、移動速度 +5%（合計上限 50%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "loy_naga_card",
    "name": "Phaya Nakharach Navakoti Card",
    "slot": "garment",
    "slots": [
      "garment"
    ],
    "tier": null,
    "is_limited": false,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.07,
      "mNaga": 1,
      "matk_pct": 0.07
    },
    "mechanics": [
      "mNaga"
    ],
    "source_monsters": [
      "Naga Envoy / Naga Sovereign (Loy Krathong)"
    ],
    "description": "🜂 納迦水癒光環：戰鬥中每 15 秒為 150 px 內隊友（含自身）淨化暈眩、冰凍、定身、致盲與緩速，並賦予相當於佩戴者 MaxHP 7% 的護盾持續 5 秒 · ATK +7%、MATK +7% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · MaxHP +7% · 滿月龍王洞窟稀有卡片"
  },
  {
    "id": "moonmoth_card",
    "name": "Moonveil Moth Card",
    "slot": "garment",
    "slots": [
      "garment"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mMoonDust": 1
    },
    "mechanics": [
      "mMoonDust"
    ],
    "source_monsters": [
      "Moonveil Moth"
    ],
    "description": "🜂 月塵閃擊：成功閃避怪物普攻或技能後，3 秒內下一次命中必為暴擊（每 2 秒最多觸發 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "nutcracker_card",
    "name": "Nutcracker Soldier Card",
    "slot": "garment",
    "slots": [
      "garment"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mCrack": 1
    },
    "mechanics": [
      "mCrack"
    ],
    "source_monsters": [
      "Nutcracker Soldier"
    ],
    "description": "🜂 碎甲破殼：命中時 5% 機率擊碎怪物護甲，使其 DEF −20% 持續 4 秒（技能每次施放僅對首個命中目標判定；Leader 與 Boss 無效） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "skitter_card",
    "name": "Void Skitter Card",
    "slot": "garment",
    "slots": [
      "garment",
      "shoes"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mWeakSpot": 1
    },
    "mechanics": [
      "mWeakSpot"
    ],
    "source_monsters": [
      "Void Skitter"
    ],
    "description": "🜂 弱點追擊：攻擊處於異常狀態的怪物時，傷害 +12% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "tomb_vampire_card",
    "name": "Vampire Card",
    "slot": "garment",
    "slots": [
      "garment"
    ],
    "tier": "SS",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_hp": 200,
      "mdef": 45,
      "res_freeze_pct": 0.3
    },
    "mechanics": [],
    "source_monsters": [
      "Vampire (Halloween Tomb)"
    ],
    "description": "MDEF +45、MaxHP +200、冰凍抗性 +30%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸 · 萬聖節墓園（Halloween Tomb）稀有卡片"
  },
  {
    "id": "mire_card",
    "name": "Mire Jelly Card",
    "slot": "head_lower",
    "slots": [
      "head_lower"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_hp": 60,
      "mdef": 6
    },
    "mechanics": [],
    "source_monsters": [
      "Mire Jelly"
    ],
    "description": "MDEF +6、MaxHP +60 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "angler_card",
    "name": "Abyssal Angler Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mLure": 1
    },
    "mechanics": [
      "mLure"
    ],
    "source_monsters": [
      "Abyssal Angler"
    ],
    "description": "🜂 誘餌仇恨：你的傷害所產生的仇恨值（Aggro）×1.5（不含治療仇恨） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "bonehound_card",
    "name": "Bone Hound Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "luk": 3,
      "str": 10
    },
    "mechanics": [],
    "source_monsters": [
      "Bone Hound"
    ],
    "description": "STR +10、LUK +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "cocoa_card",
    "name": "Cocoa Imp Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mCocoa": 1
    },
    "mechanics": [
      "mCocoa"
    ],
    "source_monsters": [
      "Cocoa Imp"
    ],
    "description": "🜂 暖心可可：你的治療技能使受治療者每秒恢復 2% MaxHP 持續 4 秒（不疊加，重複治療刷新時間）；你的技能對怪物傷害 −10% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "icicle_card",
    "name": "Icicle Hare Card",
    "slot": "head_upper",
    "slots": [
      "head_upper"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 3,
      "crit": 0.01,
      "freeze_hit_pct": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Icicle Hare"
    ],
    "description": "AGI +3、CRIT +0.01、普攻機率冰凍 +3%（合計上限 15%，對 Leader 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "kasa_card",
    "name": "Kasa Obake Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mMagicWard": 1
    },
    "mechanics": [
      "mMagicWard"
    ],
    "source_monsters": [
      "Kasa Obake"
    ],
    "description": "🜂 抗魔傘：來自怪物的魔法傷害 −20%（包含怪物元素技能與遠程施法攻擊） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "knight_card",
    "name": "Grave Knight Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 6,
      "flat_hp": 20,
      "vit": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Grave Knight"
    ],
    "description": "VIT +3、DEF +6、MaxHP +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "oracle_card",
    "name": "Lunar Oracle Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mFullMoon": 1
    },
    "mechanics": [
      "mFullMoon"
    ],
    "source_monsters": [
      "Lunar Oracle"
    ],
    "description": "🜂 滿月回魔：擊殺怪物時恢復佩戴者 2% MaxSP；多張同名卡可疊加，最多 3 張（單次技能最多計算 3 隻） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "quartz_card",
    "name": "Quartz Crawler Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "crit": 0.01,
      "dex": 7,
      "hit": 30
    },
    "mechanics": [],
    "source_monsters": [
      "Quartz Crawler"
    ],
    "description": "DEX +7、CRIT +0.01、HIT +30 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "snowowl_card",
    "name": "Snow Owl Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_atk": 5,
      "flat_matk": 5,
      "hit": 20
    },
    "mechanics": [],
    "source_monsters": [
      "Snow Owl"
    ],
    "description": "ATK +5、MATK +5、HIT +20 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "teddy_card",
    "name": "Wind-up Teddy Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mHug": 1
    },
    "mechanics": [
      "mHug"
    ],
    "source_monsters": [
      "Wind-up Teddy"
    ],
    "description": "🜂 緊緊擁抱：普攻命中怪物時恢復 1% MaxHP（每 0.5 秒最多 1 次）；佩戴期間藥水與回血道具恢復量 −50% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "tengu_card",
    "name": "Karasu Tengu Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mOpener": 1
    },
    "mechanics": [
      "mOpener"
    ],
    "source_monsters": [
      "Karasu Tengu"
    ],
    "description": "🜂 烏鴉搶攻：對尚未被攻擊過的滿血目標首次攻擊傷害 +20%（適用普攻與單體技能） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "warden_card",
    "name": "Cosmic Warden Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mStarShield": 1
    },
    "mechanics": [
      "mStarShield"
    ],
    "source_monsters": [
      "Cosmic Warden"
    ],
    "description": "🜂 星辰護盾：獲得相當於自身 MaxHP 6% 的怪物傷害吸收護盾，護盾破裂 20 秒後重新生成 · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "wraith_card",
    "name": "Bog Wraith Card",
    "slot": "head_upper",
    "slots": [
      "head_upper",
      "head_mid",
      "head_lower"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "int": 10,
      "mdef": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Bog Wraith"
    ],
    "description": "INT +10、MDEF +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "bloodfang_card",
    "name": "Bloodfang Wolf Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "S",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "lifesteal_pct": 0.01,
      "str": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Monster Card Pack (Tier S)"
    ],
    "description": "STR +3、吸血 +1% · Shield Sacrificial Strike 對玩家不觸發吸血 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "lm01m_epic_card",
    "name": "Rose Fox Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "magic_pierce": 0.03,
      "matk_pct": 0.02,
      "mcrit": 0.02
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Arcane Piercer"
    ],
    "description": "MATK +2%、魔法穿透 +3%、M.CRIT +0.02 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Arcane Piercer 卡包 · Epic"
  },
  {
    "id": "lm01m_legendary_card",
    "name": "Golden Fox Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "magic_pierce": 0.05,
      "matk_pct": 0.03,
      "mcrit": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Arcane Piercer"
    ],
    "description": "MATK +3%、魔法穿透 +5%、M.CRIT +0.03 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Arcane Piercer 卡包 · Legendary"
  },
  {
    "id": "lm01m_limited_card",
    "name": "Arcane Piercer Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "earth_dmg": 0.2,
      "magic_pierce": 0.07,
      "matk_pct": 0.05,
      "mcrit": 0.04
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Arcane Piercer"
    ],
    "description": "MATK +5%、魔法穿透 +7%、M.CRIT +0.04、對地屬性傷害 +20% · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · LM-01 Arcane Piercer 卡包 · Limited"
  },
  {
    "id": "lm01m_rare_card",
    "name": "Crystal Fox Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "magic_pierce": 0.02,
      "matk_pct": 0.01,
      "mcrit": 0.01
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Arcane Piercer"
    ],
    "description": "MATK +1%、魔法穿透 +2%、M.CRIT +0.01 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Arcane Piercer 卡包 · Rare"
  },
  {
    "id": "lm01p_epic_card",
    "name": "Rose Dragon Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.02,
      "crit": 0.02,
      "phys_pierce": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Armor Breaker"
    ],
    "description": "ATK +2%、物理穿透 +3%、CRIT +0.02 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Armor Breaker 卡包 · Epic"
  },
  {
    "id": "lm01p_legendary_card",
    "name": "Golden Dragon Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.03,
      "crit": 0.03,
      "phys_pierce": 0.05
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Armor Breaker"
    ],
    "description": "ATK +3%、物理穿透 +5%、CRIT +0.03 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Armor Breaker 卡包 · Legendary"
  },
  {
    "id": "lm01p_limited_card",
    "name": "Pierce Dragon Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.05,
      "crit": 0.04,
      "earth_dmg": 0.2,
      "phys_pierce": 0.07
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Armor Breaker"
    ],
    "description": "ATK +5%、物理穿透 +7%、CRIT +0.04、對地屬性傷害 +20% · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · LM-01 Armor Breaker 卡包 · Limited"
  },
  {
    "id": "lm01p_rare_card",
    "name": "Crystal Dragon Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.01,
      "crit": 0.01,
      "phys_pierce": 0.02
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Armor Breaker"
    ],
    "description": "ATK +1%、物理穿透 +2%、CRIT +0.01 · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Armor Breaker 卡包 · Rare"
  },
  {
    "id": "mirrorback_card",
    "name": "Mirrorback Tortoise Card",
    "slot": "shield",
    "slots": [
      "shield",
      "body",
      "garment"
    ],
    "tier": "S",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "reflect_pct": 0.02,
      "res_burn_pct": 0.05
    },
    "mechanics": [],
    "source_monsters": [
      "Monster Card Pack (Tier S)"
    ],
    "description": "物理反射 +2%（合計上限 20%）、燃燒抗性 +5%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "beetle_card",
    "name": "Amber Beetle Card",
    "slot": "shield",
    "slots": [
      "shield",
      "body",
      "garment"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Amber Beetle"
    ],
    "description": "DEF +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "bulwark_card",
    "name": "Bulwark Frame Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mBulwark": 1
    },
    "mechanics": [
      "mBulwark"
    ],
    "source_monsters": [
      "Bulwark Frame"
    ],
    "description": "🜂 鋼鐵壁壘：200 px 內的隊友所受怪物傷害 −10%（不含自身，多張同名卡不疊加） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "chochin_card",
    "name": "Chochin Obake Card",
    "slot": "shield",
    "slots": [
      "shield",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mLantern": 1
    },
    "mechanics": [
      "mLantern"
    ],
    "source_monsters": [
      "Chochin Obake"
    ],
    "description": "🜂 鬼火提燈：命中時 5% 機率使怪物陷入燃燒狀態 5 秒（技能每次施放僅對首個命中目標隨機判定 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "coral_card",
    "name": "Coral Golem Card",
    "slot": "shield",
    "slots": [
      "shield",
      "body"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mReef": 1
    },
    "mechanics": [
      "mReef"
    ],
    "source_monsters": [
      "Coral Golem"
    ],
    "description": "🜂 珊瑚屏障：3 秒內受到 3 隻以上不同怪物攻擊時，所受傷害 −20% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "drake_card",
    "name": "Sand Drake Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 3,
      "flat_atk": 10,
      "phys_pierce": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Sand Drake"
    ],
    "description": "ATK +10、物理穿透 +3%、DEF +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "moonowl_card",
    "name": "Moon Owl Card",
    "slot": "shield",
    "slots": [
      "shield",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "dex": 10
    },
    "mechanics": [],
    "source_monsters": [
      "Moon Owl"
    ],
    "description": "DEX +10 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "raider_card",
    "name": "Star Raider Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mFarShot": 1
    },
    "mechanics": [
      "mFarShot"
    ],
    "source_monsters": [
      "Star Raider"
    ],
    "description": "🜂 遠距狙擊：裝備遠程武器時：目標距離超過攻擊距離 85% 時傷害 +12%；近於 120 px 時傷害 −10% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "salamander_card",
    "name": "Magma Salamander Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_matk": 10,
      "int": 5,
      "magic_pierce": 0.02
    },
    "mechanics": [],
    "source_monsters": [
      "Magma Salamander"
    ],
    "description": "INT +5、MATK +10、魔法穿透 +2% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "sentinel_card",
    "name": "Gilded Sentinel Card",
    "slot": "shield",
    "slots": [
      "shield",
      "body"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 8,
      "flat_hp": 120,
      "mdef": 6
    },
    "mechanics": [],
    "source_monsters": [
      "Gilded Sentinel"
    ],
    "description": "DEF +8、MDEF +6、MaxHP +120 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "tortoise_card",
    "name": "Basalt Tortoise Card",
    "slot": "shield",
    "slots": [
      "shield",
      "body"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 6,
      "flat_hp": 100,
      "mdef": 9
    },
    "mechanics": [],
    "source_monsters": [
      "Basalt Tortoise"
    ],
    "description": "DEF +6、MDEF +9、MaxHP +100 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "trooper_card",
    "name": "Rifle Trooper Card",
    "slot": "shield",
    "slots": [
      "shield"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mExecute": 1
    },
    "mechanics": [
      "mExecute"
    ],
    "source_monsters": [
      "Rifle Trooper"
    ],
    "description": "🜂 斬殺收割：攻擊 HP 低於 35% 的怪物時，傷害 +30% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "wisp_card",
    "name": "Lantern Wisp Card",
    "slot": "shield",
    "slots": [
      "shield",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "int": 5,
      "magic_pierce": 0.02
    },
    "mechanics": [],
    "source_monsters": [
      "Lantern Wisp"
    ],
    "description": "INT +5、魔法穿透 +2% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "wolf_card",
    "name": "Forest Wolf Card",
    "slot": "shield",
    "slots": [
      "shield",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "phys_pierce": 0.02,
      "str": 5
    },
    "mechanics": [],
    "source_monsters": [
      "Forest Wolf"
    ],
    "description": "STR +5、物理穿透 +2% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "gecko_card",
    "name": "Dune Gecko Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flee": 80,
      "move_speed_pct": 0.05
    },
    "mechanics": [],
    "source_monsters": [
      "Dune Gecko"
    ],
    "description": "FLEE +80、移動速度 +5%（合計上限 50%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "geode_card",
    "name": "Geode Armadillo Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 6,
      "mdef": 6,
      "res_stun_pct": 0.25
    },
    "mechanics": [],
    "source_monsters": [
      "Geode Armadillo"
    ],
    "description": "DEF +6、MDEF +6、暈眩抗性 +25%（合計上限 80%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "gingerbread_card",
    "name": "Gingerbread Man Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mCatchMe": 1
    },
    "mechanics": [
      "mCatchMe"
    ],
    "source_monsters": [
      "Gingerbread Man"
    ],
    "description": "🜂 抓不到我：受到怪物普攻或元素技能命中時，25% 機率使該怪物陷入緩速 3 秒（移速 −35%、攻速 −15%，Leader 與 Boss 無效） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "gummy_card",
    "name": "Gummy Bear Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mBounce": 1
    },
    "mechanics": [
      "mBounce"
    ],
    "source_monsters": [
      "Gummy Bear"
    ],
    "description": "🜂 彈跳閃避：成功閃避怪物普攻或技能後，移動速度 +30% 持續 2 秒（每 4 秒最多觸發 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "hornet_card",
    "name": "Hornet Drone Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mSwarm": 1
    },
    "mechanics": [
      "mSwarm"
    ],
    "source_monsters": [
      "Hornet Drone"
    ],
    "description": "🜂 連擊蜂群：連續攻擊同一隻怪物時，每次疊加 ASPD +2%（最多 10 層，切換目標減半）；達 ASPD 上限後改為每層傷害 +1% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "loy_tani_card",
    "name": "Tani the Sunken Nymph Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": null,
    "is_limited": false,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "mTani": 1
    },
    "mechanics": [
      "mTani"
    ],
    "source_monsters": [
      "Tani the Sunken Nymph (Loy Krathong)"
    ],
    "description": "🜂 沉淵水妖：來自水屬性怪物的傷害 −25%；使用衝刺（Dash）後移速 +25% 並恢復 5% MaxSP 持續 5 秒（每 15 秒最多觸發 1 次） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · MDEF +10% · 滿月龍王洞窟稀有卡片"
  },
  {
    "id": "lynx_card",
    "name": "Vine Lynx Card",
    "slot": "shoes",
    "slots": [
      "shoes"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "agi": 10,
      "aspd_flat": 2,
      "move_speed_pct": 0.1
    },
    "mechanics": [],
    "source_monsters": [
      "Vine Lynx"
    ],
    "description": "AGI +10、ASPD +2（卡片固定 ASPD 不疊加）、移動速度 +10%（合計上限 50%） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "lm01_epic_card",
    "name": "Crimson Knight Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "crit": 0.05,
      "crit_dmg": 0.12,
      "flat_atk": 10,
      "flat_matk": 10,
      "mcrit": 0.05
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Critical"
    ],
    "description": "ATK +10、MATK +10、CRIT +0.05、M.CRIT +0.05、暴擊傷害 +12% · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Critical 卡包 · Epic"
  },
  {
    "id": "lm01_legendary_card",
    "name": "Bloodcrystal Dragon Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.03,
      "crit": 0.07,
      "crit_dmg": 0.15,
      "matk_pct": 0.03,
      "mcrit": 0.07
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Critical"
    ],
    "description": "ATK +3%、MATK +3%、CRIT +0.07、M.CRIT +0.07、暴擊傷害 +15% · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Critical 卡包 · Legendary"
  },
  {
    "id": "lm01_limited_card",
    "name": "Critical King Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.05,
      "crit": 0.07,
      "crit_dmg": 0.2,
      "earth_dmg": 0.2,
      "matk_pct": 0.05,
      "mcrit": 0.07
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Critical"
    ],
    "description": "ATK +5%、MATK +5%、CRIT +0.07、M.CRIT +0.07、暴擊傷害 +20%、對地屬性傷害 +20% · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · LM-01 Critical 卡包 · Limited"
  },
  {
    "id": "lm01_rare_card",
    "name": "Ruby Rogue Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "Limited",
    "is_limited": true,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "crit_dmg": 0.1,
      "flat_atk": 5,
      "flat_matk": 5
    },
    "mechanics": [],
    "source_monsters": [
      "Starter Pack Critical"
    ],
    "description": "ATK +5、MATK +5、暴擊傷害 +10% · 每件裝備限鑲嵌 1 張 · 不可拆卸 · LM-01 Critical 卡包 · Rare"
  },
  {
    "id": "antler_card",
    "name": "Ember Antler Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield",
      "head_upper",
      "head_mid",
      "head_lower",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "magic_pierce": 0.01,
      "matk_pct": 0.01
    },
    "mechanics": [],
    "source_monsters": [
      "Ember Antler"
    ],
    "description": "MATK +1%、魔法穿透 +1% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "boar_card",
    "name": "Wild Boar Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "phys_pierce": 0.01,
      "str": 5
    },
    "mechanics": [],
    "source_monsters": [
      "Wild Boar"
    ],
    "description": "STR +5、物理穿透 +1% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "cactus_card",
    "name": "Cactus Imp Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_atk": 10,
      "luk": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Cactus Imp"
    ],
    "description": "LUK +3、ATK +10 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "cloud_card",
    "name": "Cloud Serpent Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_sp": 50,
      "int": 12,
      "magic_pierce": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Cloud Serpent"
    ],
    "description": "INT +12、魔法穿透 +3%、MaxSP +50 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "cobra_card",
    "name": "Sunscale Cobra Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield",
      "accessory"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "crit": 0.01,
      "crit_dmg": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Sunscale Cobra"
    ],
    "description": "CRIT +0.01、暴擊傷害 +3% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "colossus_card",
    "name": "Sunfire Colossus Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.03,
      "phys_pierce": 0.05,
      "str": 8
    },
    "mechanics": [],
    "source_monsters": [
      "Sunfire Colossus"
    ],
    "description": "STR +8、ATK +3%、物理穿透 +5% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "fox_card",
    "name": "Aurora Fox Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield",
      "accessory"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_matk": 5,
      "int": 5,
      "matk_pct": 0.01
    },
    "mechanics": [],
    "source_monsters": [
      "Aurora Fox"
    ],
    "description": "INT +5、MATK +5、MATK +1% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "kraken_card",
    "name": "Dread Kraken Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mGrasp": 1
    },
    "mechanics": [
      "mGrasp"
    ],
    "source_monsters": [
      "Dread Kraken"
    ],
    "description": "🜂 觸手束縛：普攻命中時 5% 機率束縛怪物使其無法移動 2 秒（對 Leader 與 Boss 無效） · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "mantis_card",
    "name": "Reed Mantis Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield",
      "head_upper",
      "head_mid",
      "head_lower",
      "accessory"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.01,
      "crit": 0.02,
      "flat_atk": 10
    },
    "mechanics": [],
    "source_monsters": [
      "Reed Mantis"
    ],
    "description": "ATK +10、ATK +1%、CRIT +0.02 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "oni_card",
    "name": "Red Oni Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "B",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mRage": 1
    },
    "mechanics": [
      "mRage"
    ],
    "source_monsters": [
      "Red Oni"
    ],
    "description": "🜂 越戰越勇：每損失 4% HP，ATK 與 MATK +1%，最高 +15% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "pixie_card",
    "name": "Thorn Pixie Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "shield",
      "accessory"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "flat_matk": 5
    },
    "mechanics": [],
    "source_monsters": [
      "Thorn Pixie"
    ],
    "description": "MATK +5 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "prism_card",
    "name": "Prism Serpent Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "crit_dmg": 0.08,
      "int": 3,
      "matk_pct": 0.04
    },
    "mechanics": [],
    "source_monsters": [
      "Prism Serpent"
    ],
    "description": "INT +3、MATK +4%、暴擊傷害 +8% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "scarab_card",
    "name": "Scarab Sentinel Card",
    "slot": "weapon",
    "slots": [
      "weapon",
      "body",
      "garment",
      "shoes"
    ],
    "tier": "C",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "def": 3,
      "vit": 3
    },
    "mechanics": [],
    "source_monsters": [
      "Scarab Sentinel"
    ],
    "description": "VIT +3、DEF +3 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "scorpion_card",
    "name": "Obsidian Scorpion Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.04,
      "crit_dmg": 0.08,
      "flat_atk": 10
    },
    "mechanics": [],
    "source_monsters": [
      "Obsidian Scorpion"
    ],
    "description": "ATK +10、ATK +4%、暴擊傷害 +8% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "seraph_card",
    "name": "Fallen Seraph Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "dex": 8,
      "hit": 30,
      "phys_pierce": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Fallen Seraph"
    ],
    "description": "DEX +8、物理穿透 +3%、HIT +30 · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "terragorn_card",
    "name": "Terragorn Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": null,
    "is_limited": false,
    "removable": true,
    "max_per_item": 1,
    "bonuses": {
      "mQuake": 1
    },
    "mechanics": [
      "mQuake"
    ],
    "source_monsters": [
      "Terragorn (World Boss)"
    ],
    "description": "🜂 震地獠牙：普攻命中時產生震波，對目標周圍 150 px 內最多 6 隻其他怪物造成 40% 傷害；HIT −15% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 可付費拆卸（消耗 Silver） · 世界王 Terragorn 專屬卡片"
  },
  {
    "id": "titan_card",
    "name": "Titan Frame Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "S",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "mTitan": 1
    },
    "mechanics": [
      "mTitan"
    ],
    "source_monsters": [
      "Titan Frame"
    ],
    "description": "🜂 破王專武（首領增傷）：對 Leader 與 Boss 傷害 +25%；對一般怪物傷害 −10% · 單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效） · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  },
  {
    "id": "wyvern_card",
    "name": "Amethyst Wyvern Card",
    "slot": "weapon",
    "slots": [
      "weapon"
    ],
    "tier": "A",
    "is_limited": false,
    "removable": false,
    "max_per_item": 1,
    "bonuses": {
      "atk_pct": 0.02,
      "flat_atk": 12,
      "phys_pierce": 0.03
    },
    "mechanics": [],
    "source_monsters": [
      "Amethyst Wyvern"
    ],
    "description": "ATK +12、ATK +2%、物理穿透 +3% · 每件裝備限鑲嵌 1 張 · 不可拆卸"
  }
];

export const WIKI_TARGET_PRESETS: FallbackTargetPreset[] = [
  {
    "preset_id": "tier6_dark_boss",
    "name": "Eclipse Warlord (Lv.311 Dark Boss | DEF 255 / FLEE 500)",
    "level": 120,
    "target_def": 255,
    "target_mdef": 240,
    "target_flee": 500,
    "element": "dark",
    "is_monster": true
  },
  {
    "preset_id": "tier6_elemental_mvp",
    "name": "Chocolate Golem (Lv.319 Dark/Earth Boss | DEF 255 / FLEE 560)",
    "level": 120,
    "target_def": 255,
    "target_mdef": 250,
    "target_flee": 560,
    "element": "dark",
    "is_monster": true
  },
  {
    "preset_id": "tier6_light_boss",
    "name": "Lunar Oracle (Lv.309 Light Boss | DEF 210 / MDEF 240 / FLEE 400)",
    "level": 120,
    "target_def": 210,
    "target_mdef": 240,
    "target_flee": 400,
    "element": "light",
    "is_monster": true
  },
  {
    "preset_id": "tier6_evasion_boss",
    "name": "Gingerbread Man (Lv.312 High-FLEE Fire Boss | DEF 200 / FLEE 860)",
    "level": 120,
    "target_def": 200,
    "target_mdef": 220,
    "target_flee": 860,
    "element": "fire",
    "is_monster": true
  },
  {
    "preset_id": "tier6_mob_grind",
    "name": "Titan Frame (Lv.299 Dark Mob | DEF 255 / FLEE 400)",
    "level": 120,
    "target_def": 255,
    "target_mdef": 240,
    "target_flee": 400,
    "element": "dark",
    "is_monster": true
  },
  {
    "preset_id": "pvp_max_def_paladin",
    "name": "PvP Max-DEF Templar/Tank (DEF 255 / MDEF 255 / FLEE 420)",
    "level": 120,
    "target_def": 255,
    "target_mdef": 255,
    "target_flee": 420,
    "element": "neutral",
    "is_monster": false
  },
  {
    "preset_id": "pvp_evasion_assassin",
    "name": "PvP High-FLEE Mamushi/Sinister (DEF 160 / FLEE 620)",
    "level": 120,
    "target_def": 160,
    "target_mdef": 140,
    "target_flee": 620,
    "element": "wind",
    "is_monster": false
  }
];

export const WIKI_CARD_MECHANICS: Record<string, Record<string, unknown>> = {
  "mBounce": {
    "description": "成功閃避怪物普攻或技能後，移動速度 +30% 持續 2 秒（每 4 秒最多觸發 1 次）",
    "dps_impact": {
      "effect": "On dodge, +30% MoveSpeed for 2s (4s ICD)",
      "pve_only": true
    },
    "key": "mBounce",
    "title": "🜂 彈跳閃避"
  },
  "mBulwark": {
    "description": "200 px 內的隊友所受怪物傷害 −10%（不含自身，多張同名卡不疊加）",
    "dps_impact": {
      "effect": "Party members within 200px take -10% monster damage",
      "pve_only": true
    },
    "key": "mBulwark",
    "title": "🜂 鋼鐵壁壘"
  },
  "mCatchMe": {
    "description": "受到怪物普攻或元素技能命中時，25% 機率使該怪物陷入緩速 3 秒（移速 −35%、攻速 −15%，Leader 與 Boss 無效）",
    "dps_impact": {
      "effect": "25% chance when hit to slow monster (35% move, 15% atk) for 3s",
      "pve_only": true
    },
    "key": "mCatchMe",
    "title": "🜂 抓不到我"
  },
  "mCocoa": {
    "description": "你的治療技能使受治療者每秒恢復 2% MaxHP 持續 4 秒（不疊加，重複治療刷新時間）；你的技能對怪物傷害 −10%",
    "dps_impact": {
      "effect": "Heals grant 2% MaxHP/s HoT for 4s; your skill damage vs monsters -10%",
      "pve_only": true
    },
    "key": "mCocoa",
    "title": "🜂 暖心可可"
  },
  "mCrack": {
    "description": "命中時 5% 機率擊碎怪物護甲，使其 DEF −20% 持續 4 秒（技能每次施放僅對首個命中目標判定；Leader 與 Boss 無效）",
    "dps_impact": {
      "effect": "5% chance on hit to break monster DEF -20% for 4s (no Leader/Boss)",
      "pve_only": true
    },
    "key": "mCrack",
    "title": "🜂 碎甲破殼"
  },
  "mEclipse": {
    "description": "屬性相剋不會使你的傷害低於 100%，但屬性剋制增傷上限為 115%",
    "dps_impact": {
      "effect": "Clamps elemental multiplier to [100%, 115%] (no elemental disadvantage, caps advantage at 115%)",
      "pve_only": true
    },
    "key": "mEclipse",
    "title": "🜂 日蝕平衡"
  },
  "mExecute": {
    "description": "攻擊 HP 低於 35% 的怪物時，傷害 +30%",
    "dps_impact": {
      "effect": "+30% damage vs monsters below 35% HP",
      "pve_only": true
    },
    "key": "mExecute",
    "title": "🜂 斬殺收割"
  },
  "mFarShot": {
    "description": "裝備遠程武器時：目標距離超過攻擊距離 85% 時傷害 +12%；近於 120 px 時傷害 −10%",
    "dps_impact": {
      "effect": "Ranged weapon: +12% dmg at >85% max range; -10% dmg within 120px",
      "pve_only": true
    },
    "key": "mFarShot",
    "title": "🜂 遠距狙擊"
  },
  "mFoxTails": {
    "description": "在前次擊殺後 4 秒內擊殺怪物獲得 1 條尾（最多 9 條），每條使 ASPD 與移動速度 +1.5%",
    "dps_impact": {
      "effect": "Kill within 4s grants 1 tail (max 9): +1.5% ASPD & MoveSpeed per tail (up to +13.5%)",
      "pve_only": true
    },
    "key": "mFoxTails",
    "title": "🜂 九尾之力"
  },
  "mFullMoon": {
    "description": "擊殺怪物時恢復佩戴者 2% MaxSP；多張同名卡可疊加，最多 3 張（單次技能最多計算 3 隻）",
    "dps_impact": {
      "effect": "Restore 2% MaxSP on monster kill (stacks up to 3 cards)",
      "pve_only": true,
      "stackable_up_to": 3
    },
    "key": "mFullMoon",
    "title": "🜂 滿月回魔"
  },
  "mGrasp": {
    "description": "普攻命中時 5% 機率束縛怪物使其無法移動 2 秒（對 Leader 與 Boss 無效）",
    "dps_impact": {
      "effect": "5% chance on normal hit to root monster 2s (no Leader/Boss)",
      "pve_only": true
    },
    "key": "mGrasp",
    "title": "🜂 觸手束縛"
  },
  "mHug": {
    "description": "普攻命中怪物時恢復 1% MaxHP（每 0.5 秒最多 1 次）；佩戴期間藥水與回血道具恢復量 −50%",
    "dps_impact": {
      "effect": "Normal hit heals 1% MaxHP (0.5s ICD); healing items -50%",
      "pve_only": true
    },
    "key": "mHug",
    "title": "🜂 緊緊擁抱"
  },
  "mLantern": {
    "description": "命中時 5% 機率使怪物陷入燃燒狀態 5 秒（技能每次施放僅對首個命中目標隨機判定 1 次）",
    "dps_impact": {
      "effect": "5% chance on hit to burn monster for 5s (once per cast, first target)",
      "pve_only": true
    },
    "key": "mLantern",
    "title": "🜂 鬼火提燈"
  },
  "mLowGravity": {
    "description": "受怪物致命傷時保留 1 HP 並免疫怪物傷害 2 秒，冷卻 90 秒（Nine Lives 或 Last Stand 冷卻期間不觸發）",
    "dps_impact": {
      "effect": "Lethal monster hit leaves 1 HP & 2s invuln (90s CD)",
      "pve_only": true
    },
    "key": "mLowGravity",
    "title": "🜂 低重力緩震"
  },
  "mLure": {
    "description": "你的傷害所產生的仇恨值（Aggro）×1.5（不含治療仇恨）",
    "dps_impact": {
      "effect": "Aggro from damage x1.5",
      "pve_only": true
    },
    "key": "mLure",
    "title": "🜂 誘餌仇恨"
  },
  "mMagicWard": {
    "description": "來自怪物的魔法傷害 −20%（包含怪物元素技能與遠程施法攻擊）",
    "dps_impact": {
      "effect": "Magic damage taken from monsters -20%",
      "pve_only": true
    },
    "key": "mMagicWard",
    "title": "🜂 抗魔傘"
  },
  "mMelt": {
    "description": "以普攻擊殺怪物時留下融化巧克力 3 秒，使 100 px 內其他怪物陷入緩速（Leader 與 Boss 無效；每 3 秒最多 1 攤；技能擊殺不觸發）",
    "dps_impact": {
      "effect": "Normal-attack kill leaves chocolate slow zone for 3s",
      "pve_only": true
    },
    "key": "mMelt",
    "title": "🜂 融化巧克力"
  },
  "mMeteor": {
    "description": "擊殺怪物時 20% 機率引爆殘骸，對周圍 120 px 內最多 8 隻怪物造成致死一擊所扣 HP 的 40% 傷害（對 Leader 與 Boss 無效；每次施放最多觸發 1 次）",
    "dps_impact": {
      "effect": "20% chance on kill to explode for 40% of overkill/final hit HP dmg in 120px (max 8 mobs)",
      "pve_only": true
    },
    "key": "mMeteor",
    "title": "🜂 隕石爆裂"
  },
  "mMoonDust": {
    "description": "成功閃避怪物普攻或技能後，3 秒內下一次命中必為暴擊（每 2 秒最多觸發 1 次）",
    "dps_impact": {
      "effect": "After dodging a monster hit/skill, next hit within 3s is guaranteed critical (2s CD)",
      "pve_only": true
    },
    "key": "mMoonDust",
    "title": "🜂 月塵閃擊"
  },
  "mNaga": {
    "description": "戰鬥中每 15 秒為 150 px 內隊友（含自身）淨化暈眩、冰凍、定身、致盲與緩速，並賦予相當於佩戴者 MaxHP 7% 的護盾持續 5 秒",
    "dps_impact": {
      "effect": "MaxHP +7% in Et(); every 15s cleanses party CC & shields 7% MaxHP for 5s",
      "pve_only": true
    },
    "key": "mNaga",
    "title": "🜂 納迦水癒光環"
  },
  "mOpener": {
    "description": "對尚未被攻擊過的滿血目標首次攻擊傷害 +20%（適用普攻與單體技能）",
    "dps_impact": {
      "effect": "+20% damage on first hit against untouched monster (normal & single-target)",
      "pve_only": true
    },
    "key": "mOpener",
    "title": "🜂 烏鴉搶攻"
  },
  "mQuake": {
    "description": "普攻命中時產生震波，對目標周圍 150 px 內最多 6 隻其他怪物造成 40% 傷害；HIT −15%",
    "dps_impact": {
      "effect": "Normal hits splash 40% damage to up to 6 monsters within 150px; HIT -15%",
      "pve_only": true
    },
    "key": "mQuake",
    "title": "🜂 震地獠牙"
  },
  "mRage": {
    "description": "每損失 4% HP，ATK 與 MATK +1%，最高 +15%",
    "dps_impact": {
      "effect": "+1% ATK and MATK per 4% missing HP, up to +15%",
      "pve_only": true
    },
    "key": "mRage",
    "title": "🜂 越戰越勇"
  },
  "mReef": {
    "description": "3 秒內受到 3 隻以上不同怪物攻擊時，所受傷害 −20%",
    "dps_impact": {
      "effect": "Hit by >=3 different monsters in 3s -> -20% damage taken",
      "pve_only": true
    },
    "key": "mReef",
    "title": "🜂 珊瑚屏障"
  },
  "mSoft": {
    "description": "單次受到怪物超過 15% MaxHP 的傷害時，超出部分減免 50%（與其他減傷卡合計上限 30%）",
    "dps_impact": {
      "effect": "Single monster hit >15% MaxHP has excess reduced by 50%",
      "pve_only": true
    },
    "key": "mSoft",
    "title": "🜂 軟綿緩衝"
  },
  "mStarShield": {
    "description": "獲得相當於自身 MaxHP 6% 的怪物傷害吸收護盾，護盾破裂 20 秒後重新生成",
    "dps_impact": {
      "effect": "Absorb shield = 6% MaxHP (20s cooldown after break)",
      "pve_only": true
    },
    "key": "mStarShield",
    "title": "🜂 星辰護盾"
  },
  "mSurprise": {
    "description": "未施放任何技能達 6 秒後，下一次施放的技能對怪物傷害 +35%（涵蓋該次施放的所有目標與段數）",
    "dps_impact": {
      "effect": "First skill after 6s without casting any skill deals +35% damage vs monsters",
      "pve_only": true
    },
    "key": "mSurprise",
    "title": "🜂 驚喜突襲！"
  },
  "mSwarm": {
    "description": "連續攻擊同一隻怪物時，每次疊加 ASPD +2%（最多 10 層，切換目標減半）；達 ASPD 上限後改為每層傷害 +1%",
    "dps_impact": {
      "effect": "Consecutive hits on same monster: +2% ASPD per stack up to 10 stacks (+20% ASPD); when ASPD is capped, grants +1% damage per stack (+10% dmg)",
      "pve_only": true
    },
    "key": "mSwarm",
    "title": "🜂 連擊蜂群"
  },
  "mTani": {
    "description": "來自水屬性怪物的傷害 −25%；使用衝刺（Dash）後移速 +25% 並恢復 5% MaxSP 持續 5 秒（每 15 秒最多觸發 1 次）",
    "dps_impact": {
      "effect": "Water monster dmg -25%; dashing grants +25% MoveSpeed & 5% MaxSP for 5s; +10% MDEF in Et()",
      "pve_only": true
    },
    "key": "mTani",
    "title": "🜂 沉淵水妖"
  },
  "mTideSong": {
    "description": "你的治療技能治療量 +10%，並為受治療的隊友恢復 2% MaxSP（不含自身，每名隊友每 5 秒最多觸發 1 次）",
    "dps_impact": {
      "effect": "Healing skills +10% & restore 2% MaxSP to healed allies (5s CD per ally)",
      "pve_only": true
    },
    "key": "mTideSong",
    "title": "🜂 潮汐之歌"
  },
  "mTitan": {
    "description": "對 Leader 與 Boss 傷害 +25%；對一般怪物傷害 −10%",
    "dps_impact": {
      "effect": "+25% damage vs Leader & Bosses; -10% damage vs normal monsters",
      "pve_only": true
    },
    "key": "mTitan",
    "title": "🜂 破王專武（首領增傷）"
  },
  "mWeakSpot": {
    "description": "攻擊處於異常狀態的怪物時，傷害 +12%",
    "dps_impact": {
      "effect": "+12% damage vs monsters with any status ailment",
      "pve_only": true
    },
    "key": "mWeakSpot",
    "title": "🜂 弱點追擊"
  }
};

export const WIKI_EQUIPMENT_AFFIX_SYSTEM: Record<string, unknown> = {
  "accessory_atk_matk_mults": [
    4,
    7,
    12,
    20,
    30,
    42
  ],
  "affix_name_prefixes": {
    "atkPct": "Savage",
    "bleedHit": "Rending",
    "critDmg": "Lethal",
    "crushHit": "Crushing",
    "freezeHit": "Frozen",
    "hp": "Blood",
    "hpRegen": "Vital",
    "matkPct": "Occult",
    "moveSpeed": "Spin",
    "mpierce": "Runic",
    "pierce": "Piercing",
    "resBleed": "Ironhide",
    "resFreeze": "Thawing",
    "resStun": "Steadfast",
    "spRegen": "Serene",
    "stunHit": "Shocking"
  },
  "equipment_templates": [
    {
      "bonuses": {
        "atk": 4
      },
      "buy": 50,
      "jobs": [
        "novice",
        "thief"
      ],
      "key": "knife",
      "name": "Knife",
      "sell": 25,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 6
      },
      "buy": 100,
      "jobs": [
        "novice",
        "swordman"
      ],
      "key": "sword",
      "name": "Sword",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 12
      },
      "buy": 400,
      "jobs": [
        "novice",
        "merchant"
      ],
      "key": "hammer",
      "level": 15,
      "name": "Hammer",
      "sell": 200,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 7
      },
      "buy": 250,
      "jobs": [
        "thief"
      ],
      "key": "dagger_pair",
      "level": 12,
      "name": "Dagger Pair",
      "sell": 125,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 5
      },
      "buy": 100,
      "jobs": [
        "mamushi"
      ],
      "key": "kunai",
      "name": "Viper Kunai",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 6
      },
      "buy": 100,
      "jobs": [
        "kensei"
      ],
      "key": "katana",
      "name": "Katana",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 6
      },
      "buy": 100,
      "jobs": [
        "ironfist"
      ],
      "key": "cestus",
      "name": "Cestus",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "int": 1,
        "matk": 5
      },
      "buy": 100,
      "jobs": [
        "nekobaku"
      ],
      "key": "flask",
      "name": "Neko Flask",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "int": 1,
        "matk": 5
      },
      "buy": 100,
      "jobs": [
        "necromancer"
      ],
      "key": "grimoire",
      "name": "Rune Grimoire",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "int": 1,
        "matk": 5
      },
      "buy": 100,
      "jobs": [
        "king"
      ],
      "key": "tablet",
      "name": "Royal Tablet",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 6
      },
      "buy": 100,
      "jobs": [
        "sinister"
      ],
      "key": "pistols",
      "name": "Twin Pistols",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 6
      },
      "buy": 100,
      "jobs": [
        "templar"
      ],
      "key": "aegis",
      "name": "Lionheart Aegis",
      "sell": 50,
      "slot": "sword"
    },
    {
      "bonuses": {
        "int": 1,
        "matk": 5
      },
      "buy": 80,
      "jobs": [
        "mage"
      ],
      "key": "rod",
      "name": "Rod",
      "sell": 40,
      "slot": "sword"
    },
    {
      "bonuses": {
        "int": 2,
        "matk": 9
      },
      "buy": 500,
      "jobs": [
        "mage"
      ],
      "key": "staff",
      "level": 15,
      "name": "Staff",
      "sell": 250,
      "slot": "sword"
    },
    {
      "bonuses": {
        "matk": 10
      },
      "buy": 120,
      "jobs": [
        "acolyte"
      ],
      "key": "quarterstaff",
      "name": "Quarterstaff",
      "sell": 60,
      "slot": "sword"
    },
    {
      "bonuses": {
        "atk": 8
      },
      "buy": 350,
      "jobs": [
        "archer"
      ],
      "key": "bow",
      "level": 10,
      "name": "Bow",
      "sell": 175,
      "slot": "sword"
    },
    {
      "bonuses": {
        "def": 1
      },
      "buy": 30,
      "key": "cotton_shirt",
      "name": "Cotton Shirt",
      "sell": 15,
      "slot": "armor"
    },
    {
      "bonuses": {
        "def": 2,
        "hp": 50
      },
      "buy": 150,
      "key": "adventurer_suit",
      "name": "Adventurer's Suit",
      "sell": 75,
      "slot": "armor"
    },
    {
      "bonuses": {
        "def": 3,
        "hp": 100
      },
      "key": "coat",
      "name": "Coat",
      "sell": 200,
      "slot": "armor"
    },
    {
      "bonuses": {
        "dex": 1,
        "int": 1,
        "matk": 4
      },
      "jobs": [
        "mage"
      ],
      "key": "orb",
      "name": "Orb",
      "sell": 100,
      "slot": "shield"
    },
    {
      "bonuses": {
        "dex": 1,
        "int": 1,
        "matk": 4
      },
      "jobs": [
        "nekobaku"
      ],
      "key": "catalyst",
      "name": "Catalyst",
      "sell": 100,
      "slot": "shield"
    },
    {
      "bonuses": {
        "dex": 1,
        "int": 1,
        "matk": 4
      },
      "jobs": [
        "necromancer"
      ],
      "key": "lantern",
      "name": "Lantern",
      "sell": 100,
      "slot": "shield"
    },
    {
      "bonuses": {
        "agi": 1,
        "aspd": 1,
        "atk": 3
      },
      "jobs": [
        "mamushi"
      ],
      "key": "shuriken",
      "name": "Shuriken",
      "sell": 100,
      "slot": "shield"
    },
    {
      "bonuses": {
        "atk": 3,
        "crit": 2,
        "str": 1
      },
      "jobs": [
        "kensei"
      ],
      "key": "saya",
      "name": "Saya",
      "sell": 100,
      "slot": "shield"
    },
    {
      "bonuses": {
        "def": 1
      },
      "buy": 50,
      "key": "hood",
      "name": "Hood",
      "sell": 25,
      "slot": "garment"
    },
    {
      "bonuses": {
        "def": 2
      },
      "key": "muffler",
      "name": "Muffler",
      "sell": 60,
      "slot": "garment"
    },
    {
      "bonuses": {
        "def": 1
      },
      "buy": 40,
      "key": "sandals",
      "name": "Sandals",
      "sell": 20,
      "slot": "shoes"
    },
    {
      "bonuses": {
        "def": 2
      },
      "buy": 100,
      "key": "shoes",
      "name": "Shoes",
      "sell": 50,
      "slot": "shoes"
    },
    {
      "bonuses": {
        "def": 1,
        "mdef": 2
      },
      "buy": 60,
      "key": "hat",
      "name": "Hat",
      "sell": 30,
      "slot": "head"
    },
    {
      "bonuses": {
        "def": 2,
        "mdef": 3
      },
      "key": "cap",
      "name": "Cap",
      "sell": 75,
      "slot": "head"
    },
    {
      "bonuses": {
        "def": 3,
        "vit": 1
      },
      "key": "helm",
      "name": "Helm",
      "sell": 200,
      "slot": "head"
    },
    {
      "bonuses": {
        "crit": 2
      },
      "key": "obsidian_ring",
      "name": "Obsidian Ring",
      "sell": 100,
      "slot": "accessory1"
    },
    {
      "bonuses": {
        "mcrit": 2
      },
      "key": "emerald_ring",
      "name": "Emerald Ring",
      "sell": 100,
      "slot": "accessory2"
    }
  ],
  "extra_stat_chance_non_accessory": 0.25,
  "flee_and_hit_roll_weights": {
    "bucket_weights": [
      0.3,
      0.25,
      0.2,
      0.15,
      0.1
    ],
    "description": "Rolled independently on every slot; bucket 0..4 with sub-offset in 0..(tier-1) for buckets 0..3, exact 4*tier for bucket 4"
  },
  "non_dps_affixes": [
    "resStun",
    "resFreeze",
    "resBleed",
    "hpRegen",
    "spRegen",
    "moveSpeed",
    "hp"
  ],
  "ring_crit_mult": 2,
  "saya_crit_per_tier": [
    2,
    4,
    6,
    8,
    10,
    12
  ],
  "shuriken_aspd_per_tier": [
    1,
    1,
    2,
    2,
    3,
    3
  ],
  "slot_base_rolls": {
    "accessory1_default": {
      "range": "[1*Ko[tier-1], 3*Ko[tier-1] - 1]",
      "stat": "atk"
    },
    "accessory1_obsidian_ring": {
      "range": "[1*tier, 2*tier - 1]",
      "stat": "crit"
    },
    "accessory2_default": {
      "range": "[1*Ko[tier-1], 3*Ko[tier-1] - 1]",
      "stat": "matk"
    },
    "accessory2_emerald_ring": {
      "range": "[1*tier, 2*tier - 1]",
      "stat": "mcrit"
    },
    "ammo_quiver": {
      "range": "[1*tier, 3*tier - 1]",
      "stat": "atk"
    },
    "face_mouth": {
      "stat": "mdef",
      "weighted_tier_mults": {
        "1*tier..2*tier-1": 0.55,
        "2*tier..3*tier-1": 0.35,
        "3*tier": 0.1
      }
    },
    "head_armor_garment_shoes": {
      "stat": "def",
      "weighted_tier_mults": {
        "1*tier..2*tier-1": 0.55,
        "2*tier..3*tier-1": 0.35,
        "3*tier": 0.1
      }
    },
    "shield_actual": {
      "stat": "def",
      "weighted_tier_mults": {
        "1*tier..2*tier-1": 0.55,
        "2*tier..3*tier-1": 0.35,
        "3*tier": 0.1
      }
    },
    "shield_orb_catalyst_lantern": {
      "matk": "[1*tier, 3*tier-1]",
      "mdef_50pct": "0 or tier",
      "sp": "[5*tier, 20*tier-1]"
    },
    "shield_saya": {
      "atk": "[1*tier, 3*tier-1]",
      "crit": "saya_crit_per_tier[tier-1]"
    },
    "shield_shuriken": {
      "aspd": "shuriken_aspd_per_tier[tier-1]",
      "atk": "[1*tier, 3*tier-1]"
    },
    "sword": {
      "range": "[2*tier, 6*tier - 1] (uniform int; doubled by Ro if 2H)",
      "stat": "atk (converted to matk if caster template has matk & no atk)"
    }
  },
  "special_affix_chance": [
    0.03,
    0.06,
    0.09,
    0.12,
    0.15,
    0.15
  ],
  "special_affix_pools": {
    "accessory1": [
      "atkPct",
      "pierce",
      "critDmg",
      "spRegen",
      "hpRegen"
    ],
    "accessory2": [
      "matkPct",
      "mpierce",
      "critDmg",
      "spRegen",
      "hpRegen"
    ],
    "ammo": [
      "pierce",
      "atkPct",
      "critDmg",
      "bleedHit",
      "crushHit"
    ],
    "armor": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "face": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "garment": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "head": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "mouth": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "shield_actual": [
      "resBleed",
      "resStun",
      "resFreeze",
      "hp",
      "spRegen"
    ],
    "shield_orb": [
      "matkPct",
      "mpierce",
      "critDmg",
      "spRegen",
      "freezeHit"
    ],
    "shield_saya": [
      "atkPct",
      "pierce",
      "critDmg",
      "bleedHit",
      "crushHit"
    ],
    "shield_shuriken": [
      "atkPct",
      "pierce",
      "critDmg",
      "bleedHit",
      "crushHit"
    ],
    "shoes": [
      "moveSpeed",
      "resBleed",
      "resStun",
      "resFreeze",
      "spRegen"
    ],
    "sword_caster": [
      "mpierce",
      "matkPct",
      "critDmg",
      "freezeHit",
      "spRegen"
    ],
    "sword_melee": [
      "pierce",
      "atkPct",
      "critDmg",
      "bleedHit",
      "crushHit"
    ]
  },
  "special_affix_values": {
    "atkPct": [
      2,
      4,
      6,
      8,
      10,
      12
    ],
    "bleedHit": [
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "critDmg": [
      2,
      4,
      6,
      8,
      10,
      12
    ],
    "crushHit": [
      2,
      2,
      3,
      4,
      5,
      6
    ],
    "freezeHit": [
      2,
      2,
      3,
      4,
      5,
      6
    ],
    "hp": [
      30,
      60,
      90,
      120,
      150,
      180
    ],
    "hpRegen": [
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "matkPct": [
      2,
      4,
      6,
      8,
      10,
      12
    ],
    "moveSpeed": [
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "mpierce": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "pierce": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "resBleed": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "resFreeze": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "resStun": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "spRegen": [
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "stunHit": [
      2,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "stat_roll_distribution": {
    "buckets": [
      {
        "chance": 0.55,
        "high_mult_excl": 2,
        "low_mult": 1
      },
      {
        "chance": 0.4,
        "high_mult_excl": 3,
        "low_mult": 2
      },
      {
        "chance": 0.05,
        "exact_mult": 3
      }
    ],
    "description": "55% uniform in [tier, 2*tier - 1]; 40% uniform in [2*tier, 3*tier - 1]; 5% exact 3*tier"
  },
  "status_resist_affixes": [
    "resStun",
    "resFreeze",
    "resBleed"
  ],
  "tier6_verified_ranges": {
    "accessory1": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "atk": 126,
          "atkPct": 12,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 42,
          "atkPct": 12,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atk": 126,
          "atkPct": 12,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 42,
          "atkPct": 12,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "accessory1:obsidian_ring": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "atkPct": 12,
          "crit": 12,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atkPct": 12,
          "crit": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atkPct": 12,
          "crit": 12,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atkPct": 12,
          "crit": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "accessory2": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "matk": 126,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "matk": 42,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "matk": 126,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "matk": 42,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "accessory2:emerald_ring": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "matkPct": 12,
          "mcrit": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "matkPct": 12,
          "mcrit": 6,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hpRegen": 7,
          "int": 18,
          "luk": 18,
          "matkPct": 12,
          "mcrit": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hpRegen": 7,
          "int": 6,
          "luk": 6,
          "matkPct": 12,
          "mcrit": 6,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "ammo": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      }
    },
    "armor": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "face": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "mdef": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "mdef": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "mdef": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "mdef": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "garment": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "head": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "mouth": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "mdef": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "mdef": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "mdef": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "mdef": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "shield": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "hp": 180,
          "int": 18,
          "luk": 18,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "hp": 180,
          "int": 6,
          "luk": 6,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "shield:orb": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "freezeHit": 6,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "matk": 18,
          "matkPct": 12,
          "mdef": 6,
          "mpierce": 6,
          "sp": 120,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "freezeHit": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "matk": 6,
          "matkPct": 12,
          "mdef": 6,
          "mpierce": 6,
          "sp": 30,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "freezeHit": 6,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "matk": 18,
          "matkPct": 12,
          "mdef": 6,
          "mpierce": 6,
          "sp": 120,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "freezeHit": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "matk": 6,
          "matkPct": 12,
          "mdef": 6,
          "mpierce": 6,
          "sp": 30,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "shield:saya": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "crit": 12,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "crit": 12,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "crit": 12,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "crit": 12,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      }
    },
    "shield:shuriken": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "aspd": 3,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "aspd": 3,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "aspd": 3,
          "atk": 18,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "aspd": 3,
          "atk": 6,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      }
    },
    "shoes": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "moveSpeed": 7,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "moveSpeed": 7,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "def": 18,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "moveSpeed": 7,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "def": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "moveSpeed": 7,
          "resBleed": 6,
          "resFreeze": 6,
          "resStun": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "sword:aegis": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 36,
          "atk": 72,
          "atkPct": 24,
          "bleedHit": 14,
          "critDmg": 24,
          "crushHit": 12,
          "dex": 36,
          "flee": 48,
          "hit": 48,
          "int": 36,
          "luk": 36,
          "pierce": 12,
          "str": 36,
          "vit": 36
        },
        "min": {
          "agi": 12,
          "atk": 24,
          "atkPct": 24,
          "bleedHit": 14,
          "critDmg": 24,
          "crushHit": 12,
          "dex": 12,
          "flee": 12,
          "hit": 12,
          "int": 12,
          "luk": 12,
          "pierce": 12,
          "str": 12,
          "vit": 12
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atk": 36,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 12,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      }
    },
    "sword:staff": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 36,
          "critDmg": 24,
          "dex": 36,
          "flee": 48,
          "freezeHit": 12,
          "hit": 48,
          "int": 36,
          "luk": 36,
          "matk": 72,
          "matkPct": 24,
          "mpierce": 12,
          "spRegen": 14,
          "str": 36,
          "vit": 36
        },
        "min": {
          "agi": 12,
          "critDmg": 24,
          "dex": 12,
          "flee": 12,
          "freezeHit": 12,
          "hit": 12,
          "int": 12,
          "luk": 12,
          "matk": 24,
          "matkPct": 24,
          "mpierce": 12,
          "spRegen": 14,
          "str": 12,
          "vit": 12
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "freezeHit": 6,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "matk": 36,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "freezeHit": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "matk": 12,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    },
    "sword:sword": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 36,
          "atk": 72,
          "atkPct": 24,
          "bleedHit": 14,
          "critDmg": 24,
          "crushHit": 12,
          "dex": 36,
          "flee": 48,
          "hit": 48,
          "int": 36,
          "luk": 36,
          "pierce": 12,
          "str": 36,
          "vit": 36
        },
        "min": {
          "agi": 12,
          "atk": 24,
          "atkPct": 24,
          "bleedHit": 14,
          "critDmg": 24,
          "crushHit": 12,
          "dex": 12,
          "flee": 12,
          "hit": 12,
          "int": 12,
          "luk": 12,
          "pierce": 12,
          "str": 12,
          "vit": 12
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "atk": 36,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 18,
          "flee": 24,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "pierce": 6,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "atk": 12,
          "atkPct": 12,
          "bleedHit": 7,
          "critDmg": 12,
          "crushHit": 6,
          "dex": 6,
          "flee": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "pierce": 6,
          "str": 6,
          "vit": 6
        }
      }
    },
    "sword:tablet": {
      "effective_with_2h_Ro": {
        "max": {
          "agi": 36,
          "atk": 36,
          "critDmg": 24,
          "dex": 36,
          "flee": 48,
          "freezeHit": 12,
          "hit": 48,
          "int": 36,
          "luk": 36,
          "matk": 36,
          "matkPct": 24,
          "mpierce": 12,
          "spRegen": 14,
          "str": 36,
          "vit": 36
        },
        "min": {
          "agi": 12,
          "atk": 12,
          "critDmg": 24,
          "dex": 12,
          "flee": 12,
          "freezeHit": 12,
          "hit": 12,
          "int": 12,
          "luk": 12,
          "matk": 12,
          "matkPct": 24,
          "mpierce": 12,
          "spRegen": 14,
          "str": 12,
          "vit": 12
        }
      },
      "raw_bonuses": {
        "max": {
          "agi": 18,
          "critDmg": 12,
          "dex": 18,
          "flee": 24,
          "freezeHit": 6,
          "hit": 24,
          "int": 18,
          "luk": 18,
          "matk": 36,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 18,
          "vit": 18
        },
        "min": {
          "agi": 6,
          "critDmg": 12,
          "dex": 6,
          "flee": 6,
          "freezeHit": 6,
          "hit": 6,
          "int": 6,
          "luk": 6,
          "matk": 12,
          "matkPct": 12,
          "mpierce": 6,
          "spRegen": 7,
          "str": 6,
          "vit": 6
        }
      }
    }
  },
  "tier_count": 6,
  "tier_level_thresholds": [
    1,
    25,
    50,
    75,
    100,
    121
  ],
  "tiers": [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI"
  ],
  "two_handed_rules": {
    "blocks_shield_slot": true,
    "card_slots": 2,
    "refine_gain_multiplier": 2,
    "refine_pierce_multiplier": 2,
    "stats_multiplier": 2,
    "tablet_exception": "Royal Tablet (slot sword, template tablet) converts raw matk to both atk=matk (1x, NOT 2x), doubles other base stats, doubles refine MATK gain, and grants BOTH +2% pierce and +2% mpierce per refine level >= +6"
  },
  "two_handed_templates": [
    "staff",
    "quarterstaff",
    "dagger_pair",
    "hammer",
    "sword",
    "tablet",
    "pistols",
    "aegis",
    "cestus"
  ],
  "vit_vs_flat_hp_comparison": {
    "flat_hp_affix_tier6": 180,
    "pve_vit_hp_multiplier_note": "BodyHP is multiplied by vitHp (1 + VIT*0.006 up to 100 VIT, +0.002 per VIT above 100). On a Templar with 6000+ BodyHP, +12..18 VIT adds ~600..1500+ MaxHP, +DEF, and unlocks GLD VIT thresholds (100/200/300 -> 10x/15x/20x/25x MaxHP at Lv10), far outweighing flat hp +180.",
    "slot_primary_stat_rules": "Every gear slot rolls 1 random stat (25% chance for 2nd) from all 6 primary stats [str, agi, vit, int, dex, luk] (accessories always roll 2 distinct primary stats), plus independent FLEE & HIT rolls [0..4*tier], plus 15% (Tier V-VI) special affix from rr(slot, template). Note armor/head/face/mouth/garment/shield special affixes in rr() are ONLY defensive/regen [resBleed, resStun, resFreeze, hp, spRegen], so DPS on those slots comes primarily from primary stat rolls (e.g. STR/VIT/AGI/DEX/INT/LUK +12..+18), HIT/FLEE rolls, and Armor Sets.",
    "templar_body_hp_per_vit": 23.5,
    "vit_roll_tier6_range": [
      6,
      18
    ],
    "vit_roll_upper_band_tier6": "12..18 (45% chance: 40% in 12..17 + 5% at 18)"
  }
};
