-- =============================================================================
-- Lumivara Online Build & DPS Optimizer — SQLite Schema (9 Tables)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. 職業總表 (15 職業：Novice、6 一轉、8 二轉/擴充)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,                  -- 'novice' | 'first' | 'second'
    role_summary TEXT NOT NULL,
    is_melee INTEGER NOT NULL DEFAULT 1, -- 1 = 近戰, 0 = 遠程/法系
    base_aspd REAL NOT NULL DEFAULT 150.0,
    auto_atk_scale REAL NOT NULL DEFAULT 1.0,
    auto_hp_scale REAL NOT NULL DEFAULT 0.0,
    job_bonuses_json TEXT NOT NULL,      -- JSON: {"vit": 5, "str": 1, ...}
    innate_stats_json TEXT NOT NULL,     -- JSON: {"vit": 60, "def": 30, ...}
    allowed_weapons_json TEXT NOT NULL,  -- JSON: ["sword", "shield", "lionheart_aegis"]
    active_stats_json TEXT NOT NULL,     -- JSON: ["vit", "str", "agi", "dex", "luk"]
    hp_bonus_pct REAL NOT NULL DEFAULT 0.0,
    sp_bonus_pct REAL NOT NULL DEFAULT 0.0,
    max_job_level INTEGER NOT NULL DEFAULT 70,
    wiki_url TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. 職業技能表 (主動與固有被動技能)
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    name TEXT NOT NULL,
    skill_type TEXT NOT NULL,            -- 'active' | 'passive'
    dmg_type TEXT NOT NULL DEFAULT 'physical', -- 'physical' | 'magic' | 'hybrid'
    atk_scale REAL NOT NULL DEFAULT 0.0,
    matk_scale REAL NOT NULL DEFAULT 0.0,
    hp_scale REAL NOT NULL DEFAULT 0.0,
    vit_tier_hp_scale INTEGER NOT NULL DEFAULT 0,
    str_eq_int_bonus REAL NOT NULL DEFAULT 0.0, -- The King 條件觸發加成倍率 (例 0.35 = +35%)
    element TEXT NOT NULL DEFAULT 'neutral',
    uses_weapon_coating INTEGER NOT NULL DEFAULT 0,
    cooldown REAL NOT NULL DEFAULT 1.0,
    effective_uptime_cd REAL,
    cast_time REAL NOT NULL DEFAULT 0.0,
    hits INTEGER NOT NULL DEFAULT 1,
    never_misses INTEGER NOT NULL DEFAULT 0,
    can_crit INTEGER NOT NULL DEFAULT 1,
    monster_mult REAL NOT NULL DEFAULT 1.0,
    monster_damage_applies_to TEXT NOT NULL DEFAULT 'total_damage',
    aspd_scaling_type TEXT NOT NULL DEFAULT 'fixed_cooldown',
    cooldown_from_aspd INTEGER NOT NULL DEFAULT 0,
    aspd_floor INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    description_lv10 TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 3. 跨職業被動技能池 (上限攜帶 4/4)
CREATE TABLE IF NOT EXISTS cross_passives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    source_job TEXT NOT NULL,
    restriction TEXT NOT NULL DEFAULT 'all', -- 'all' | 'melee' | 'ranged' | 'bow' | 'kunai' | 'knuckle' | 'magic'
    stats_json TEXT NOT NULL,                -- JSON: {"atk_pct": 0.60, "aspd_pct": 0.20, "melee_only": true}
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. 武器與防具基礎資料庫
CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slot TEXT NOT NULL,                  -- 'weapon' | 'shield' | 'head_upper' | 'head_mid' | 'head_lower' | 'body' | 'garment' | 'shoes' | 'accessory'
    tier INTEGER NOT NULL DEFAULT 6,
    weapon_type TEXT,                    -- 'sword' | 'two_handed_sword' | 'spear' | 'bow' | 'staff' | 'kunai' | 'knuckle' | 'dagger' | 'mace' | 'lionheart_aegis'
    is_two_handed INTEGER NOT NULL DEFAULT 0,
    stats_json TEXT NOT NULL,            -- JSON: {"flat_atk": 220, "vit": 20, "phys_pierce": 0.10, ...}
    allowed_jobs_json TEXT NOT NULL,     -- JSON: ["all"] or ["templar", "swordman"]
    description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

