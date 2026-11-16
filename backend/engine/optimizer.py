"""
Lumivara Online — Multi-Stage Build & DPS Optimizer Engine.

Uses 100% live Wiki combat formulas (`combat_math.py`) and live Wiki / SQLite
ground-truth catalogs (`job_specs.py` / `build_runtime_catalog`), covering:
- Separated HIT vs ASPD calculation & metrics
- All 15 jobs, 56 cross-class passives (4/4 slot cap), 11 armor sets (2pc/4pc/6pc)
- 102 cards with 2H weapon 2-card-slot & non-stacking ASPD rules
- Per-slot Wiki Tier VI Gear Affix & Substat recommendations (`gear_affix_recommendations`)
"""

from collections import Counter
from dataclasses import replace
from itertools import combinations, combinations_with_replacement
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from .combat_math import (
    NON_SHIELD_OFFHANDS,
    calc_aspd_details,
    calc_cast_and_cd,
    calc_crit_multiplier,
    calc_damage_after_def,
    calc_def_reduction,
    calc_flee,
    calc_high_aspd_basic_bonus,
    calc_body_hp,
    calc_hit,
    calc_hit_chance,
    calc_max_hp,
    calc_max_sp,
    calc_phys_crit_rate,
    calc_player_def,
    calc_player_mdef,
    calc_refine_pierce,
    calc_skill_cycle_time,
    calc_spell_crit_rate,
    calc_total_atk,
    calc_total_matk,
    calc_vit_vs_flat_hp_delta,
    element_multiplier,
    gld_vit_multiplier,
    max_stat_cap_for_level,
    stat_cost,
    stat_step_cost,
    total_stat_points,
)
from .job_specs import (
    ARMOR_SETS,
    CARDS,
    JOB_REGISTRY,
    MONSTER_PRESETS,
    PASSIVES,
    TWO_PIECE_SETS,
    build_runtime_catalog,
    get_default_gear_for_job,
)
from .models import CardSpec, ClassProfile, GearProfile, SkillSpec, TargetProfile

ALL_STATS = ("str", "agi", "vit", "int", "dex", "luk")

# Wiki Equipment Affix Pools & Tier VI Values (matching data/wiki_ground_truth.json)
_AFFIX_PREFIXES: Dict[str, str] = {
    "moveSpeed": "Spin",
    "freezeHit": "Frozen",
    "stunHit": "Shocking",
    "pierce": "Piercing",
    "mpierce": "Runic",
    "critDmg": "Lethal",
    "atkPct": "Savage",
    "matkPct": "Occult",
    "bleedHit": "Rending",
    "crushHit": "Crushing",
    "resStun": "Steadfast",
    "resFreeze": "Thawing",
    "resBleed": "Ironhide",
    "spRegen": "Serene",
    "hpRegen": "Vital",
    "hp": "Blood",
}

_AFFIX_DISPLAY: Dict[str, Tuple[str, str]] = {
    "pierce": ("Physical Pierce", "+6% P.Pierce (Tier VI)"),
    "mpierce": ("Magic Pierce", "+6% M.Pierce (Tier VI)"),
    "atkPct": ("ATK%", "+12% ATK (Tier VI)"),
    "matkPct": ("MATK%", "+12% MATK (Tier VI)"),
    "critDmg": ("Crit Damage%", "+12% Crit Dmg (Tier VI)"),
    "bleedHit": ("Bleed Chance", "+7% Bleed on Hit (Tier VI)"),
    "crushHit": ("Crush Chance", "+6% Crush on Hit (Tier VI)"),
    "freezeHit": ("Freeze Chance", "+6% Freeze on Hit (Tier VI)"),
    "hp": ("Flat MaxHP", "+180 MaxHP (Tier VI)"),
    "resStun": ("Stun Resist", "+6% Stun Resist (Tier VI)"),
    "resFreeze": ("Freeze Resist", "+6% Freeze Resist (Tier VI)"),
    "resBleed": ("Bleed Resist", "+6% Bleed Resist (Tier VI)"),
    "moveSpeed": ("Move Speed", "+7% Move Speed (Tier VI)"),
    "spRegen": ("SP Regen", "+7 SP Regen (Tier VI)"),
    "hpRegen": ("HP Regen", "+7 HP Regen (Tier VI)"),
}

_NON_DPS_AFFIXES = {"resStun", "resFreeze", "resBleed", "hpRegen", "spRegen", "moveSpeed", "hp"}
_OFFENSIVE_AFFIXES = {"pierce", "mpierce", "atkPct", "matkPct", "critDmg", "bleedHit", "crushHit", "freezeHit"}

_SLOT_AFFIX_POOLS: Dict[str, List[str]] = {
    "sword_melee": ["pierce", "atkPct", "critDmg", "bleedHit", "crushHit"],
    "sword_caster": ["mpierce", "matkPct", "critDmg", "freezeHit", "spRegen"],
    "shield_actual": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "shield_orb": ["matkPct", "mpierce", "critDmg", "spRegen", "freezeHit"],
    "shield_shuriken": ["atkPct", "pierce", "critDmg", "bleedHit", "crushHit"],
    "shield_saya": ["atkPct", "pierce", "critDmg", "bleedHit", "crushHit"],
    "ammo": ["pierce", "atkPct", "critDmg", "bleedHit", "crushHit"],
    "head": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "face": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "mouth": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "armor": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "garment": ["resBleed", "resStun", "resFreeze", "hp", "spRegen"],
    "shoes": ["moveSpeed", "resBleed", "resStun", "resFreeze", "spRegen"],
    "accessory1": ["atkPct", "pierce", "critDmg", "spRegen", "hpRegen"],
    "accessory2": ["matkPct", "mpierce", "critDmg", "spRegen", "hpRegen"],
}


def _slot_matches_card(card: CardSpec, equip_slot: str) -> bool:
    """Checks if `card.slots` can be socketed into `equip_slot`."""
    slot_tags = {s.lower() for s in (card.slots or (card.slot,))}
    if "all" in slot_tags:
        return True
    if equip_slot in ("weapon_1", "weapon_2"):
        return bool(slot_tags & {"sword", "weapon"})
    if equip_slot == "shield":
        return bool(slot_tags & {"shield", "offhand"})
    if equip_slot == "head_upper":
        return bool(slot_tags & {"head", "headgear", "head_upper"})
    if equip_slot == "head_mid":
        return bool(slot_tags & {"face", "headgear", "head", "head_mid"})
    if equip_slot == "head_lower":
        return bool(slot_tags & {"mouth", "headgear", "head", "head_lower"})
    if equip_slot == "body":
        return bool(slot_tags & {"armor", "body"})
    if equip_slot == "garment":
        return "garment" in slot_tags
    if equip_slot == "shoes":
        return "shoes" in slot_tags
    if equip_slot in ("accessory_1", "accessory_2"):
        return "accessory" in slot_tags
    return False


def _is_passive_compatible(
    p_data: Dict[str, Any],
    cls: ClassProfile,
    stats_map: Optional[Dict[str, int]] = None,
) -> bool:
    """Checks weapon, range, and job condition gating for a cross-class passive."""
    if p_data.get("melee_only") and not cls.is_melee:
        return False
    if p_data.get("ranged_only") and cls.is_melee:
        return False
    if p_data.get("katana_only") and cls.weapon_type != "katana":
        return False
    if p_data.get("kunai_only") and cls.weapon_type != "kunai":
        return False
    if p_data.get("cestus_only") and cls.weapon_type != "cestus":
        return False
    if p_data.get("aegis_only") and cls.weapon_type != "aegis":
        return False
    if p_data.get("str_eq_int_only"):
        if cls.job_id == "king":
            return True
        if stats_map is not None:
            return stats_map.get("str", 1) == stats_map.get("int", 1) and stats_map.get("str", 1) >= 20
        return False
    if p_data.get("vs_poison_crit_dmg") or p_data.get("vs_poison_pierce") or p_data.get("vs_poisoned_phys_pct"):
        # Only jobs that reliably inflict poison (e.g. Mamushi) trigger vs-poison passives
        if cls.job_id != "mamushi":
            return False
    return True


def _apply_bonus_dict(
    acc: Dict[str, float],
    bonus: Dict[str, Any],
    scale: float = 1.0,
) -> None:
    """Accumulates stat/modifier keys from a passive, armor set, or card dict."""
    for k, v in bonus.items():
        if not isinstance(v, (int, float)):
            continue
        fv = float(v) * scale
        if k in ALL_STATS:
            acc[f"stat_{k}"] = acc.get(f"stat_{k}", 0.0) + fv
        elif k in ("hp", "flat_hp"):
            acc["flat_hp"] = acc.get("flat_hp", 0.0) + fv
        elif k in ("hp_pct", "max_hp_pct"):
            acc["hp_pct"] = acc.get("hp_pct", 0.0) + fv
        elif k in ("sp", "flat_sp"):
            acc["flat_sp"] = acc.get("flat_sp", 0.0) + fv
        elif k in ("sp_pct", "max_sp_pct"):
            acc["sp_pct"] = acc.get("sp_pct", 0.0) + fv
        elif k in ("atk", "flat_atk"):
            acc["flat_atk"] = acc.get("flat_atk", 0.0) + fv
        elif k in ("matk", "flat_matk"):
            acc["flat_matk"] = acc.get("flat_matk", 0.0) + fv
        elif k == "aspd":
            acc["aspd_flat"] = acc.get("aspd_flat", 0.0) + fv
        else:
            acc[k] = acc.get(k, 0.0) + fv


