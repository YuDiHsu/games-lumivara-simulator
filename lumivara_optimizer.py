#!/usr/bin/env python3
"""
Lumivara Online — 全職業通用秒傷 (DPS) 與配裝最佳化引擎 (Antigravity 起手範本)
嚴格遵守 AGENTS.md 規範：
  - 僅使用 Python 3 標準函式庫
  - 支援 Lv.1–150、119 屬性上限、4/4 跨職業被動限制、6 部位 3×2 套裝組合
  - 支援物理 / 魔法 / 混合職業、武器屬性塗層開關、DEX 150 瞬發與多段加速、真實 DPS 計算
"""

from dataclasses import dataclass, field
from itertools import combinations, combinations_with_replacement
from typing import Callable, Dict, List, Optional, Tuple


# ==============================================================================
# 1. 通用資料結構 (未來可直接由 SQLite / Wiki 爬蟲匯入)
# ==============================================================================
@dataclass
class SkillSpec:
    name: str
    dmg_type: str = "physical"          # "physical" | "magic"
    atk_scale: float = 0.0              # 物理倍率 (例: 27.0 = 2700% ATK)
    matk_scale: float = 0.0             # 魔法倍率
    hp_scale: float = 0.0               # MaxHP 倍率 (可為固定值)
    vit_tier_hp_scale: bool = False     # True 時套用 Grand Light Devastation VIT 跳檔
    element: str = "neutral"            # "neutral" | "light" | "dark" | "fire" | "water" | "wind" | "earth"
    uses_weapon_coating: bool = False   # True = 無屬性時跟隨武器塗層屬性
    cooldown: float = 1.0               # 基礎冷卻秒數
    effective_uptime_cd: Optional[float] = None  # 實戰等效冷卻 (如擊殺重置可設較低值)
    cast_time: float = 0.0              # 基礎詠唱秒數 (總 DEX 150 變為 0)
    never_misses: bool = False
    can_crit: bool = True
    monster_mult: float = 1.0           # 對怪物額外乘數 (例: 1.50 = +50%)


@dataclass
class ClassProfile:
    name: str
    level: int = 150
    max_stat_cap: int = 119
    job_bonuses: Dict[str, int] = field(default_factory=dict)       # 職業加成 (如 {"vit": 5, "str": 1})
    innate_stats: Dict[str, float] = field(default_factory=dict)    # 固有被動加成 (如 Templar Mastery)
    is_melee: bool = True
    auto_atk_scale: float = 1.0         # 普攻與普攻觸發被動合計等效倍率
    auto_hp_scale: float = 0.0          # 普攻觸發的 MaxHP 傷害 (如 Colossus Radiant Bash)
    base_aspd: float = 150.0            # 武器基礎 ASPD (上限 193)
    skills: List[SkillSpec] = field(default_factory=list)
    active_stats: Tuple[str, ...] = ("vit", "str", "agi", "dex", "luk")  # 參與搜尋的主屬性


@dataclass
class GearProfile:
    vit: int = 0
    str_v: int = 0
    agi: int = 0
    dex: int = 0
    int_v: int = 0
    luk: int = 0
    flat_atk: int = 200
    flat_matk: int = 0
    atk_pct: float = 0.20
    matk_pct: float = 0.0
    phys_pierce: float = 0.15
    magic_pierce: float = 0.0
    crit: float = 0.20
    mcrit: float = 0.0
    crit_dmg: float = 0.30
    hit: int = 250
    gear_def: int = 210
    gear_mdef: int = 90
    flat_hp: int = 3500
    hp_pct: float = 0.10
    flat_sp: int = 300
    sp_pct: float = 0.0
    weapon_coating: Optional[str] = "light"  # None 或 "fire"/"water"/"wind"/"earth"/"light"/"dark"


@dataclass
class TargetProfile:
    target_def: int = 255
    target_mdef: int = 240
    target_flee: int = 500
    element: str = "dark"               # 目標屬性
    is_monster: bool = True             # True=PvE, False=PvP