-- 5. 防具套裝效果表 (6 部位防具，支援 2/4/6 件套)
CREATE TABLE IF NOT EXISTS armor_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    pieces_required INTEGER NOT NULL DEFAULT 2,
    rarity TEXT NOT NULL DEFAULT 'common',
    max_stacks INTEGER NOT NULL DEFAULT 1,
    eligible_slots_json TEXT NOT NULL DEFAULT '["head","face","mouth","armor","garment","shoes"]',
    bonuses_json TEXT NOT NULL,          -- JSON: {"phys_pierce": 0.07}
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. 怪物卡片表 (全 102 張 Wiki 卡片)
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slot TEXT NOT NULL,                  -- 'weapon' | 'shield' | 'head_upper' | 'head_mid' | 'head_lower' | 'body' | 'garment' | 'shoes' | 'accessory' | 'all'
    tier TEXT,                           -- 'SS' | 'S' | 'A' | 'B' | 'C' | 'Limited' | NULL
    slots_json TEXT NOT NULL DEFAULT '["all"]',
    source_monsters_json TEXT NOT NULL DEFAULT '[]',
    removable INTEGER NOT NULL DEFAULT 1,
    max_per_item INTEGER NOT NULL DEFAULT 1,
    is_limited INTEGER NOT NULL DEFAULT 0, -- 1 = Limited / Gacha / Pack 限定卡（如 LM-01 卡包）, 0 = 可農怪物／首領／副本掉落卡
    bonuses_json TEXT NOT NULL,          -- JSON: {"str": 8, "atk_pct": 0.03, "phys_pierce": 0.05}
    mechanics_json TEXT NOT NULL DEFAULT '[]', -- JSON: ["mSwarm", "mTitan", ...]
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. 目標怪物與 PvP 測試木樁預設表
CREATE TABLE IF NOT EXISTS monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 150,
    hp INTEGER NOT NULL DEFAULT 1000,
    def INTEGER NOT NULL DEFAULT 255,
    mdef INTEGER NOT NULL DEFAULT 240,
    hit INTEGER NOT NULL DEFAULT 0,
    flee INTEGER NOT NULL DEFAULT 500,
    element TEXT NOT NULL DEFAULT 'dark',
    areas_json TEXT NOT NULL DEFAULT '[]',
    is_boss INTEGER NOT NULL DEFAULT 1,
    is_monster INTEGER NOT NULL DEFAULT 1, -- 1 = PvE Monster, 0 = PvP Player
    description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

-- 8. CDC 實體內容雜湊快照表 (Canonical JSON SHA-256)
CREATE TABLE IF NOT EXISTS entity_hashes (
    entity_type TEXT NOT NULL,           -- 'job' | 'skill' | 'passive' | 'armor_set' | 'card' | 'equipment' | 'monster'
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
);

-- 9. CDC 變更歷史紀錄表 (供前端頂部改版異動通知列查詢)
CREATE TABLE IF NOT EXISTS data_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    change_type TEXT NOT NULL,           -- 'ADDED' | 'MODIFIED' | 'REMOVED'
    old_hash TEXT,
    new_hash TEXT,
    diff_summary TEXT NOT NULL,          -- 人類可讀的改版差異摘要
    diff_json TEXT NOT NULL,             -- JSON 結構化欄位前後對比
    affected_jobs_json TEXT NOT NULL DEFAULT '["all"]',
    patch_version TEXT NOT NULL DEFAULT '2026-11-13',
    detected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_job_id ON skills(job_id);
CREATE INDEX IF NOT EXISTS idx_cards_slot ON cards(slot);
CREATE INDEX IF NOT EXISTS idx_data_changes_detected_at ON data_changes(detected_at DESC);

-- 10. Wiki 系統規則與機制中繼資料 (card_mechanics, card_mechanics_params, equipment_affix_system)
CREATE TABLE IF NOT EXISTS wiki_metadata (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