def evaluate_dps(
    stats_map: Dict[str, int],
    passive_names: Sequence[str],
    set_combo: Sequence[str],
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
    cards_loadout: Optional[Sequence[CardSpec]] = None,
    passives_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    sets_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    fast: bool = False,
) -> Dict[str, Any]:
    """
    Computes exact Wiki stats, separated HIT vs ASPD metrics, mitigation,
    auto-attack + proc DPS, and skill rotation DPS.
    """
    p_cat = passives_catalog if passives_catalog is not None else PASSIVES
    s_cat = sets_catalog if sets_catalog is not None else ARMOR_SETS

    # 1) Accumulate Set Bonuses (handles 2pc stackable up to 3x, 4pc, and 6pc)
    set_acc: Dict[str, float] = {}
    set_counts = Counter(set_combo)
    for s_name, cnt in set_counts.items():
        s_data = s_cat.get(s_name)
        if not s_data:
            continue
        pieces_req = int(s_data.get("pieces_required", 2))
        max_stacks = int(s_data.get("max_stacks", 3 if pieces_req == 2 else 1))
        stacks = min(cnt, max_stacks)
        _apply_bonus_dict(set_acc, s_data, scale=float(stacks))

    # 2) Accumulate Card Bonuses (ASPD flat from cards does NOT stack — uses max!)
    card_acc: Dict[str, float] = {}
    card_aspd_values: List[float] = []
    card_mechs: set = set()
    for card in cards_loadout or ():
        if not card:
            continue
        for mk in getattr(card, "mechanics", ()) or ():
            card_mechs.add(str(mk))
        if not card.bonuses:
            continue
        b = card.bonuses
        for bk in b:
            if isinstance(bk, str) and len(bk) > 1 and bk.startswith("m") and bk[1].isupper():
                card_mechs.add(bk)
        # Extract flat card ASPD separately for non-stacking max() rule
        card_b = dict(b)
        for aspd_key in ("aspd", "aspd_flat"):
            if aspd_key in card_b and float(card_b[aspd_key]) > 0:
                card_aspd_values.append(float(card_b.pop(aspd_key)))
        _apply_bonus_dict(card_acc, card_b, scale=1.0)

    has_naga_card = "mNaga" in card_mechs
    has_eclipse_card = "mEclipse" in card_mechs
    has_quake_card = "mQuake" in card_mechs
    has_swarm_card = "mSwarm" in card_mechs

    # 3) Accumulate Job Innate + Active Passive Bonuses
    # First compute preliminary total STR & INT to check King's STR == INT condition
    base_str = int(stats_map.get("str", 1))
    base_agi = int(stats_map.get("agi", 1))
    base_vit = int(stats_map.get("vit", 1))
    base_int = int(stats_map.get("int", 1))
    base_dex = int(stats_map.get("dex", 1))
    base_luk = int(stats_map.get("luk", 1))

    prelim_str = (
        base_str
        + int(cls.job_bonuses.get("str", 0))
        + int(gear.bonus_stats.get("str", 0))
        + int(set_acc.get("stat_str", 0.0))
        + int(card_acc.get("stat_str", 0.0))
    )
    prelim_int = (
        base_int
        + int(cls.job_bonuses.get("int", 0))
        + int(gear.bonus_stats.get("int", 0))
        + int(set_acc.get("stat_int", 0.0))
        + int(card_acc.get("stat_int", 0.0))
    )

    passive_acc: Dict[str, float] = {}
    # Apply innate class passive stats first
    _apply_bonus_dict(passive_acc, cls.innate_stats, scale=1.0)

    # King's Fair Value & HFT activate innately when Total STR == Total INT
    if cls.job_id == "king" and prelim_str == prelim_int:
        passive_acc["phys_pierce"] = passive_acc.get("phys_pierce", 0.0) + 0.10
        passive_acc["magic_pierce"] = passive_acc.get("magic_pierce", 0.0) + 0.10
        passive_acc["cd_red"] = passive_acc.get("cd_red", 0.0) + 0.15
        passive_acc["stat_luk"] = passive_acc.get("stat_luk", 0.0) + 30.0

    for p_name in passive_names:
        p_data = p_cat.get(p_name)
        if not p_data:
            continue
        if p_data.get("source_job") == cls.job_id:
            continue
        if p_data.get("str_eq_int_only"):
            if prelim_str != prelim_int:
                continue
        if not _is_passive_compatible(p_data, cls, stats_map):
            continue
        _apply_bonus_dict(passive_acc, p_data, scale=1.0)
        if isinstance(p_data.get("bonuses"), dict):
            _apply_bonus_dict(passive_acc, p_data["bonuses"], scale=1.0)

    # 4) Total Primary Stats
    tot_str = (
        base_str
        + int(cls.job_bonuses.get("str", 0))
        + int(gear.bonus_stats.get("str", 0))
        + int(set_acc.get("stat_str", 0.0))
        + int(card_acc.get("stat_str", 0.0))
        + int(passive_acc.get("stat_str", 0.0))
    )
    tot_agi = (
        base_agi
        + int(cls.job_bonuses.get("agi", 0))
        + int(gear.bonus_stats.get("agi", 0))
        + int(set_acc.get("stat_agi", 0.0))
        + int(card_acc.get("stat_agi", 0.0))
        + int(passive_acc.get("stat_agi", 0.0))
    )
    tot_vit = (
        base_vit
        + int(cls.job_bonuses.get("vit", 0))
        + int(gear.bonus_stats.get("vit", 0))
        + int(set_acc.get("stat_vit", 0.0))
        + int(card_acc.get("stat_vit", 0.0))
        + int(passive_acc.get("stat_vit", 0.0))
    )
    tot_int = (
        base_int
        + int(cls.job_bonuses.get("int", 0))
        + int(gear.bonus_stats.get("int", 0))
        + int(set_acc.get("stat_int", 0.0))
        + int(card_acc.get("stat_int", 0.0))
        + int(passive_acc.get("stat_int", 0.0))
    )
    tot_dex = (
        base_dex
        + int(cls.job_bonuses.get("dex", 0))
        + int(gear.bonus_stats.get("dex", 0))
        + int(set_acc.get("stat_dex", 0.0))
        + int(card_acc.get("stat_dex", 0.0))
        + int(passive_acc.get("stat_dex", 0.0))
    )
    tot_luk = (
        base_luk
        + int(cls.job_bonuses.get("luk", 0))
        + int(gear.bonus_stats.get("luk", 0))
        + int(set_acc.get("stat_luk", 0.0))
        + int(card_acc.get("stat_luk", 0.0))
        + int(passive_acc.get("stat_luk", 0.0))
    )

    king_balanced = cls.job_id == "king" and (tot_str == tot_int or base_str == base_int)

    # 5) MaxHP, MaxSP, DEF, MDEF (Wiki Nov 13 VIT Rebalance)
    gear_card_set_hp = (
        float(gear.flat_hp)
        + set_acc.get("flat_hp", 0.0)
        + card_acc.get("flat_hp", 0.0)
        + passive_acc.get("flat_hp", 0.0)
    )
    passive_hp_pct = (
        float(gear.hp_pct)
        + set_acc.get("hp_pct", 0.0)
        + card_acc.get("hp_pct", 0.0)
        + passive_acc.get("hp_pct", 0.0)
    )
    aegis_hp_pct = 0.25 if cls.weapon_type == "aegis" else 0.0
    body_hp = calc_body_hp(
        level=gear.level,
        total_vit=float(tot_vit),
        job_hp_pct=float(cls.hp_bonus_pct),
        gear_card_set_hp=gear_card_set_hp,
        passive_hp_pct=passive_hp_pct,
        aegis_hp_pct=aegis_hp_pct,
    )
    max_hp = calc_max_hp(
        level=gear.level,
        base_vit=base_vit,
        total_vit=float(tot_vit),
        job_hp_pct=float(cls.hp_bonus_pct),
        gear_card_set_hp=gear_card_set_hp,
        passive_hp_pct=passive_hp_pct,
        aegis_hp_pct=aegis_hp_pct,
        is_pvp=tgt.is_pvp,
        has_naga_card=has_naga_card,
    )

    gear_card_set_sp = (
        float(gear.flat_sp)
        + set_acc.get("flat_sp", 0.0)
        + card_acc.get("flat_sp", 0.0)
        + passive_acc.get("flat_sp", 0.0)
    )
    passive_sp_pct = (
        set_acc.get("sp_pct", 0.0)
        + card_acc.get("sp_pct", 0.0)
        + passive_acc.get("sp_pct", 0.0)
    )
    max_sp = calc_max_sp(
        level=gear.level,
        total_int=float(tot_int),
        job_sp_pct=float(cls.sp_bonus_pct),
        gear_card_set_sp=gear_card_set_sp,
        passive_sp_pct=passive_sp_pct,
    )

    player_def = calc_player_def(
        gear_def=int(gear.gear_def + set_acc.get("def", 0.0) + card_acc.get("def", 0.0)),
        total_vit=int(tot_vit),
        passive_def=int(passive_acc.get("def", 0.0)),
    )
    player_mdef = calc_player_mdef(
        gear_mdef=int(gear.gear_mdef + set_acc.get("mdef", 0.0) + card_acc.get("mdef", 0.0)),
        total_int=int(tot_int),
        passive_mdef=int(passive_acc.get("mdef", 0.0)),
    )

    # 6) SEPARATED HIT & FLEE (exact Wiki formulas)
    gear_card_set_hit = (
        float(gear.hit)
        + set_acc.get("hit", 0.0)
        + card_acc.get("hit", 0.0)
    )
    flat_passive_hit = passive_acc.get("hit", 0.0)
    passive_hit_pct = (
        passive_acc.get("hit_pct", 0.0)
        + set_acc.get("hit_pct", 0.0)
        + card_acc.get("hit_pct", 0.0)
    )
    player_hit = calc_hit(
        level=gear.level,
        total_dex=float(tot_dex),
        total_luk=float(tot_luk),
        flat_passive_hit=flat_passive_hit,
        gear_card_set_hit=gear_card_set_hit,
        passive_hit_pct=passive_hit_pct,
        has_quake_card=has_quake_card,
    )

    gear_card_set_flee = (
        float(gear.flee)
        + set_acc.get("flee", 0.0)
        + card_acc.get("flee", 0.0)
    )
    player_flee = calc_flee(
        level=gear.level,
        total_agi=float(tot_agi),
        total_luk=float(tot_luk),
        gear_card_set_flee=gear_card_set_flee,
        passive_flee_pct=passive_acc.get("flee_pct", 0.0),
    )

    effective_tgt_flee = int(tgt.flee * (1.0 - min(0.30, passive_acc.get("flee_cut_pct", 0.0))))
    hit_rate = calc_hit_chance(player_hit, effective_tgt_flee, never_misses=False)

    # 7) SEPARATED ASPD (exact Wiki formula — non-stacking card ASPD & shield -8 penalty)
    offhand_type = (gear.offhand_type or cls.offhand_type or "none").lower()
    has_actual_shield = (not gear.is_two_handed) and (offhand_type == "shield")
    total_aspd_pct = (
        float(gear.aspd_pct)
        + set_acc.get("aspd_pct", 0.0)
        + card_acc.get("aspd_pct", 0.0)
        + passive_acc.get("aspd_pct", 0.0)
    )
    if tgt.is_monster:
        if has_swarm_card:
            total_aspd_pct += 0.20  # +2% ASPD per stack up to 10 stacks (+20% ASPD)
        if "mFoxTails" in card_mechs and tgt.target_def < 150:
            total_aspd_pct += 0.135  # 9 tails * 1.5% ASPD in mob grind
    flat_gear_set_aspd = (
        float(gear.aspd_flat)
        + set_acc.get("aspd_flat", 0.0)
        + passive_acc.get("aspd_flat", 0.0)
    )
    aspd_info = calc_aspd_details(
        job_id=cls.job_id,
        weapon_type=cls.weapon_type,
        total_agi=float(tot_agi),
        total_dex=float(tot_dex),
        aspd_pct=total_aspd_pct,
        flat_gear_set_potion_aspd=flat_gear_set_aspd,
        card_aspd_values=card_aspd_values,
        has_actual_shield=has_actual_shield,
    )
    aspd = float(aspd_info["aspd"])
    aps = float(aspd_info["attacks_per_sec"])
    attack_interval_ms = int(aspd_info["attack_interval_ms"])
    high_aspd_bonus = calc_high_aspd_basic_bonus(aspd)

    # 8) Total ATK & MATK (exact Wiki formulas)
    gear_card_set_atk = (
        float(gear.flat_atk)
        + set_acc.get("flat_atk", 0.0)
        + card_acc.get("flat_atk", 0.0)
        + passive_acc.get("flat_atk", 0.0)
    )
    total_atk_pct = (
        float(gear.atk_pct)
        + set_acc.get("atk_pct", 0.0)
        + card_acc.get("atk_pct", 0.0)
        + passive_acc.get("atk_pct", 0.0)
    )
    gear_card_set_matk = (
        float(gear.flat_matk)
        + set_acc.get("flat_matk", 0.0)
        + card_acc.get("flat_matk", 0.0)
        + passive_acc.get("flat_matk", 0.0)
    )
    total_matk_pct = (
        float(gear.matk_pct)
        + set_acc.get("matk_pct", 0.0)
        + card_acc.get("matk_pct", 0.0)
        + passive_acc.get("matk_pct", 0.0)
    )

    if tgt.is_monster and "mRage" in card_mechs:
        # Red Oni (mRage): +1% ATK/MATK per 4% missing HP up to +15% (~+7.5% steady average)
        total_atk_pct += 0.075
        total_matk_pct += 0.075

    if king_balanced:
        # Royal Balance innate bonus scales with balanced stat investment
        balanced_bonus_pct = min(0.25, (min(tot_str, tot_int) // 20) * 0.03)
        total_atk_pct += balanced_bonus_pct
        total_matk_pct += balanced_bonus_pct

    ironclad_atk = round(player_def * passive_acc.get("def_to_atk_pct", 0.0))

    total_atk = calc_total_atk(
        level=gear.level,
        total_str=float(tot_str),
        total_dex=float(tot_dex),
        total_luk=float(tot_luk),
        total_agi=float(tot_agi),
        body_hp=body_hp,
        player_hit=float(player_hit),
        gear_card_set_atk=gear_card_set_atk,
        total_atk_pct=total_atk_pct,
        is_ranged_dex_atk=cls.is_ranged_dex_atk,
        hp_to_atk=passive_acc.get("hp_to_atk", 0.0),
        hit_to_atk=passive_acc.get("hit_to_atk", 0.0),
        dex_to_atk=passive_acc.get("dex_to_atk", 0.0),
        agi_to_atk=passive_acc.get("agi_to_atk", 0.0),
        ironclad_atk=float(ironclad_atk),
    )

    total_matk = calc_total_matk(
        level=gear.level,
        total_int=float(tot_int),
        total_dex=float(tot_dex),
        total_agi=float(tot_agi),
        max_sp=max_sp,
        gear_card_set_matk=gear_card_set_matk,
        total_matk_pct=total_matk_pct,
        sp_to_matk=passive_acc.get("sp_to_matk", 0.0),
        dex_to_matk=passive_acc.get("dex_to_matk", 0.0),
        agi_to_matk=passive_acc.get("agi_to_matk", 0.0),
    )

    # 9) Crit Rates, Crit Damage Multiplier (2 * (1 + critDmg)), Pierce, Global Mults
    is_thief_knife = cls.job_id == "thief" and cls.weapon_type in ("knife", "dagger_pair")
    phys_crit_rate = calc_phys_crit_rate(
        level=gear.level,
        total_luk=float(tot_luk),
        gear_card_set_crit_pct=(float(gear.crit_rate) + set_acc.get("crit", 0.0) + card_acc.get("crit", 0.0)) * 100.0,
        passive_crit_pct=passive_acc.get("crit", 0.0) * 100.0,
        is_thief_knife=is_thief_knife,
    )
    spell_crit_rate = calc_spell_crit_rate(
        total_luk=float(tot_luk),
        gear_card_set_mcrit_pct=(float(gear.mcrit_rate) + set_acc.get("mcrit", 0.0) + card_acc.get("mcrit", 0.0)) * 100.0,
        buff_crit_pct=passive_acc.get("mcrit", 0.0) * 100.0,
    )
    crit_dmg_bonus = (
        float(gear.crit_dmg)
        + set_acc.get("crit_dmg", 0.0)
        + card_acc.get("crit_dmg", 0.0)
        + passive_acc.get("crit_dmg", 0.0)
    )
    crit_mult = calc_crit_multiplier(crit_dmg_bonus)

    wep_refine_pierce = calc_refine_pierce(gear.refine_level, is_two_handed=gear.is_two_handed)
    off_type_l = (gear.offhand_type or cls.offhand_type or "none").lower()
    off_refine_pierce = (
        calc_refine_pierce(gear.refine_level, is_two_handed=False)
        if (not gear.is_two_handed and off_type_l in NON_SHIELD_OFFHANDS)
        else 0.0
    )
    is_tablet = cls.weapon_type == "tablet"
    phys_ref_pierce = (wep_refine_pierce + off_refine_pierce) if (cls.primary_dmg_type != "magic" or is_tablet) else 0.0
    magic_ref_pierce = (wep_refine_pierce + off_refine_pierce) if (cls.primary_dmg_type in ("magic", "hybrid") or is_tablet) else 0.0

    phys_pierce = min(
        1.0,
        float(gear.phys_pierce)
        + phys_ref_pierce
        + set_acc.get("phys_pierce", 0.0)
        + card_acc.get("phys_pierce", 0.0)
        + passive_acc.get("phys_pierce", 0.0),
    )
    magic_pierce = min(
        1.0,
        float(gear.magic_pierce)
        + magic_ref_pierce
        + set_acc.get("magic_pierce", 0.0)
        + card_acc.get("magic_pierce", 0.0)
        + passive_acc.get("magic_pierce", 0.0),
    )

    ranged_class_bonus = 0.0
    if not cls.is_melee:
        ranged_class_bonus = passive_acc.get("bow_dmg_pct", 0.0) if cls.weapon_type == "bow" else passive_acc.get("ranged_dmg_pct", 0.0)

    global_dmg_mult = 1.0 + passive_acc.get("dmg_pct", 0.0) + card_acc.get("dmg_pct", 0.0) + set_acc.get("dmg_pct", 0.0) + ranged_class_bonus
    if set_acc.get("dealt_cut_pct", 0.0) > 0:
        global_dmg_mult *= max(0.1, 1.0 - set_acc["dealt_cut_pct"])

    # Card special DPS mechanics (PvE only, matching Wiki card_mechanics)
    is_boss_target = (
        "boss" in tgt.name.lower()
        or "mvp" in tgt.name.lower()
        or "leader" in tgt.name.lower()
        or tgt.target_def >= 150
    )
    if tgt.is_monster:
        if "mTitan" in card_mechs:
            global_dmg_mult *= 1.25 if is_boss_target else 0.90
        if "mExecute" in card_mechs:
            global_dmg_mult *= 1.105  # +30% below 35% HP -> +10.5% fight average
        if "mOpener" in card_mechs:
            global_dmg_mult *= 1.02 if is_boss_target else 1.15
        if "mWeakSpot" in card_mechs:
            has_status = cls.primary_dmg_type != "magic" or cls.job_id in ("mage", "nekobaku") or bool(card_mechs & {"mLantern", "mMelt", "mGrasp"})
            global_dmg_mult *= 1.10 if has_status else 1.04
        if "mFarShot" in card_mechs:
            global_dmg_mult *= 1.12 if not cls.is_melee else 0.90
        if has_swarm_card and aspd >= 192.9:
            global_dmg_mult *= 1.10  # Hornet Drone: +1% dmg/stack (+10%) when ASPD is capped

    skill_dmg_mult = 1.0 + passive_acc.get("skill_dmg_pct", 0.0) + card_acc.get("skill_dmg_pct", 0.0) + set_acc.get("skill_dmg_pct", 0.0)
    if tgt.is_monster:
        if "mSurprise" in card_mechs:
            skill_dmg_mult *= 1.03
        if "mCocoa" in card_mechs:
            skill_dmg_mult *= 0.90
    basic_dmg_mult = (1.0 + passive_acc.get("basic_atk_dmg_pct", 0.0) + card_acc.get("basic_atk_dmg_pct", 0.0)) * high_aspd_bonus
    earth_dmg_bonus = card_acc.get("earth_dmg", 0.0)
    light_dark_dmg_bonus = passive_acc.get("light_dark_dmg", 0.0) + card_acc.get("light_dark_dmg", 0.0)

    total_cd_red = min(
        0.50,
        float(gear.cd_red)
        + set_acc.get("cd_red", 0.0)
        + card_acc.get("cd_red", 0.0)
        + passive_acc.get("cd_red", 0.0),
    )
    total_cast_red = min(
        0.30,
        float(gear.cast_reduce_pct)
        + set_acc.get("cast_reduce_pct", 0.0)
        + card_acc.get("cast_reduce_pct", 0.0)
        + passive_acc.get("cast_reduce_pct", 0.0),
    )

    # 10) Auto-Attack & Proc DPS
    auto_elem = (gear.weapon_coating or "neutral").lower()
    auto_elem_mult = element_multiplier(auto_elem, tgt.element, has_eclipse_card=has_eclipse_card)
    if auto_elem == "earth":
        auto_elem_mult *= (1.0 + earth_dmg_bonus)
    elif auto_elem in ("light", "dark"):
        auto_elem_mult *= (1.0 + light_dark_dmg_bonus)
    if auto_elem != "neutral":
        auto_elem_mult *= (1.0 + passive_acc.get("elem_dmg", 0.0) + passive_acc.get("coated_dmg", 0.0))

    if cls.uses_tablet_hybrid_basic:
        raw_auto = (total_atk + total_matk) * 0.5 * cls.auto_atk_scale + max_hp * cls.auto_hp_scale
        auto_crit_rate = spell_crit_rate
        auto_mitigated = calc_damage_after_def(raw_auto, (tgt.phys_def + tgt.magic_def) // 2, (phys_pierce + magic_pierce) * 0.5)
    elif cls.uses_matk_basic_attack:
        matk_scale_auto = cls.auto_matk_scale if cls.auto_matk_scale > 0 else cls.auto_atk_scale
        raw_auto = total_matk * matk_scale_auto + max_hp * cls.auto_hp_scale
        auto_crit_rate = spell_crit_rate
        auto_mitigated = calc_damage_after_def(raw_auto, tgt.magic_def, magic_pierce)
    else:
        raw_auto = total_atk * cls.auto_atk_scale + max_hp * cls.auto_hp_scale
        auto_crit_rate = phys_crit_rate
        auto_mitigated = calc_damage_after_def(raw_auto, tgt.phys_def, phys_pierce)

    auto_crit_factor = 1.0 + auto_crit_rate * (crit_mult - 1.0)
    auto_hit_factor = 1.0 if cls.uses_matk_basic_attack else hit_rate

    # Twin Strike / Double Attack proc scaling
    double_atk_mult = 1.0
    if passive_acc.get("double_atk_chance", 0.0) > 0:
        chance = min(1.0, passive_acc["double_atk_chance"])
        mult_extra = max(0.5, passive_acc.get("double_atk_mult", 1.0) - 1.0)
        double_atk_mult += chance * mult_extra

    auto_dmg_per_hit = (
        auto_mitigated
        * auto_elem_mult
        * auto_crit_factor
        * auto_hit_factor
        * global_dmg_mult
        * basic_dmg_mult
        * double_atk_mult
    )

    # Proc bonuses triggered on basic attack (Colossus Radiant Bash, Sacred Guillotine, Kasumi Edge, Akatsuki Kenki, Poon-poon)
    proc_atk_scale = passive_acc.get("auto_atk_proc_scale", 0.0)
    proc_hp_scale = passive_acc.get("auto_hp_proc_scale", 0.0)
    proc_dmg_per_hit = 0.0
    if proc_atk_scale > 0 or proc_hp_scale > 0:
        raw_proc = total_atk * proc_atk_scale + max_hp * proc_hp_scale
        mit_proc = calc_damage_after_def(raw_proc, tgt.phys_def, phys_pierce)
        proc_dmg_per_hit = mit_proc * auto_elem_mult * auto_crit_factor * hit_rate * global_dmg_mult

    # Companion / Summon DPS (Sinister Poon-poon & Necromancer Black Cat Squad)
    companion_dps = 0.0
    comp_scale = passive_acc.get("companion_atk_scale", 0.0)
    if comp_scale > 0:
        comp_raw = total_atk * comp_scale
        comp_mit = calc_damage_after_def(comp_raw, tgt.phys_def, phys_pierce)
        companion_dps = comp_mit * auto_elem_mult * auto_crit_factor * hit_rate * (aps * 0.5) * global_dmg_mult

    auto_dps = (auto_dmg_per_hit + proc_dmg_per_hit) * aps + companion_dps

    # 11) Active Skill DPS Breakdown & Summons
    dps_breakdown: Dict[str, float] = {"Auto-Attack (+Procs)": round(auto_dps, 2)}
    total_skill_dps = 0.0

    # Wicked Necromancer: 3 Black Cat Summons inheriting player ASPD, M.CRIT, Dark element, and Summon DMG%
    if cls.job_id == "necromancer":
        summon_mult = (1.0 + passive_acc.get("summon_dmg_pct", 0.0)) * global_dmg_mult
        dark_elem_mult = element_multiplier("dark", tgt.element, has_eclipse_card=has_eclipse_card) * (
            1.0 + light_dark_dmg_bonus + passive_acc.get("elem_dmg", 0.0)
        )
        cat_mcrit_factor = 1.0 + spell_crit_rate * (crit_mult - 1.0)
        archer_crit_rate = min(1.0, spell_crit_rate + 0.10)
        archer_crit_factor = 1.0 + archer_crit_rate * (crit_mult - 1.0)

        # Black Cat Knight: 1.0 ATK auto + Taunt (INT>=100: 1.5 ATK / 5s) + Hook (INT>=200: 2.5 MATK / 10s)
        knight_phys_raw = total_atk * (aps + (1.5 / 5.0 if tot_int >= 100 else 0.0))
        knight_phys_dps = calc_damage_after_def(knight_phys_raw, tgt.phys_def, phys_pierce) * dark_elem_mult * cat_mcrit_factor * summon_mult
        knight_hook_dps = 0.0
        if tot_int >= 200:
            knight_hook_dps = calc_damage_after_def(total_matk * (2.5 / 10.0), tgt.magic_def, magic_pierce) * dark_elem_mult * cat_mcrit_factor * summon_mult
        knight_total_dps = knight_phys_dps + knight_hook_dps

        # Black Cat Archer: 1.0 (+2.1 Shadow Shot at INT>=200) * ATK * aps + Shadow Piercing (INT>=300: 20.0 ATK / 5s)
        archer_shot_scale = 1.0 + (2.1 if tot_int >= 200 else 0.0)
        archer_raw = total_atk * (archer_shot_scale * aps + (20.0 / 5.0 if tot_int >= 300 else 0.0))
        archer_total_dps = calc_damage_after_def(archer_raw, tgt.phys_def, phys_pierce) * dark_elem_mult * archer_crit_factor * summon_mult

        # Black Cat Cleric: cast 4s / 3s / 2s / 1s (INT 0/100/200/300), looping Vortex(12x) -> Meteor(12x) -> Mend(heal)
        cleric_cast_sec = 1.0 if tot_int >= 300 else (2.0 if tot_int >= 200 else (3.0 if tot_int >= 100 else 4.0))
        cleric_matk_per_sec = total_matk * (24.0 / (3.0 * cleric_cast_sec))
        cleric_total_dps = calc_damage_after_def(cleric_matk_per_sec, tgt.magic_def, magic_pierce) * dark_elem_mult * cat_mcrit_factor * summon_mult

        dps_breakdown["Black Cat Knight"] = round(knight_total_dps, 2)
        dps_breakdown["Black Cat Archer"] = round(archer_total_dps, 2)
        dps_breakdown["Black Cat Cleric"] = round(cleric_total_dps, 2)
        total_skill_dps += knight_total_dps + archer_total_dps + cleric_total_dps

    for sk in cls.skills:
        eff_elem = (
            (gear.weapon_coating or "neutral").lower()
            if (sk.uses_weapon_coating and sk.element == "neutral")
            else sk.element.lower()
        )
        sk_elem_mult = element_multiplier(eff_elem, tgt.element, has_eclipse_card=has_eclipse_card)
        if eff_elem == "earth":
            sk_elem_mult *= (1.0 + earth_dmg_bonus)
        elif eff_elem in ("light", "dark"):
            sk_elem_mult *= (1.0 + light_dark_dmg_bonus)
        if eff_elem != "neutral":
            sk_elem_mult *= (1.0 + passive_acc.get("elem_dmg", 0.0))
        if sk.uses_weapon_coating and (gear.weapon_coating or "neutral").lower() != "neutral":
            sk_elem_mult *= (1.0 + passive_acc.get("coated_dmg", 0.0))

        hp_mult = gld_vit_multiplier(int(tot_vit)) if sk.vit_tier_hp_scale else sk.hp_scale
        atk_mon_mult = sk.atk_monster_mult if tgt.is_monster else 1.0
        raw_atk_part = total_atk * sk.atk_scale * atk_mon_mult
        raw_matk_part = total_matk * sk.matk_scale
        raw_hp_part = max_hp * hp_mult
        raw_sk = raw_atk_part + raw_matk_part + raw_hp_part
        if raw_sk <= 0:
            continue

        if sk.ignores_def:
            mit_sk = raw_sk
        elif sk.dmg_type == "magic":
            mit_sk = calc_damage_after_def(raw_sk, tgt.magic_def, magic_pierce)
        elif sk.dmg_type == "hybrid":
            mit_sk = (
                calc_damage_after_def(raw_atk_part + raw_hp_part, tgt.phys_def, phys_pierce)
                + calc_damage_after_def(raw_matk_part, tgt.magic_def, magic_pierce)
            )
        else:
            mit_sk = calc_damage_after_def(raw_sk, tgt.phys_def, phys_pierce)

        extra_sk_crit_dmg = 0.0
        if "crossfire" in sk.name.lower() and cls.job_id == "sinister":
            extra_sk_crit_dmg = 0.30 if tot_dex >= 300 else (0.20 if tot_dex >= 200 else 0.10)
        sk_crit_mult = calc_crit_multiplier(crit_dmg_bonus + extra_sk_crit_dmg)

        if not sk.can_crit:
            sk_crit_factor = 1.0
        elif sk.dmg_type == "magic" or cls.uses_tablet_hybrid_basic:
            sk_crit_factor = 1.0 + spell_crit_rate * (sk_crit_mult - 1.0)
        else:
            sk_crit_factor = 1.0 + phys_crit_rate * (sk_crit_mult - 1.0)

        sk_hit_factor = 1.0 if (sk.never_misses or sk.dmg_type == "magic") else hit_rate
        sk_pve_mult = sk.monster_mult if not tgt.is_pvp else 1.0

        # Summon-specific bonus for Necromancer skills
        summon_bonus = 1.0 + (passive_acc.get("summon_dmg_pct", 0.0) if "black cat" in sk.name.lower() else 0.0)

        expected_sk_dmg = (
            mit_sk
            * sk_elem_mult
            * sk_crit_factor
            * sk_hit_factor
            * sk_pve_mult
            * global_dmg_mult
            * skill_dmg_mult
            * summon_bonus
        )

        base_cd = sk.effective_uptime_cd if sk.effective_uptime_cd is not None else sk.cooldown
        base_cd = max(0.20, base_cd - passive_acc.get("cd_cut_sec", 0.0))
        eff_cd = calc_skill_cycle_time(
            base_cd=base_cd,
            base_cast=sk.cast_time,
            total_dex=int(tot_dex),
            cd_red=total_cd_red,
            aspd_scaling_type=sk.aspd_scaling_type if not sk.cooldown_from_aspd else "cooldown_from_aspd",
            attack_interval_ms=attack_interval_ms,
            multi_hit_spells=sk.multi_hit_spell,
            fixed_cast=sk.fixed_cast,
            cast_reduce_pct=total_cast_red,
        )

        sk_dps = expected_sk_dmg / max(0.20, eff_cd)
        dps_breakdown[sk.name] = round(sk_dps, 2)
        total_skill_dps += sk_dps

    # Solari / Unstable Concoction skill-hit procs
    if passive_acc.get("solari_proc_matk", 0.0) > 0 and cls.skills:
        proc_matk_raw = total_matk * passive_acc["solari_proc_matk"]
        proc_matk_mit = calc_damage_after_def(proc_matk_raw, tgt.magic_def, magic_pierce)
        dps_breakdown["Skill-Hit Procs"] = round(proc_matk_mit * global_dmg_mult * 0.5, 2)
        total_skill_dps += dps_breakdown["Skill-Hit Procs"]

    total_dps = auto_dps + total_skill_dps
    total_stats_dict = {
        "str": tot_str,
        "agi": tot_agi,
        "vit": tot_vit,
        "int": tot_int,
        "dex": tot_dex,
        "luk": tot_luk,
    }
    if fast:
        return {
            "total_dps": round(total_dps, 2),
            "auto_dps": round(auto_dps, 2),
            "skill_dps": round(total_skill_dps, 2),
            "total_stats": total_stats_dict,
            "king_balanced": king_balanced,
        }

    return {
        "total_dps": round(total_dps, 2),
        "auto_dps": round(auto_dps, 2),
        "skill_dps": round(total_skill_dps, 2),
        "dps_breakdown": dps_breakdown,
        # Derived Offense / Defense
        "total_atk": round(total_atk, 1),
        "total_matk": round(total_matk, 1),
        "max_hp": round(max_hp, 1),
        "max_sp": round(max_sp, 1),
        "player_def": player_def,
        "player_mdef": player_mdef,
        "phys_crit_rate": round(phys_crit_rate, 4),
        "spell_crit_rate": round(spell_crit_rate, 4),
        "crit_mult": round(crit_mult, 4),
        "phys_pierce": round(phys_pierce, 4),
        "magic_pierce": round(magic_pierce, 4),
        "gld_vit_mult": gld_vit_multiplier(int(tot_vit)),
        # Separated HIT vs Target FLEE
        "player_hit": player_hit,
        "player_flee": player_flee,
        "target_flee": effective_tgt_flee,
        "hit_rate": round(hit_rate, 4),
        "hit_chance_pct": round(hit_rate * 100.0, 2),
        "hit_formula_note": f"HIT = floor((100 + Lv{gear.level} + DEX*2 + floor(LUK/3) + Gear/Card/Passive) * (1 + Hit%)) vs Target FLEE {effective_tgt_flee}",
        # Separated ASPD
        "aspd": round(aspd, 2),
        "aspd_cap": 193,
        "aspd_details": aspd_info,
        "attacks_per_sec": round(aps, 3),
        "aps": round(aps, 3),
        "attack_interval_ms": attack_interval_ms,
        "aspd_formula_note": (
            f"ASPD = min(193, softcap180((Base {aspd_info['class_base_aspd']} + Offset {aspd_info['weapon_aspd_offset']}"
            f"{' - 8 Shield' if has_actual_shield else ''} + (AGI*0.3 + DEX*0.02)*{aspd_info['agi_dex_factor']}) "
            f"+ ASPD% + Gear/Potion {flat_gear_set_aspd} + CardMax {aspd_info['max_card_aspd']}))"
        ),
        "total_stats": {
            "str": tot_str,
            "agi": tot_agi,
            "vit": tot_vit,
            "int": tot_int,
            "dex": tot_dex,
            "luk": tot_luk,
        },
        "base_stats": dict(stats_map),
        "stat_sources": {
            "base": {s: int(stats_map.get(s, 1)) for s in ALL_STATS},
            "job": {s: int(cls.job_bonuses.get(s, 0)) for s in ALL_STATS},
            "innate": {s: int(cls.innate_stats.get(s, 0)) for s in ALL_STATS},
            "gear": {s: int(gear.bonus_stats.get(s, 0)) for s in ALL_STATS},
            "cards": {s: int(card_acc.get(f"stat_{s}", 0.0)) for s in ALL_STATS},
            "sets": {s: int(set_acc.get(f"stat_{s}", 0.0)) for s in ALL_STATS},
            "passives": {
                s: int(passive_acc.get(f"stat_{s}", 0.0)) - int(cls.innate_stats.get(s, 0))
                for s in ALL_STATS
            },
        },
        "card_bonuses": {
            "str": int(card_acc.get("stat_str", 0.0)),
            "agi": int(card_acc.get("stat_agi", 0.0)),
            "vit": int(card_acc.get("stat_vit", 0.0)),
            "int": int(card_acc.get("stat_int", 0.0)),
            "dex": int(card_acc.get("stat_dex", 0.0)),
            "luk": int(card_acc.get("stat_luk", 0.0)),
            "flat_atk": round(float(card_acc.get("flat_atk", 0.0)), 1),
            "flat_matk": round(float(card_acc.get("flat_matk", 0.0)), 1),
            "atk_pct": round(float(card_acc.get("atk_pct", 0.0)), 4),
            "matk_pct": round(float(card_acc.get("matk_pct", 0.0)), 4),
            "phys_pierce": round(float(card_acc.get("phys_pierce", 0.0)), 4),
            "magic_pierce": round(float(card_acc.get("magic_pierce", 0.0)), 4),
            "crit": round(float(card_acc.get("crit", 0.0)), 4),
            "mcrit": round(float(card_acc.get("mcrit", 0.0)), 4),
            "crit_dmg": round(float(card_acc.get("crit_dmg", 0.0)), 4),
            "flat_hp": round(float(card_acc.get("flat_hp", 0.0)), 1),
            "hp_pct": round(float(card_acc.get("hp_pct", 0.0)), 4),
            "hit": int(card_acc.get("hit", 0.0)),
            "flee": int(card_acc.get("flee", 0.0)),
            "aspd_flat": max(card_aspd_values) if card_aspd_values else 0.0,
        },
        "king_balanced": king_balanced,
        "active_card_mechanics": sorted(card_mechs),
    }


def recommend_cards(
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
    best_stats: Dict[str, int],
    p_comb: Sequence[str],
    s_comb: Sequence[str],
    cards_catalog: Optional[Dict[str, CardSpec]] = None,
    passives_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    sets_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    card_tier_filter: str = "all",
) -> Dict[str, Any]:
    """
    Greedily picks optimal cards per eligible equipment slot using Wiki card
    slot rules:
    - 2H weapons unlock 2 card slots (`weapon_1`, `weapon_2`) and block `shield`.
    - 1H weapons unlock 1 `weapon_1` slot + 1 `shield`/offhand slot.
    - Respects `max_per_item` (no duplicate identical card in `weapon_1` & `weapon_2`).
    - Card flat ASPD does not stack across cards (`max()` rule handled by `evaluate_dps`).
    """
    c_cat = cards_catalog if cards_catalog is not None else CARDS
    p_cat = passives_catalog if passives_catalog is not None else PASSIVES
    s_cat = sets_catalog if sets_catalog is not None else ARMOR_SETS

    base_res = evaluate_dps(
        best_stats, p_comb, s_comb, cls, gear, tgt,
        cards_loadout=[], passives_catalog=p_cat, sets_catalog=s_cat,
    )
    base_dps = base_res["total_dps"]

    if gear.is_two_handed:
        equip_slots = [
            "weapon_1", "weapon_2",
            "head_upper", "head_mid", "head_lower",
            "body", "garment", "shoes",
            "accessory_1", "accessory_2",
        ]
    else:
        equip_slots = [
            "weapon_1", "shield",
            "head_upper", "head_mid", "head_lower",
            "body", "garment", "shoes",
            "accessory_1", "accessory_2",
        ]

    # Filter candidate cards by tier preference
    candidates_all: List[CardSpec] = []
    for c in c_cat.values():
        if card_tier_filter == "standard_only" and c.is_limited:
            continue
        if card_tier_filter == "limited_only" and not c.is_limited:
            continue
        candidates_all.append(c)

    chosen_loadout: List[CardSpec] = []
    cards_by_slot: Dict[str, Optional[Dict[str, Any]]] = {}
    recommendations: List[Dict[str, Any]] = []
    current_dps = base_dps

    weapon_chosen_ids: set = set()

    for slot in equip_slots:
        slot_cands = [c for c in candidates_all if _slot_matches_card(c, slot)]
        if slot == "weapon_2":
            # Enforce max_per_item = 1 per 2H weapon
            slot_cands = [
                c for c in slot_cands
                if c.card_id not in weapon_chosen_ids or c.max_per_item > 1
            ]

        best_card: Optional[CardSpec] = None
        best_card_dps = current_dps

        for cand in slot_cands:
            res = evaluate_dps(
                best_stats, p_comb, s_comb, cls, gear, tgt,
                cards_loadout=chosen_loadout + [cand],
                passives_catalog=p_cat,
                sets_catalog=s_cat,
                fast=True,
            )
            if res["total_dps"] > best_card_dps + 1e-6:
                best_card_dps = res["total_dps"]
                best_card = cand

        if best_card is not None:
            chosen_loadout.append(best_card)
            if slot in ("weapon_1", "weapon_2"):
                weapon_chosen_ids.add(best_card.card_id)
            gain = round(best_card_dps - current_dps, 2)
            gain_pct = round((gain / max(1.0, current_dps)) * 100.0, 2)
            current_dps = best_card_dps
            entry = {
                "equip_slot": slot,
                "card_id": best_card.card_id,
                "name": best_card.name,
                "tier": best_card.tier,
                "is_limited": best_card.is_limited,
                "removable": best_card.removable,
                "bonuses": dict(best_card.bonuses),
                "mechanics": list(getattr(best_card, "mechanics", ()) or ()),
                "source_monsters": list(best_card.source_monsters),
                "description": best_card.description,
                "marginal_dps_gain": gain,
                "marginal_dps_gain_pct": gain_pct,
            }
            cards_by_slot[slot] = entry
            recommendations.append(entry)
        else:
            cards_by_slot[slot] = None

    if gear.is_two_handed:
        cards_by_slot["shield"] = None

    final_res = evaluate_dps(
        best_stats, p_comb, s_comb, cls, gear, tgt,
        cards_loadout=chosen_loadout,
        passives_catalog=p_cat,
        sets_catalog=s_cat,
    )

    return {
        "cards_by_slot": cards_by_slot,
        "recommendations": recommendations,
        "chosen_card_ids": [c.card_id for c in chosen_loadout],
        "dps_without_cards": round(base_dps, 2),
        "dps_with_cards": round(final_res["total_dps"], 2),
        "card_dps_gain": round(final_res["total_dps"] - base_dps, 2),
        "card_dps_gain_pct": round(((final_res["total_dps"] - base_dps) / max(1.0, base_dps)) * 100.0, 2),
        "two_handed_weapon_slots": 2 if gear.is_two_handed else 1,
        "final_metrics": final_res,
    }


def _expand_armor_set_slots(
    set_combo: Sequence[str],
    sets_cat: Dict[str, Dict[str, Any]],
) -> Dict[str, str]:
    """Maps the 6 Wiki armor set slots (`head`, `face`, `mouth`, `armor`, `garment`, `shoes`) to winning set pieces."""
    slot_order = ("head", "face", "mouth", "armor", "garment", "shoes")
    labels: List[str] = []
    for s_name in set_combo:
        s_data = sets_cat.get(s_name, {})
        req = int(s_data.get("pieces_required", 2))
        labels.extend([f"{s_name} ({req}pc)"] * req)
    while len(labels) < 6:
        labels.append("Free Set Piece")
    return {slot_order[i]: labels[i] for i in range(6)}


def _gear_lines_budget_for_level(level: int, affix_budget: str = "high") -> int:
    """
    Returns realistic weighted 6-stat line budget across all 9 active gear slots:
    - 9 slots = weapon+offhand (2 weight), 6 armors/head/shoes (6 weight), 2 rings (2 weight) = 10 primary weights.
    - Plus 2 rings' mandatory 2nd lines + ~2 extra lines on non-rings = 14 weighted lines at Tier VI endgame.
    """
    if level < 10:
        base_lines = 0
    elif level < 30:
        base_lines = 2
    elif level < 60:
        base_lines = 4
    elif level < 90:
        base_lines = 8
    elif level < 115:
        base_lines = 12
    else:
        base_lines = 14
    scale = {"low": 0.65, "medium": 0.85, "high": 1.0, "whale": 1.15}.get(
        (affix_budget or "high").lower(), 1.0
    )
    return max(0, int(round(base_lines * scale)))


def _apply_gear_stats_dict(gear: GearProfile, gear_stats: Dict[str, int]) -> GearProfile:
    """Returns a copy of `GearProfile` with its 6 core bonus_stats replaced by `gear_stats`."""
    return replace(
        gear,
        str_v=int(gear_stats.get("str", 0)),
        agi=int(gear_stats.get("agi", 0)),
        vit=int(gear_stats.get("vit", 0)),
        int_v=int(gear_stats.get("int", 0)),
        dex=int(gear_stats.get("dex", 0)),
        luk=int(gear_stats.get("luk", 0)),
    )


def _pack_gear_stats_into_slots(
    gear_stats: Dict[str, int],
    is_two_handed: bool,
) -> Dict[str, Dict[str, int]]:
    """
    Distributes total equipment 6-stat points across the 9 active stat-bearing slots
    (2H weapon = 2x weight, 1H weapon + offhand = 1x each, 6 armor pieces + 2 rings = 1x each),
    enforcing at most 2 distinct core stats per piece and exact integer sum equality.
    """
    active_slots: List[Tuple[str, int]] = [("weapon", 2 if is_two_handed else 1)]
    if not is_two_handed:
        active_slots.append(("shield", 1))
    active_slots.extend([
        ("armor", 1), ("head", 1), ("face", 1), ("mouth", 1),
        ("garment", 1), ("shoes", 1), ("accessory1", 1), ("accessory2", 1),
    ])

    packed: Dict[str, Dict[str, int]] = {s: {} for s, _ in active_slots}
    if is_two_handed:
        packed["shield"] = {}

    rem = {s: max(0, int(v)) for s, v in gear_stats.items() if int(v) > 0}
    if not rem:
        return packed

    def _top_stat(exclude: Optional[set] = None) -> Optional[str]:
        cands = [(k, v) for k, v in rem.items() if v > 0 and (not exclude or k not in exclude)]
        if not cands:
            return None
        cands.sort(key=lambda x: x[1], reverse=True)
        return cands[0][0]

    # Pass 1: assign 1 primary stat chunk per slot (unit = 30 for 2H, 15 for 1x slots)
    for slot_key, weight in active_slots:
        st = _top_stat()
        if not st:
            break
        unit = 15 * weight
        take = min(rem[st], unit)
        if take > 0:
            packed[slot_key][st] = packed[slot_key].get(st, 0) + take
            rem[st] -= take

    # Pass 2: assign remaining chunks as 2nd distinct line (accessories + weapon + armor priority)
    second_order: List[Tuple[str, int]] = [
        ("accessory1", 1), ("accessory2", 1), ("weapon", 2 if is_two_handed else 1),
        ("armor", 1), ("shoes", 1), ("head", 1), ("garment", 1), ("face", 1), ("mouth", 1),
    ]
    if not is_two_handed:
        second_order.insert(3, ("shield", 1))

    for slot_key, weight in second_order:
        if len(packed[slot_key]) >= 2:
            continue
        st = _top_stat(exclude=set(packed[slot_key].keys()))
        if not st:
            continue
        unit = 15 * weight
        take = min(rem[st], unit)
        if take > 0:
            packed[slot_key][st] = packed[slot_key].get(st, 0) + take
            rem[st] -= take

    # Pass 3: top up any leftover points cleanly onto matching existing slots or free slots
    for st in sorted(rem.keys(), key=lambda k: rem[k], reverse=True):
        while rem[st] > 0:
            placed = False
            for slot_key, weight in active_slots:
                if st in packed[slot_key] or len(packed[slot_key]) < 2:
                    cap_room = (18 * weight) - packed[slot_key].get(st, 0)
                    if cap_room > 0:
                        give = min(rem[st], cap_room)
                        packed[slot_key][st] = packed[slot_key].get(st, 0) + give
                        rem[st] -= give
                        placed = True
                        break
            if not placed:
                # Overflow fallback (when user manually drags gear slider beyond Tier VI max)
                first_slot = active_slots[0][0]
                packed[first_slot][st] = packed[first_slot].get(st, 0) + rem[st]
                rem[st] = 0

    return packed


def recommend_gear_affixes(
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
    eval_res: Dict[str, Any],
    base_stats: Dict[str, int],
    p_comb: Sequence[str] = (),
    s_comb: Sequence[str] = (),
    card_recs: Optional[Dict[str, Any]] = None,
    cards_loadout: Optional[Sequence[CardSpec]] = None,
    passives_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    sets_catalog: Optional[Dict[str, Dict[str, Any]]] = None,
    ring_choice_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generates strict DPS-only per-slot Wiki Gear Recommendations:
    - Excludes non-DPS affixes (`resStun`, `resFreeze`, `resBleed`, `hpRegen`, `spRegen`, `moveSpeed`, `hp`).
    - Computes quantitative `vit_vs_flat_hp_comparison` (+12 VIT vs +180 Flat HP).
    - Computes live `stat_priority_guide` from marginal +12 DPS probes.
    - Maps the 6 armor slots to `armor_sets` and attaches socketed `cards` per slot.
    """
    p_cat = passives_catalog if passives_catalog is not None else PASSIVES
    s_cat = sets_catalog if sets_catalog is not None else ARMOR_SETS

    tot_stats = eval_res["total_stats"]
    player_hit = int(eval_res["player_hit"])
    tgt_flee = int(eval_res["target_flee"])
    hit_rate = float(eval_res["hit_rate"])
    aspd = float(eval_res["aspd"])
    phys_pierce = float(eval_res["phys_pierce"])
    magic_pierce = float(eval_res["magic_pierce"])
    auto_share = float(eval_res["auto_dps"]) / max(1.0, float(eval_res["total_dps"]))
    base_total_dps = float(eval_res["total_dps"])

    is_caster_primary = cls.primary_dmg_type == "magic"
    is_hybrid_primary = cls.primary_dmg_type == "hybrid"

    hit_deficit = max(0, tgt_flee - player_hit) if (not is_caster_primary and hit_rate < 1.0) else 0
    aspd_deficit = round(max(0.0, 193.0 - aspd), 2)
    need_aspd = aspd_deficit > 0.5 and (auto_share >= 0.12 or cls.job_id in ("templar", "kensei", "sinister", "ironfist", "mamushi", "thief", "archer", "swordman"))

    tgt_phys_dr = calc_def_reduction(tgt.phys_def)
    tgt_magic_dr = calc_def_reduction(tgt.magic_def)
    phys_pierce_headroom = round(max(0.0, tgt_phys_dr - phys_pierce) * 100.0, 1)
    magic_pierce_headroom = round(max(0.0, tgt_magic_dr - magic_pierce) * 100.0, 1)
    dex_cast_deficit = max(0, 150 - int(tot_stats.get("dex", 0)))

    # Compute live Stat Priority Guide (+12 stat roll marginal DPS probe)
    stat_roles = {
        "vit": "MaxHP & GLD 25x Scaling" if cls.job_id == "templar" else "Survivability / MaxHP",
        "str": "Melee ATK (+3/pt)" if not cls.is_ranged_dex_atk else "Weight / Minor ATK",
        "agi": "ASPD -> 193 Cap (7.14 APS + 1.5%/pt Basic Dmg)" if aspd < 192.9 else "FLEE / Excess ASPD",
        "int": "MATK (+3/pt) & MaxSP" if (is_caster_primary or is_hybrid_primary) else "MDEF & MaxSP",
        "dex": "Ranged ATK & HIT (+2/pt)" if cls.is_ranged_dex_atk else ("Cast Time (150 Instant, 250 Multi-hit)" if (is_caster_primary or is_hybrid_primary) else "HIT (+2/pt) & Min ATK"),
        "luk": "CRIT / M.CRIT (+0.33%/pt) & HIT/FLEE",
    }
    stat_priority_guide: List[Dict[str, Any]] = []
    for st in ALL_STATS:
        probe_b = dict(base_stats)
        probe_b[st] = int(probe_b.get(st, 1)) + 12
        probe_ev = evaluate_dps(
            probe_b, p_comb, s_comb, cls, gear, tgt,
            cards_loadout=cards_loadout, passives_catalog=p_cat, sets_catalog=s_cat,
        )
        delta_dps = round(float(probe_ev["total_dps"]) - base_total_dps, 2)
        delta_pct = round((delta_dps / max(1.0, base_total_dps)) * 100.0, 2)
        stat_priority_guide.append({
            "stat": st.upper(),
            "current_total": int(tot_stats.get(st, 1)),
            "role": stat_roles[st],
            "marginal_dps_per_12": delta_dps,
            "marginal_dps_pct_per_12": delta_pct,
            "priority_tier": "S (Core DPS)" if delta_pct >= 1.5 else ("A (Strong)" if delta_pct >= 0.4 else ("B (Support)" if delta_dps > 0 else "C (Skip for DPS)")),
        })
    stat_priority_guide.sort(key=lambda x: x["marginal_dps_per_12"], reverse=True)

    # Quantitative VIT (+12 roll) vs Flat HP (+180 Blood Tier VI) proof
    set_acc_hp_pct = sum(float(s_cat.get(sn, {}).get("hp_pct", 0.0)) for sn in s_comb)
    card_acc_hp_pct = sum(float(c.bonuses.get("hp_pct", 0.0)) for c in (cards_loadout or ()) if c and c.bonuses)
    has_naga = any("mNaga" in (getattr(c, "mechanics", ()) or ()) or (c.bonuses and c.bonuses.get("mNaga")) for c in (cards_loadout or ()))
    vit_hp_cmp = calc_vit_vs_flat_hp_delta(
        level=gear.level,
        base_vit=int(base_stats.get("vit", 1)),
        total_vit=float(tot_stats.get("vit", 1)),
        job_hp_pct=float(cls.hp_bonus_pct),
        gear_card_set_hp=float(gear.flat_hp),
        passive_hp_pct=float(gear.hp_pct) + set_acc_hp_pct + card_acc_hp_pct,
        aegis_hp_pct=0.25 if cls.weapon_type == "aegis" else 0.0,
        is_pvp=tgt.is_pvp,
        has_naga_card=has_naga,
        vit_delta=12,
        flat_hp_delta=180.0,
    )
    vit_hp_cmp["verdict"] = (
        f"VIT +12 可增加 {vit_hp_cmp['vit_hp_gain']} MaxHP（+180 Flat HP 為 +{vit_hp_cmp['flat_hp_gain']}，"
        f"差距 {vit_hp_cmp['vit_hp_ratio']}x 且額外附帶 +{vit_hp_cmp['vit_def_gain']} DEF）。"
    )
    # Also attach exact DPS delta of +12 VIT vs +180 Flat HP
    vit12_dps = next((x["marginal_dps_per_12"] for x in stat_priority_guide if x["stat"] == "VIT"), 0.0)
    gear_hp180 = replace(gear, flat_hp=int(gear.flat_hp) + 180)
    hp180_eval = evaluate_dps(
        base_stats, p_comb, s_comb, cls, gear_hp180, tgt,
        cards_loadout=cards_loadout, passives_catalog=p_cat, sets_catalog=s_cat,
    )
    hp180_dps = round(float(hp180_eval["total_dps"]) - base_total_dps, 2)
    vit_hp_cmp["vit_12_dps_gain"] = vit12_dps
    vit_hp_cmp["flat_hp_180_dps_gain"] = hp180_dps
    vit_hp_cmp["dps_advantage_ratio"] = round(vit12_dps / max(0.01, hp180_dps), 2) if hp180_dps > 0 else 0.0

    # Primary dual-stat roll targets driven directly by live marginal DPS rankings
    # Wiki equipment rule: each piece rolls 1 core stat (25% chance for 2, max 2); rings always roll 2.
    # HIT / FLEE and native CRIT / M.CRIT / ATK / MATK roll independently and do NOT consume those 2 slots.
    top_3_stats = [x["stat"] for x in stat_priority_guide[:3]]
    if cls.job_id == "king":
        primary_substats = [
            "STR +12 ~ +18 (維持 STR=INT 共鳴)",
            "INT +12 ~ +18 (維持 STR=INT 共鳴)",
        ]
        fallback_substat = (
            "DEX +12 ~ +18 (補 150 瞬詠)"
            if dex_cast_deficit > 0
            else f"{top_3_stats[0]} / LUK +12 ~ +18"
        )
    else:
        primary_substats = [
            f"{top_3_stats[0]} +12 ~ +18 ({stat_roles[top_3_stats[0].lower()]})",
            f"{top_3_stats[1]} +12 ~ +18 ({stat_roles[top_3_stats[1].lower()]})",
        ]
        fallback_substat = f"{top_3_stats[2]} +12 ~ +18 ({stat_roles[top_3_stats[2].lower()]})"
    hit_indep_note = (
        f"HIT (0 ~ +24 獨立副條，不佔 2 格 6 維；尚缺 +{hit_deficit} 達 100%)"
        if hit_deficit > 0
        else None
    )

    # Measure true marginal DPS gain for each Tier VI offensive affix once
    affix_dps_gain: Dict[str, float] = {}
    probe_deltas = {
        "pierce": replace(gear, phys_pierce=float(gear.phys_pierce) + 0.06),
        "mpierce": replace(gear, magic_pierce=float(gear.magic_pierce) + 0.06),
        "atkPct": replace(gear, atk_pct=float(gear.atk_pct) + 0.12),
        "matkPct": replace(gear, matk_pct=float(gear.matk_pct) + 0.12),
        "critDmg": replace(gear, crit_dmg=float(gear.crit_dmg) + 0.12),
    }
    for ak, mod_gear in probe_deltas.items():
        if is_caster_primary and ak in ("pierce", "atkPct"):
            affix_dps_gain[ak] = -1.0
            continue
        if (not is_caster_primary and not is_hybrid_primary) and ak in ("mpierce", "matkPct"):
            affix_dps_gain[ak] = -1.0
            continue
        mod_ev = evaluate_dps(
            base_stats, p_comb, s_comb, cls, mod_gear, tgt,
            cards_loadout=cards_loadout, passives_catalog=p_cat, sets_catalog=s_cat,
        )
        affix_dps_gain[ak] = float(mod_ev["total_dps"]) - base_total_dps

    rem_phys_headroom = [float(phys_pierce_headroom)]
    rem_magic_headroom = [float(magic_pierce_headroom)]

    def _rank_offense_pool(pool: List[str], caster: bool) -> List[str]:
        clean_pool = [a for a in pool if a not in _NON_DPS_AFFIXES]
        if is_caster_primary or (is_hybrid_primary and caster):
            clean_pool = [a for a in clean_pool if a not in ("pierce", "atkPct")]
        elif not is_hybrid_primary or (is_hybrid_primary and not caster):
            clean_pool = [a for a in clean_pool if a not in ("mpierce", "matkPct")]

        def _score(a: str) -> Tuple[float, int]:
            g = affix_dps_gain.get(a, 0.0)
            if a == "pierce":
                g = g * (min(6.0, max(0.0, rem_phys_headroom[0])) / 6.0)
            elif a == "mpierce":
                g = g * (min(6.0, max(0.0, rem_magic_headroom[0])) / 6.0)
            proc_tie = 2 if a in ("pierce", "mpierce", "atkPct", "matkPct", "critDmg") else 1
            return (g, proc_tie)

        return sorted(clean_pool, key=_score, reverse=True)

    set_slot_map = _expand_armor_set_slots(s_comb, s_cat) if s_comb else {}
    cards_by_slot = (card_recs or {}).get("cards_by_slot") or {}

    def _cards_for_slot(slot_key: str) -> List[Dict[str, Any]]:
        if slot_key == "weapon":
            keys = ["weapon_1", "weapon_2"] if gear.is_two_handed else ["weapon_1"]
        elif slot_key == "head":
            keys = ["head_upper"]
        elif slot_key == "face":
            keys = ["head_mid"]
        elif slot_key == "mouth":
            keys = ["head_lower"]
        elif slot_key == "armor":
            keys = ["body"]
        elif slot_key == "accessory1":
            keys = ["accessory_1"]
        elif slot_key == "accessory2":
            keys = ["accessory_2"]
        else:
            keys = [slot_key]
        out_c: List[Dict[str, Any]] = []
        for k in keys:
            c = cards_by_slot.get(k)
            if c:
                out_c.append({
                    "equip_slot": k,
                    "card_id": c["card_id"],
                    "name": c["name"],
                    "tier": c["tier"],
                    "mechanics": c.get("mechanics", []),
                    "marginal_dps_gain_pct": c.get("marginal_dps_gain_pct", 0.0),
                })
        return out_c

    packed_slot_stats = _pack_gear_stats_into_slots(gear.bonus_stats, gear.is_two_handed)

    def _make_slot_rec(
        slot_key: str,
        slot_label: str,
        template_name: str,
        pool_key: Optional[str],
        substats: List[str],
        rationale: str,
        blocked: bool = False,
        set_assignment: Optional[str] = None,
        fallback_stat: Optional[str] = None,
        independent_rolls: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        slot_cards = _cards_for_slot(slot_key)
        slot_alloc = dict(packed_slot_stats.get(slot_key) or {})
        if slot_alloc:
            core_substats = [
                f"{st_k.upper()} +{st_v} ({stat_roles.get(st_k, '')})"
                for st_k, st_v in sorted(slot_alloc.items(), key=lambda kv: kv[1], reverse=True)
            ]
            # Keep 2 stat guidance slots consistent with dual-roll armor/ring metadata
            if len(core_substats) == 1:
                for cand_sub in substats:
                    cand_prefix = cand_sub.split(" ", 1)[0].lower()
                    if cand_prefix not in slot_alloc:
                        core_substats.append(f"{cand_prefix.upper()} 備選第2條 ({stat_roles.get(cand_prefix, '')})")
                        break
                while len(core_substats) < 2 and len(substats) >= 2:
                    core_substats.append(substats[len(core_substats)])
        else:
            core_substats = list(substats[:2])
        indep_list = list(independent_rolls or [])
        if blocked or not pool_key:
            return {
                "slot": slot_key,
                "slot_label": slot_label,
                "template_name": template_name,
                "recommended_item_name": template_name,
                "set_assignment": set_assignment,
                "blocked_by_two_handed": blocked,
                "recommended_special_affix": None,
                "special_affix_target": None if blocked else "None",
                "affix_key": None,
                "affix_prefix": None,
                "tier_vi_max_value": None,
                "runner_up_affixes": [],
                "allocated_stats": {},
                "primary_stat_targets": [],
                "recommended_substats": [],
                "fallback_stat_target": None,
                "independent_roll_targets": [],
                "cards": slot_cards,
                "rationale": rationale,
            }

        pool = _SLOT_AFFIX_POOLS[pool_key]
        is_offense_slot = pool_key in ("sword_melee", "sword_caster", "shield_orb", "shield_shuriken", "shield_saya", "ammo", "accessory1", "accessory2")
        if pool_key in ("sword_melee", "shield_shuriken", "shield_saya", "ammo", "accessory1"):
            ranked = _rank_offense_pool(pool, caster=False)
        elif pool_key in ("sword_caster", "shield_orb", "accessory2"):
            ranked = _rank_offense_pool(pool, caster=True)
        else:
            # Armor / Headgear / Shoes / Actual Shield pools contain NO DPS special affixes!
            ranked = []

        if is_offense_slot and ranked:
            best_key = ranked[0]
            affix_mult = 2 if (slot_key == "weapon" and gear.is_two_handed) else 1
            if best_key == "pierce":
                rem_phys_headroom[0] = max(0.0, rem_phys_headroom[0] - 6.0 * affix_mult)
            elif best_key == "mpierce":
                rem_magic_headroom[0] = max(0.0, rem_magic_headroom[0] - 6.0 * affix_mult)
            title, tier_vi_base = _AFFIX_DISPLAY.get(best_key, (best_key, "Tier VI"))
            if affix_mult == 2:
                _2h_labels = {
                    "pierce": "+12% P.Pierce (Tier VI 雙手 2×)",
                    "mpierce": "+12% M.Pierce (Tier VI 雙手 2×)",
                    "atkPct": "+24% ATK (Tier VI 雙手 2×)",
                    "matkPct": "+24% MATK (Tier VI 雙手 2×)",
                    "critDmg": "+24% Crit Dmg (Tier VI 雙手 2×)",
                }
                tier_vi = _2h_labels.get(best_key, tier_vi_base)
            else:
                tier_vi = tier_vi_base
            prefix = _AFFIX_PREFIXES[best_key]
            spec_target = f"{prefix} ({tier_vi})"
            rec_item_name = f"{prefix} {template_name}"
            runners = [f"{_AFFIX_PREFIXES[k]} ({_AFFIX_DISPLAY[k][1]})" for k in ranked[1:3]]
            return {
                "slot": slot_key,
                "slot_label": slot_label,
                "template_name": template_name,
                "recommended_item_name": rec_item_name,
                "set_assignment": set_assignment,
                "blocked_by_two_handed": False,
                "recommended_special_affix": f"{prefix} ({title})",
                "special_affix_target": spec_target,
                "affix_key": best_key,
                "affix_prefix": prefix,
                "tier_vi_max_value": tier_vi,
                "runner_up_affixes": runners,
                "allocated_stats": slot_alloc,
                "primary_stat_targets": core_substats,
                "recommended_substats": core_substats,
                "fallback_stat_target": fallback_stat,
                "independent_roll_targets": indep_list,
                "cards": slot_cards,
                "rationale": rationale,
            }

        # Non-offensive special pool (head/face/mouth/armor/garment/shoes/shield_actual): strict DPS-only advice!
        return {
            "slot": slot_key,
            "slot_label": slot_label,
            "template_name": template_name,
            "recommended_item_name": f"{set_assignment} {template_name}" if set_assignment else template_name,
            "set_assignment": set_assignment,
            "blocked_by_two_handed": False,
            "recommended_special_affix": None,
            "special_affix_target": "無攻擊特詞（此部位專注湊目標 6 維屬性；HIT/FLEE 為獨立副條）",
            "affix_key": None,
            "affix_prefix": None,
            "tier_vi_max_value": None,
            "runner_up_affixes": [],
            "allocated_stats": slot_alloc,
            "primary_stat_targets": core_substats,
            "recommended_substats": core_substats,
            "fallback_stat_target": fallback_stat,
            "independent_roll_targets": indep_list,
            "cards": slot_cards,
            "rationale": rationale,
        }

    core_subs = list(primary_substats[:2])
    base_indep = [hit_indep_note] if hit_indep_note else []

    weapon_pool = "sword_caster" if is_caster_primary else "sword_melee"
    weapon_note = (
        f"2H {cls.weapon_name}: 2x base stats, +60 refine ATK/MATK, +10% refine Pierce (+10), and 2 Card Slots."
        if gear.is_two_handed
        else f"1H {cls.weapon_name}: +30 refine ATK/MATK & +5% refine Pierce (+10); pairs with {cls.offhand_type.title()}."
    )
    if cls.weapon_type == "tablet":
        weapon_note = "Royal Tablet (2H): converts MATK into ATK+MATK, doubles refine MATK, and grants +10% P.Pierce & M.Pierce at +10."

    slots: List[Dict[str, Any]] = [
        _make_slot_rec(
            "weapon",
            f"Weapon ({cls.weapon_name})",
            cls.weapon_name,
            weapon_pool,
            core_subs,
            weapon_note + (f" Target DR leaves {magic_pierce_headroom if is_caster_primary else phys_pierce_headroom}% pierce headroom." if tgt.phys_def > 0 else ""),
            fallback_stat=fallback_substat,
            independent_rolls=base_indep,
        )
    ]

    if gear.is_two_handed:
        slots.append(
            _make_slot_rec(
                "shield",
                "Shield / Off-Hand",
                "Blocked (2H Equipped)",
                None,
                [],
                f"Blocked because {cls.weapon_name} is Two-Handed (2x stats, 2x refine, 2 weapon card slots).",
                blocked=True,
            )
        )
    else:
        off_t = (gear.offhand_type or cls.offhand_type).lower()
        if off_t == "quiver":
            off_pool, off_name, off_note = "ammo", "Quiver", "No -8 ASPD shield penalty; offensive Tier VI affixes (Piercing/Savage/Lethal)."
        elif off_t == "saya":
            off_pool, off_name, off_note = "shield_saya", "Saya", "Kensei offhand: no -8 ASPD penalty; rolls innate CRIT + offensive affixes."
        elif off_t == "shuriken":
            off_pool, off_name, off_note = "shield_shuriken", "Shuriken", "Mamushi offhand: no -8 ASPD penalty; rolls innate ASPD + offensive affixes."
        elif off_t in ("orb", "catalyst", "lantern"):
            off_pool, off_name, off_note = "shield_orb", off_t.title(), f"Caster offhand ({off_t.title()}): no -8 ASPD penalty; rolls MATK + Occult/Runic/Lethal."
        else:
            off_pool, off_name, off_note = "shield_actual", "Shield", "Actual Shield has -8 ASPD penalty and no DPS special affix; prioritize top 2 core stats."
        slots.append(
            _make_slot_rec(
                "shield",
                f"Off-Hand ({off_name})",
                off_name,
                off_pool,
                core_subs,
                off_note,
                fallback_stat=fallback_substat,
                independent_rolls=base_indep,
            )
        )

    acc1_pool = "accessory2" if is_caster_primary else "accessory1"
    acc2_pool = "accessory1" if (not is_caster_primary and not is_hybrid_primary) else "accessory2"
    acc1_name = (ring_choice_info or {}).get("acc1_name") or ("Emerald Ring" if is_caster_primary else "Obsidian Ring")
    acc2_name = (ring_choice_info or {}).get("acc2_name") or (
        "Emerald Ring" if (is_caster_primary or is_hybrid_primary) else "Obsidian Ring"
    )

    def _ring_indep(ring_name: str, is_magic: bool) -> List[str]:
        if "Emerald" in ring_name:
            native = "M.CRIT (+6 ~ +12 Emerald 原生自帶，不佔 2 格 6 維)"
        elif "Obsidian" in ring_name:
            native = "CRIT (+6 ~ +12 Obsidian 原生自帶，不佔 2 格 6 維)"
        elif is_magic:
            native = "MATK (+42 ~ +126 Diamond 原生自帶，不佔 2 格 6 維)"
        else:
            native = "ATK (+42 ~ +126 Platinum 原生自帶，不佔 2 格 6 維)"
        return [native] + base_indep

    acc1_note = (
        f"{acc1_name}：兩個飾品格皆可裝備法系戒指，戒指固定出 2 種 6 維屬性；Tier VI 特詞可選 Runic (+6% M.Pierce)、Occult (+12% MATK) 或 Lethal (+12% Crit Dmg)。"
        if acc1_pool == "accessory2"
        else f"{acc1_name}：兩個飾品格皆可裝備物理戒指，戒指固定出 2 種 6 維屬性；Tier VI 特詞可選 Piercing (+6% P.Pierce)、Savage (+12% ATK) 或 Lethal (+12% Crit Dmg)。"
    )
    acc2_note = (
        f"{acc2_name}：戒指固定出 2 種 6 維屬性；Tier VI 特詞可選 Runic (+6% M.Pierce)、Occult (+12% MATK) 或 Lethal (+12% Crit Dmg)。"
        if acc2_pool == "accessory2"
        else f"{acc2_name}：物理職業兩個飾品格皆可穿戴物理戒指（固定出 2 種 6 維屬性；Piercing +6% P.Pierce / Savage +12% ATK / Lethal +12% Crit Dmg）。"
    )

    slots.extend([
        _make_slot_rec("head", "Headgear (Upper)", "Helm / Cap", "head", core_subs, "頭上無攻擊特詞（可洗 Blood +180 MaxHP），單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並搭配套裝件數。", set_assignment=set_slot_map.get("head"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec("face", "Headgear (Mid / Face)", "Facegear", "face", core_subs, "頭中無攻擊特詞（可洗 Blood +180 MaxHP），單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並搭配套裝件數。", set_assignment=set_slot_map.get("face"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec("mouth", "Headgear (Lower / Mouth)", "Mouthgear", "mouth", core_subs, "頭下無攻擊特詞（可洗 Blood +180 MaxHP），單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並搭配套裝件數。", set_assignment=set_slot_map.get("mouth"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec("armor", "Body Armor", "Coat", "armor", core_subs, "身體無攻擊特詞（可洗 Blood +180 MaxHP），單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並搭配職業套裝。", set_assignment=set_slot_map.get("armor"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec("garment", "Garment", "Muffler", "garment", core_subs, "披風無攻擊特詞（可洗 Blood +180 MaxHP），單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並搭配套裝件數。", set_assignment=set_slot_map.get("garment"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec("shoes", "Shoes", "Shoes", "shoes", core_subs, "鞋履無攻擊特詞，單件最多骰出 2 種 6 維屬性 (+12 ~ +18) 並插卡攻速/屬性卡。", set_assignment=set_slot_map.get("shoes"), fallback_stat=fallback_substat, independent_rolls=base_indep),
        _make_slot_rec(
            "accessory1",
            "Accessory 1 (Magic Ring)" if acc1_pool == "accessory2" else "Accessory 1 (Physical Ring)",
            acc1_name,
            acc1_pool,
            core_subs,
            acc1_note,
            fallback_stat=fallback_substat,
            independent_rolls=_ring_indep(acc1_name, acc1_pool == "accessory2"),
        ),
        _make_slot_rec(
            "accessory2",
            "Accessory 2 (Magic Ring)" if acc2_pool == "accessory2" else "Accessory 2 (Physical Ring)",
            acc2_name,
            acc2_pool,
            core_subs,
            acc2_note,
            fallback_stat=fallback_substat,
            independent_rolls=_ring_indep(acc2_name, acc2_pool == "accessory2"),
        ),
    ])

    return {
        "breakpoints_status": {
            "hit_status": "100% Capped" if hit_deficit == 0 else f"Need +{hit_deficit} HIT to reach 100% vs {tgt_flee} FLEE",
            "hit_deficit": hit_deficit,
            "aspd_status": f"{aspd} / 193 ({'Capped' if aspd >= 192.9 else f'{aspd_deficit} below cap'})",
            "aspd_deficit": aspd_deficit,
            "phys_pierce_headroom_pct": phys_pierce_headroom,
            "magic_pierce_headroom_pct": magic_pierce_headroom,
            "dex_cast_deficit": dex_cast_deficit,
            "templar_vit_300_deficit": max(0, 300 - int(tot_stats.get("vit", 0))) if cls.job_id == "templar" else 0,
            "king_str_eq_int_ok": eval_res.get("king_balanced", False) if cls.job_id == "king" else None,
            "active_card_mechanics": eval_res.get("active_card_mechanics", []),
        },
        "vit_vs_flat_hp_comparison": vit_hp_cmp,
        "stat_priority_guide": stat_priority_guide,
        "ring_recommendation": ring_choice_info or {"accessory1": acc1_name, "accessory2": acc2_name},
        "allocated_gear_stats": {s: int(gear.bonus_stats.get(s, 0)) for s in ALL_STATS},
        "slots": slots,
    }


def _generate_valid_set_combos(
    sets_cat: Dict[str, Dict[str, Any]],
    cls: ClassProfile,
    tgt: TargetProfile,
) -> List[Tuple[str, ...]]:
    """
    Generates valid 6-slot Armor Set combinations:
    - Up to 3 x 2-piece sets (stackable up to 3x)
    - 1 x 4-piece set + 1 x 2-piece set
    - 1 x 6-piece set (Blood Lord)
    Prunes strictly dominated sets (e.g. Archmage for pure physical) to keep
    runtime instant while preserving every relevant damage/pierce/crit/HP set.
    """
    two_pc = [k for k, v in sets_cat.items() if int(v.get("pieces_required", 2)) == 2]
    four_pc = [k for k, v in sets_cat.items() if int(v.get("pieces_required", 2)) == 4]
    six_pc = [k for k, v in sets_cat.items() if int(v.get("pieces_required", 2)) == 6]

    def _is_set_archetype_compatible(d: Dict[str, Any], name: str) -> bool:
        if cls.primary_dmg_type == "physical" and (d.get("matk_pct", 0) > 0 or d.get("magic_pierce", 0) > 0) and d.get("atk_pct", 0) == 0:
            return False
        if cls.primary_dmg_type == "magic" and (d.get("atk_pct", 0) > 0 or d.get("phys_pierce", 0) > 0) and d.get("matk_pct", 0) == 0:
            return False
        if name == "Iron Bastion" and cls.job_id != "templar" and not tgt.is_pvp:
            return False
        return True

    # Filter irrelevant 2pc & 4pc sets per damage archetype
    filtered_2pc: List[str] = [k for k in two_pc if _is_set_archetype_compatible(sets_cat[k], k)]
    if not filtered_2pc:
        filtered_2pc = two_pc

    filtered_4pc: List[str] = [k for k in four_pc if _is_set_archetype_compatible(sets_cat[k], k)]

    combos: List[Tuple[str, ...]] = list(combinations_with_replacement(filtered_2pc, 3))
    for s4 in filtered_4pc:
        for s2 in filtered_2pc:
            combos.append((s4, s2))
    for s6 in six_pc:
        combos.append((s6,))
    return combos


def _rank_top_passives(
    candidate_passives: List[str],
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
    probe_stats: Dict[str, int],
    passives_cat: Dict[str, Dict[str, Any]],
    sets_cat: Dict[str, Dict[str, Any]],
    limit: int = 10,
) -> List[str]:
    """Ranks compatible passives by single-slot marginal DPS when pool > limit."""
    if len(candidate_passives) <= limit:
        return candidate_passives

    base_s = ("Warlord", "Warlord", "Warlord") if cls.primary_dmg_type != "magic" else ("Archmage", "Archmage", "Archmage")
    baseline = evaluate_dps(
        probe_stats, (), base_s, cls, gear, tgt,
        passives_catalog=passives_cat, sets_catalog=sets_cat, fast=True,
    )["total_dps"]

    scored: List[Tuple[float, str]] = []
    for p_name in candidate_passives:
        res = evaluate_dps(
            probe_stats, (p_name,), base_s, cls, gear, tgt,
            passives_catalog=passives_cat, sets_catalog=sets_cat, fast=True,
        )["total_dps"]
        scored.append((res - baseline, p_name))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]


def _optimize_stats_for_combo(
    p_comb: Sequence[str],
    s_comb: Sequence[str],
    cls: ClassProfile,
    gear: GearProfile,
    tgt: TargetProfile,
    total_pts: int,
    stat_cap: int,
    step: int = 15,
    passives_cat: Optional[Dict[str, Dict[str, Any]]] = None,
    sets_cat: Optional[Dict[str, Dict[str, Any]]] = None,
    cards_loadout: Optional[Sequence[CardSpec]] = None,
) -> Tuple[Dict[str, int], Dict[str, Any]]:
    """
    Greedy marginal-DPS-per-stat-point optimizer followed by fine (+1/+3) polish.
    Automatically enforces King's `STR == INT` Royal Balance if King is active.
    Supports `cards_loadout` so Pass 2 re-allocates stats accounting for card stats/ASPD.
    """
    stats: Dict[str, int] = {s: 1 for s in ALL_STATS}
    spent = 0

    def _cost_to_raise(cur: int, amt: int) -> int:
        c = 0
        for x in range(cur, cur + amt):
            c += stat_step_cost(x)
        return c

    # Templar initial VIT/DEX/STR weighting; King synced STR/INT steps
    while True:
        best_choice: Optional[Tuple[str, int, int, float]] = None
        cur_eval = evaluate_dps(
            stats, p_comb, s_comb, cls, gear, tgt,
            cards_loadout=cards_loadout,
            passives_catalog=passives_cat, sets_catalog=sets_cat,
            fast=True,
        )
        cur_dps = cur_eval["total_dps"]

        # Candidate stat moves (clamp final step cleanly up to stat_cap)
        moves: List[Tuple[str, int]] = []
        if cls.job_id == "king":
            cur_pair = min(stats["str"], stats["int"])
            if cur_pair < stat_cap:
                moves.append(("str_int_pair", min(step, stat_cap - cur_pair)))
            for s in ("dex", "agi", "luk", "vit"):
                if stats[s] < stat_cap:
                    moves.append((s, min(step, stat_cap - stats[s])))
        else:
            for s in ALL_STATS:
                if stats[s] < stat_cap:
                    moves.append((s, min(step, stat_cap - stats[s])))
            # For Templar, also allow a breakpoint jump directly to 300 total VIT (25x Lv.10 GLD)
            if cls.job_id == "templar" and stats["vit"] < stat_cap:
                cur_tot_vit = cur_eval["total_stats"]["vit"]
                if cur_tot_vit < 300:
                    needed_vit = min(stat_cap - stats["vit"], 300 - cur_tot_vit)
                    if needed_vit > 0 and needed_vit != min(step, stat_cap - stats["vit"]):
                        moves.append(("vit", needed_vit))
            # For Wicked Necromancer & casters, allow direct jumps to Total INT 100/200/300 & Total DEX 150 breakpoints
            if cls.job_id == "necromancer" and stats["int"] < stat_cap:
                cur_tot_int = cur_eval["total_stats"]["int"]
                for int_bp in (100, 200, 300):
                    if cur_tot_int < int_bp:
                        needed_int = min(stat_cap - stats["int"], int_bp - cur_tot_int)
                        if needed_int > 0 and needed_int != min(step, stat_cap - stats["int"]):
                            moves.append(("int", needed_int))
                        break
            if cls.primary_dmg_type in ("magic", "hybrid") and stats["dex"] < stat_cap:
                cur_tot_dex = cur_eval["total_stats"]["dex"]
                if cur_tot_dex < 150:
                    needed_dex = min(stat_cap - stats["dex"], 150 - cur_tot_dex)
                    if needed_dex > 0 and needed_dex != min(step, stat_cap - stats["dex"]):
                        moves.append(("dex", needed_dex))

        for mv, amt in moves:
            if mv == "str_int_pair":
                cost = _cost_to_raise(stats["str"], amt) + _cost_to_raise(stats["int"], amt)
                if spent + cost > total_pts:
                    continue
                cand_stats = dict(stats)
                cand_stats["str"] += amt
                cand_stats["int"] += amt
            else:
                cost = _cost_to_raise(stats[mv], amt)
                if spent + cost > total_pts:
                    continue
                cand_stats = dict(stats)
                cand_stats[mv] += amt

            new_dps = evaluate_dps(
                cand_stats, p_comb, s_comb, cls, gear, tgt,
                cards_loadout=cards_loadout,
                passives_catalog=passives_cat, sets_catalog=sets_cat,
                fast=True,
            )["total_dps"]
            efficiency = (new_dps - cur_dps) / max(1, cost)
            if best_choice is None or efficiency > best_choice[3]:
                best_choice = (mv, amt, cost, efficiency)

        if best_choice is None or best_choice[3] <= 0:
            break

        mv, amt, cost, _ = best_choice
        if mv == "str_int_pair":
            stats["str"] += amt
            stats["int"] += amt
        else:
            stats[mv] += amt
        spent += cost

    # Fine-grained polish (spend leftover points 1 by 1 on best marginal DPS)
    for _ in range(80):
        cur_eval = evaluate_dps(
            stats, p_comb, s_comb, cls, gear, tgt,
            cards_loadout=cards_loadout,
            passives_catalog=passives_cat, sets_catalog=sets_cat,
            fast=True,
        )
        cur_dps = cur_eval["total_dps"]
        best_single: Optional[Tuple[str, int, float]] = None

        fine_moves = ["str_int_pair", "dex", "agi", "luk", "vit"] if cls.job_id == "king" else list(ALL_STATS)
        for mv in fine_moves:
            if mv == "str_int_pair":
                if stats["str"] >= stat_cap or stats["int"] >= stat_cap:
                    continue
                c = stat_step_cost(stats["str"]) + stat_step_cost(stats["int"])
                if spent + c > total_pts:
                    continue
                cand = dict(stats)
                cand["str"] += 1
                cand["int"] += 1
            else:
                if stats[mv] >= stat_cap:
                    continue
                c = stat_step_cost(stats[mv])
                if spent + c > total_pts:
                    continue
                cand = dict(stats)
                cand[mv] += 1

            nd = evaluate_dps(
                cand, p_comb, s_comb, cls, gear, tgt,
                cards_loadout=cards_loadout,
                passives_catalog=passives_cat, sets_catalog=sets_cat,
                fast=True,
            )["total_dps"]
            eff = (nd - cur_dps) / max(1, c)
            if best_single is None or eff > best_single[2]:
                best_single = (mv, c, eff)

        if best_single is None or best_single[2] <= 0:
            break
        mv, c, _ = best_single
        if mv == "str_int_pair":
            stats["str"] += 1
            stats["int"] += 1
        else:
            stats[mv] += 1
        spent += c

    final_eval = evaluate_dps(
        stats, p_comb, s_comb, cls, gear, tgt,
        cards_loadout=cards_loadout,
        passives_catalog=passives_cat, sets_catalog=sets_cat,
    )
    final_eval["points_spent"] = spent
    final_eval["points_remaining"] = max(0, total_pts - spent)
    return stats, final_eval


def _joint_optimize_stats_and_gear(
    p_comb: Sequence[str],
    s_comb: Sequence[str],
    cls: ClassProfile,
    base_gear: GearProfile,
    tgt: TargetProfile,
    total_pts: int,
    stat_cap: int,
    gear_lines_budget: int,
    step: int = 15,
    passives_cat: Optional[Dict[str, Dict[str, Any]]] = None,
    sets_cat: Optional[Dict[str, Dict[str, Any]]] = None,
    cards_loadout: Optional[Sequence[CardSpec]] = None,
) -> Tuple[Dict[str, int], Dict[str, Any], GearProfile]:
    """
    Clean-slate joint optimizer: starts from base={all: 1} and gear_6stats={all: 0},
    allocating level-up stat points AND realistic equipment 6-stat slot lines together
    by marginal DPS per budget fraction (respecting King STR=INT & Templar/Necro thresholds).
    """
    stats: Dict[str, int] = {s: 1 for s in ALL_STATS}
    gear_pts: Dict[str, int] = {s: 0 for s in ALL_STATS}
    spent = 0
    gear_spent = 0
    total_gear_pts = gear_lines_budget * 16
    max_gear_per_stat = min(180, gear_lines_budget * 18)
    gear_step = 16

    def _cost_to_raise(cur: int, amt: int) -> int:
        c = 0
        for x in range(cur, cur + amt):
            c += stat_step_cost(x)
        return c

    def _cur_gear() -> GearProfile:
        return _apply_gear_stats_dict(base_gear, gear_pts)

    while True:
        cur_gear_obj = _cur_gear()
        cur_eval = evaluate_dps(
            stats, p_comb, s_comb, cls, cur_gear_obj, tgt,
            cards_loadout=cards_loadout,
            passives_catalog=passives_cat, sets_catalog=sets_cat,
            fast=True,
        )
        cur_dps = cur_eval["total_dps"]
        best_choice: Optional[Tuple[Dict[str, int], Dict[str, int], int, int, float]] = None

        candidates: List[Tuple[Dict[str, int], Dict[str, int]]] = []

        if cls.job_id == "king":
            cur_pair = min(stats["str"], stats["int"])
            if cur_pair < stat_cap:
                amt = min(step, stat_cap - cur_pair)
                candidates.append(({"str": amt, "int": amt}, {}))
            g_amt = min(gear_step, max_gear_per_stat - gear_pts["str"], max_gear_per_stat - gear_pts["int"])
            if g_amt > 0 and gear_spent + 2 * g_amt <= total_gear_pts:
                candidates.append(({}, {"str": g_amt, "int": g_amt}))
            for s in ("dex", "agi", "luk", "vit"):
                if stats[s] < stat_cap:
                    candidates.append(({s: min(step, stat_cap - stats[s])}, {}))
                s_amt = min(gear_step, max_gear_per_stat - gear_pts[s], total_gear_pts - gear_spent)
                if s_amt > 0:
                    candidates.append(({}, {s: s_amt}))
        else:
            for s in ALL_STATS:
                if stats[s] < stat_cap:
                    candidates.append(({s: min(step, stat_cap - stats[s])}, {}))
                s_amt = min(gear_step, max_gear_per_stat - gear_pts[s], total_gear_pts - gear_spent)
                if s_amt > 0:
                    candidates.append(({}, {s: s_amt}))

            # Combined breakpoint jumps for threshold classes
            if cls.job_id == "templar":
                cur_tot_vit = cur_eval["total_stats"]["vit"]
                if cur_tot_vit < 300:
                    deficit = 300 - cur_tot_vit
                    base_add = min(stat_cap - stats["vit"], deficit)
                    rem_def = max(0, deficit - base_add)
                    gear_add = min(max_gear_per_stat - gear_pts["vit"], total_gear_pts - gear_spent, rem_def)
                    candidates.append(
                        ({"vit": base_add} if base_add > 0 else {}, {"vit": gear_add} if gear_add > 0 else {})
                    )
            if cls.job_id == "necromancer":
                cur_tot_int = cur_eval["total_stats"]["int"]
                for bp in (100, 200, 300):
                    if cur_tot_int < bp:
                        deficit = bp - cur_tot_int
                        base_add = min(stat_cap - stats["int"], deficit)
                        rem_def = max(0, deficit - base_add)
                        gear_add = min(max_gear_per_stat - gear_pts["int"], total_gear_pts - gear_spent, rem_def)
                        candidates.append(
                            ({"int": base_add} if base_add > 0 else {}, {"int": gear_add} if gear_add > 0 else {})
                        )
                        break
            if cls.primary_dmg_type in ("magic", "hybrid"):
                cur_tot_dex = cur_eval["total_stats"]["dex"]
                if cur_tot_dex < 150:
                    deficit = 150 - cur_tot_dex
                    base_add = min(stat_cap - stats["dex"], deficit)
                    rem_def = max(0, deficit - base_add)
                    gear_add = min(max_gear_per_stat - gear_pts["dex"], total_gear_pts - gear_spent, rem_def)
                    candidates.append(
                        ({"dex": base_add} if base_add > 0 else {}, {"dex": gear_add} if gear_add > 0 else {})
                    )

        for d_base, d_gp in candidates:
            if not d_base and not d_gp:
                continue
            b_cost = 0
            valid = True
            cand_stats = dict(stats)
            for k, dv in d_base.items():
                if dv <= 0 or cand_stats[k] + dv > stat_cap:
                    valid = False
                    break
                b_cost += _cost_to_raise(cand_stats[k], dv)
                cand_stats[k] += dv
            if not valid or spent + b_cost > total_pts:
                continue

            g_cost = sum(d_gp.values())
            if gear_spent + g_cost > total_gear_pts:
                continue
            cand_gp = dict(gear_pts)
            for k, dg in d_gp.items():
                if dg <= 0 or cand_gp[k] + dg > max_gear_per_stat:
                    valid = False
                    break
                cand_gp[k] += dg
            if not valid:
                continue

            cand_gear = _apply_gear_stats_dict(base_gear, cand_gp)
            new_dps = evaluate_dps(
                cand_stats, p_comb, s_comb, cls, cand_gear, tgt,
                cards_loadout=cards_loadout,
                passives_catalog=passives_cat, sets_catalog=sets_cat,
                fast=True,
            )["total_dps"]

            frac = (b_cost / max(1, total_pts)) + (g_cost / max(1, total_gear_pts) if total_gear_pts > 0 else 0.0)
            if frac <= 0:
                continue
            eff = (new_dps - cur_dps) / frac
            if best_choice is None or eff > best_choice[4]:
                best_choice = (d_base, d_gp, b_cost, g_cost, eff)

        if best_choice is None or best_choice[4] <= 0:
            break

        d_base, d_gp, b_cost, g_cost, _ = best_choice
        for k, dv in d_base.items():
            stats[k] += dv
        for k, dg in d_gp.items():
            gear_pts[k] += dg
        spent += b_cost
        gear_spent += g_cost

    # Spend any leftover base stat points 1 by 1
    for _ in range(80):
        cur_gear_obj = _cur_gear()
        cur_eval = evaluate_dps(
            stats, p_comb, s_comb, cls, cur_gear_obj, tgt,
            cards_loadout=cards_loadout,
            passives_catalog=passives_cat, sets_catalog=sets_cat,
            fast=True,
        )
        cur_dps = cur_eval["total_dps"]
        best_single: Optional[Tuple[str, int, float]] = None

        fine_moves = ["str_int_pair", "dex", "agi", "luk", "vit"] if cls.job_id == "king" else list(ALL_STATS)
        for mv in fine_moves:
            if mv == "str_int_pair":
                if stats["str"] >= stat_cap or stats["int"] >= stat_cap:
                    continue
                c = stat_step_cost(stats["str"]) + stat_step_cost(stats["int"])
                if spent + c > total_pts:
                    continue
                cand = dict(stats)
                cand["str"] += 1
                cand["int"] += 1
            else:
                if stats[mv] >= stat_cap:
                    continue
                c = stat_step_cost(stats[mv])
                if spent + c > total_pts:
                    continue
                cand = dict(stats)
                cand[mv] += 1

            nd = evaluate_dps(
                cand, p_comb, s_comb, cls, cur_gear_obj, tgt,
                cards_loadout=cards_loadout,
                passives_catalog=passives_cat, sets_catalog=sets_cat,
                fast=True,
            )["total_dps"]
            eff = (nd - cur_dps) / max(1, c)
            if best_single is None or eff > best_single[2]:
                best_single = (mv, c, eff)

        if best_single is None or best_single[2] <= 0:
            break
        mv, c, _ = best_single
        if mv == "str_int_pair":
            stats["str"] += 1
            stats["int"] += 1
        else:
            stats[mv] += 1
        spent += c

    final_gear = _cur_gear()
    final_eval = evaluate_dps(
        stats, p_comb, s_comb, cls, final_gear, tgt,
        cards_loadout=cards_loadout,
        passives_catalog=passives_cat, sets_catalog=sets_cat,
    )
    final_eval["points_spent"] = spent
    final_eval["points_remaining"] = max(0, total_pts - spent)
    final_eval["gear_lines_used"] = round(gear_spent / 16.0, 1)
    final_eval["gear_lines_budget"] = gear_lines_budget
    return stats, final_eval, final_gear


def _summarize_set_combo(s_comb: Sequence[str], sets_cat: Dict[str, Dict[str, Any]]) -> str:
    cnt = Counter(s_comb)
    parts: List[str] = []
    for k, v in cnt.items():
        req = int(sets_cat.get(k, {}).get("pieces_required", 2))
        if req == 2:
            parts.append(f"{v}x {k} ({v * 2}pc)")
        else:
            parts.append(f"{k} ({req}pc)")
    return " + ".join(parts)


def _build_panel_stats_dict(ev: Dict[str, Any]) -> Dict[str, Any]:
    """Formats `evaluate_dps` output into the standardized frontend/API `panel_stats` block."""
    return {
        "total_atk": ev["total_atk"],
        "total_matk": ev["total_matk"],
        "max_hp": ev["max_hp"],
        "max_sp": ev["max_sp"],
        "player_def": ev["player_def"],
        "player_mdef": ev["player_mdef"],
        "phys_crit_rate_pct": round(ev["phys_crit_rate"] * 100.0, 2),
        "spell_crit_rate_pct": round(ev["spell_crit_rate"] * 100.0, 2),
        "crit_mult": ev["crit_mult"],
        "phys_pierce_pct": round(ev["phys_pierce"] * 100.0, 2),
        "magic_pierce_pct": round(ev["magic_pierce"] * 100.0, 2),
        "player_hit": ev["player_hit"],
        "player_flee": ev["player_flee"],
        "target_flee": ev["target_flee"],
        "hit_rate_pct": ev["hit_chance_pct"],
        "hit_chance_pct": ev["hit_chance_pct"],
        "hit_formula_note": ev["hit_formula_note"],
        "aspd": ev["aspd"],
        "aspd_cap": ev["aspd_cap"],
        "attacks_per_sec": ev["attacks_per_sec"],
        "aps": ev["aps"],
        "attack_interval_ms": ev["attack_interval_ms"],
        "aspd_formula_note": ev["aspd_formula_note"],
        "hit": ev["player_hit"],
        "gld_vit_mult": ev["gld_vit_mult"],
    }


def _gear_mods_dict(gear: GearProfile) -> Dict[str, Any]:
    """Extracts editable non-6-stat equipment modifiers for the Simulator sliders."""
    return {
        "weapon_refine": int(gear.refine_level),
        "weapon_coating": gear.weapon_coating,
        "is_two_handed": bool(gear.is_two_handed),
        "offhand_type": gear.offhand_type,
        "flat_atk": int(gear.flat_atk),
        "flat_matk": int(gear.flat_matk),
        "atk_pct": round(float(gear.atk_pct), 4),
        "matk_pct": round(float(gear.matk_pct), 4),
        "phys_pierce": round(float(gear.phys_pierce), 4),
        "magic_pierce": round(float(gear.magic_pierce), 4),
        "crit": round(float(gear.crit), 4),
        "mcrit": round(float(gear.mcrit), 4),
        "crit_dmg": round(float(gear.crit_dmg), 4),
        "hit": int(gear.hit),
        "flee": int(gear.flee),
        "aspd_flat": float(gear.aspd_flat),
        "aspd_pct": round(float(gear.aspd_pct), 4),
        "gear_def": int(gear.gear_def),
        "gear_mdef": int(gear.gear_mdef),
        "flat_hp": int(gear.flat_hp),
        "hp_pct": round(float(gear.hp_pct), 4),
        "flat_sp": int(gear.flat_sp),
        "sp_pct": round(float(gear.sp_pct), 4),
    }


def _resolve_target_profile(
    target_preset: str,
    db_meta: Optional[Dict[str, Any]] = None,
    target_def: Optional[int] = None,
    target_mdef: Optional[int] = None,
    target_flee: Optional[int] = None,
    target_element: Optional[str] = None,
    is_pvp: Optional[bool] = None,
) -> TargetProfile:
    """Resolves TargetProfile from MONSTER_PRESETS, SQLite monsters, and field overrides."""
    legacy_preset_aliases = {
        "Boss Dummy (MvP)": "tier6_dark_boss",
        "PvP Target": "pvp_tank",
    }
    resolved_preset = legacy_preset_aliases.get(target_preset, target_preset)
    tgt_base: Optional[TargetProfile] = None
    if resolved_preset in MONSTER_PRESETS:
        preset_t = MONSTER_PRESETS[resolved_preset]
        tgt_base = TargetProfile(
            name=preset_t.name,
            level=preset_t.level,
            target_def=preset_t.target_def,
            target_mdef=preset_t.target_mdef,
            target_flee=preset_t.target_flee,
            element=preset_t.element,
            is_monster=preset_t.is_monster,
            preset_id=preset_t.preset_id,
        )
    elif db_meta and isinstance(db_meta.get("monsters"), list):
        for m in db_meta["monsters"]:
            if m.get("name") == target_preset or m.get("id") == target_preset:
                tgt_base = TargetProfile(
                    name=str(m.get("name", target_preset)),
                    level=int(m.get("level", 120)),
                    target_def=int(m.get("def", 120)),
                    target_mdef=int(m.get("mdef", 120)),
                    target_flee=int(m.get("flee", 300)),
                    element=str(m.get("element", "neutral")),
                    is_monster=bool(m.get("is_monster", True)),
                    preset_id=str(m.get("id", target_preset)),
                )
                break
    if tgt_base is None:
        tgt_base = TargetProfile(name=target_preset or "Boss Dummy (MvP)")

    if target_def is not None:
        tgt_base.target_def = int(target_def)
    if target_mdef is not None:
        tgt_base.target_mdef = int(target_mdef)
    if target_flee is not None:
        tgt_base.target_flee = int(target_flee)
    if target_element is not None:
        tgt_base.element = target_element.lower()
    if is_pvp is not None:
        tgt_base.is_monster = not bool(is_pvp)
    return tgt_base


def optimize_build_api(
    job_id: Any = "templar",
    level: int = 120,
    refine_level: int = 4,
    affix_budget: str = "high",
    weapon_coating: Optional[str] = "light",
    is_two_handed: Optional[bool] = None,
    target_preset: str = "Boss Dummy (MvP)",
    target_def: Optional[int] = None,
    target_mdef: Optional[int] = None,
    target_flee: Optional[int] = None,
    target_element: Optional[str] = None,
    is_pvp: Optional[bool] = None,
    unlocked_passives: Optional[List[str]] = None,
    card_tier_filter: str = "all",
    top_n: int = 5,
    db_meta: Optional[Dict[str, Any]] = None,
    custom_gear: Optional[Dict[str, Any]] = None,
    auto_gear_stats: Optional[bool] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Full API-ready optimization entrypoint.
    Uses SQLite `db_meta` as single source of truth when supplied.
    Supports both clean-slate joint optimization (`auto_gear_stats=True`, allocating
    level-up stat points AND realistic equipment 6-stat lines from scratch) and
    fixed custom gear evaluation.
    """
    cfg_dict: Dict[str, Any] = {}
    if isinstance(job_id, dict):
        cfg_dict.update(job_id)
    if isinstance(params, dict):
        cfg_dict.update(params)

    if cfg_dict:
        job_id = cfg_dict.get("job_id", "templar")
        level = int(cfg_dict.get("level", level))
        refine_level = int(cfg_dict.get("refine_level") if cfg_dict.get("refine_level") is not None else refine_level)
        affix_budget = cfg_dict.get("affix_budget") or affix_budget
        if "weapon_coating" in cfg_dict:
            weapon_coating = cfg_dict.get("weapon_coating")
        is_two_handed = cfg_dict.get("is_two_handed", is_two_handed)
        target_preset = cfg_dict.get("target_preset") or target_preset
        top_n = int(cfg_dict.get("top_n") or cfg_dict.get("top_k") or top_n)
        unlocked_passives = cfg_dict.get("unlocked_passives", unlocked_passives)
        card_tier_filter = cfg_dict.get("card_tier_filter") or card_tier_filter
        custom_gear = cfg_dict.get("custom_gear", custom_gear)
        if "auto_gear_stats" in cfg_dict:
            auto_gear_stats = cfg_dict.get("auto_gear_stats")
        ct = cfg_dict.get("custom_target") or cfg_dict.get("target")
        if isinstance(ct, dict):
            target_def = ct.get("target_def", ct.get("phys_def", ct.get("def", target_def)))
            target_mdef = ct.get("target_mdef", ct.get("magic_def", ct.get("mdef", target_mdef)))
            target_flee = ct.get("target_flee", ct.get("flee", target_flee))
            target_element = ct.get("element", target_element)
            if "is_pvp" in ct:
                is_pvp = bool(ct["is_pvp"])
            elif "is_monster" in ct:
                is_pvp = not bool(ct["is_monster"])

    jobs_cat, passives_cat, sets_cat, cards_cat = build_runtime_catalog(db_meta)

    jid = str(job_id).lower()
    if jid not in jobs_cat:
        raise ValueError(f"Unknown job_id '{job_id}'. Supported: {sorted(jobs_cat.keys())}")
    cls = jobs_cat[jid]

    gear = get_default_gear_for_job(
        jid,
        affix_budget=affix_budget,
        weapon_coating=weapon_coating,
        refine_level=refine_level,
        is_two_handed=is_two_handed,
    )
    gear.level = level

    has_explicit_gear_6stats = False
    if custom_gear:
        if "auto_gear_stats" in custom_gear and auto_gear_stats is None:
            auto_gear_stats = bool(custom_gear["auto_gear_stats"])
        for k, v in custom_gear.items():
            if v is None or k == "auto_gear_stats":
                continue
            if k == "bonus_stats" and isinstance(v, dict):
                if any(bs_v is not None and int(bs_v) > 0 for bs_v in v.values()):
                    has_explicit_gear_6stats = True
                for bs_k, bs_v in v.items():
                    attr_k = "str_v" if bs_k == "str" else ("int_v" if bs_k == "int" else bs_k)
                    if hasattr(gear, attr_k) and isinstance(bs_v, (int, float)):
                        setattr(gear, attr_k, int(bs_v))
            elif k in ALL_STATS and isinstance(v, (int, float)) and int(v) > 0:
                has_explicit_gear_6stats = True
                attr_k = "str_v" if k == "str" else ("int_v" if k == "int" else k)
                setattr(gear, attr_k, int(v))
            elif k == "str":
                gear.str_v = int(v)
            elif k == "int":
                gear.int_v = int(v)
            elif k == "crit_rate":
                gear.crit = float(v)
            elif k == "mcrit_rate":
                gear.mcrit = float(v)
            elif hasattr(gear, k) and k not in ("bonus_stats", "crit_rate", "mcrit_rate"):
                setattr(gear, k, v)

    use_joint_clean_slate = (
        bool(auto_gear_stats) if auto_gear_stats is not None else (not has_explicit_gear_6stats)
    )
    gear_clean_base = _apply_gear_stats_dict(gear, {s: 0 for s in ALL_STATS}) if use_joint_clean_slate else gear
    gear_lines_budget = _gear_lines_budget_for_level(level, affix_budget)

    tgt_base = _resolve_target_profile(
        target_preset,
        db_meta=db_meta,
        target_def=target_def,
        target_mdef=target_mdef,
        target_flee=target_flee,
        target_element=target_element,
        is_pvp=is_pvp,
    )

    total_pts = total_stat_points(level)
    stat_cap = max_stat_cap_for_level(level)

    # Probe stat template for Stage 1 passive/set combo screening
    if jid == "templar":
        probe_stats = {"str": 65, "agi": 35, "vit": min(stat_cap, 119), "int": 1, "dex": 75, "luk": 20}
    elif jid == "king":
        probe_stats = {"str": 85, "agi": 40, "vit": 30, "int": 85, "dex": 75, "luk": 40}
    elif cls.primary_dmg_type == "magic":
        probe_stats = {"str": 1, "agi": 30, "vit": 30, "int": min(stat_cap, 119), "dex": 95, "luk": 40}
    elif cls.is_ranged_dex_atk:
        probe_stats = {"str": 1, "agi": 85, "vit": 25, "int": 1, "dex": min(stat_cap, 119), "luk": 50}
    else:
        probe_stats = {"str": min(stat_cap, 119), "agi": 80, "vit": 25, "int": 1, "dex": 70, "luk": 55}

    # Build ID + case-insensitive display-name lookup for `unlocked_passives`
    passive_lookup: Dict[str, str] = {}
    for pname, pdata in passives_cat.items():
        passive_lookup[pname.lower()] = pname
        for id_k in ("id", "key"):
            if pdata.get(id_k):
                passive_lookup[str(pdata[id_k]).strip().lower()] = pname

    # Filter compatible cross-class passives (excluding own-job innate passives from the 4/4 pool)
    if unlocked_passives:
        raw_pool = []
        seen_raw = set()
        for raw_p in unlocked_passives:
            resolved = passive_lookup.get(str(raw_p).strip().lower())
            if resolved and resolved not in seen_raw:
                seen_raw.add(resolved)
                raw_pool.append(resolved)
    else:
        raw_pool = list(passives_cat.keys())

    compat_passives = [
        p for p in raw_pool
        if p in passives_cat
        and passives_cat[p].get("source_job") != cls.job_id
        and _is_passive_compatible(passives_cat[p], cls, probe_stats)
    ]
    top_passives = _rank_top_passives(
        compat_passives, cls, gear, tgt_base, probe_stats, passives_cat, sets_cat, limit=10
    )

    slot_count = min(4, len(top_passives))
    passive_combos = list(combinations(top_passives, slot_count)) if slot_count > 0 else [()]
    all_set_combos = _generate_valid_set_combos(sets_cat, cls, tgt_base)

    # Pre-screen set_combos using top passive quartet so Stage 1 scales cleanly (< 1s)
    anchor_p = passive_combos[0] if passive_combos else ()
    set_screened: List[Tuple[float, Tuple[str, ...]]] = []
    for s_comb in all_set_combos:
        res_s = evaluate_dps(
            probe_stats, anchor_p, s_comb, cls, gear, tgt_base,
            passives_catalog=passives_cat, sets_catalog=sets_cat, fast=True,
        )
        set_screened.append((res_s["total_dps"], s_comb))
    set_screened.sort(key=lambda x: x[0], reverse=True)
    set_combos: List[Tuple[str, ...]] = [sc for _, sc in set_screened[:10]]
    for s_comb in all_set_combos:
        if "Blood Lord" in s_comb and s_comb not in set_combos:
            set_combos.append(s_comb)
            break

    # Stage 1: Coarse evaluation over (passive_combo x top set_combos)
    stage1_candidates: List[Tuple[float, Tuple[str, ...], Tuple[str, ...]]] = []
    for s_comb in set_combos:
        for p_comb in passive_combos:
            res = evaluate_dps(
                probe_stats, p_comb, s_comb, cls, gear, tgt_base,
                passives_catalog=passives_cat, sets_catalog=sets_cat, fast=True,
            )
            stage1_candidates.append((res["total_dps"], tuple(p_comb), tuple(s_comb)))

    stage1_candidates.sort(key=lambda x: x[0], reverse=True)

    # Keep top 6 distinct (passive, set) combos for Stage 2 full stat allocation optimization
    seen_combos = set()
    stage2_pool: List[Tuple[Tuple[str, ...], Tuple[str, ...]]] = []
    for _, p_c, s_c in stage1_candidates:
        key = (p_c, s_c)
        if key not in seen_combos:
            seen_combos.add(key)
            stage2_pool.append(key)
            if len(stage2_pool) >= 6:
                break

    # Stage 2: Full stat allocation optimization per top combo
    optimized_builds: List[Tuple[float, Dict[str, int], Tuple[str, ...], Tuple[str, ...], Dict[str, Any], GearProfile]] = []
    for p_c, s_c in stage2_pool:
        if use_joint_clean_slate:
            best_s, best_eval, best_g = _joint_optimize_stats_and_gear(
                p_c, s_c, cls, gear_clean_base, tgt_base, total_pts, stat_cap, gear_lines_budget,
                step=15, passives_cat=passives_cat, sets_cat=sets_cat,
            )
        else:
            best_s, best_eval = _optimize_stats_for_combo(
                p_c, s_c, cls, gear, tgt_base, total_pts, stat_cap,
                step=15, passives_cat=passives_cat, sets_cat=sets_cat,
            )
            best_g = gear
        optimized_builds.append((best_eval["total_dps"], best_s, p_c, s_c, best_eval, best_g))

    optimized_builds.sort(key=lambda x: x[0], reverse=True)

    # Pass 2: Joint Card + Ring + Stat Re-Optimization on top candidates
    pass2_count = min(len(optimized_builds), max(3, top_n))
    pass2_builds: List[
        Tuple[float, Dict[str, int], Tuple[str, ...], Tuple[str, ...], Dict[str, Any], float, Dict[str, Any], List[CardSpec], GearProfile]
    ] = []
    for base_dps_no_cards, p1_stats, p_c, s_c, _, p1_gear in optimized_builds[:pass2_count]:
        c_recs_1 = recommend_cards(
            cls=cls,
            gear=p1_gear,
            tgt=tgt_base,
            best_stats=p1_stats,
            p_comb=p_c,
            s_comb=s_c,
            cards_catalog=cards_cat,
            passives_catalog=passives_cat,
            sets_catalog=sets_cat,
            card_tier_filter=card_tier_filter,
        )
        c_objs_1 = [cards_cat[cid] for cid in c_recs_1["chosen_card_ids"] if cid in cards_cat]
        if use_joint_clean_slate:
            reopt_stats, reopt_eval, reopt_gear = _joint_optimize_stats_and_gear(
                p_c, s_c, cls, gear_clean_base, tgt_base, total_pts, stat_cap, gear_lines_budget,
                step=15, passives_cat=passives_cat, sets_cat=sets_cat, cards_loadout=c_objs_1,
            )
        else:
            reopt_stats, reopt_eval = _optimize_stats_for_combo(
                p_c, s_c, cls, gear, tgt_base, total_pts, stat_cap,
                step=15, passives_cat=passives_cat, sets_cat=sets_cat, cards_loadout=c_objs_1,
            )
            reopt_gear = gear
        c_recs_2 = recommend_cards(
            cls=cls,
            gear=reopt_gear,
            tgt=tgt_base,
            best_stats=reopt_stats,
            p_comb=p_c,
            s_comb=s_c,
            cards_catalog=cards_cat,
            passives_catalog=passives_cat,
            sets_catalog=sets_cat,
            card_tier_filter=card_tier_filter,
        )
        c_objs_2 = [cards_cat[cid] for cid in c_recs_2["chosen_card_ids"] if cid in cards_cat]
        final_ev = c_recs_2["final_metrics"]
        final_ev["points_spent"] = reopt_eval["points_spent"]
        final_ev["points_remaining"] = reopt_eval["points_remaining"]
        pass2_builds.append(
            (final_ev["total_dps"], reopt_stats, p_c, s_c, final_ev, base_dps_no_cards, c_recs_2, c_objs_2, reopt_gear)
        )

    pass2_builds.sort(key=lambda x: x[0], reverse=True)

    def _compute_ring_info_for_build(
        b_stats: Dict[str, int],
        p_c: Sequence[str],
        s_c: Sequence[str],
        b_gear: GearProfile,
        b_card_objs: Sequence[CardSpec],
        b_eval: Dict[str, Any],
    ) -> Dict[str, Any]:
        obsidian_gear = replace(b_gear, crit=float(b_gear.crit) + 0.09, flat_atk=max(0, int(b_gear.flat_atk) - 80))
        obsidian_dps = evaluate_dps(
            b_stats, p_c, s_c, cls, obsidian_gear, tgt_base,
            cards_loadout=b_card_objs, passives_catalog=passives_cat, sets_catalog=sets_cat,
        )["total_dps"]
        emerald_gear = replace(b_gear, mcrit=float(b_gear.mcrit) + 0.09, flat_matk=max(0, int(b_gear.flat_matk) - 80))
        emerald_dps = evaluate_dps(
            b_stats, p_c, s_c, cls, emerald_gear, tgt_base,
            cards_loadout=b_card_objs, passives_catalog=passives_cat, sets_catalog=sets_cat,
        )["total_dps"]
        use_obsidian = cls.primary_dmg_type != "magic" and obsidian_dps >= b_eval["total_dps"]
        use_emerald = cls.primary_dmg_type in ("magic", "hybrid") and emerald_dps >= b_eval["total_dps"]
        phys_ring_name = "Obsidian Ring" if use_obsidian else "Physical ATK Ring"
        magic_ring_name = "Emerald Ring" if use_emerald else "Magic MATK Ring"
        if cls.primary_dmg_type == "magic":
            acc1_ring, acc2_ring = magic_ring_name, magic_ring_name
        elif cls.primary_dmg_type == "hybrid":
            acc1_ring, acc2_ring = phys_ring_name, magic_ring_name
        else:
            acc1_ring, acc2_ring = phys_ring_name, phys_ring_name
        return {
            "acc1_name": acc1_ring,
            "acc2_name": acc2_ring,
            "obsidian_ring_delta_dps": round(obsidian_dps - b_eval["total_dps"], 2),
            "emerald_ring_delta_dps": round(emerald_dps - b_eval["total_dps"], 2),
            "rationale": (
                f"Obsidian Ring (+CRIT vs -80 ATK) delta: {round(obsidian_dps - b_eval['total_dps'], 1):+.1f} DPS; "
                f"Emerald Ring (+M.CRIT vs -80 MATK) delta: {round(emerald_dps - b_eval['total_dps'], 1):+.1f} DPS."
            ),
        }

    top_builds: List[Dict[str, Any]] = []
    best_ring_info: Optional[Dict[str, Any]] = None
    best_affix_recs: Optional[Dict[str, Any]] = None

    for rank_idx, (_, b_stats, p_c, s_c, ev, base_no_cards_dps, c_recs_r, c_objs_r, b_gear) in enumerate(pass2_builds[:max(1, top_n)], start=1):
        thresholds: List[str] = []
        tot_st = ev["total_stats"]
        if cls.job_id == "templar":
            thresholds.append(f"GLD {ev['gld_vit_mult']}x (VIT {tot_st['vit']})")
        if ev.get("king_balanced"):
            thresholds.append("Royal Balance (STR = INT)")
        if tot_st.get("dex", 0) >= 150:
            thresholds.append("Instant Variable Cast (DEX >= 150)")
        if ev["aspd"] >= 193.0:
            thresholds.append("ASPD Cap (193)")
        if ev["hit_rate"] >= 1.0:
            thresholds.append("100% HIT")

        r_ring = _compute_ring_info_for_build(b_stats, p_c, s_c, b_gear, c_objs_r, ev)
        r_affixes = recommend_gear_affixes(
            cls=cls,
            gear=b_gear,
            tgt=tgt_base,
            eval_res=ev,
            base_stats=b_stats,
            p_comb=p_c,
            s_comb=s_c,
            card_recs=c_recs_r,
            cards_loadout=c_objs_r,
            passives_catalog=passives_cat,
            sets_catalog=sets_cat,
            ring_choice_info=r_ring,
        )
        if rank_idx == 1:
            best_ring_info = r_ring
            best_affix_recs = r_affixes

        top_builds.append({
            "rank": rank_idx,
            "total_dps": ev["total_dps"],
            "dps_with_cards": ev["total_dps"],
            "base_dps_no_cards": round(base_no_cards_dps, 2),
            "auto_dps": ev["auto_dps"],
            "skill_dps": ev["skill_dps"],
            "base_stats": b_stats,
            "gear_stats": {s: int(b_gear.bonus_stats.get(s, 0)) for s in ALL_STATS},
            "gear_mods": _gear_mods_dict(b_gear),
            "stat_sources": ev.get("stat_sources"),
            "card_bonuses": ev.get("card_bonuses"),
            "total_stats": ev["total_stats"],
            "points_spent": ev["points_spent"],
            "stat_points_used": ev["points_spent"],
            "points_remaining": ev["points_remaining"],
            "passives": list(p_c),
            "innate_class_passives": list(cls.innate_class_passives),
            "passive_slots_used": len(p_c),
            "passive_slots_max": 4,
            "armor_sets": list(s_c),
            "armor_set_summary": _summarize_set_combo(s_c, sets_cat),
            "active_thresholds": thresholds,
            "dps_breakdown": ev["dps_breakdown"],
            "card_recommendations": c_recs_r,
            "gear_affix_recommendations": r_affixes,
            "panel_stats": _build_panel_stats_dict(ev),
        })

    best_entry = pass2_builds[0]
    best_stats, best_p, best_s, best_eval = best_entry[1], best_entry[2], best_entry[3], best_entry[4]
    card_recs, best_card_objs, best_gear = best_entry[6], best_entry[7], best_entry[8]
    ring_info = best_ring_info or _compute_ring_info_for_build(best_stats, best_p, best_s, best_gear, best_card_objs, best_eval)
    gear_affix_recs = best_affix_recs or recommend_gear_affixes(
        cls=cls,
        gear=best_gear,
        tgt=tgt_base,
        eval_res=card_recs["final_metrics"],
        base_stats=best_stats,
        p_comb=best_p,
        s_comb=best_s,
        card_recs=card_recs,
        cards_loadout=best_card_objs,
        passives_catalog=passives_cat,
        sets_catalog=sets_cat,
        ring_choice_info=ring_info,
    )

    # Compare coated vs uncoated build DPS for synergy insights (with cards & identical gear stats)
    uncoated_gear = _apply_gear_stats_dict(
        get_default_gear_for_job(
            jid,
            affix_budget=affix_budget,
            weapon_coating=None,
            refine_level=refine_level,
            is_two_handed=is_two_handed,
        ),
        best_gear.bonus_stats,
    )
    uncoated_gear.level = level
    uncoated_eval = evaluate_dps(
        best_stats, best_p, best_s, cls, uncoated_gear, tgt_base,
        cards_loadout=best_card_objs, passives_catalog=passives_cat, sets_catalog=sets_cat,
    )
    coating_gain_pct = round(
        ((best_eval["total_dps"] - uncoated_eval["total_dps"]) / max(1.0, uncoated_eval["total_dps"])) * 100.0,
        2,
    )

    # Compare top distinct armor set alternatives under the winning passive + card loadout
    seen_set_alts = {tuple(best_s)}
    armor_set_alternatives: List[Dict[str, Any]] = [{
        "armor_sets": list(best_s),
        "armor_set_summary": _summarize_set_combo(best_s, sets_cat),
        "total_dps": best_eval["total_dps"],
        "dps_delta_pct": 0.0,
        "is_recommended": True,
    }]
    for _, _, s_alt in stage1_candidates:
        s_key = tuple(s_alt)
        if s_key in seen_set_alts:
            continue
        seen_set_alts.add(s_key)
        alt_ev = evaluate_dps(
            best_stats, best_p, s_alt, cls, best_gear, tgt_base,
            cards_loadout=best_card_objs, passives_catalog=passives_cat, sets_catalog=sets_cat,
        )
        armor_set_alternatives.append({
            "armor_sets": list(s_alt),
            "armor_set_summary": _summarize_set_combo(s_alt, sets_cat),
            "total_dps": alt_ev["total_dps"],
            "dps_delta_pct": round(((alt_ev["total_dps"] - best_eval["total_dps"]) / max(1.0, best_eval["total_dps"])) * 100.0, 2),
            "is_recommended": False,
        })
        if len(armor_set_alternatives) >= 5:
            break

    return {
        "job": {
            "id": cls.job_id,
            "job_id": cls.job_id,
            "name": cls.name,
            "weapon_type": cls.weapon_type,
            "weapon_name": cls.weapon_name,
            "offhand_type": best_gear.offhand_type or cls.offhand_type,
            "is_two_handed": best_gear.is_two_handed,
            "primary_dmg_type": cls.primary_dmg_type,
            "base_aspd": cls.base_aspd,
            "max_stat_cap": stat_cap,
            "innate_class_passives": list(cls.innate_class_passives),
        },
        "coating_comparison": {
            "active_coating": best_gear.weapon_coating,
            "coated_dps": best_eval["total_dps"],
            "uncoated_dps": uncoated_eval["total_dps"],
            "light_coating_gain_pct": coating_gain_pct,
        },
        "config": {
            "level": level,
            "stat_cap": stat_cap,
            "total_stat_points": total_pts,
            "refine_level": best_gear.refine_level,
            "affix_budget": affix_budget,
            "weapon_coating": best_gear.weapon_coating,
            "is_two_handed": best_gear.is_two_handed,
            "card_tier_filter": card_tier_filter,
            "clean_slate": use_joint_clean_slate,
            "gear_lines_budget": gear_lines_budget,
        },
        "target": {
            "name": tgt_base.name,
            "level": tgt_base.level,
            "phys_def": tgt_base.phys_def,
            "magic_def": tgt_base.magic_def,
            "flee": tgt_base.flee,
            "element": tgt_base.element,
            "is_pvp": tgt_base.is_pvp,
            "phys_dr_pct": round(calc_def_reduction(tgt_base.phys_def) * 100.0, 2),
            "magic_dr_pct": round(calc_def_reduction(tgt_base.magic_def) * 100.0, 2),
        },
        "top_builds": top_builds,
        "armor_set_alternatives": armor_set_alternatives,
        "card_recommendations": card_recs,
        "gear_affix_recommendations": gear_affix_recs,
        "search_space": {
            "compatible_passives": len(compat_passives),
            "evaluated_top_passives": len(top_passives),
            "passive_combos_checked": len(passive_combos),
            "set_combos_checked": len(set_combos),
            "stage1_total_evals": len(stage1_candidates),
            "stage2_full_stat_optimizations": len(stage2_pool),
        },
    }


def evaluate_build_api(
    job_id: str = "templar",
    level: int = 150,
    base_stats: Optional[Dict[str, int]] = None,
    gear_stats: Optional[Dict[str, int]] = None,
    gear_mods: Optional[Dict[str, Any]] = None,
    passives: Optional[Sequence[str]] = None,
    armor_sets: Optional[Sequence[str]] = None,
    cards_by_slot: Optional[Dict[str, Optional[str]]] = None,
    target_preset: str = "tier6_dark_boss",
    target_def: Optional[int] = None,
    target_mdef: Optional[int] = None,
    target_flee: Optional[int] = None,
    target_element: Optional[str] = None,
    is_pvp: Optional[bool] = None,
    db_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Fast single-build evaluation entrypoint for interactive Simulator slider & card adjustments.
    Uses exact same `evaluate_dps` math as `optimize_build_api`.
    """
    jobs_cat, passives_cat, sets_cat, cards_cat = build_runtime_catalog(db_meta)
    jid = str(job_id).lower()
    if jid not in jobs_cat:
        raise ValueError(f"Unknown job_id '{job_id}'")
    cls = jobs_cat[jid]

    gm = dict(gear_mods or {})
    refine_level = int(gm.get("weapon_refine", gm.get("refine_level", 4)))
    coating = gm.get("weapon_coating", "light")
    is_2h = gm.get("is_two_handed", cls.is_two_handed)
    gear = get_default_gear_for_job(
        jid,
        affix_budget="high",
        weapon_coating=coating,
        refine_level=refine_level,
        is_two_handed=is_2h,
    )
    gear.level = int(level)
    for mod_k, mod_v in gm.items():
        if mod_v is None or mod_k in ("weapon_refine", "bonus_stats"):
            continue
        if mod_k == "crit_rate":
            gear.crit = float(mod_v)
        elif mod_k == "mcrit_rate":
            gear.mcrit = float(mod_v)
        elif hasattr(gear, mod_k):
            cur_attr = getattr(gear, mod_k)
            if isinstance(cur_attr, bool):
                setattr(gear, mod_k, bool(mod_v))
            elif isinstance(cur_attr, int):
                setattr(gear, mod_k, int(mod_v))
            elif isinstance(cur_attr, float):
                setattr(gear, mod_k, float(mod_v))
            else:
                setattr(gear, mod_k, mod_v)

    if gear_stats is not None:
        gear = _apply_gear_stats_dict(gear, {s: int(gear_stats.get(s, 0)) for s in ALL_STATS})

    # Recompute weapon refine ATK/MATK if user moved refine slider without explicitly locking flat_atk/matk
    if "flat_atk" not in gm or gm.get("recalc_refine_atk"):
        base_r10 = get_default_gear_for_job(jid, "high", coating, 10, is_2h)
        cur_rx = get_default_gear_for_job(jid, "high", coating, refine_level, is_2h)
        if "flat_atk" not in gm:
            gear.flat_atk = cur_rx.flat_atk
        if "flat_matk" not in gm:
            gear.flat_matk = cur_rx.flat_matk
        # Adjust refine pierce difference relative to +10 if caller passed default pierce
        _ = base_r10

    stat_cap = max_stat_cap_for_level(level)
    total_pts = total_stat_points(level)
    clean_base = {s: max(1, min(stat_cap, int((base_stats or {}).get(s, 1)))) for s in ALL_STATS}
    points_spent = sum(stat_cost(clean_base[s]) for s in ALL_STATS)

    # Resolve passives (accept display name or id)
    p_lookup: Dict[str, str] = {}
    for pname, pdata in passives_cat.items():
        p_lookup[pname.lower()] = pname
        for id_k in ("id", "key"):
            if pdata.get(id_k):
                p_lookup[str(pdata[id_k]).strip().lower()] = pname
    resolved_passives: List[str] = []
    for raw_p in (passives or []):
        rp = p_lookup.get(str(raw_p).strip().lower())
        if rp and rp not in resolved_passives:
            resolved_passives.append(rp)
    resolved_passives = resolved_passives[:4]

    tgt_base = _resolve_target_profile(
        target_preset,
        db_meta=db_meta,
        target_def=target_def,
        target_mdef=target_mdef,
        target_flee=target_flee,
        target_element=target_element,
        is_pvp=is_pvp,
    )

    # Resolve 10-slot card loadout
    chosen_cards: List[CardSpec] = []
    cards_detail: Dict[str, Optional[Dict[str, Any]]] = {}
    slot_keys = (
        ("weapon_1", "weapon_2", "head_upper", "head_mid", "head_lower", "body", "garment", "shoes", "accessory_1", "accessory_2")
        if gear.is_two_handed
        else ("weapon_1", "shield", "head_upper", "head_mid", "head_lower", "body", "garment", "shoes", "accessory_1", "accessory_2")
    )
    for sk in slot_keys:
        cid = (cards_by_slot or {}).get(sk)
        if cid and cid in cards_cat:
            cobj = cards_cat[cid]
            chosen_cards.append(cobj)
            cards_detail[sk] = {
                "equip_slot": sk,
                "card_id": cobj.card_id,
                "name": cobj.name,
                "tier": cobj.tier,
                "is_limited": cobj.is_limited,
                "removable": cobj.removable,
                "bonuses": dict(cobj.bonuses),
                "mechanics": list(getattr(cobj, "mechanics", ()) or ()),
                "source_monsters": list(cobj.source_monsters),
                "description": cobj.description,
            }
        else:
            cards_detail[sk] = None
    if gear.is_two_handed:
        cards_detail["shield"] = None

    # Resolve armor sets (accept display name or canonical set id)
    s_lookup: Dict[str, str] = {}
    for sname, sdata in sets_cat.items():
        s_lookup[sname.lower()] = sname
        for id_k in ("id", "key"):
            if sdata.get(id_k):
                s_lookup[str(sdata[id_k]).strip().lower()] = sname
    resolved_sets: List[str] = [
        s_lookup.get(str(raw_s).strip().lower(), str(raw_s))
        for raw_s in (armor_sets or ())
        if raw_s
    ]

    ev = evaluate_dps(
        clean_base, resolved_passives, resolved_sets, cls, gear, tgt_base,
        cards_loadout=chosen_cards, passives_catalog=passives_cat, sets_catalog=sets_cat,
    )

    thresholds: List[str] = []
    tot_st = ev["total_stats"]
    if cls.job_id == "templar":
        thresholds.append(f"GLD {ev['gld_vit_mult']}x (VIT {tot_st['vit']})")
    if ev.get("king_balanced"):
        thresholds.append("Royal Balance (STR = INT)")
    if tot_st.get("dex", 0) >= 150:
        thresholds.append("Instant Variable Cast (DEX >= 150)")
    if ev["aspd"] >= 193.0:
        thresholds.append("ASPD Cap (193)")
    if ev["hit_rate"] >= 1.0:
        thresholds.append("100% HIT")

    return {
        "total_dps": ev["total_dps"],
        "auto_dps": ev["auto_dps"],
        "skill_dps": ev["skill_dps"],
        "dps_breakdown": ev["dps_breakdown"],
        "base_stats": clean_base,
        "gear_stats": {s: int(gear.bonus_stats.get(s, 0)) for s in ALL_STATS},
        "gear_mods": _gear_mods_dict(gear),
        "total_stats": ev["total_stats"],
        "stat_sources": ev["stat_sources"],
        "card_bonuses": ev["card_bonuses"],
        "cards_by_slot": cards_detail,
        "passives": resolved_passives,
        "armor_sets": resolved_sets,
        "points_spent": points_spent,
        "total_stat_points": total_pts,
        "points_remaining": total_pts - points_spent,
        "stat_cap": stat_cap,
        "active_thresholds": thresholds,
        "active_card_mechanics": ev.get("active_card_mechanics", []),
        "panel_stats": _build_panel_stats_dict(ev),
    }


def optimize_build(
    job_id: str = "templar",
    level: int = 120,
    refine_level: int = 4,
    target_preset: str = "Boss Dummy (MvP)",
    top_n: int = 5,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Convenience CLI / test wrapper around `optimize_build_api`."""
    return optimize_build_api(
        job_id=job_id,
        level=level,
        refine_level=refine_level,
        target_preset=target_preset,
        top_n=top_n,
        **kwargs,
    )
