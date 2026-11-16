"""
Lumivara Online — Domain Combat Math & Formulas
Strictly adheres to Lumivara Online Wiki (live JS ground truth) & AGENTS.md specifications.
Pure Python 3 standard library implementation.
"""

import math
from typing import Any, Dict, List, Sequence

# Precompute cumulative stat cost table up to 150 for fast lookup
STAT_COST_TABLE: List[int] = [0] * 151
for _v in range(2, 151):
    STAT_COST_TABLE[_v] = STAT_COST_TABLE[_v - 1] + ((_v - 2) // 10 + 2)

# Wiki ASPD base tables ($n and weapon offset ai)
CLASS_BASE_ASPD: Dict[str, float] = {
    "novice": 148.0,
    "swordman": 150.0,
    "mage": 145.0,
    "archer": 147.0,
    "acolyte": 150.0,
    "merchant": 148.0,
    "thief": 152.0,
    "mamushi": 152.0,
    "nekobaku": 150.0,
    "kensei": 152.0,
    "ironfist": 152.0,
    "necromancer": 148.0,
    "king": 148.0,
    "sinister": 150.0,
    "templar": 148.0,  # Falls back to novice = 148 in Wiki
}

WEAPON_ASPD_OFFSET: Dict[str, float] = {
    "knife": 2.0,
    "dagger_pair": 2.0,
    "kunai": 2.0,
    "flask": 0.0,
    "katana": 1.0,
    "cestus": 1.0,
    "grimoire": -2.0,
    "tablet": -2.0,
    "pistols": 1.0,
    "aegis": -2.0,
    "sword": 0.0,
    "hammer": -2.0,
    "rod": -8.0,
    "staff": -10.0,
    "quarterstaff": -5.0,
    "bow": -4.0,
}

NON_SHIELD_OFFHANDS = frozenset(
    {"none", "orb", "catalyst", "lantern", "shuriken", "saya", "ammo", "quiver"}
)

WEAPON_REFINE_STEPS: List[int] = [2, 2, 2, 2, 3, 3, 3, 4, 4, 5]      # +30 at +10 (1H), +60 (2H)
OFFHAND_REFINE_STEPS: List[int] = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3]     # +17 at +10
ARMOR_HP_REFINE_5_TO_10: List[int] = [10, 20, 30, 40, 50, 60]        # +210 at +10


