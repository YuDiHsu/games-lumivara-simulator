"""
Lumivara Online — Complete Job Specifications (15 Jobs), Cross-Class Passives (56),
Armor Sets (11 Sets: 2pc / 4pc / 6pc), Monster Cards (102 Wiki Cards), and Target Presets.
Synced 100% with `data/wiki_ground_truth.json` and supports dynamic SQLite `get_all_meta()` overrides.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .combat_math import calc_refine_atk_matk, max_stat_cap_for_level
from .models import CardSpec, ClassProfile, GearProfile, SkillSpec, TargetProfile

GROUND_TRUTH_PATH = Path(__file__).resolve().parents[2] / "data" / "wiki_ground_truth.json"


def _load_ground_truth() -> Dict[str, Any]:
    if GROUND_TRUTH_PATH.exists():
        try:
            return json.loads(GROUND_TRUTH_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


# ==============================================================================
# Key Normalization Helpers (supports both snake_case SQLite & camelCase Wiki JSON)
# ==============================================================================
_BONUS_KEY_MAP: Dict[str, Tuple[str, float]] = {
    "str": ("str", 1.0),
    "agi": ("agi", 1.0),
    "vit": ("vit", 1.0),
    "int": ("int", 1.0),
    "dex": ("dex", 1.0),
    "luk": ("luk", 1.0),
    "atk": ("flat_atk", 1.0),
    "flat_atk": ("flat_atk", 1.0),
    "matk": ("flat_matk", 1.0),
    "flat_matk": ("flat_matk", 1.0),
    "hp": ("flat_hp", 1.0),
    "flat_hp": ("flat_hp", 1.0),
    "sp": ("flat_sp", 1.0),
    "flat_sp": ("flat_sp", 1.0),
    "def": ("def", 1.0),
    "mdef": ("mdef", 1.0),
    "hit": ("hit", 1.0),
    "flee": ("flee", 1.0),
    "aspd": ("aspd_flat", 1.0),
    "aspd_flat": ("aspd_flat", 1.0),
    "atkPct": ("atk_pct", 0.01),
    "atk_pct": ("atk_pct", 1.0),
    "matkPct": ("matk_pct", 0.01),
    "matk_pct": ("matk_pct", 1.0),
    "hp_pct": ("hp_pct", 1.0),
    "sp_pct": ("sp_pct", 1.0),
    "pierce": ("phys_pierce", 0.01),
    "phys_pierce": ("phys_pierce", 1.0),
    "mpierce": ("magic_pierce", 0.01),
    "magic_pierce": ("magic_pierce", 1.0),
    "crit": ("crit", 0.01),
    "mcrit": ("mcrit", 0.01),
    "critDmg": ("crit_dmg", 0.01),
    "crit_dmg": ("crit_dmg", 1.0),
    "aspd_pct": ("aspd_pct", 1.0),
    "hit_pct": ("hit_pct", 1.0),
    "flee_pct": ("flee_pct", 1.0),
    "castReduce": ("cast_reduce_pct", 0.01),
    "cast_reduce_pct": ("cast_reduce_pct", 1.0),
    "earthDmg": ("earth_dmg", 0.01),
    "earth_dmg": ("earth_dmg", 1.0),
    "moveSpeed": ("move_speed_pct", 0.01),
    "move_speed_pct": ("move_speed_pct", 1.0),
    "lifesteal": ("lifesteal_pct", 0.01),
    "reflect": ("reflect_pct", 0.01),
    "spRegen": ("sp_regen", 1.0),
    "resStun": ("res_stun", 0.01),
    "resFreeze": ("res_freeze", 0.01),
    "resBurn": ("res_burn", 0.01),
    "freezeHit": ("freeze_hit", 0.01),
    "dealtCut": ("dealt_cut_pct", 0.01),
}

_CARD_MECHANIC_FLAGS = {
    "mMagicWard", "mLantern", "mOpener", "mRage", "mFoxTails", "mWeakSpot",
    "mFarShot", "mStarShield", "mMeteor", "mReef", "mLure", "mTideSong",
    "mGrasp", "mSwarm", "mExecute", "mBulwark", "mTitan", "mMoonDust",
    "mFullMoon", "mLowGravity", "mEclipse", "mCatchMe", "mHug", "mSurprise",
    "mCrack", "mBounce", "mCocoa", "mSoft", "mMelt", "mTani", "mNaga", "mQuake",
}


def normalize_bonuses(raw: Dict[str, Any], from_wiki_percent: bool = False) -> Dict[str, float]:
    """
    Normalize bonus dictionary into canonical engine keys (fractional percentages 0.03 = 3%).
    If `from_wiki_percent` is True, camelCase Wiki values like `atkPct: 3` or `crit: 7` are scaled by 0.01.
    If already normalized (snake_case from SQLite), fractional keys are kept as-is, while `crit`/`mcrit`
    if > 1.0 (e.g. 7 instead of 0.07) are safely converted to fractional `0.07`.
    """
    out: Dict[str, float] = {}
    for k, v in (raw or {}).items():
        if not isinstance(v, (int, float)):
            continue
        if k in _CARD_MECHANIC_FLAGS:
            out[k] = float(v)
            continue
        if k in _BONUS_KEY_MAP:
            norm_k, scale = _BONUS_KEY_MAP[k]
            if not from_wiki_percent and k in ("crit", "mcrit"):
                # In normalized SQLite schema, crit/mcrit are fractional (e.g. 0.07); if >= 1.0, scale 0.01
                val = float(v) * (0.01 if abs(float(v)) >= 1.0 else 1.0)
            elif not from_wiki_percent and k in ("atk_pct", "matk_pct", "phys_pierce", "magic_pierce", "crit_dmg", "hp_pct", "sp_pct", "aspd_pct"):
                val = float(v)
            else:
                val = float(v) * scale
            out[norm_k] = out.get(norm_k, 0.0) + val
        else:
            out[k] = float(v)
    return out


# ==============================================================================
# 1. Cross-Class Passives (4/4 Slot Limit, Lv.10 Values, Wiki Conditions)
# ==============================================================================
PASSIVES: Dict[str, Dict[str, Any]] = {
    "Close-Combat Mastery": {
        "key": "swordmastery",
        "source_job": "swordman",
        "atk_pct": 0.60,
        "aspd_pct": 0.20,
        "melee_only": True,
        "category": "Melee Physical",
        "description": "Melee weapons (incl. Katana & Lionheart Aegis, excl. Rod/Staff): ATK +60%, ASPD +20%.",
    },
    "Vigor": {
        "key": "hprecovery",
        "source_job": "swordman",
        "hp_to_atk": 0.10,
        "category": "HP / Physical",
        "description": "Converts 10% of Body/MaxHP into flat ATK; boosts HP regen.",
    },
    "Iron Body": {
        "key": "ironbody",
        "source_job": "swordman",
        "vit": 20,
        "hp_pct": 0.05,
        "category": "Tank / VIT",
        "description": "VIT +20, MaxHP +5%.",
    },
    "Zanshin": {
        "key": "zanshin",
        "source_job": "kensei",
        "crit_dmg": 0.30,
        "agi_to_atk": 0.50,
        "category": "Crit / AGI",
        "description": "Crit Damage +30%, converts 50% of AGI into flat ATK.",
    },
    "Fatal Sense": {
        "key": "fatalsense",
        "source_job": "thief",
        "crit_dmg": 0.20,
        "aspd_pct": 0.10,
        "agi_to_atk": 0.55,
        "category": "Crit / ASPD",
        "description": "Crit Damage +20%, ASPD +10%, converts 55% of AGI into flat ATK.",
    },
    "Twin Strike": {
        "key": "doubleattack",
        "source_job": "thief",
        "double_hit_chance": 0.50,
        "hit": 10,
        "melee_only": True,
        "category": "Melee Auto",
        "description": "Melee only: 50% chance for double auto-attack (always hits on proc), HIT +10.",
    },
    "Weight Training": {
        "key": "weighttraining",
        "source_job": "merchant",
        "str": 10,
        "atk_pct": 0.45,
        "weight_atk": 45.0,
        "category": "Physical ATK",
        "description": "STR +10, ATK +45%, +45 flat ATK from carry weight (+1000 max weight).",
    },
    "Sacred & Divine": {
        "key": "demonbane",
        "source_job": "acolyte",
        "def": 20,
        "mdef": 30,
        "atk_pct": 0.25,
        "matk_pct": 0.25,
        "category": "Hybrid / Defensive",
        "description": "DEF +20, MDEF +30, ATK +25%, MATK +25%.",
    },
    "Light & Shadow": {
        "key": "lightshadow",
        "source_job": "acolyte",
        "light_dark_dmg": 0.20,
        "cd_red": 0.10,
        "category": "Elemental / CDR",
        "description": "Light & Dark Damage +20% (physical & magic), Skill Cooldown -10%. Innate for Cleric.",
    },
    "Keen Eye": {
        "key": "owleye",
        "source_job": "archer",
        "dex": 20,
        "hit_pct": 0.10,
        "dex_to_atk": 0.45,
        "hit_to_atk": 0.20,
        "category": "Precision / ATK",
        "description": "DEX +20, Total HIT +10%, converts 45% DEX and 20% HIT into flat ATK.",
    },
    "Far Sight": {
        "key": "vultureeye",
        "source_job": "archer",
        "ranged_only": True,
        "bow_dmg_pct": 0.60,
        "ranged_dmg_pct": 0.20,
        "category": "Ranged",
        "description": "Ranged weapons: +60% damage with Bow (Archer) or +20% damage with other ranged weapons.",
    },
    "Elemental Quiver": {
        "key": "elementalquiver",
        "source_job": "archer",
        "coated_dmg": 0.15,
        "category": "Elemental Coating",
        "description": "When weapon is coated with an element, basic attacks & skills deal +15% damage.",
    },
    "Elemental Resonance": {
        "key": "elementalresonance",
        "source_job": "mage",
        "elem_dmg": 0.10,
        "category": "Elemental",
        "description": "Party aura: all non-neutral elemental damage +10% (physical & magic).",
    },
    "Mentality": {
        "key": "mentality",
        "source_job": "mage",
        "int": 20,
        "sp_pct": 0.10,
        "sp_to_matk": 0.15,
        "dex_to_matk": 1.50,
        "matk_pct": 0.60,
        "category": "Magic MATK",
        "description": "INT +20, MaxSP +10%, MATK +60%, converts 15% MaxSP & 150% DEX to flat MATK.",
    },
    "Alchemy Mastery": {
        "key": "alchemymastery",
        "source_job": "nekobaku",
        "matk_pct": 0.50,
        "category": "Magic / Hybrid",
        "description": "MATK +50%.",
    },
    "Feline Reflex": {
        "key": "catreflex",
        "source_job": "nekobaku",
        "aspd_pct": 0.10,
        "agi_to_matk": 0.40,
        "category": "Hybrid / Speed",
        "description": "ASPD +10%, converts 40% of AGI into flat MATK.",
    },
    "Meditation": {
        "key": "sp_recovery",
        "source_job": "mage",
        "sp_regen": 5,
        "category": "Magic Sustain",
        "description": "+5 SP regen per tick, -40% skill SP cost.",
    },
    "Katana Mastery": {
        "key": "katanamastery",
        "source_job": "kensei",
        "katana_only": True,
        "atk_pct": 0.40,
        "crit": 0.10,
        "category": "Katana",
        "description": "Katana only: ATK +40%, CRIT +10%.",
    },
    "Shukuchi": {
        "key": "shukuchi",
        "source_job": "kensei",
        "flee_pct": 0.10,
        "move_speed_pct": 0.20,
        "category": "Speed / Evasion",
        "description": "Move Speed +20%, FLEE +10%.",
    },
    "Fleet Foot": {
        "key": "improvedodge",
        "source_job": "thief",
        "flee_pct": 0.20,
        "move_speed_pct": 0.15,
        "category": "Speed / Evasion",
        "description": "FLEE +20%, Move Speed +15%.",
    },
    "Fair Value": {
        "key": "peratio",
        "source_job": "king",
        "str_eq_int_only": True,
        "phys_pierce": 0.10,
        "magic_pierce": 0.10,
        "category": "Royal Balance (STR=INT)",
        "description": "Active only when Total STR == Total INT: Physical Pierce +10%, Magic Pierce +10%.",
    },
    "HFT": {
        "key": "priceceiling",
        "source_job": "king",
        "str_eq_int_only": True,
        "cd_red": 0.15,
        "luk": 30,
        "category": "Royal Balance (STR=INT)",
        "description": "Active only when Total STR == Total INT: Skill Cooldown -15%, LUK +30.",
    },
    "Cash Flow": {
        "key": "pricefloor",
        "source_job": "king",
        "str_eq_int_only": True,
        "category": "Royal Balance (STR=INT)",
        "description": "Active only when Total STR == Total INT: basic attacks restore SP (disables external SP leech).",
    },
    "Sovereign Dividend Yield": {
        "key": "sovereigndividend",
        "source_job": "king",
        "dmg_pct": 0.25,
        "category": "Single-Target Ramp",
        "description": "Consecutive hits on same target stack +2.5% damage up to 10x (+25% damage).",
    },
    "Battle Momentum": {
        "key": "battlemomentum",
        "source_job": "swordman",
        "aspd_pct": 0.50,
        "cd_cut_sec": 0.20,
        "category": "Skill / ASPD",
        "description": "Active skills grant up to 5 stacks: ASPD +10% per stack (up to +50% ASPD at Lv.10) & -0.2s CD.",
    },
    "Spellweave Synergy": {
        "key": "spellweave",
        "source_job": "mage",
        "cast_reduce_pct": 0.15,
        "mcrit": 0.10,
        "category": "Magic / Cast",
        "description": "After casting a skill: -15% Cast Time and +10% Magic CRIT for 5s.",
    },
    "Solari Judgment": {
        "key": "solarijudgment",
        "source_job": "acolyte",
        "solari_proc_matk": 1.50,  # 30% chance * 500% MATK Light beam on offensive skill hit
        "category": "Magic Proc",
        "description": "30% chance on offensive skill hit to call a 500% MATK Light beam.",
    },
    "Twilight Equilibrium": {
        "key": "twilightequilibrium",
        "source_job": "acolyte",
        "next_skill_dmg_pct": 0.20,
        "category": "Hybrid / Support",
        "description": "Alternating heal/buff and attack grants +20% next offensive skill damage (not active in pure attack rotation).",
    },
    "Venom Mastery": {
        "key": "venommastery",
        "source_job": "mamushi",
        "kunai_only": True,
        "atk_pct": 0.15,
        "category": "Kunai",
        "description": "Kunai only: Snake Venom damage +100%, ATK +15%.",
    },
    "Numbing Toxin": {
        "key": "numbingtoxin",
        "source_job": "mamushi",
        "kunai_only": True,
        "hit": 100,
        "category": "Kunai / Precision",
        "description": "Kunai only: HIT +100 and reduces poisoned target HIT.",
    },
    "Predator's Patience": {
        "key": "predator",
        "source_job": "mamushi",
        "kunai_only": True,
        "dmg_pct": 0.45,
        "category": "Kunai / Burst",
        "description": "Kunai only: +45% physical damage against poisoned targets.",
    },
    "Cold-Blooded Precision": {
        "key": "coldblooded",
        "source_job": "mamushi",
        "crit_dmg": 0.20,
        "phys_pierce": 0.05,
        "category": "Crit / Pierce",
        "description": "Against poisoned targets: Crit Damage +20%, Ignore DEF +5%.",
    },
    "Fresh Blood": {
        "key": "ironhide",
        "source_job": "ironfist",
        "cestus_only": True,
        "dmg_pct": 0.20,
        "category": "Cestus",
        "description": "Cestus only: +20% damage vs targets above 85% HP.",
    },
    "Ironclad Knuckle Conversion": {
        "key": "ironcladknuckle",
        "source_job": "ironfist",
        "def_to_atk_pct": 0.60,
        "category": "DEF -> ATK",
        "description": "Converts 60% of total DEF into flat ATK.",
    },
    "Piston Rhythm": {
        "key": "pistonrhythm",
        "source_job": "ironfist",
        "cd_red": 0.10,
        "category": "Crit / CDR",
        "description": "Basic attack crits reduce remaining active skill cooldowns by 0.5s.",
    },
    "Sacred Guillotine Chain": {
        "key": "sacredguillotine",
        "source_job": "templar",
        "auto_atk_proc_scale": 1.748,
        "category": "Auto-Attack Proc",
        "description": "Every 5th basic attack triggers a 4-hit Sacred Guillotine chain (190% base + 10%/hit = 874% / 5 = 174.8%/auto).",
    },
    "Colossus Radiant Bash": {
        "key": "colossusbash",
        "source_job": "templar",
        "aegis_only": True,
        "auto_atk_proc_scale": 0.4025,
        "auto_hp_proc_scale": 0.021,
        "category": "Lionheart Aegis Proc",
        "description": "Lionheart Aegis only: 35% chance on basic attack for 115% ATK + 6% MaxHP (can crit).",
    },
    "Soul-Lantern Harvest": {
        "key": "soullantern",
        "source_job": "necromancer",
        "matk_pct": 0.35,
        "summon_dmg_pct": 0.50,
        "category": "Magic Ramp",
        "description": "Collects up to 5 soul wisps (+7% MATK & +10% Summon Dmg per wisp -> +35% MATK & +50% Summon Dmg).",
    },
    "Akatsuki Kenki": {
        "key": "akatsukikenki",
        "source_job": "kensei",
        "auto_atk_proc_scale": 0.25,
        "category": "Auto-Attack Cleave",
        "description": "After 10 crits or kill: +60 attack range and 50% ATK splash around target.",
    },
    "Kasumi Edge": {
        "key": "kasumiedge",
        "source_job": "kensei",
        "auto_atk_proc_scale": 0.25,
        "category": "Auto-Attack Proc",
        "description": "20% chance on basic attack (5s CD) for 2 extra hits of 450% ATK.",
    },
    "Unstable Concoction": {
        "key": "unstableconcoction",
        "source_job": "nekobaku",
        "solari_proc_matk": 0.525,
        "category": "Magic Proc",
        "description": "35% chance on skill hit to trigger Freeze, -15% MDEF, or 150% MATK explosion.",
    },
    "Call of Poon-poon": {
        "key": "callpoon",
        "source_job": "sinister",
        "companion_atk_scale": 0.50,
        "category": "Companion",
        "description": "Summons immortal Poon-poon dog companion attacking every 2nd strike (innate for Sinister).",
    },
    "Nine Lives": {
        "key": "ninelives",
        "source_job": "nekobaku",
        "category": "Survival",
        "description": "Survive lethal monster hit and heal 30% MaxHP (5m CD, PvE only).",
    },
    "Last Stand": {
        "key": "fivetriple",
        "source_job": "ironfist",
        "category": "Survival",
        "description": "Survive lethal damage at 1 HP with 5s invulnerability (30s CD).",
    },
    "Blessed Searing Judgment": {
        "key": "blessedjudgment",
        "source_job": "acolyte",
        "category": "Support / Blind",
        "description": "+15% Heal Power and +40% damage vs Blinded enemies.",
    },
    "Unyielding Grit": {
        "key": "unyieldinggrit",
        "source_job": "swordman",
        "category": "Survival",
        "description": "Below 30% HP: -15% incoming damage and +15% potion recovery.",
    },
    "Arcane Conduit": {
        "key": "arcaneconduit",
        "source_job": "mage",
        "category": "Sustain",
        "description": "Casting a skill heals 3% MaxHP every 2.5s.",
    },
    "Reinforced Cart Wheels": {
        "key": "cartwheels",
        "source_job": "merchant",
        "move_speed_pct": 0.20,
        "category": "Mobility",
        "description": "Move Speed +20%.",
    },
    "Heavy Cart Armor": {
        "key": "heavycart",
        "source_job": "merchant",
        "category": "Survival",
        "description": "-12% incoming damage when carrying >50% weight.",
    },
    "Evasive Counterstep": {
        "key": "counterstep",
        "source_job": "thief",
        "category": "Dodge Counter",
        "description": "75% chance on dodge to counterattack for 150% ATK and restore 10 SP (2s CD).",
    },
    "Combo Point Finisher": {
        "key": "combofinisher",
        "source_job": "thief",
        "skill_dmg_pct": 0.10,
        "category": "Melee Combo",
        "description": "5 Twin Strike procs empower next offensive skill with +50% ATK and 7% MaxHP heal.",
    },
    "Shedding Skin": {
        "key": "sheddingskin",
        "source_job": "mamushi",
        "category": "Survival / FLEE",
        "description": "Taking >20% MaxHP hit cleanses ailments and grants +40% FLEE & +20% Move Speed.",
    },
    "Grim Purr-session": {
        "key": "grimpurr",
        "source_job": "necromancer",
        "category": "Utility / Anti-Heal",
        "description": "30% chance on magic hit to reverse enemy healing into 195% Dark damage.",
    },
    "Feline Pact": {
        "key": "felinepact",
        "source_job": "necromancer",
        "category": "Summon Defense",
        "description": "All summons take -20% damage.",
    },
    "Market Circuit-Breaker": {
        "key": "circuitbreaker",
        "source_job": "king",
        "category": "Survival",
        "description": "Caps single-hit incoming damage at 25% MaxHP (20s CD).",
    },
    "Poon-poon Ankle Clamp": {
        "key": "ankleclamp",
        "source_job": "sinister",
        "category": "Debuff / FLEE Cut",
        "description": "Poon-poon bites have 15% chance to Root and cut target FLEE by -30%.",
    },
}


# ==============================================================================
# 2. Armor Set Bonuses (All 11 Wiki Sets: 2pc, 4pc, and 6pc across 6 slots)
# ==============================================================================
TWO_PIECE_SETS: Dict[str, Dict[str, Any]] = {
    "Armor Breaker": {
        "key": "breaker",
        "pieces_required": 2,
        "max_stacks": 3,
        "phys_pierce": 0.07,
        "description": "2pc: +7% Physical Pierce (up to +21% with 3 stacks).",
    },
    "Spell Breaker": {
        "key": "spellbreaker",
        "pieces_required": 2,
        "max_stacks": 3,
        "magic_pierce": 0.07,
        "description": "2pc: +7% Magic Pierce (up to +21% with 3 stacks).",
    },
    "Warlord": {
        "key": "might",
        "pieces_required": 2,
        "max_stacks": 3,
        "atk_pct": 0.10,
        "description": "2pc: +10% Physical ATK (up to +30% with 3 stacks).",
    },
    "Archmage": {
        "key": "arcana",
        "pieces_required": 2,
        "max_stacks": 3,
        "matk_pct": 0.10,
        "description": "2pc: +10% Magic MATK (up to +30% with 3 stacks).",
    },
    "Lucky Star": {
        "key": "fortune",
        "pieces_required": 2,
        "max_stacks": 3,
        "crit": 0.10,
        "description": "2pc: +10% Physical CRIT Rate (up to +30% with 3 stacks).",
    },
    "Executioner": {
        "key": "executioner",
        "pieces_required": 2,
        "max_stacks": 3,
        "crit_dmg": 0.15,
        "description": "2pc: +15% Critical Damage (up to +45% with 3 stacks).",
    },
    "Iron Bastion": {
        "key": "bastion",
        "pieces_required": 2,
        "max_stacks": 3,
        "hp": 500,
        "def": 7,
        "mdef": 10,
        "description": "2pc: +500 MaxHP, +7 DEF, +10 MDEF.",
    },
}

ARMOR_SETS: Dict[str, Dict[str, Any]] = {
    **TWO_PIECE_SETS,
    "Phantom Dancer": {
        "key": "phantom",
        "pieces_required": 4,
        "max_stacks": 1,
        "flee": 200,
        "atk_pct": 0.10,
        "move_speed_pct": 0.07,
        "description": "4pc: +200 FLEE, +10% ATK, +7% Move Speed.",
    },
    "Hawkeye": {
        "key": "hawkeye",
        "pieces_required": 4,
        "max_stacks": 1,
        "hit": 250,
        "atk_pct": 0.10,
        "matk_pct": 0.10,
        "move_speed_pct": 0.07,
        "description": "4pc: +250 HIT, +10% ATK, +10% MATK, +7% Move Speed.",
    },
    "Mystic Sage": {
        "key": "sage",
        "pieces_required": 4,
        "max_stacks": 1,
        "dex": 30,
        "matk_pct": 0.10,
        "sp_regen": 5,
        "move_speed_pct": 0.07,
        "description": "4pc: +30 DEX, +10% MATK, +5 SP Regen, +7% Move Speed.",
    },
    "Blood Lord": {
        "key": "bloodlord",
        "pieces_required": 6,
        "max_stacks": 1,
        "lifesteal_pct": 1.00,
        "dealt_cut_pct": 0.30,
        "description": "6pc: +100% Lifesteal, +3 SP Drain, +2000 Weight, -30% Damage Dealt.",
    },
}


# ==============================================================================
# 3. Monster Cards Catalog (Loaded 100% from Wiki Ground Truth / SQLite)
# ==============================================================================
def _primary_card_slot(slots: Sequence[str]) -> str:
    if not slots:
        return "all"
    s0 = str(slots[0]).lower()
    if s0 in ("sword", "weapon"):
        return "weapon"
    if s0 in ("shield",):
        return "shield"
    if s0 in ("head", "face", "mouth", "head_upper", "head_mid", "head_lower"):
        return "head" if s0 == "head" else s0
    if s0 in ("armor", "body"):
        return "body"
    if s0 == "garment":
        return "garment"
    if s0 == "shoes":
        return "shoes"
    if s0 in ("accessory", "accessory1", "accessory2", "accessory_1", "accessory_2"):
        return "accessory"
    return s0


def _infer_card_limited(tier: Optional[str], lm01: Any, card_id: str) -> bool:
    if card_id.startswith("lm01") or (lm01 and isinstance(lm01, dict)):
        return True
    if card_id in ("mirrorback_card", "arcanewisp_card", "bloodfang_card"):
        return True
    t = (tier or "").strip().upper()
    if t in ("LIMITED", "SS", "MVP"):
        return True
    return False


def _load_wiki_cards() -> Dict[str, CardSpec]:
    gt = _load_ground_truth()
    raw_cards = gt.get("cards") or {}
    known_mechs = set((gt.get("card_mechanics") or {}).keys())
    out: Dict[str, CardSpec] = {}
    for cid, cdata in raw_cards.items():
        slots_raw = tuple(cdata.get("slots") or ["all"])
        tier_str = str(cdata.get("tier") or (cdata.get("lm01_pack_info") or {}).get("rarity", "Boss").title())
        lm01 = cdata.get("lm01_pack_info")
        raw_bonuses = cdata.get("bonuses") or {}
        norm_bonuses = normalize_bonuses(raw_bonuses, from_wiki_percent=True)
        mechs = tuple(cdata.get("mechanics") or [k for k in raw_bonuses if k in known_mechs])
        out[cid] = CardSpec(
            card_id=cid,
            name=str(cdata.get("name", cid)),
            slot=_primary_card_slot(slots_raw),
            slots=slots_raw,
            tier=tier_str,
            is_limited=_infer_card_limited(cdata.get("tier"), lm01, cid),
            bonuses=norm_bonuses,
            mechanics=mechs,
            description=str(cdata.get("description", "")),
            source_monsters=tuple(cdata.get("source_monsters") or ()),
            removable=bool(cdata.get("removable", False)),
            max_per_item=int(cdata.get("max_per_item", 1)),
            lm01_pack_info=lm01,
        )
    if out:
        return out

    # Minimal fallback if wiki_ground_truth.json is unavailable
    return {
        "colossus_card": CardSpec(
            card_id="colossus_card",
            name="Sunfire Colossus Card",
            slot="weapon",
            slots=("sword",),
            tier="S",
            is_limited=True,
            bonuses={"str": 8.0, "atk_pct": 0.03, "phys_pierce": 0.05},
            description="STR +8, ATK +3%, Physical Pierce +5% (Sunfire Colossus, 1 per weapon, unremovable).",
            source_monsters=("Sunfire Colossus",),
        ),
        "lm01_limited_card": CardSpec(
            card_id="lm01_limited_card",
            name="Critical King Card",
            slot="weapon",
            slots=("sword",),
            tier="Limited",
            is_limited=True,
            bonuses={"atk_pct": 0.05, "matk_pct": 0.05, "crit": 0.07, "mcrit": 0.07, "crit_dmg": 0.20, "earth_dmg": 0.20},
            description="ATK +5%, MATK +5%, CRIT +7%, MCRIT +7%, Crit Damage +20%, Earth Damage +20%.",
        ),
    }


CARDS: Dict[str, CardSpec] = _load_wiki_cards()


# ==============================================================================
# 4. Target Monster / PvP Presets
# ==============================================================================
MONSTER_PRESETS: Dict[str, TargetProfile] = {
    "tier6_dark_boss": TargetProfile(
        preset_id="tier6_dark_boss",
        name="Eclipse Warlord (Lv.311 Dark Boss | DEF 255 / FLEE 500)",
        target_def=255,
        target_mdef=240,
        target_flee=500,
        element="dark",
        is_monster=True,
    ),
    "tier6_elemental_mvp": TargetProfile(
        preset_id="tier6_elemental_mvp",
        name="Chocolate Golem (Lv.319 Dark/Earth Boss | DEF 255 / FLEE 560)",
        target_def=255,
        target_mdef=250,
        target_flee=560,
        element="dark",
        is_monster=True,
    ),
    "tier6_light_boss": TargetProfile(
        preset_id="tier6_light_boss",
        name="Lunar Oracle (Lv.309 Light Boss | DEF 210 / MDEF 240 / FLEE 400)",
        target_def=210,
        target_mdef=240,
        target_flee=400,
        element="light",
        is_monster=True,
    ),
    "tier6_evasion_boss": TargetProfile(
        preset_id="tier6_evasion_boss",
        name="Gingerbread Man (Lv.312 High-FLEE Fire Boss | DEF 200 / FLEE 860)",
        target_def=200,
        target_mdef=220,
        target_flee=860,
        element="fire",
        is_monster=True,
    ),
    "tier6_mob_grind": TargetProfile(
        preset_id="tier6_mob_grind",
        name="Titan Frame (Lv.299 Dark Mob | DEF 255 / FLEE 400)",
        target_def=255,
        target_mdef=240,
        target_flee=400,
        element="dark",
        is_monster=True,
    ),
    "pvp_max_def_paladin": TargetProfile(
        preset_id="pvp_max_def_paladin",
        name="PvP Max-DEF Templar/Tank (DEF 255 / MDEF 255 / FLEE 420)",
        target_def=255,
        target_mdef=255,
        target_flee=420,
        element="neutral",
        is_monster=False,
    ),
    "pvp_evasion_assassin": TargetProfile(
        preset_id="pvp_evasion_assassin",
        name="PvP High-FLEE Mamushi/Sinister (DEF 160 / FLEE 620)",
        target_def=160,
        target_mdef=140,
        target_flee=620,
        element="wind",
        is_monster=False,
    ),
}


# ==============================================================================
# 5. All 15 Wiki-Verified Job Profiles & Default Gear Templates
# ==============================================================================
JOB_REGISTRY: Dict[str, ClassProfile] = {
    "templar": ClassProfile(
        job_id="templar",
        name="Templar",
        tier="Master / Transcendent",
        role="Physical / MaxHP Tank-Burst",
        weapon_type="aegis",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"vit": 5, "str": 1},
        hp_bonus_pct=1.35,
        sp_bonus_pct=0.45,
        innate_stats={"vit": 60, "def": 30, "mdef": 30, "hp_pct": 0.10},
        is_melee=True,
        auto_atk_scale=3.1505,  # Base 1.0 + Sacred Guillotine Chain (1.748) + Colossus Radiant Bash (0.4025)
        auto_hp_scale=0.021,    # Colossus Radiant Bash 35% * 6% MaxHP
        base_aspd=148.0,
        active_stats=("vit", "str", "agi", "dex", "luk"),
        innate_passive_name="Templar Mastery & Innate Aegis Passives",
        innate_passive_desc="2H Lionheart Aegis (+60 VIT, +30 DEF/MDEF, +10% MaxHP) + Sacred Guillotine Chain (+1.748x ATK) + Colossus Radiant Bash (+0.4025x ATK + 2.1% MaxHP).",
        innate_class_passives=["Templar Mastery", "Sacred Guillotine Chain", "Colossus Radiant Bash"],
        skills=[
            SkillSpec(
                name="Shield Sacrificial Strike",
                dmg_type="physical",
                atk_scale=29.0,  # 14.5 x 2 hits (Wiki templar_u.strike Lv.10)
                hp_scale=0.40,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=2.0,
                hits=2,
                never_misses=True,
                can_crit=True,
                monster_mult=1.0,
                atk_monster_mult=3.0,
                description="1450% ATK x2 (3x on ATK portion vs Monsters -> 8700% ATK) + 40% MaxHP. Never misses, inherits weapon coating, 2.0s CD.",
            ),
            SkillSpec(
                name="Grand Light Devastation",
                dmg_type="physical",
                atk_scale=50.0,  # Wiki templar_devastation_Da Lv.10 ATK 50x
                vit_tier_hp_scale=True,
                element="light",
                uses_weapon_coating=False,
                cooldown=10.0,
                hits=5,
                never_misses=False,
                can_crit=True,
                monster_mult=1.50,
                description="Fixed Light element. Scales 5x/7x/10x/15x MaxHP by VIT tier (<100/100+/200+/300+) + 5000% ATK (+50% vs Monsters).",
            ),
            SkillSpec(
                name="Light's Embrace",
                dmg_type="physical",
                atk_scale=5.5,
                hp_scale=0.15,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=15.0,
                never_misses=False,
                can_crit=True,
                description="550% ATK + 15% MaxHP AoE taunt strike, inherits weapon coating.",
            ),
        ],
    ),

    "kensei": ClassProfile(
        job_id="kensei",
        name="Kensei",
        tier="Master / Transcendent",
        role="Katana Critical / AGI-STR Burst",
        weapon_type="katana",
        offhand_type="saya",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={"agi": 3, "str": 2, "vit": 1},
        hp_bonus_pct=0.85,
        sp_bonus_pct=0.30,
        innate_stats={
            "crit_dmg": 0.40,  # Meikyo Shisui (+10%) + Zanshin (+30%)
            "atk_pct": 0.40,   # Katana Mastery (+40% ATK)
            "crit": 0.10,      # Katana Mastery (+10% CRIT)
            "agi_to_atk": 0.50,  # Zanshin (50% AGI -> ATK)
            "auto_atk_proc_scale": 0.50,  # Kasumi Edge + Akatsuki Kenki
            "flee_pct": 0.10,
            "move_speed_pct": 0.20,
        },
        is_melee=True,
        auto_atk_scale=1.20,
        base_aspd=152.0,
        active_stats=("str", "agi", "dex", "luk", "vit"),
        innate_passive_name="Katana & Saya Iaido + Kensei Mastery",
        innate_passive_desc="1H Katana + Saya (+17 refine ATK, +5% Pierce) + innate Katana Mastery, Zanshin, Meikyo Shisui, Kasumi Edge & Akatsuki Kenki.",
        innate_class_passives=["Meikyo Shisui", "Katana Mastery", "Zanshin", "Kasumi Edge", "Akatsuki Kenki", "Shukuchi"],
        skills=[
            SkillSpec(
                name="Oboro Ranbu",
                dmg_type="physical",
                atk_scale=49.0,  # 700% x 7 hits Lv.10
                element="neutral",
                uses_weapon_coating=True,
                cooldown=2.1,
                hits=7,
                aspd_scaling_type="aspd_floor",
                never_misses=False,
                can_crit=True,
                description="7-hit rapid Katana flurry (700% x 7 = 4900% ATK Lv.10, ASPD-floored animation), inherits weapon coating.",
            ),
            SkillSpec(
                name="Issen",
                dmg_type="physical",
                atk_scale=6.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=0.5,
                aspd_scaling_type="aspd_floor",
                never_misses=False,
                can_crit=True,
                description="High-frequency 600% ATK Iaido flash strike (0.5s CD, ASPD floor).",
            ),
            SkillSpec(
                name="Iaigiri",
                dmg_type="physical",
                atk_scale=4.8,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=2.5,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=False,
                can_crit=True,
                description="480% ATK slash whose cooldown scales with ASPD.",
            ),
        ],
    ),

    "king": ClassProfile(
        job_id="king",
        name="The King",
        tier="Master / Sovereign",
        role="Hybrid Royal Tablet (STR = INT Synergy)",
        weapon_type="tablet",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"int": 3, "str": 3},
        hp_bonus_pct=0.85,
        sp_bonus_pct=0.85,
        innate_stats={"dmg_pct": 0.25},  # Sovereign Dividend Yield innate (+Fair Value & HFT applied when STR == INT)
        is_melee=True,
        uses_matk_basic_attack=True,
        uses_tablet_hybrid_basic=True,
        auto_atk_scale=1.0,
        auto_matk_scale=1.0,
        base_aspd=148.0,
        active_stats=("str", "int", "dex", "luk", "agi"),
        innate_passive_name="Royal Tablet Equilibrium (STR = INT)",
        innate_passive_desc="2H Royal Tablet (ATK+MATK hybrid basic attack, +10% P./M.Pierce at +10). Innate Fair Value, HFT & Sovereign Dividend Yield when STR == INT.",
        innate_class_passives=["Royal Tablet Equilibrium", "Fair Value", "HFT", "Cash Flow", "Sovereign Dividend Yield", "Market Circuit-Breaker"],
        requires_str_eq_int=True,
        skills=[
            SkillSpec(
                name="BTC Soul",
                dmg_type="hybrid",
                atk_scale=22.0,  # 440% x 5 hits Lv.10
                matk_scale=22.0,  # 440% x 5 hits Lv.10
                element="neutral",
                uses_weapon_coating=True,
                cooldown=1.0,
                hits=5,
                never_misses=True,
                can_crit=True,
                monster_mult=1.2,
                description="5-hit bouncing strike when STR=INT (440% hybrid x 5 = 2200% ATK + 2200% MATK, 1.2x vs Monsters), inherits weapon coating.",
            ),
            SkillSpec(
                name="Bullish Breakout Candle",
                dmg_type="magic",
                atk_scale=0.0,
                matk_scale=10.3,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=6.0,
                never_misses=True,
                can_crit=True,
                monster_mult=1.2,
                description="1030% MATK surge (1.2x vs Monsters) that breaks MDEF by 15% and inherits weapon coating.",
            ),
            SkillSpec(
                name="Take Profit",
                dmg_type="hybrid",
                atk_scale=4.4,
                matk_scale=4.4,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=10.0,
                hits=3,
                never_misses=True,
                can_crit=True,
                monster_mult=1.2,
                description="880% 3-hit combo finisher (1.2x vs Monsters) following Candle Storm -> Break Out.",
            ),
        ],
    ),

    "necromancer": ClassProfile(
        job_id="necromancer",
        name="Wicked Necromancer",
        tier="Master / Transcendent",
        role="Dark Magic & Black Cat Summoner",
        weapon_type="grimoire",
        offhand_type="lantern",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={"int": 2, "agi": 2, "luk": 2},
        hp_bonus_pct=0.70,
        sp_bonus_pct=0.85,
        innate_stats={
            "matk_pct": 0.35,        # Soul-Lantern Harvest (5 wisps * 7%)
            "summon_dmg_pct": 0.60,  # Summon Mastery (+10%) + Soul-Lantern Harvest (+50%)
            "aspd_pct": 0.10,        # Shadow Spirit (+10% ASPD)
        },
        is_melee=False,
        uses_matk_basic_attack=True,
        auto_atk_scale=0.0,
        auto_matk_scale=1.15,  # Grimoire Dark Bolt basic attack
        base_aspd=148.0,
        active_stats=("int", "dex", "luk", "vit", "agi"),
        innate_passive_name="Black Cat Coven, Shadow Spirit & Soul-Lantern Harvest",
        innate_passive_desc="1H Rune Grimoire + Lantern. Commands Black Cat Knight/Archer/Cleric (INT 100/200/300 tiers) + Soul-Lantern (+35% MATK, +50% Summon DMG) + Summon Mastery (+10%) + Shadow Spirit (+10% ASPD).",
        innate_class_passives=["Soul-Lantern Harvest", "Shadow Spirit", "Summon Mastery", "Feline Pact", "Grim Purr-session"],
        skills=[
            SkillSpec(
                name="Black Cat Spells",
                dmg_type="magic",
                matk_scale=11.5,
                element="dark",
                uses_weapon_coating=False,
                cooldown=1.7,
                cast_time=0.82,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="1150% Dark MATK barrage (350 + 52.5*(lv-1) ms cast; instant at DEX 150, accelerates to DEX 250).",
            ),
        ],
    ),

    "nekobaku": ClassProfile(
        job_id="nekobaku",
        name="Nekobaku",
        tier="Master / Transcendent",
        role="Elemental Flask Alchemist (Magic-Crit)",
        weapon_type="flask",
        offhand_type="catalyst",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={"agi": 3, "int": 3},
        hp_bonus_pct=0.60,
        sp_bonus_pct=0.65,
        innate_stats={
            "mcrit": 0.15,              # Catalyst Brew (+15% MCRIT)
            "aspd_pct": 0.30,           # Catalyst Brew (+20%) + Feline Reflex (+10%)
            "matk_pct": 0.50,           # Alchemy Mastery (+50% MATK)
            "agi_to_matk": 0.40,        # Feline Reflex (40% AGI -> MATK)
            "solari_proc_matk": 0.525,  # Unstable Concoction (35% * 150% MATK)
        },
        is_melee=False,
        uses_matk_basic_attack=True,
        auto_atk_scale=0.0,
        auto_matk_scale=1.10,
        base_aspd=150.0,
        active_stats=("int", "dex", "agi", "luk", "vit"),
        innate_passive_name="Neko Flask & Catalyst Brew",
        innate_passive_desc="1H Neko Flask + Catalyst offhand. Innate Alchemy Mastery (+50% MATK), Feline Reflex (+10% ASPD, 40% AGI->MATK), Catalyst Brew (+20% ASPD, +15% MCRIT) & Unstable Concoction.",
        innate_class_passives=["Catalyst Brew", "Alchemy Mastery", "Feline Reflex", "Unstable Concoction", "Nine Lives"],
        skills=[
            SkillSpec(
                name="Fizz Flask",
                dmg_type="magic",
                matk_scale=3.82,
                element="water",
                uses_weapon_coating=False,
                cooldown=0.5,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="382% Water MATK splash flask (0.5s ASPD-scaled CD, +20% vs oiled targets).",
            ),
            SkillSpec(
                name="Tar Flask",
                dmg_type="magic",
                matk_scale=4.0,
                element="earth",
                uses_weapon_coating=False,
                cooldown=1.2,
                aspd_scaling_type="aspd_floor",
                never_misses=True,
                can_crit=True,
                description="400% Earth MATK flask applying Oil debuff.",
            ),
            SkillSpec(
                name="Big Kaboom",
                dmg_type="magic",
                matk_scale=7.2,
                element="fire",
                uses_weapon_coating=False,
                cooldown=3.0,
                aspd_scaling_type="aspd_floor",
                never_misses=True,
                can_crit=True,
                description="720% Fire MATK explosion (+20% vs oiled targets).",
            ),
            SkillSpec(
                name="Gravity Vortex Pull",
                dmg_type="magic",
                matk_scale=8.7,
                element="dark",
                uses_weapon_coating=False,
                cooldown=5.0,
                never_misses=True,
                can_crit=True,
                description="870% Dark MATK pull vortex.",
            ),
        ],
    ),

    "mamushi": ClassProfile(
        job_id="mamushi",
        name="Mamushi",
        tier="Master / Transcendent",
        role="Viper Kunai & Shuriken Ranged Assassin",
        weapon_type="kunai",
        offhand_type="shuriken",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={"agi": 3, "dex": 3},
        hp_bonus_pct=0.70,
        sp_bonus_pct=0.35,
        innate_stats={
            "atk_pct": 0.15,      # Venom Mastery
            "hit": 100,           # Numbing Toxin
            "dmg_pct": 0.45,      # Predator's Patience (+45% vs poisoned)
            "crit_dmg": 0.20,     # Cold-Blooded Precision
            "phys_pierce": 0.05,  # Cold-Blooded Precision
        },
        is_melee=False,
        is_ranged_dex_atk=True,
        auto_atk_scale=1.15,
        base_aspd=152.0,
        active_stats=("dex", "agi", "luk", "str", "vit"),
        innate_passive_name="Viper Kunai, Shuriken & Venom Passives",
        innate_passive_desc="1H Viper Kunai (DEX*3 ATK) + Shuriken offhand. Innate Venom Mastery, Numbing Toxin (+100 HIT), Predator's Patience (+45% DMG) & Cold-Blooded Precision.",
        innate_class_passives=["Viper Kunai & Shuriken", "Venom Mastery", "Numbing Toxin", "Predator's Patience", "Cold-Blooded Precision", "Shedding Skin"],
        skills=[
            SkillSpec(
                name="Viper Fang",
                dmg_type="physical",
                atk_scale=7.7,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=2.5,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=False,
                can_crit=True,
                description="770% ATK ranged kunai strike (ASPD-scaled CD, inherits weapon coating).",
            ),
            SkillSpec(
                name="Viper's Coil",
                dmg_type="physical",
                atk_scale=9.1,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=5.0,
                never_misses=False,
                can_crit=True,
                description="910% ATK root & DEF-shredding strike, inherits weapon coating.",
            ),
            SkillSpec(
                name="Shadow Decoy",
                dmg_type="physical",
                atk_scale=12.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=5.0,
                never_misses=False,
                can_crit=True,
                description="1200% ATK decoy detonation + 5 Snake Venom stacks.",
            ),
            SkillSpec(
                name="Bouncing Shuriken",
                dmg_type="physical",
                atk_scale=13.42,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=30.0,
                never_misses=False,
                can_crit=True,
                description="1342% ATK multi-bounce shuriken.",
            ),
        ],
    ),

    "ironfist": ClassProfile(
        job_id="ironfist",
        name="Iron Fist",
        tier="Master / Transcendent",
        role="2H Cestus Combo & God Fist Striker",
        weapon_type="cestus",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"str": 2, "agi": 2, "vit": 2},
        hp_bonus_pct=1.05,
        sp_bonus_pct=0.35,
        innate_stats={
            "atk_pct": 0.60,         # Knuckles Mastery (+60% ATK)
            "def_to_atk_pct": 0.60,  # Ironclad Knuckle Conversion (60% DEF -> ATK)
            "cd_red": 0.10,          # Piston Rhythm (-10% effective CD)
            "dmg_pct": 0.20,         # Fresh Blood
        },
        is_melee=True,
        auto_atk_scale=1.20,
        base_aspd=152.0,
        active_stats=("str", "agi", "vit", "dex", "luk"),
        innate_passive_name="Knuckles Mastery & Ironclad Conversion (Cestus)",
        innate_passive_desc="2H Cestus (+60% ATK, 2x refine & 2 cards) + innate Ironclad Knuckle Conversion (60% DEF->ATK), Piston Rhythm & Fresh Blood.",
        innate_class_passives=["Knuckles Mastery", "Ironclad Knuckle Conversion", "Piston Rhythm", "Fresh Blood", "Last Stand"],
        skills=[
            SkillSpec(
                name="Flash Dash & Smash",
                dmg_type="physical",
                atk_scale=12.1,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.0,
                never_misses=False,
                can_crit=True,
                description="1210% ATK gap-closing strike, inherits weapon coating.",
            ),
            SkillSpec(
                name="Smash",
                dmg_type="physical",
                atk_scale=14.85,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.0,
                never_misses=False,
                can_crit=True,
                description="1485% ATK combo smash, inherits weapon coating.",
            ),
            SkillSpec(
                name="Low Sweep Kick",
                dmg_type="physical",
                atk_scale=13.64,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.0,
                never_misses=False,
                can_crit=True,
                description="1364% ATK 2-charge sweep kick, inherits weapon coating.",
            ),
            SkillSpec(
                name="God Fist Destroyer",
                dmg_type="physical",
                atk_scale=136.0,  # Stage 4 Lv.10 13,600% ATK over ~24s charge+CD cycle
                element="neutral",
                uses_weapon_coating=True,
                cooldown=8.0,
                effective_uptime_cd=24.0,
                never_misses=True,
                can_crit=True,
                description="Charged God Fist burst (13,600% ATK at full 4-stage charge; ~24s rotation cycle), inherits weapon coating.",
            ),
        ],
    ),

    "sinister": ClassProfile(
        job_id="sinister",
        name="Sinister",
        tier="Master / Transcendent",
        role="Twin Pistols Ranged Gunner & Poon-poon",
        weapon_type="pistols",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"dex": 4, "agi": 2},
        hp_bonus_pct=0.75,
        sp_bonus_pct=0.55,
        innate_stats={
            "atk_pct": 0.45,              # Dog's Eye + Dual Focus
            "crit_dmg": 0.15,             # Dog's Eye
            "companion_atk_scale": 0.50,  # Call of Poon-poon innate companion
        },
        is_melee=False,
        is_ranged_dex_atk=True,
        auto_atk_scale=1.35,  # Includes Poon-poon's Strike 40% proc + Twin Pistols + bullets
        base_aspd=150.0,
        active_stats=("dex", "agi", "luk", "str", "vit"),
        innate_passive_name="Dog's Eye, Dog's Bane & Call of Poon-poon",
        innate_passive_desc="2H Twin Pistols (DEX*3 ATK, +45% ATK, +15% CritDmg) + innate Call of Poon-poon companion.",
        innate_class_passives=["Dog's Eye & Dog's Bane", "Call of Poon-poon", "Poon-poon Ankle Clamp"],
        skills=[
            SkillSpec(
                name="Bullet-Waltz Cyclone",
                dmg_type="physical",
                atk_scale=25.65,  # 855% x 3 rounds Lv.10
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.0,
                hits=3,
                never_misses=False,
                can_crit=True,
                description="2565% ATK rapid gunfire cyclone (855% x 3 rounds), inherits weapon coating.",
            ),
            SkillSpec(
                name="Crossfire Eclipse: Alpha Hunt",
                dmg_type="physical",
                atk_scale=136.0,  # 550% x 12 phase + 3500% x 2 finish = 13,600% ATK Lv.10
                element="neutral",
                uses_weapon_coating=True,
                cooldown=7.0,
                fixed_cast=0.2,
                hits=14,
                never_misses=False,
                can_crit=True,
                description="12-hit volley (550% x 12) + 2-hit finisher (3500% x 2) = 13,600% ATK; DEX>=200/+300 grants +20%/+30% CritDmg.",
            ),
            SkillSpec(
                name="Poon-poon & Destroy",
                dmg_type="physical",
                atk_scale=5.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=4.0,
                never_misses=False,
                can_crit=True,
                description="550% ATK command shot + 60% slow, inherits weapon coating.",
            ),
        ],
    ),

    "swordman": ClassProfile(
        job_id="swordman",
        name="Swordsman",
        tier="1st Class",
        role="2H Sword Melee Vanguard",
        weapon_type="sword",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"str": 2, "vit": 3},
        hp_bonus_pct=1.15,
        sp_bonus_pct=0.25,
        innate_stats={
            "atk_pct": 0.60,    # Close-Combat Mastery (+60% ATK)
            "aspd_pct": 0.70,   # Close-Combat Mastery (+20%) + Battle Momentum (+50%)
            "cd_cut_sec": 0.20, # Battle Momentum (-0.2s CD)
            "vit": 20,          # Iron Body
            "hp_pct": 0.05,     # Iron Body
            "hp_to_atk": 0.10,  # Vigor
        },
        is_melee=True,
        auto_atk_scale=1.0,
        base_aspd=150.0,
        active_stats=("str", "vit", "agi", "dex", "luk"),
        innate_passive_name="2H Sword Vanguard & Swordsman Passives",
        innate_passive_desc="2H Sword (2x stats, 2x refine ATK, +10% Pierce) + innate Close-Combat Mastery, Battle Momentum (+50% ASPD, -0.2s CD), Iron Body & Vigor.",
        innate_class_passives=["Close-Combat Mastery", "Battle Momentum", "Iron Body", "Vigor", "Unyielding Grit"],
        skills=[
            SkillSpec(
                name="Power Strike",
                dmg_type="physical",
                atk_scale=4.2,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=0.5,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=False,
                can_crit=True,
                description="420% ATK melee strike (0.5s ASPD-scaled CD), inherits weapon coating.",
            ),
            SkillSpec(
                name="Flame Smash",
                dmg_type="physical",
                atk_scale=9.0,  # 300% x 3 waves Lv.10
                element="fire",
                uses_weapon_coating=False,
                cooldown=1.0,
                hits=3,
                never_misses=False,
                can_crit=True,
                description="900% Fire AoE shockwave (300% x 3).",
            ),
            SkillSpec(
                name="Vanguard Charge",
                dmg_type="physical",
                atk_scale=6.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=4.0,
                never_misses=False,
                can_crit=True,
                description="650% ATK stun charge, inherits weapon coating.",
            ),
        ],
    ),

    "mage": ClassProfile(
        job_id="mage",
        name="Mage",
        tier="1st Class",
        role="Elemental Spellcaster (2H Staff)",
        weapon_type="staff",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"int": 5},
        hp_bonus_pct=0.60,
        sp_bonus_pct=0.95,
        innate_stats={
            "int": 20,               # Mentality
            "sp_pct": 0.10,          # Mentality
            "sp_to_matk": 0.15,      # Mentality
            "dex_to_matk": 1.50,     # Mentality
            "matk_pct": 0.60,        # Mentality
            "elem_dmg": 0.10,        # Elemental Resonance
            "cast_reduce_pct": 0.15, # Spellweave Synergy
            "mcrit": 0.10,           # Spellweave Synergy
        },
        is_melee=False,
        uses_matk_basic_attack=True,
        auto_atk_scale=0.0,
        auto_matk_scale=1.0,
        base_aspd=145.0,
        active_stats=("int", "dex", "luk", "vit", "agi"),
        innate_passive_name="Elemental Arcana & Mage Passives (Staff)",
        innate_passive_desc="2H Staff (2x stats, 2x refine MATK, +10% Pierce) + innate Mentality, Elemental Resonance & Spellweave Synergy.",
        innate_class_passives=["Mentality", "Elemental Resonance", "Spellweave Synergy", "Meditation", "Arcane Conduit"],
        skills=[
            SkillSpec(
                name="Armageddon Starburst",
                dmg_type="magic",
                matk_scale=23.0,  # 460% x 5 hits Lv.10
                element="fire",
                uses_weapon_coating=False,
                cooldown=4.0,
                cast_time=3.0,
                hits=5,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="2300% Fire MATK AoE (460% x 5; 3.0s variable cast -> 0s at DEX 150, accelerates up to DEX 250).",
            ),
            SkillSpec(
                name="Frost Area",
                dmg_type="magic",
                matk_scale=24.0,  # 480% x 5 hits Lv.10
                element="water",
                uses_weapon_coating=False,
                cooldown=4.0,
                cast_time=3.0,
                hits=5,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="2400% Water MATK freeze area (480% x 5; +50% vs stunned).",
            ),
            SkillSpec(
                name="Stormbreak",
                dmg_type="magic",
                matk_scale=23.0,  # 460% x 5 hits Lv.10
                element="wind",
                uses_weapon_coating=False,
                cooldown=4.0,
                cast_time=3.0,
                hits=5,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="2300% Wind MATK lightning storm (460% x 5; +50% vs frozen).",
            ),
            SkillSpec(
                name="Tierra Bladeburst",
                dmg_type="magic",
                matk_scale=23.0,  # 460% x 5 hits Lv.10
                element="earth",
                uses_weapon_coating=False,
                cooldown=4.0,
                cast_time=3.0,
                hits=5,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="2300% Earth MATK eruption (460% x 5).",
            ),
        ],
    ),

    "archer": ClassProfile(
        job_id="archer",
        name="Archer",
        tier="1st Class",
        role="Ranged Bow Marksman",
        weapon_type="bow",
        offhand_type="quiver",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={"dex": 5},
        hp_bonus_pct=0.65,
        sp_bonus_pct=0.45,
        innate_stats={
            "dex": 20,            # Keen Eye
            "hit_pct": 0.10,      # Keen Eye
            "dex_to_atk": 0.45,   # Keen Eye
            "hit_to_atk": 0.20,   # Keen Eye
            "bow_dmg_pct": 0.60,  # Far Sight (+60% Bow)
            "ranged_dmg_pct": 0.20,
            "coated_dmg": 0.15,   # Elemental Quiver
        },
        is_melee=False,
        is_ranged_dex_atk=True,
        auto_atk_scale=1.0,
        base_aspd=147.0,
        active_stats=("dex", "agi", "luk", "str", "vit"),
        innate_passive_name="Bow & Quiver Marksman + Archer Passives",
        innate_passive_desc="1H Bow (DEX*3 ATK) + Quiver offhand. Innate Far Sight (+60% Bow DMG), Keen Eye (+20 DEX, +10% HIT) & Elemental Quiver (+15% coated DMG).",
        innate_class_passives=["Far Sight", "Keen Eye", "Elemental Quiver"],
        skills=[
            SkillSpec(
                name="Twin Shot",
                dmg_type="physical",
                atk_scale=5.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=0.6,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=False,
                can_crit=True,
                description="500% ATK twin arrow shot (0.6s ASPD-scaled CD), inherits coating.",
            ),
            SkillSpec(
                name="Arrow Rain",
                dmg_type="physical",
                atk_scale=15.5,  # 310% x 5 hits Lv.10
                element="neutral",
                uses_weapon_coating=True,
                cooldown=1.5,
                hits=5,
                never_misses=False,
                can_crit=True,
                description="1550% ATK arrow barrage (310% x 5), inherits coating.",
            ),
            SkillSpec(
                name="Piercing Shot",
                dmg_type="physical",
                atk_scale=8.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=2.0,
                never_misses=False,
                can_crit=True,
                description="800% ATK armor-crushing shot, inherits coating.",
            ),
            SkillSpec(
                name="Briar Seed Trap",
                dmg_type="physical",
                atk_scale=8.2,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=0.5,
                never_misses=False,
                can_crit=True,
                description="820% ATK trap detonation, inherits coating.",
            ),
            SkillSpec(
                name="Leap Shot",
                dmg_type="physical",
                atk_scale=12.0,
                element="wind",
                uses_weapon_coating=False,
                cooldown=2.0,
                never_misses=False,
                can_crit=True,
                description="1200% fixed Wind aerial arrow shot.",
            ),
        ],
    ),

    "acolyte": ClassProfile(
        job_id="acolyte",
        name="Cleric",
        tier="1st Class",
        role="Holy Light Quarterstaff Caster",
        weapon_type="quarterstaff",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"int": 3, "vit": 2},
        hp_bonus_pct=0.75,
        sp_bonus_pct=0.75,
        innate_stats={
            "light_dark_dmg": 0.20,    # Light & Shadow
            "cd_red": 0.10,            # Light & Shadow
            "atk_pct": 0.25,           # Sacred & Divine
            "matk_pct": 0.25,          # Sacred & Divine
            "def": 20,                 # Sacred & Divine
            "mdef": 30,                # Sacred & Divine
            "skill_dmg_pct": 0.20,     # Twilight Equilibrium
            "solari_proc_matk": 1.50,  # Solari Judgment (30% * 500% MATK)
        },
        is_melee=True,
        uses_matk_basic_attack=True,
        auto_atk_scale=0.0,
        auto_matk_scale=1.0,
        base_aspd=150.0,
        active_stats=("int", "dex", "vit", "luk", "str"),
        innate_passive_name="Light & Shadow & Acolyte Mastery",
        innate_passive_desc="2H Quarterstaff + innate Light & Shadow (+20% Light/Dark, -10% CD), Sacred & Divine (+25% ATK/MATK), Twilight Equilibrium & Solari Judgment.",
        innate_class_passives=["Light & Shadow", "Sacred & Divine", "Twilight Equilibrium", "Solari Judgment", "Blessed Searing Judgment"],
        skills=[
            SkillSpec(
                name="Radiant Light",
                dmg_type="magic",
                matk_scale=8.3,
                element="light",
                uses_weapon_coating=False,
                cooldown=1.3,
                cast_time=3.0,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="830% Light MATK beam (3.0s variable cast -> 0s at DEX 150).",
            ),
            SkillSpec(
                name="Sacred Radiance",
                dmg_type="magic",
                matk_scale=17.5,  # 3.5 * 5 ticks (Wiki acolyte_sacredradiance_fe)
                element="light",
                uses_weapon_coating=False,
                cooldown=4.0,
                cast_time=3.0,
                hits=5,
                aspd_scaling_type="multi_hit_cast_dex_over_150",
                never_misses=True,
                can_crit=True,
                multi_hit_spell=True,
                description="5-tick 350% MATK Light AoE (1750% total MATK) + party healing.",
            ),
        ],
    ),

    "merchant": ClassProfile(
        job_id="merchant",
        name="Merchant",
        tier="1st Class",
        role="2H Hammer Heavy Striker",
        weapon_type="hammer",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"str": 3, "vit": 2},
        hp_bonus_pct=0.95,
        sp_bonus_pct=0.35,
        innate_stats={
            "flat_hp": 2000,       # Treasury Vitality (+2000 HP)
            "str": 10,             # Weight Training
            "atk_pct": 0.45,       # Weight Training
            "weight_atk": 45.0,    # Weight Training
            "move_speed_pct": 0.20,# Reinforced Cart Wheels
        },
        is_melee=True,
        auto_atk_scale=1.0,
        base_aspd=148.0,
        active_stats=("str", "vit", "agi", "dex", "luk"),
        innate_passive_name="Treasury Vitality & Merchant Passives",
        innate_passive_desc="2H Hammer (2x stats, 2x refine ATK, +10% Pierce) + innate Treasury Vitality (+2000 HP), Weight Training (+45% ATK) & Cart passives.",
        innate_class_passives=["Treasury Vitality", "Weight Training", "Reinforced Cart Wheels", "Heavy Cart Armor"],
        skills=[
            SkillSpec(
                name="Gold Strike",
                dmg_type="physical",
                atk_scale=8.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.5,
                cooldown_from_aspd=True,
                aspd_scaling_type="cooldown_from_aspd",
                never_misses=False,
                can_crit=True,
                description="800% ATK strike (ASPD-scaled CD), inherits weapon coating.",
            ),
            SkillSpec(
                name="Cart Strike",
                dmg_type="physical",
                atk_scale=8.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=5.0,
                never_misses=False,
                can_crit=True,
                description="850% ATK knockback + stun strike, inherits weapon coating.",
            ),
            SkillSpec(
                name="Quake Hammer",
                dmg_type="physical",
                atk_scale=23.5,  # 470% x 5 hits Lv.10
                element="earth",
                uses_weapon_coating=False,
                cooldown=3.0,
                hits=5,
                never_misses=True,
                can_crit=True,
                description="2350% fixed Earth AoE stun (470% x 5 hits, never misses).",
            ),
            SkillSpec(
                name="Decoy Coin Totem",
                dmg_type="physical",
                atk_scale=18.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=15.0,
                never_misses=False,
                can_crit=True,
                description="1800% ATK explosive coin totem, inherits coating.",
            ),
        ],
    ),

    "thief": ClassProfile(
        job_id="thief",
        name="Thief",
        tier="1st Class",
        role="Dagger Pair Critical Rogue (2x CRIT)",
        weapon_type="dagger_pair",
        offhand_type="none",
        is_two_handed=True,
        level=150,
        max_stat_cap=119,
        job_bonuses={"agi": 3, "str": 2},
        hp_bonus_pct=0.80,
        sp_bonus_pct=0.20,
        innate_stats={
            "double_hit_chance": 0.50, # Twin Strike
            "hit": 10,                 # Twin Strike
            "crit_dmg": 0.20,          # Fatal Sense
            "aspd_pct": 0.10,          # Fatal Sense
            "agi_to_atk": 0.55,        # Fatal Sense
            "flee_pct": 0.20,          # Fleet Foot
            "move_speed_pct": 0.15,    # Fleet Foot
            "skill_dmg_pct": 0.10,     # Combo Point Finisher
        },
        is_melee=True,
        auto_atk_scale=1.10,
        base_aspd=152.0,
        active_stats=("agi", "str", "luk", "dex", "vit"),
        innate_passive_name="Dagger Mastery (2x CRIT) & Thief Passives",
        innate_passive_desc="2H Dagger Pair (2x Physical CRIT%) + innate Twin Strike, Fatal Sense, Combo Point Finisher & Fleet Foot.",
        innate_class_passives=["Dagger Mastery (2x Physical CRIT)", "Twin Strike", "Fatal Sense", "Combo Point Finisher", "Fleet Foot", "Evasive Counterstep"],
        skills=[
            SkillSpec(
                name="Shadow Strike",
                dmg_type="physical",
                atk_scale=7.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=3.0,
                never_misses=False,
                can_crit=True,
                description="750% ATK strike (1860% backstab from behind/Vanish), inherits coating.",
            ),
            SkillSpec(
                name="Shadow Blink",
                dmg_type="physical",
                atk_scale=4.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=5.0,
                never_misses=False,
                can_crit=True,
                description="450% ATK armor-cutting blink (-20% target DEF), inherits coating.",
            ),
            SkillSpec(
                name="Shadow Bomb",
                dmg_type="physical",
                atk_scale=6.0,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=8.0,
                never_misses=False,
                can_crit=True,
                description="600% ATK AoE blind bomb, inherits coating.",
            ),
        ],
    ),

    "novice": ClassProfile(
        job_id="novice",
        name="Novice",
        tier="Starter",
        role="Starter Adventurer",
        weapon_type="knife",
        offhand_type="shield",
        is_two_handed=False,
        level=150,
        max_stat_cap=119,
        job_bonuses={},
        hp_bonus_pct=0.0,
        sp_bonus_pct=0.0,
        innate_stats={},
        is_melee=True,
        auto_atk_scale=1.0,
        base_aspd=148.0,
        active_stats=("str", "agi", "vit", "dex", "luk"),
        innate_passive_name="Adventurer's Spirit",
        innate_passive_desc="Starter class relying on basic attacks and cross-class passives.",
        innate_class_passives=["Adventurer's Spirit"],
        skills=[
            SkillSpec(
                name="Basic Strike",
                dmg_type="physical",
                atk_scale=1.5,
                element="neutral",
                uses_weapon_coating=True,
                cooldown=1.5,
                never_misses=False,
                can_crit=True,
                description="Basic melee strike (150% ATK), inherits weapon coating.",
            ),
        ],
    ),
}


def get_default_gear_for_job(
    job_id: str,
    affix_budget: str = "high",
    weapon_coating: Optional[str] = None,
    refine_level: int = 4,
    is_two_handed: Optional[bool] = None,
) -> GearProfile:
    """
    Constructs a calibrated Tier VI `GearProfile` based on actual Lumivara Wiki
    equipment base rolls, +10 refine gains, and Tier VI random substat budgets.
    """
    budget_scale = {"low": 0.65, "medium": 0.85, "high": 1.00, "whale": 1.15}.get(
        (affix_budget or "high").lower(), 1.00
    )
    cls = JOB_REGISTRY.get(job_id.lower(), JOB_REGISTRY["templar"])
    two_handed = cls.is_two_handed if is_two_handed is None else bool(is_two_handed)
    offhand = "none" if two_handed else cls.offhand_type

    # Refine flat ATK / MATK gain from Wiki tables
    wep_refine_gain = calc_refine_atk_matk(refine_level, is_two_handed=two_handed, is_offhand=False)
    offhand_refine_gain = (
        calc_refine_atk_matk(refine_level, is_two_handed=False, is_offhand=True)
        if offhand in ("orb", "catalyst", "lantern", "shuriken", "saya", "quiver")
        else 0
    )

    # Magic-focused classes
    if job_id.lower() in ("necromancer", "nekobaku", "mage", "acolyte"):
        return GearProfile(
            vit=int(round(36 * budget_scale)),
            str_v=0,
            agi=int(round((40 if job_id.lower() == "nekobaku" else 18) * budget_scale)),
            dex=int(round(54 * budget_scale)),
            int_v=int(round((165 if job_id.lower() == "necromancer" else 135) * budget_scale)),
            luk=int(round(42 * budget_scale)),
            flat_atk=20,
            flat_matk=int(round((140 if two_handed else 120) * budget_scale)) + wep_refine_gain + offhand_refine_gain,
            atk_pct=0.0,
            matk_pct=round(0.24 * budget_scale, 3),
            phys_pierce=0.0,
            magic_pierce=round(0.14 * budget_scale, 3),
            crit=0.05,
            mcrit=round(0.18 * budget_scale, 3),
            crit_dmg=round(0.24 * budget_scale, 3),
            hit=int(round(120 * budget_scale)),
            flee=int(round(70 * budget_scale)),
            aspd_flat=4.0 if budget_scale >= 0.85 else 0.0,  # Awakening/Berserk potion
            aspd_pct=0.0,
            gear_def=int(round(150 * budget_scale)),
            gear_mdef=int(round(160 * budget_scale)),
            flat_hp=int(round(2200 * budget_scale)),
            hp_pct=round(0.05 * budget_scale, 3),
            flat_sp=int(round(650 * budget_scale)),
            sp_pct=round(0.12 * budget_scale, 3),
            weapon_coating=weapon_coating,
            refine_level=refine_level,
            is_two_handed=two_handed,
            offhand_type=offhand,
        )

    # Hybrid The King (Royal Tablet)
    if job_id.lower() == "king":
        return GearProfile(
            vit=int(round(36 * budget_scale)),
            str_v=int(round(60 * budget_scale)),
            agi=int(round(36 * budget_scale)),
            dex=int(round(48 * budget_scale)),
            int_v=int(round(60 * budget_scale)),
            luk=int(round(36 * budget_scale)),
            flat_atk=int(round(115 * budget_scale)) + wep_refine_gain,
            flat_matk=int(round(115 * budget_scale)) + wep_refine_gain,
            atk_pct=round(0.18 * budget_scale, 3),
            matk_pct=round(0.18 * budget_scale, 3),
            phys_pierce=round(0.12 * budget_scale, 3),
            magic_pierce=round(0.12 * budget_scale, 3),
            crit=round(0.15 * budget_scale, 3),
            mcrit=round(0.18 * budget_scale, 3),
            crit_dmg=round(0.24 * budget_scale, 3),
            hit=int(round(135 * budget_scale)),
            flee=int(round(80 * budget_scale)),
            aspd_flat=5.0 if budget_scale >= 1.0 else 3.0,
            gear_def=int(round(170 * budget_scale)),
            gear_mdef=int(round(135 * budget_scale)),
            flat_hp=int(round(2400 * budget_scale)),
            hp_pct=round(0.06 * budget_scale, 3),
            flat_sp=int(round(450 * budget_scale)),
            sp_pct=round(0.08 * budget_scale, 3),
            weapon_coating=weapon_coating,
            refine_level=refine_level,
            is_two_handed=two_handed,
            offhand_type=offhand,
        )

    # Templar (Lionheart Aegis 2H + VIT/MaxHP Tank-Burst)
    if job_id.lower() == "templar":
        return GearProfile(
            vit=int(round(116 * budget_scale)),
            str_v=int(round(24 * budget_scale)),
            agi=int(round(24 * budget_scale)),
            dex=int(round(30 * budget_scale)),
            int_v=0,
            luk=int(round(18 * budget_scale)),
            flat_atk=int(round(130 * budget_scale)) + wep_refine_gain,
            flat_matk=0,
            atk_pct=round(0.18 * budget_scale, 3),
            matk_pct=0.0,
            phys_pierce=round(0.14 * budget_scale, 3),
            magic_pierce=0.0,
            crit=round(0.16 * budget_scale, 3),
            mcrit=0.0,
            crit_dmg=round(0.24 * budget_scale, 3),
            hit=int(round(140 * budget_scale)),
            flee=int(round(60 * budget_scale)),
            aspd_flat=5.0 if budget_scale >= 1.0 else 3.0,
            gear_def=int(round(195 * budget_scale)),
            gear_mdef=int(round(90 * budget_scale)),
            flat_hp=int(round(2600 * budget_scale)),
            hp_pct=round(0.08 * budget_scale, 3),
            flat_sp=int(round(260 * budget_scale)),
            sp_pct=0.0,
            weapon_coating=weapon_coating,
            refine_level=refine_level,
            is_two_handed=two_handed,
            offhand_type=offhand,
        )

    # General Physical classes (Kensei, Mamushi, Iron Fist, Sinister, Swordsman, Archer, Merchant, Thief, Novice)
    shuriken_aspd = 3.0 if offhand == "shuriken" else 0.0
    saya_crit = 0.12 if offhand == "saya" else 0.0
    return GearProfile(
        vit=int(round(36 * budget_scale)),
        str_v=int(round((24 if cls.is_ranged_dex_atk else 68) * budget_scale)),
        agi=int(round(52 * budget_scale)),
        dex=int(round((72 if cls.is_ranged_dex_atk else 42) * budget_scale)),
        int_v=0,
        luk=int(round(36 * budget_scale)),
        flat_atk=int(round(140 * budget_scale)) + wep_refine_gain + offhand_refine_gain,
        flat_matk=0,
        atk_pct=round(0.22 * budget_scale, 3),
        matk_pct=0.0,
        phys_pierce=round(0.14 * budget_scale, 3),
        magic_pierce=0.0,
        crit=round(0.18 * budget_scale + saya_crit, 3),
        mcrit=0.0,
        crit_dmg=round(0.26 * budget_scale, 3),
        hit=int(round(145 * budget_scale)),
        flee=int(round(85 * budget_scale)),
        aspd_flat=(5.0 if budget_scale >= 1.0 else 3.0) + shuriken_aspd,
        gear_def=int(round(170 * budget_scale)),
        gear_mdef=int(round(95 * budget_scale)),
        flat_hp=int(round(2200 * budget_scale)),
        hp_pct=round(0.05 * budget_scale, 3),
        flat_sp=int(round(280 * budget_scale)),
        sp_pct=0.0,
        weapon_coating=weapon_coating,
        refine_level=refine_level,
        is_two_handed=two_handed,
        offhand_type=offhand,
    )


# ==============================================================================
# 6. Runtime Catalog Builder (Single Source of Truth from SQLite `get_all_meta()`)
# ==============================================================================
def build_runtime_catalog(
    db_meta: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, ClassProfile], Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]], Dict[str, CardSpec]]:
    """
    Returns deep-copied `(jobs, passives, sets, cards)` catalogs merged with any
    live SQLite / CDC data supplied via `db_meta`.
    Reads cards, armor sets, cross-class passives, jobs, and skills from SQLite
    when present so SQLite is the single source of truth.
    """
    jobs = deepcopy(JOB_REGISTRY)
    passives = deepcopy(PASSIVES)
    sets = deepcopy(ARMOR_SETS)
    cards = deepcopy(CARDS)

    if not db_meta:
        return jobs, passives, sets, cards

    # 1) Cross-class passives from SQLite (`cross_passives` list or `passives` dict)
    raw_cross = db_meta.get("cross_passives")
    if isinstance(raw_cross, list) and raw_cross:
        for cp in raw_cross:
            p_name = str(cp.get("name") or "")
            if not p_name:
                continue
            norm_stats = normalize_bonuses(cp.get("stats") or {}, from_wiki_percent=False)
            restriction = str(cp.get("restriction") or "all").lower()
            entry = dict(passives.get(p_name, {}))
            entry.update(norm_stats)
            if cp.get("id"):
                entry["id"] = str(cp["id"])
                entry.setdefault("key", str(cp["id"]))
            if cp.get("source_job"):
                entry["source_job"] = str(cp["source_job"]).lower()
            if restriction == "melee":
                entry["melee_only"] = True
            elif restriction == "ranged":
                entry["ranged_only"] = True
            elif restriction == "katana":
                entry["katana_only"] = True
            elif restriction == "kunai":
                entry["kunai_only"] = True
            elif restriction == "knuckle":
                entry["cestus_only"] = True
            if cp.get("description"):
                entry["description"] = str(cp["description"])
            passives[p_name] = entry

    for p_name, p_override in (db_meta.get("passives") or {}).items():
        if p_name in passives and isinstance(p_override, dict):
            passives[p_name].update(normalize_bonuses(p_override, from_wiki_percent=False))
        elif isinstance(p_override, dict):
            passives[p_name] = normalize_bonuses(p_override, from_wiki_percent=False)

    # 2) Armor sets from SQLite (`armor_sets` list or `sets` dict)
    raw_sets = db_meta.get("armor_sets")
    if isinstance(raw_sets, list) and raw_sets:
        for aset in raw_sets:
            s_name = str(aset.get("name") or "")
            if not s_name:
                continue
            norm_b = normalize_bonuses(aset.get("bonuses") or {}, from_wiki_percent=False)
            pieces_req = int(aset.get("pieces_required", 2))
            max_stacks = 3 if pieces_req == 2 else 1
            entry = dict(sets.get(s_name, {}))
            entry.update(norm_b)
            entry["pieces_required"] = pieces_req
            entry["max_stacks"] = max_stacks
            if aset.get("description"):
                entry["description"] = str(aset["description"])
            sets[s_name] = entry

    for s_name, s_override in (db_meta.get("sets") or {}).items():
        if s_name in sets and isinstance(s_override, dict):
            sets[s_name].update(normalize_bonuses(s_override, from_wiki_percent=False))
        elif isinstance(s_override, dict):
            sets[s_name] = normalize_bonuses(s_override, from_wiki_percent=False)

    # 3) Cards from SQLite (`cards` list) — Single Source of Truth!
    raw_cards = db_meta.get("cards")
    if isinstance(raw_cards, list) and raw_cards:
        sql_cards: Dict[str, CardSpec] = {}
        for rc in raw_cards:
            cid = str(rc.get("id") or rc.get("card_id") or "")
            if not cid:
                continue
            existing = cards.get(cid)
            raw_slot = str(rc.get("slot") or "all")
            raw_slots = rc.get("slots")
            slots_tuple = tuple(str(s) for s in raw_slots) if isinstance(raw_slots, list) and raw_slots else (existing.slots if existing else (raw_slot,))
            raw_monsters = rc.get("source_monsters")
            monsters_tuple = tuple(str(m) for m in raw_monsters) if isinstance(raw_monsters, list) else (existing.source_monsters if existing else ())
            norm_b = normalize_bonuses(rc.get("bonuses") or {}, from_wiki_percent=False)
            raw_mechs = rc.get("mechanics")
            if isinstance(raw_mechs, list) and raw_mechs:
                mechs_tuple = tuple(str(m) for m in raw_mechs)
            elif existing and existing.mechanics:
                mechs_tuple = existing.mechanics
            else:
                mechs_tuple = tuple(
                    k for k in (rc.get("bonuses") or {})
                    if isinstance(k, str) and len(k) > 1 and k.startswith("m") and k[1].isupper()
                )
            sql_cards[cid] = CardSpec(
                card_id=cid,
                name=str(rc.get("name") or cid),
                slot=_primary_card_slot(slots_tuple),
                slots=slots_tuple,
                tier=str(rc.get("tier") or (existing.tier if existing else ("Limited" if rc.get("is_limited") else "Standard"))),
                is_limited=bool(rc.get("is_limited")),
                bonuses=norm_b,
                mechanics=mechs_tuple,
                description=str(rc.get("description") or ""),
                source_monsters=monsters_tuple,
                removable=bool(rc.get("removable")) if "removable" in rc else (existing.removable if existing else False),
                max_per_item=int(rc.get("max_per_item", existing.max_per_item if existing else 1)),
                lm01_pack_info=existing.lm01_pack_info if existing else None,
            )
        if sql_cards:
            cards = sql_cards

    # 4) Jobs & Skills overrides from SQLite
    raw_jobs = db_meta.get("jobs")
    if isinstance(raw_jobs, list):
        for rj in raw_jobs:
            jid = str(rj.get("id") or "").lower()
            if jid in jobs:
                cls_obj = jobs[jid]
                if isinstance(rj.get("job_bonuses"), dict) and rj["job_bonuses"]:
                    cls_obj.job_bonuses = {k: int(v) for k, v in rj["job_bonuses"].items()}
                if isinstance(rj.get("innate_stats"), dict) and rj["innate_stats"]:
                    cls_obj.innate_stats.update(normalize_bonuses(rj["innate_stats"], from_wiki_percent=False))
                if rj.get("base_aspd"):
                    cls_obj.base_aspd = float(rj["base_aspd"])
                if rj.get("auto_atk_scale") is not None and not cls_obj.uses_matk_basic_attack:
                    cls_obj.auto_atk_scale = max(cls_obj.auto_atk_scale, float(rj["auto_atk_scale"]))
                if rj.get("auto_hp_scale") is not None:
                    cls_obj.auto_hp_scale = max(cls_obj.auto_hp_scale, float(rj["auto_hp_scale"]))

    jobs_override = db_meta.get("jobs_override") or (db_meta.get("jobs") if isinstance(db_meta.get("jobs"), dict) else {})
    for j_id, j_override in (jobs_override or {}).items():
        jid = j_id.lower()
        if jid in jobs and isinstance(j_override, dict):
            cls_obj = jobs[jid]
            if "innate_stats" in j_override and isinstance(j_override["innate_stats"], dict):
                cls_obj.innate_stats.update(j_override["innate_stats"])
            if "skills" in j_override and isinstance(j_override["skills"], dict):
                for sk in cls_obj.skills:
                    if sk.name in j_override["skills"]:
                        sk_patch = j_override["skills"][sk.name]
                        for attr_k, attr_v in sk_patch.items():
                            if hasattr(sk, attr_k):
                                setattr(sk, attr_k, attr_v)

    # Apply flat `skills` list from `get_all_meta()` when present
    raw_skills = db_meta.get("skills")
    if isinstance(raw_skills, list) and raw_skills:
        by_job_name: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for rsk in raw_skills:
            if rsk.get("skill_type") == "active":
                jid = str(rsk.get("job_id") or "").lower()
                sk_name = str(rsk.get("name") or "")
                if jid and sk_name:
                    by_job_name[(jid, sk_name)] = rsk
        for jid, cls_obj in jobs.items():
            for sk in cls_obj.skills:
                patch = by_job_name.get((jid, sk.name))
                if patch:
                    p_atk = float(patch.get("atk_scale", 0.0))
                    p_matk = float(patch.get("matk_scale", 0.0))
                    p_hits = max(1, int(patch.get("hits") or 1))
                    # Preserve multi-hit total scales in JOB_REGISTRY when SQLite stores per-hit
                    if p_atk > 0 and (sk.hits <= 1 or p_hits > 1 or p_atk >= sk.atk_scale):
                        db_atk = p_atk * (p_hits if p_hits > 1 and p_atk * p_hits > sk.atk_scale * 0.9 else 1)
                        sk.atk_scale = max(sk.atk_scale, db_atk) if sk.hits > 1 else db_atk
                    if p_matk > 0 and (sk.hits <= 1 or p_hits > 1 or p_matk >= sk.matk_scale):
                        db_matk = p_matk * (p_hits if p_hits > 1 and p_matk * p_hits > sk.matk_scale * 0.9 else 1)
                        sk.matk_scale = max(sk.matk_scale, db_matk) if sk.hits > 1 else db_matk
                    if float(patch.get("hp_scale", 0.0)) > 0:
                        sk.hp_scale = float(patch["hp_scale"])
                    sk.vit_tier_hp_scale = bool(patch.get("vit_tier_hp_scale", sk.vit_tier_hp_scale))
                    if patch.get("cooldown"):
                        sk.cooldown = float(patch["cooldown"])
                    if patch.get("effective_uptime_cd") is not None:
                        p_eff = float(patch["effective_uptime_cd"])
                        if sk.effective_uptime_cd is None or p_eff > sk.cooldown:
                            sk.effective_uptime_cd = p_eff
                    sk.cast_time = float(patch.get("cast_time", sk.cast_time))
                    sk.uses_weapon_coating = bool(patch.get("uses_weapon_coating", sk.uses_weapon_coating))
                    sk.never_misses = bool(patch.get("never_misses", sk.never_misses))
                    sk.can_crit = bool(patch.get("can_crit", sk.can_crit))
                    if patch.get("aspd_scaling_type"):
                        sk.aspd_scaling_type = str(patch["aspd_scaling_type"])
                        if sk.aspd_scaling_type == "cooldown_from_aspd":
                            sk.cooldown_from_aspd = True
                    applies_to = str(patch.get("monster_damage_applies_to") or "total_damage")
                    mon_mult = float(patch.get("monster_mult", 1.0))
                    if applies_to == "atk_portion":
                        sk.atk_monster_mult = mon_mult
                        sk.monster_mult = 1.0
                    else:
                        sk.monster_mult = mon_mult
                    if patch.get("element"):
                        sk.element = str(patch["element"])
                    if patch.get("dmg_type") and sk.dmg_type not in ("hybrid", "magic"):
                        sk.dmg_type = str(patch["dmg_type"])

    return jobs, passives, sets, cards