# ==============================================================================
# 2. Wiki 通用公式庫
# ==============================================================================
def total_stat_points(level: int) -> int:
    return sum(lv // 5 + 3 for lv in range(2, level + 1))


STAT_COST_TABLE: List[int] = [0] * 121
for _v in range(2, 121):
    STAT_COST_TABLE[_v] = STAT_COST_TABLE[_v - 1] + ((_v - 2) // 10 + 2)


def stat_cost(val: int) -> int:
    return STAT_COST_TABLE[val]


def element_multiplier(atk_elem: str, tgt_elem: str) -> float:
    if atk_elem == "neutral":
        return 1.0
    if {atk_elem, tgt_elem} == {"light", "dark"}:
        return 1.50
    if atk_elem in ("light", "dark") and tgt_elem in ("fire", "water", "wind", "earth"):
        return 1.00
    if atk_elem in ("fire", "water", "wind", "earth") and tgt_elem in ("light", "dark"):
        return 0.75
    cycle = {"wind": "water", "water": "fire", "fire": "earth", "earth": "wind"}
    if cycle.get(atk_elem) == tgt_elem:
        return 1.25
    if cycle.get(tgt_elem) == atk_elem:
        return 0.75
    return 1.00


def gld_vit_multiplier(total_vit: int) -> float:
    if total_vit >= 300:
        return 15.0
    if total_vit >= 200:
        return 10.0
    if total_vit >= 100:
        return 7.0
    return 5.0


# 跨職業被動庫 (含物理、法系、通用)
PASSIVES: Dict[str, dict] = {
    "Close-Combat Mastery": {"atk_pct": 0.60, "aspd_pct": 0.20, "melee_only": True},
    "Vigor": {"hp_to_atk": 0.10},
    "Iron Body": {"vit": 20, "hp_pct": 0.05},
    "Zanshin": {"crit_dmg": 0.30, "agi_to_atk": 0.50},
    "Fatal Sense": {"crit_dmg": 0.20, "aspd_pct": 0.10, "agi_to_atk": 0.55},
    "Twin Strike": {"double_hit_chance": 0.50, "hit": 10, "melee_only": True},
    "Weight Training": {"str": 10, "atk_pct": 0.45, "weight_atk": 45.0},
    "Sacred & Divine": {"def": 20, "mdef": 30, "atk_pct": 0.25, "matk_pct": 0.25},
    "Light & Shadow": {"light_dark_dmg": 0.20, "cd_red": 0.10},
    "Keen Eye": {"dex": 20, "hit_pct": 0.10, "dex_to_atk": 0.45, "hit_to_atk": 0.20},
    "Elemental Quiver": {"coated_dmg": 0.15},
    "Elemental Resonance": {"elem_dmg": 0.10},
    "Mentality": {"int": 20, "sp_pct": 0.10, "sp_to_matk": 0.15, "dex_to_matk": 1.50, "matk_pct": 0.60},
    "Alchemy Mastery": {"matk_pct": 0.50},
    "Feline Reflex": {"aspd_pct": 0.10, "agi_to_matk": 0.40},
}

TWO_PIECE_SETS: Dict[str, dict] = {
    "Armor Breaker": {"phys_pierce": 0.07},
    "Spell Breaker": {"magic_pierce": 0.07},
    "Warlord": {"atk_pct": 0.10},
    "Archmage": {"matk_pct": 0.10},
    "Lucky Star": {"crit": 0.10, "mcrit": 0.10},
    "Executioner": {"crit_dmg": 0.15},
    "Iron Bastion": {"hp": 500, "def": 7, "mdef": 10},
}


# ==============================================================================
# 3. 通用秒傷 (DPS) 評估引擎
# ==============================================================================
def evaluate_dps(
    stats_map: Dict[str, int],
    passive_names: Tuple[str, ...],
    set_combo: Tuple[str, ...],
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
) -> Dict[str, float]:
    # 彙總被動
    p = {k: 0.0 for k in (
        "atk_pct", "matk_pct", "vit", "str", "dex", "int", "hp_pct", "sp_pct",
        "crit_dmg", "agi_to_atk", "hp_to_atk", "dex_to_atk", "hit_to_atk",
        "sp_to_matk", "dex_to_matk", "agi_to_matk", "weight_atk", "def", "mdef",
        "light_dark_dmg", "cd_red", "aspd_pct", "hit", "hit_pct", "coated_dmg",
        "elem_dmg", "double_hit_chance"
    )}
    for pname in passive_names:
        pdata = PASSIVES[pname]
        if pdata.get("melee_only") and not cls.is_melee:
            continue
        for k, v in pdata.items():
            if k in p:
                p[k] += v

    # 彙總套裝
    s = {"phys_pierce": 0.0, "magic_pierce": 0.0, "atk_pct": 0.0, "matk_pct": 0.0,
         "crit": 0.0, "mcrit": 0.0, "crit_dmg": 0.0, "hp": 0.0, "def": 0.0, "mdef": 0.0}
    for sname in set_combo:
        for k, v in TWO_PIECE_SETS[sname].items():
            if k in s:
                s[k] += v

    # 總屬性
    inn = cls.innate_stats
    jb = cls.job_bonuses
    total_vit = stats_map.get("vit", 1) + jb.get("vit", 0) + inn.get("vit", 0) + gear.vit + p["vit"]
    total_str = stats_map.get("str", 1) + jb.get("str", 0) + inn.get("str", 0) + gear.str_v + p["str"]
    total_agi = stats_map.get("agi", 1) + jb.get("agi", 0) + inn.get("agi", 0) + gear.agi
    total_dex = stats_map.get("dex", 1) + jb.get("dex", 0) + inn.get("dex", 0) + gear.dex + p["dex"]
    total_int = stats_map.get("int", 1) + jb.get("int", 0) + inn.get("int", 0) + gear.int_v + p["int"]
    total_luk = stats_map.get("luk", 1) + jb.get("luk", 0) + inn.get("luk", 0) + gear.luk

    # MaxHP / MaxSP
    base_hp = 1200 + cls.level * 45 + total_vit * 55 + gear.flat_hp + s["hp"]
    max_hp = base_hp * (1.0 + inn.get("hp_pct", 0.0) + gear.hp_pct + p["hp_pct"])
    max_sp = (200 + cls.level * 8 + total_int * 15 + gear.flat_sp) * (1.0 + gear.sp_pct + p["sp_pct"])

    # HIT & 命中率
    raw_hit = cls.level + total_dex + (total_luk // 3) + gear.hit + p["hit"]
    total_hit = raw_hit * (1.0 + p["hit_pct"])
    hit_rate = max(0.40, min(1.00, 1.0 + (total_hit - tgt.target_flee) * 0.0025))

    # 總 ATK / MATK
    flat_atk = (
        total_str * 2.4 + gear.flat_atk + max_hp * p["hp_to_atk"]
        + total_agi * p["agi_to_atk"] + total_dex * p["dex_to_atk"]
        + total_hit * p["hit_to_atk"] + p["weight_atk"]
    )
    total_atk = flat_atk * (1.0 + gear.atk_pct + p["atk_pct"] + s["atk_pct"])

    flat_matk = (
        total_int * 2.6 + gear.flat_matk + max_sp * p["sp_to_matk"]
        + total_dex * p["dex_to_matk"] + total_agi * p["agi_to_matk"]
    )
    total_matk = flat_matk * (1.0 + gear.matk_pct + p["matk_pct"] + s["matk_pct"])

    # 暴擊與防禦穿透
    crit_rate = min(1.0, (total_luk / 3.0) * 0.01 + 0.10 + gear.crit + s["crit"])
    mcrit_rate = min(1.0, (total_luk // 3) * 0.01 + gear.mcrit + s["mcrit"])
    crit_dmg_mult = 2.0 + gear.crit_dmg + p["crit_dmg"] + s["crit_dmg"]

    phys_crit_ev = (1.0 - crit_rate) + crit_rate * crit_dmg_mult
    magic_crit_ev = (1.0 - mcrit_rate) + mcrit_rate * crit_dmg_mult

    phys_pierce = gear.phys_pierce + s["phys_pierce"]
    magic_pierce = gear.magic_pierce + s["magic_pierce"]
    phys_def_mult = 1.0 - max(0.0, min(255, tgt.target_def) / 300.0 - phys_pierce)
    magic_def_mult = 1.0 - max(0.0, min(255, tgt.target_mdef) / 300.0 - magic_pierce)

    # 1) 計算普攻 DPS (考慮 ASPD 與 Twin Strike 二連擊)
    aspd = min(193.0, cls.base_aspd + total_agi * 0.25 + p["aspd_pct"] * 25.0)
    aps = 50.0 / max(15.0, (200.0 - aspd))  # 攻速換算每秒攻擊次數模型
    double_mult = 1.0 + p["double_hit_chance"]
    auto_elem = gear.weapon_coating or "neutral"
    auto_elem_mult = element_multiplier(auto_elem, tgt.element)
    if auto_elem in ("light", "dark"):
        auto_elem_mult *= (1.0 + p["light_dark_dmg"])
    if auto_elem != "neutral":
        auto_elem_mult *= (1.0 + p["elem_dmg"])
    if gear.weapon_coating:
        auto_elem_mult *= (1.0 + p["coated_dmg"])

    auto_hit_dmg = (total_atk * cls.auto_atk_scale + max_hp * cls.auto_hp_scale) * auto_elem_mult * hit_rate * phys_crit_ev * phys_def_mult
    auto_dps = auto_hit_dmg * aps * double_mult

    # 2) 計算各主動技能 DPS
    skill_dps_breakdown: Dict[str, float] = {}
    total_skill_dps = 0.0
    cast_factor = max(0.0, 1.0 - total_dex / 150.0) if total_dex < 150 else 0.0

    for sk in cls.skills:
        eff_elem = (gear.weapon_coating or "neutral") if (sk.uses_weapon_coating and sk.element == "neutral") else sk.element
        e_mult = element_multiplier(eff_elem, tgt.element)
        if eff_elem in ("light", "dark"):
            e_mult *= (1.0 + p["light_dark_dmg"])
        if eff_elem != "neutral":
            e_mult *= (1.0 + p["elem_dmg"])
        if sk.uses_weapon_coating and gear.weapon_coating:
            e_mult *= (1.0 + p["coated_dmg"])

        hp_mult = gld_vit_multiplier(int(total_vit)) if sk.vit_tier_hp_scale else sk.hp_scale
        raw_dmg = total_atk * sk.atk_scale + total_matk * sk.matk_scale + max_hp * hp_mult
        if tgt.is_monster:
            raw_dmg *= sk.monster_mult

        h_mult = 1.0 if sk.never_misses else hit_rate
        if sk.dmg_type == "magic":
            c_mult = magic_crit_ev if sk.can_crit else 1.0
            d_mult = magic_def_mult
        else:
            c_mult = phys_crit_ev if sk.can_crit else 1.0
            d_mult = phys_def_mult

        expected_dmg = raw_dmg * e_mult * h_mult * c_mult * d_mult
        base_cd = sk.effective_uptime_cd if sk.effective_uptime_cd is not None else sk.cooldown
        eff_cd = max(0.5, base_cd * (1.0 - p["cd_red"]) + sk.cast_time * cast_factor)
        sk_dps = expected_dmg / eff_cd
        skill_dps_breakdown[sk.name] = sk_dps
        total_skill_dps += sk_dps

    return {
        "total_dps": auto_dps + total_skill_dps,
        "auto_dps": auto_dps,
        "skill_dps": total_skill_dps,
        "total_vit": total_vit,
        "max_hp": max_hp,
        "total_atk": total_atk,
        "total_matk": total_matk,
        "hit_rate": hit_rate,
        "crit_rate": crit_rate,
        "phys_pierce": phys_pierce,
        "magic_pierce": magic_pierce,
        "aps": aps,
    }


# ==============================================================================
# 4. 通用最佳化尋優器
# ==============================================================================
def optimize_build(cls: ClassProfile, gear: GearProfile, tgt: TargetProfile) -> None:
    avail_pts = total_stat_points(cls.level)
    cap = cls.max_stat_cap
    stats_keys = cls.active_stats

    # 篩選與職業相容的被動
    valid_passives = [k for k, v in PASSIVES.items() if not (v.get("melee_only") and not cls.is_melee)]
    passive_combos = list(combinations(valid_passives, 4))
    set_combos = list(combinations_with_replacement(TWO_PIECE_SETS.keys(), 3))

    # 用基準配點快速篩選 Top 6 (被動 × 套裝)
    probe = {k: 91 for k in stats_keys}
    coarse = []
    for p_comb in passive_combos:
        for s_comb in set_combos:
            res = evaluate_dps(probe, p_comb, s_comb, cls, gear, tgt)
            coarse.append((res["total_dps"], p_comb, s_comb))
    coarse.sort(key=lambda x: x[0], reverse=True)

    # 對 Top 6 執行配點爬山尋優
    final = []
    for _, p_comb, s_comb in coarse[:6]:
        # 起始配點均分至預算內
        cur = {k: 1 for k in stats_keys}
        step = 10
        while step >= 1:
            improved = True
            while improved:
                improved = False
                best_k = None
                best_dps = evaluate_dps(cur, p_comb, s_comb, cls, gear, tgt)["total_dps"]
                for k in stats_keys:
                    if cur[k] + step <= cap:
                        cand = dict(cur)
                        cand[k] += step
                        if sum(stat_cost(v) for v in cand.values()) <= avail_pts:
                            d = evaluate_dps(cand, p_comb, s_comb, cls, gear, tgt)["total_dps"]
                            if d > best_dps:
                                best_dps = d
                                best_k = k
                if best_k:
                    cur[best_k] += step
                    improved = True
            step //= 3

        # 單點交換精調 (+1 / -1)
        cur_dps = evaluate_dps(cur, p_comb, s_comb, cls, gear, tgt)["total_dps"]
        swapped = True
        while swapped:
            swapped = False
            for k_up in stats_keys:
                for k_dn in stats_keys:
                    if k_up == k_dn or cur[k_up] + 1 > cap or cur[k_dn] - 1 < 1:
                        continue
                    cand = dict(cur)
                    cand[k_up] += 1
                    cand[k_dn] -= 1
                    if sum(stat_cost(v) for v in cand.values()) <= avail_pts:
                        d = evaluate_dps(cand, p_comb, s_comb, cls, gear, tgt)["total_dps"]
                        if d > cur_dps:
                            cur = cand
                            cur_dps = d
                            swapped = True

        res = evaluate_dps(cur, p_comb, s_comb, cls, gear, tgt)
        final.append((res["total_dps"], cur, p_comb, s_comb, res))

    final.sort(key=lambda x: x[0], reverse=True)
    print(f"\n=== [{cls.name}] Lv.{cls.level} (點數 {avail_pts:,}) | 塗層={gear.weapon_coating} | 目標 DEF={tgt.target_def}, FLEE={tgt.target_flee} ===")
    for i, (dps, st, p_comb, s_comb, r) in enumerate(final[:3], 1):
        used = sum(stat_cost(v) for v in st.values())
        st_str = ", ".join(f"{k.upper()}={v}" for k, v in st.items())
        print(f"#{i} 總DPS: {dps:,.0f} (普攻 {r['auto_dps']:,.0f} + 技能 {r['skill_dps']:,.0f}) | 點數: {used}/{avail_pts}")
        print(f"   配點: {st_str}")
        print(f"   被動: {', '.join(p_comb)}")
        print(f"   套裝: {', '.join(s_comb)}")


# ==============================================================================
# 5. 職業預設範例 (Templar & Mage)
# ==============================================================================
if __name__ == "__main__":
    templar = ClassProfile(
        name="Templar",
        level=150,
        job_bonuses={"vit": 5, "str": 1},
        innate_stats={"vit": 60, "def": 30, "mdef": 30, "hp_pct": 0.10},
        is_melee=True,
        auto_atk_scale=1.55,   # 含 Sacred Guillotine Chain + Colossus Radiant Bash 平均
        auto_hp_scale=0.021,   # 35% * 6% MaxHP
        base_aspd=158.0,
        skills=[
            SkillSpec("Shield Sacrificial Strike", "physical", atk_scale=27.0, hp_scale=0.40,
                      element="neutral", uses_weapon_coating=True, cooldown=4.0, effective_uptime_cd=2.5, never_misses=True),
            SkillSpec("Grand Light Devastation", "physical", atk_scale=10.0, vit_tier_hp_scale=True,
                      element="light", cooldown=12.0, monster_mult=1.50),
        ],
    )

    target_boss = TargetProfile(target_def=255, target_mdef=240, target_flee=500, element="dark", is_monster=True)
    optimize_build(templar, GearProfile(vit=116, weapon_coating="light"), target_boss)
    optimize_build(templar, GearProfile(vit=116, weapon_coating=None), target_boss)