def total_stat_points(level: int) -> int:
    """
    Total stat points earned from Lv.1 up to `level`:
    sum_{L=2}^{level} (floor(L / 5) + 3)
    Verified checkpoints:
      Lv.118 = 1,708 | Lv.121 = 1,788 | Lv.130 = 2,038 | Lv.140 = 2,335 | Lv.150 = 2,652
    """
    if level <= 1:
        return 0
    return sum(lv // 5 + 3 for lv in range(2, level + 1))


def stat_step_cost(cur_val: int) -> int:
    """
    Cost to raise a single base stat from `cur_val` to `cur_val + 1`:
    floor((cur_val - 1) / 10) + 2
    """
    if cur_val < 1:
        return 2
    return (cur_val - 1) // 10 + 2


def stat_cost(val: int) -> int:
    """
    Cumulative stat points required to raise a stat from 1 to `val`.
    Verified checkpoints:
      1->81 = 440 | 1->91 = 540 | 1->101 = 650 | 1->111 = 770 | 1->119 = 874
    """
    if val <= 1:
        return 0
    if val < len(STAT_COST_TABLE):
        return STAT_COST_TABLE[val]
    cost = STAT_COST_TABLE[-1]
    for v in range(len(STAT_COST_TABLE), val + 1):
        cost += (v - 2) // 10 + 2
    return cost


def max_stat_cap_for_level(level: int) -> int:
    """
    Standard base stat cap is 99; unlocks to 119 at Lv.119+.
    """
    return 119 if level >= 119 else 99


# ==============================================================================
# ASPD Formula (Completely distinct from HIT!)
# ==============================================================================
def calc_aspd_details(
    job_id: str,
    weapon_type: str,
    total_agi: float,
    total_dex: float,
    aspd_pct: float = 0.0,
    flat_gear_set_potion_aspd: float = 0.0,
    card_aspd_values: Sequence[float] = (),
    has_actual_shield: bool = False,
) -> Dict[str, Any]:
    """
    Exact Lumivara Online Wiki ASPD formula:
      baseAspd = classBase + weaponOffset - (8 if hasActualShield else 0)
      factor = 1 - (baseAspd - 144) / 50
      raw = baseAspd + (max(0, total.agi) * 0.3 + max(0, total.dex) * 0.02) * factor
      withPct = raw + max(0, 200 - raw) * aspdPercent
      flatSum = withPct + flatGearSetPotionAspd + max(cardAspdValues, default=0)  [cards do NOT stack ASPD!]
      softCap = flatSum <= 180 ? flatSum : 180 + (flatSum - 180) * 0.5
      finalAspd = min(193, max(50, round(softCap * 10) / 10))
      attackIntervalMs = round((200 - finalAspd) * 20)
      attacksPerSecond = 1000 / attackIntervalMs
      highAspdBasicBonus = 1 + max(0, finalAspd - 170) * 0.015
    """
    class_base = CLASS_BASE_ASPD.get((job_id or "novice").lower(), 148.0)
    weapon_offset = WEAPON_ASPD_OFFSET.get((weapon_type or "sword").lower(), 0.0)
    shield_pen = 8.0 if has_actual_shield else 0.0
    base_aspd = class_base + weapon_offset - shield_pen

    factor = 1.0 - (base_aspd - 144.0) / 50.0
    raw = base_aspd + (max(0.0, float(total_agi)) * 0.3 + max(0.0, float(total_dex)) * 0.02) * factor
    with_pct = raw + max(0.0, 200.0 - raw) * max(0.0, float(aspd_pct))

    max_card_aspd = max((float(v) for v in card_aspd_values if v > 0), default=0.0)
    flat_sum = with_pct + float(flat_gear_set_potion_aspd) + max_card_aspd

    soft_capped = flat_sum if flat_sum <= 180.0 else 180.0 + (flat_sum - 180.0) * 0.5
    final_aspd = min(193.0, max(50.0, round(soft_capped * 10.0) / 10.0))

    attack_interval_ms = max(140, int(round((200.0 - final_aspd) * 20.0)))
    attacks_per_sec = 1000.0 / float(attack_interval_ms)
    high_aspd_basic_bonus = 1.0 + max(0.0, final_aspd - 170.0) * 0.015

    return {
        "class_base_aspd": class_base,
        "weapon_aspd_offset": weapon_offset,
        "shield_penalty": -shield_pen,
        "base_aspd": round(base_aspd, 2),
        "agi_dex_factor": round(factor, 4),
        "raw_aspd": round(raw, 2),
        "with_pct_aspd": round(with_pct, 2),
        "max_card_aspd": max_card_aspd,
        "flat_sum_aspd": round(flat_sum, 2),
        "soft_capped_aspd": round(soft_capped, 2),
        "aspd": final_aspd,
        "attack_interval_ms": attack_interval_ms,
        "attacks_per_sec": round(attacks_per_sec, 3),
        "high_aspd_basic_bonus": round(high_aspd_basic_bonus, 4),
    }


def calc_aspd(
    job_id: str,
    weapon_type: str,
    total_agi: float,
    total_dex: float,
    aspd_pct: float = 0.0,
    flat_gear_set_potion_aspd: float = 0.0,
    card_aspd_values: Sequence[float] = (),
    has_actual_shield: bool = False,
) -> float:
    """Returns final ASPD (softcap >180 at 0.5x, hardcap 193)."""
    return float(
        calc_aspd_details(
            job_id=job_id,
            weapon_type=weapon_type,
            total_agi=total_agi,
            total_dex=total_dex,
            aspd_pct=aspd_pct,
            flat_gear_set_potion_aspd=flat_gear_set_potion_aspd,
            card_aspd_values=card_aspd_values,
            has_actual_shield=has_actual_shield,
        )["aspd"]
    )


def calc_attacks_per_sec(aspd: float) -> float:
    """Wiki interval formula: attackIntervalMs = round((200 - aspd) * 20); APS = 1000 / intervalMs."""
    clamped = min(193.0, max(50.0, float(aspd)))
    interval_ms = max(140, int(round((200.0 - clamped) * 20.0)))
    return 1000.0 / float(interval_ms)


def calc_high_aspd_basic_bonus(aspd: float) -> float:
    """Wiki basic attack bonus above 170 ASPD: 1 + max(0, aspd - 170) * 0.015."""
    return 1.0 + max(0.0, float(aspd) - 170.0) * 0.015


# ==============================================================================
# HIT, FLEE & Hit Chance Formulas (Completely distinct from ASPD!)
# ==============================================================================
def calc_hit(
    level: int,
    total_dex: float,
    total_luk: float,
    flat_passive_hit: float = 0.0,
    gear_card_set_hit: float = 0.0,
    passive_hit_pct: float = 0.0,
    has_quake_card: bool = False,
) -> int:
    """
    Exact Wiki Player HIT formula:
      HIT = floor((100 + level + total.dex * 2 + floor(total.luk / 3) + passive.hit + gearCardSet.hit) * (1 + passive.hitPct) * (mQuake ? 0.85 : 1))
    """
    base = 100.0 + int(level) + float(total_dex) * 2.0 + math.floor(float(total_luk) / 3.0)
    raw = base + float(flat_passive_hit) + float(gear_card_set_hit)
    mult = (1.0 + max(0.0, float(passive_hit_pct))) * (0.85 if has_quake_card else 1.0)
    return int(math.floor(raw * mult))


def calc_flee(
    level: int,
    total_agi: float,
    total_luk: float,
    gear_card_set_flee: float = 0.0,
    passive_flee_pct: float = 0.0,
    buff_flee_pct: float = 0.0,
    buff_flee: float = 0.0,
) -> int:
    """
    Exact Wiki Player FLEE formula:
      FLEE = floor((level + total.agi * 2 + floor(total.luk / 5) + gearCardSet.flee) * (1 + passive.fleePct + buff.fleePct)) + buff.flee
    """
    raw = int(level) + float(total_agi) * 2.0 + math.floor(float(total_luk) / 5.0) + float(gear_card_set_flee)
    mult = 1.0 + max(0.0, float(passive_flee_pct) + float(buff_flee_pct))
    return int(math.floor(raw * mult)) + int(buff_flee)


def calc_hit_chance(total_hit: float, target_flee: int, never_misses: bool = False) -> float:
    """
    HitChance = clamp(1.0 + (HIT - FLEE) * 0.0025, 0.40, 1.00)
    Returns 1.0 if `never_misses` is True.
    """
    if never_misses:
        return 1.0
    return max(0.40, min(1.00, 1.0 + (float(total_hit) - float(target_flee)) * 0.0025))


# ==============================================================================
# DEF, MDEF, Pierce & Damage Mitigation
# ==============================================================================
def calc_player_def(
    gear_def: int,
    total_vit: int,
    passive_def: int = 0,
    buff_def: int = 0,
    buff_def_pct: float = 0.0,
) -> int:
    """
    Player DEF = min(255, floor((floor(VIT / 15) + Gear & Refine DEF + Passive DEF + Buff DEF) * (1 + buff_def_pct))).
    """
    raw = (max(0, int(total_vit)) // 15) + int(gear_def) + int(passive_def) + int(buff_def)
    return min(255, max(0, int(math.floor(raw * (1.0 + max(0.0, buff_def_pct))))))


def calc_player_mdef(
    gear_mdef: int,
    total_int: int,
    passive_mdef: int = 0,
    buff_mdef: int = 0,
    buff_mdef_pct: float = 0.0,
) -> int:
    """
    Player MDEF = min(255, floor((floor(INT / 10) + Gear & Refine MDEF + Passive MDEF + Buff MDEF) * (1 + buff_mdef_pct))).
    """
    raw = (max(0, int(total_int)) // 10) + int(gear_mdef) + int(passive_mdef) + int(buff_mdef)
    return min(255, max(0, int(math.floor(raw * (1.0 + max(0.0, buff_mdef_pct))))))


def calc_def_reduction(def_or_mdef: int) -> float:
    """
    Damage reduction from DEF or MDEF = min(255, max(0, DEF)) / 300.0 (max 85%).
    """
    return min(255, max(0, int(def_or_mdef))) / 300.0


def calc_damage_after_def(raw_dmg: float, target_def_or_mdef: int, pierce: float) -> float:
    """
    Final Damage = Raw Damage * (1 - max(0, min(255, DEF)/300 - clamp(Pierce, 0, 1)))
    Crits do NOT bypass DEF/MDEF; pierce exceeding target DR (max 85%) gives no bonus damage.
    """
    dr = calc_def_reduction(target_def_or_mdef)
    clamped_pierce = min(1.0, max(0.0, float(pierce)))
    eff_dr = max(0.0, dr - clamped_pierce)
    return raw_dmg * (1.0 - eff_dr)


# ==============================================================================
# ATK, MATK, CRIT, MaxHP & MaxSP
# ==============================================================================
def calc_phys_crit_rate(
    level: int,
    total_luk: float,
    gear_card_set_crit_pct: float = 0.0,
    passive_crit_pct: float = 0.0,
    buff_crit_pct: float = 0.0,
    is_thief_knife: bool = False,
) -> float:
    """
    Wiki Physical CRIT% (returned as 0.0..1.0):
      min(100, (floor(LUK/3) + (Lv-1)*0.1 + gearCardSetCrit + passiveCrit + buffCrit) * (2 if Thief + knife/dagger_pair else 1)) / 100
    """
    base = math.floor(max(0.0, float(total_luk)) / 3.0) + max(0, int(level) - 1) * 0.1
    pct = (base + float(gear_card_set_crit_pct) + float(passive_crit_pct) + float(buff_crit_pct)) * (
        2.0 if is_thief_knife else 1.0
    )
    return min(1.0, max(0.0, pct / 100.0))


def calc_spell_crit_rate(
    total_luk: float,
    gear_card_set_mcrit_pct: float = 0.0,
    buff_crit_pct: float = 0.0,
    buff_mcrit_pct: float = 0.0,
) -> float:
    """
    Wiki Spell CRIT% (returned as 0.0..1.0):
      min(100, floor(LUK/3) + gearCardSetMCrit + buffCrit + buffMCrit) / 100
    """
    pct = math.floor(max(0.0, float(total_luk)) / 3.0) + float(gear_card_set_mcrit_pct) + float(buff_crit_pct) + float(buff_mcrit_pct)
    return min(1.0, max(0.0, pct / 100.0))


def calc_crit_multiplier(crit_dmg_bonus_pct: float = 0.0) -> float:
    """
    Wiki Crit Multiplier:
      2 * (1 + passive.critDamagePct + buff.critDamage + gearCardSet.critDmg / 100)
    where `crit_dmg_bonus_pct` is expressed as a decimal fraction (e.g. 0.30 for +30% crit damage -> 2.60x).
    """
    return 2.0 * (1.0 + max(0.0, float(crit_dmg_bonus_pct)))


def calc_body_hp(
    level: int,
    total_vit: float,
    job_hp_pct: float = 0.0,
    gear_card_set_hp: float = 0.0,
    passive_hp_pct: float = 0.0,
    aegis_hp_pct: float = 0.0,
    buff_hp_pct: float = 0.0,
    overcharge_hp: float = 0.0,
) -> float:
    """
    Wiki pre-VIT-rebalance BodyHP formula used for HP->ATK conversion (e.g. Vigor / hprecovery):
      body_hp = floor((floor((100 + (level - 1) * 5 + total.vit * 10) * (1 + job_hp_pct)) + gearCardSet.hp + overchargeHp) * (1 + passive.maxHpPct + aegisHpPct + buffHpPct))
    """
    base_core = math.floor((100.0 + max(0, int(level) - 1) * 5.0 + float(total_vit) * 10.0) * (1.0 + float(job_hp_pct)))
    return float(
        math.floor(
            (base_core + float(gear_card_set_hp) + float(overcharge_hp))
            * (1.0 + float(passive_hp_pct) + float(aegis_hp_pct) + float(buff_hp_pct))
        )
    )


def calc_max_hp(
    level: int,
    base_vit: int,
    total_vit: float,
    job_hp_pct: float = 0.0,
    gear_card_set_hp: float = 0.0,
    passive_hp_pct: float = 0.0,
    aegis_hp_pct: float = 0.0,
    buff_hp_pct: float = 0.0,
    overcharge_hp: float = 0.0,
    is_pvp: bool = False,
    has_naga_card: bool = False,
) -> float:
    """
    Exact Wiki MaxHP formula including Nov 13 VIT rebalance:
      body_hp = calc_body_hp(...)
      vit_rebalance_refund = max(0, base.vit - 1) * max(0, 30 - 10 * (1 + job_hp_pct))
      vit_hp_mult (PvE) = 1 + total.vit * 0.006 if <= 100 else 1.6 + (total.vit - 100) * 0.002
      vit_hp_mult (PvP) = 1 + total.vit * 0.003 if <= 100 else 1.3 + (total.vit - 100) * 0.001
      max_hp = floor((body_hp + vit_rebalance_refund) * vit_hp_mult * (1.07 if has_naga_card else 1.0))
    """
    body_hp = calc_body_hp(
        level=level,
        total_vit=total_vit,
        job_hp_pct=job_hp_pct,
        gear_card_set_hp=gear_card_set_hp,
        passive_hp_pct=passive_hp_pct,
        aegis_hp_pct=aegis_hp_pct,
        buff_hp_pct=buff_hp_pct,
        overcharge_hp=overcharge_hp,
    )
    refund = max(0, int(base_vit) - 1) * max(0.0, 30.0 - 10.0 * (1.0 + float(job_hp_pct)))
    tv = max(0.0, float(total_vit))
    if is_pvp:
        vit_mult = 1.0 + tv * 0.003 if tv <= 100.0 else 1.3 + (tv - 100.0) * 0.001
    else:
        vit_mult = 1.0 + tv * 0.006 if tv <= 100.0 else 1.6 + (tv - 100.0) * 0.002
    naga_mult = 1.07 if has_naga_card else 1.0
    return float(math.floor((body_hp + refund) * vit_mult * naga_mult))


def calc_max_sp(
    level: int,
    total_int: float,
    job_sp_pct: float = 0.0,
    gear_card_set_sp: float = 0.0,
    passive_sp_pct: float = 0.0,
) -> float:
    """
    Exact Wiki MaxSP formula:
      floor((floor((20 + (level - 1) + total.int * 5) * (1 + job_sp_pct)) + gearCardSet.sp) * (1 + passive.maxSpPct))
    """
    base_core = math.floor((20.0 + max(0, int(level) - 1) + float(total_int) * 5.0) * (1.0 + float(job_sp_pct)))
    return float(math.floor((base_core + float(gear_card_set_sp)) * (1.0 + float(passive_sp_pct))))


def calc_total_atk(
    level: int,
    total_str: float,
    total_dex: float,
    total_luk: float,
    total_agi: float,
    body_hp: float,
    player_hit: float,
    gear_card_set_atk: float,
    total_atk_pct: float,
    is_ranged_dex_atk: bool = False,
    hp_to_atk: float = 0.0,
    hit_to_atk: float = 0.0,
    dex_to_atk: float = 0.0,
    agi_to_atk: float = 0.0,
    weight_atk: float = 0.0,
    ironclad_atk: float = 0.0,
    ammo_mult: float = 1.0,
) -> float:
    """
    Exact Wiki ATK formula:
      atk_stat_scale = total.dex * 3 + floor(total.str / 5) if ranged else total.str * 3 + floor(total.dex / 5)
      atk_base = (10 + atk_stat_scale + floor(total.luk / 10) + (level - 1) * 0.3) * F
                 + floor(bodyHp * hp_to_atk + hit * hit_to_atk + dex * dex_to_atk + agi * agi_to_atk + weight_atk)
      atk_final = (atk_base + ironclad_atk + gearCardSet.atk * F) * (1 + total_atk_pct)
    """
    if is_ranged_dex_atk:
        stat_scale = float(total_dex) * 3.0 + math.floor(float(total_str) / 5.0)
    else:
        stat_scale = float(total_str) * 3.0 + math.floor(float(total_dex) / 5.0)

    passive_conv = math.floor(
        float(body_hp) * float(hp_to_atk)
        + float(player_hit) * float(hit_to_atk)
        + float(total_dex) * float(dex_to_atk)
        + float(total_agi) * float(agi_to_atk)
        + float(weight_atk)
    )
    atk_base = (10.0 + stat_scale + math.floor(float(total_luk) / 10.0) + max(0, int(level) - 1) * 0.3) * float(ammo_mult) + passive_conv
    return (atk_base + float(ironclad_atk) + float(gear_card_set_atk) * float(ammo_mult)) * (1.0 + max(0.0, float(total_atk_pct)))


def calc_total_matk(
    level: int,
    total_int: float,
    total_dex: float,
    total_agi: float,
    max_sp: float,
    gear_card_set_matk: float,
    total_matk_pct: float,
    sp_to_matk: float = 0.0,
    dex_to_matk: float = 0.0,
    agi_to_matk: float = 0.0,
    matk_coeff: float = 1.0,
) -> float:
    """
    Exact Wiki MATK formula:
      matk_base = (5 + total.int * 3 + floor(total.dex / 5) + (level - 1) * 0.3) * ca
                  + floor(maxSp * sp_to_matk + total.dex * dex_to_matk + total.agi * agi_to_matk)
      matk_final = (matk_base + gearCardSet.matk * ca) * (1 + total_matk_pct)
    """
    passive_conv = math.floor(
        float(max_sp) * float(sp_to_matk)
        + float(total_dex) * float(dex_to_matk)
        + float(total_agi) * float(agi_to_matk)
    )
    matk_base = (5.0 + float(total_int) * 3.0 + math.floor(float(total_dex) / 5.0) + max(0, int(level) - 1) * 0.3) * float(matk_coeff) + passive_conv
    return (matk_base + float(gear_card_set_matk) * float(matk_coeff)) * (1.0 + max(0.0, float(total_matk_pct)))


# ==============================================================================
# Elements, GLD VIT Tiers, Cast Time & Refine
# ==============================================================================
def element_multiplier(atk_elem: str, tgt_elem: str, has_eclipse_card: bool = False) -> float:
    """
    Elemental affinity multiplier:
      - Four-element cycle (Wind -> Water -> Fire -> Earth -> Wind): 1.25x advantage, 0.75x disadvantage
      - Light <-> Dark mutual counter: 1.50x
      - Four elements vs Light/Dark: 0.75x
      - Light/Dark vs Four elements: 1.00x
      - Neutral or same element: 1.00x
      - Eclipse Warlord Card (`has_eclipse_card`): min 1.00x, max 1.15x
    """
    atk = (atk_elem or "neutral").lower()
    tgt = (tgt_elem or "neutral").lower()
    mult = 1.00
    if atk == "neutral" or tgt == "neutral" or atk == tgt:
        mult = 1.00
    elif {atk, tgt} == {"light", "dark"}:
        mult = 1.50
    elif atk in ("light", "dark") and tgt in ("fire", "water", "wind", "earth"):
        mult = 1.00
    elif atk in ("fire", "water", "wind", "earth") and tgt in ("light", "dark"):
        mult = 0.75
    else:
        cycle = {"wind": "water", "water": "fire", "fire": "earth", "earth": "wind"}
        if cycle.get(atk) == tgt:
            mult = 1.25
        elif cycle.get(tgt) == atk:
            mult = 0.75

    if has_eclipse_card:
        mult = min(1.15, max(1.00, mult))
    return mult


def gld_vit_multiplier(total_vit: int, skill_level: int = 10) -> float:
    """
    Templar's Grand Light Devastation MaxHP multiplier tiers by total VIT:
      - Lv.10 (default): <100 -> 10.0x, 100-199 -> 15.0x, 200-299 -> 20.0x, >=300 -> 25.0x
      - Lv.1:            <100 ->  5.0x, 100-199 ->  7.0x, 200-299 -> 10.0x, >=300 -> 15.0x
    """
    v = int(total_vit)
    if skill_level <= 1:
        if v >= 300:
            return 15.0
        if v >= 200:
            return 10.0
        if v >= 100:
            return 7.0
        return 5.0
    if v >= 300:
        return 25.0
    if v >= 200:
        return 20.0
    if v >= 100:
        return 15.0
    return 10.0


def calc_skill_cycle_time(
    base_cd: float,
    base_cast: float,
    total_dex: int,
    cd_red: float,
    aspd_scaling_type: str = "fixed_cooldown",
    attack_interval_ms: int = 200,
    multi_hit_spells: bool = False,
    fixed_cast: float = 0.0,
    cast_reduce_pct: float = 0.0,
) -> float:
    """
    Computes effective skill cycle time considering Wiki ASPD scaling modes:
      - `cooldown_from_aspd`: skill CD equals attack interval (`attack_interval_ms / 1000`)
      - `aspd_floor`: skill CD is floored by attack interval (`max(base_cd_after_cdr, interval_sec)`)
      - `fixed_cooldown` / `multi_hit_cast_dex_over_150`: uses `calc_cast_and_cd`
    """
    atk_sec = max(0.14, float(attack_interval_ms) / 1000.0)
    mode = (aspd_scaling_type or "fixed_cooldown").lower()
    if mode == "cooldown_from_aspd":
        cast_factor = max(0.0, 1.0 - float(total_dex) / 150.0) if total_dex < 150 else 0.0
        cast_cut = max(0.0, 1.0 - min(1.0, max(0.0, float(cast_reduce_pct))))
        eff_cast = float(base_cast) * cast_factor * cast_cut + max(0.0, float(fixed_cast))
        return max(0.14, atk_sec + eff_cast)
    cycle = calc_cast_and_cd(
        base_cd=base_cd,
        base_cast=base_cast,
        total_dex=total_dex,
        cd_red=cd_red,
        multi_hit_spells=multi_hit_spells or mode == "multi_hit_cast_dex_over_150",
        fixed_cast=fixed_cast,
        cast_reduce_pct=cast_reduce_pct,
    )
    if mode == "aspd_floor":
        return max(atk_sec, cycle)
    return cycle


def calc_vit_vs_flat_hp_delta(
    level: int,
    base_vit: int,
    total_vit: float,
    job_hp_pct: float = 0.0,
    gear_card_set_hp: float = 0.0,
    passive_hp_pct: float = 0.0,
    aegis_hp_pct: float = 0.0,
    is_pvp: bool = False,
    has_naga_card: bool = False,
    vit_delta: int = 12,
    flat_hp_delta: float = 180.0,
) -> Dict[str, Any]:
    """
    Quantifies MaxHP & DEF gain of `+12 VIT` (Tier VI primary roll) vs `+180 Flat HP`
    (Tier VI Blood special affix) under the Nov 13 VIT rebalance formula.
    """
    hp_base = calc_max_hp(
        level, base_vit, total_vit, job_hp_pct, gear_card_set_hp,
        passive_hp_pct, aegis_hp_pct, is_pvp=is_pvp, has_naga_card=has_naga_card,
    )
    hp_plus_vit = calc_max_hp(
        level, base_vit, total_vit + vit_delta, job_hp_pct, gear_card_set_hp,
        passive_hp_pct, aegis_hp_pct, is_pvp=is_pvp, has_naga_card=has_naga_card,
    )
    hp_plus_flat = calc_max_hp(
        level, base_vit, total_vit, job_hp_pct, gear_card_set_hp + flat_hp_delta,
        passive_hp_pct, aegis_hp_pct, is_pvp=is_pvp, has_naga_card=has_naga_card,
    )
    vit_hp_gain = round(hp_plus_vit - hp_base, 1)
    flat_hp_gain = round(hp_plus_flat - hp_base, 1)
    return {
        "vit_delta": vit_delta,
        "flat_hp_delta": flat_hp_delta,
        "vit_hp_gain": vit_hp_gain,
        "flat_hp_gain": flat_hp_gain,
        "vit_hp_ratio": round(vit_hp_gain / max(1.0, flat_hp_gain), 2),
        "vit_def_gain": int((total_vit + vit_delta) // 15) - int(total_vit // 15),
    }


def calc_cast_and_cd(
    base_cd: float,
    base_cast: float,
    total_dex: int,
    cd_red: float,
    multi_hit_spells: bool = False,
    fixed_cast: float = 0.0,
    cast_reduce_pct: float = 0.0,
) -> float:
    """
    Computes effective skill cycle time (cooldown + cast time) considering:
      - Cooldown reduction (`cd_red`)
      - Instant variable cast at total DEX >= 150 (`variable_cast = 0`), plus optional `cast_reduce_pct`
      - Fixed cast time (e.g. Crossfire 0.2s)
      - Multi-hit spell cast acceleration above DEX 150: 0.6% per point above 150,
        capped at DEX 250 (max 60% acceleration).
    """
    cast_factor = max(0.0, 1.0 - float(total_dex) / 150.0) if total_dex < 150 else 0.0
    cast_cut = max(0.0, 1.0 - min(1.0, max(0.0, float(cast_reduce_pct))))
    eff_cast = float(base_cast) * cast_factor * cast_cut + max(0.0, float(fixed_cast))
    eff_cd = float(base_cd) * (1.0 - min(0.80, max(0.0, float(cd_red)))) + eff_cast

    if multi_hit_spells and total_dex > 150:
        over_dex = min(100, int(total_dex) - 150)
        accel_bonus = over_dex * 0.006  # up to 0.60 (60%)
        eff_cd = eff_cd * (1.0 - accel_bonus * 0.35)

    return max(0.5, eff_cd)


def calc_refine_pierce(refine_lv: int, is_two_handed: bool = False) -> float:
    """
    Refine pierce bonus: starts at +6 (+1% per level from +6 to +10 -> max +5% for 1H/offhand).
    Two-handed weapons grant 2x refine pierce bonus (up to +10% at +10).
    """
    lv = min(10, max(0, int(refine_lv)))
    if lv <= 5:
        return 0.0
    base_pierce = (lv - 5) * 0.01
    return base_pierce * (2.0 if is_two_handed else 1.0)


def calc_refine_atk_matk(refine_lv: int, is_two_handed: bool = False, is_offhand: bool = False) -> int:
    """
    Wiki weapon/offhand refine ATK/MATK gain:
      - 1H Weapon: +2/+2/+2/+2/+3/+3/+3/+4/+4/+5 (+30 at +10)
      - 2H Weapon: 2x (+60 at +10)
      - Non-shield Offhand: +1/+1/+1/+1/+2/+2/+2/+2/+2/+3 (+17 at +10)
    """
    lv = min(10, max(0, int(refine_lv)))
    if lv == 0:
        return 0
    if is_offhand:
        return sum(OFFHAND_REFINE_STEPS[:lv])
    gain = sum(WEAPON_REFINE_STEPS[:lv])
    return gain * (2 if is_two_handed else 1)


def calc_refine_armor_hp(refine_lv: int) -> int:
    """Wiki armor/head/shield/garment/shoes HP gain from +5..+10 (+210 total at +10)."""
    lv = min(10, max(0, int(refine_lv)))
    if lv < 5:
        return 0
    return sum(ARMOR_HP_REFINE_5_TO_10[: lv - 4])
