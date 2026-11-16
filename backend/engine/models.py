"""
Lumivara Online — Data Models for Skills, Classes, Gear, Targets, and Cards.
Pure Python 3 standard library implementation (`dataclasses`, `typing`).
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class SkillSpec:
    name: str
    dmg_type: str = "physical"          # "physical" | "magic" | "hybrid"
    atk_scale: float = 0.0              # ATK multiplier (e.g. 27.0 = 2700% ATK)
    matk_scale: float = 0.0             # MATK multiplier
    hp_scale: float = 0.0               # MaxHP multiplier (fixed)
    vit_tier_hp_scale: bool = False     # True = uses Grand Light Devastation VIT tiers (5/7/10/15x)
    element: str = "neutral"            # "neutral"|"light"|"dark"|"fire"|"water"|"wind"|"earth"
    uses_weapon_coating: bool = False   # True = inherits weapon coating when skill is neutral
    cooldown: float = 1.0               # Base cooldown (seconds)
    effective_uptime_cd: Optional[float] = None  # Practical rotation CD (e.g. reset on kill)
    cast_time: float = 0.0              # Variable cast time in seconds (0 at total DEX >= 150)
    fixed_cast: float = 0.0             # Fixed cast time in seconds (e.g. Crossfire 0.2s)
    hits: int = 1                       # Hit count per cast
    cooldown_from_aspd: bool = False    # True = ASPD reduces effective skill cooldown
    aspd_scaling_type: str = "fixed_cooldown"  # "fixed_cooldown"|"cooldown_from_aspd"|"aspd_floor"|"multi_hit_cast_dex_over_150"
    never_misses: bool = False          # True = ignores FLEE check (100% hit)
    can_crit: bool = True               # True = scales with Crit / M.Crit
    ignores_def: bool = False           # True = bypasses DEF/MDEF mitigation
    multi_hit_spell: bool = False       # True = benefits from DEX > 150 cast acceleration
    monster_mult: float = 1.0           # PvE total damage multiplier (e.g. 1.50 = +50% vs monsters)
    atk_monster_mult: float = 1.0       # PvE ATK-portion-only multiplier (e.g. Shield Sacrificial Strike 3.0x)
    description: str = ""


@dataclass
class ClassProfile:
    name: str
    job_id: str = "templar"
    tier: str = "Master / Transcendent"
    role: str = "Physical / Tank-Burst"
    weapon_type: str = "aegis"          # Wiki weapon template key (e.g. aegis, katana, tablet, pistols)
    offhand_type: str = "none"          # "none"|"shield"|"orb"|"catalyst"|"lantern"|"shuriken"|"saya"|"quiver"
    is_two_handed: bool = True          # 2H weapons grant 2x stats, 2x refine ATK/pierce, 2 card slots
    level: int = 150
    max_stat_cap: int = 119
    job_bonuses: Dict[str, int] = field(default_factory=dict)
    innate_stats: Dict[str, float] = field(default_factory=dict)
    hp_bonus_pct: float = 0.0           # Wiki Bn.hp (e.g. 1.35 for Templar +135%)
    sp_bonus_pct: float = 0.0           # Wiki Bn.sp (e.g. 0.45 for Templar +45%)
    is_melee: bool = True
    is_ranged_dex_atk: bool = False     # True for bow, kunai, pistols (DEX*3 + floor(STR/5))
    uses_matk_basic_attack: bool = False  # True for flask, quarterstaff, grimoire, tablet
    uses_tablet_hybrid_basic: bool = False  # True for Royal Tablet (atk + matk, spellCrit)
    auto_atk_scale: float = 1.0         # Auto-attack + proc chain equivalent ATK multiplier
    auto_matk_scale: float = 0.0        # Auto-attack MATK proc multiplier
    auto_hp_scale: float = 0.0          # Auto-attack MaxHP proc multiplier (e.g. Colossus Radiant Bash)
    base_aspd: float = 148.0            # Wiki class base ASPD ($n)
    skills: List[SkillSpec] = field(default_factory=list)
    active_stats: Tuple[str, ...] = ("vit", "str", "agi", "dex", "luk")
    innate_passive_name: str = ""
    innate_passive_desc: str = ""
    innate_class_passives: List[str] = field(default_factory=list)
    requires_str_eq_int: bool = False   # True for The King's Royal Balance / Fair Value / HFT

    @property
    def weapon_name(self) -> str:
        names = {
            "aegis": "Lionheart Aegis",
            "katana": "Katana",
            "tablet": "Royal Tablet",
            "grimoire": "Rune Grimoire",
            "flask": "Neko Flask",
            "kunai": "Viper Kunai",
            "cestus": "Cestus",
            "pistols": "Twin Pistols",
            "sword": "Sword",
            "staff": "Staff",
            "rod": "Rod",
            "bow": "Bow",
            "quarterstaff": "Quarterstaff",
            "hammer": "Hammer",
            "dagger_pair": "Dagger Pair",
            "knife": "Knife",
        }
        return names.get(self.weapon_type, self.weapon_type.replace("_", " ").title())

    @property
    def primary_dmg_type(self) -> str:
        if self.uses_tablet_hybrid_basic or self.job_id == "king":
            return "hybrid"
        if self.uses_matk_basic_attack:
            return "magic"
        return "physical"


@dataclass
class GearProfile:
    vit: int = 0
    str_v: int = 0
    agi: int = 0
    dex: int = 0
    int_v: int = 0
    luk: int = 0
    flat_atk: int = 120
    flat_matk: int = 0
    atk_pct: float = 0.15
    matk_pct: float = 0.0
    phys_pierce: float = 0.12
    magic_pierce: float = 0.0
    crit: float = 0.15
    mcrit: float = 0.0
    crit_dmg: float = 0.20
    hit: int = 120
    flee: int = 40
    aspd_flat: float = 0.0              # Flat ASPD from gear (e.g. Shuriken +3, Berserk Potion +5)
    aspd_pct: float = 0.0               # % ASPD from gear/buffs
    cast_reduce_pct: float = 0.0        # Variable cast reduction %
    cd_red: float = 0.0                 # Cooldown reduction %
    gear_def: int = 180
    gear_mdef: int = 90
    flat_hp: int = 2000
    hp_pct: float = 0.05
    flat_sp: int = 300
    sp_pct: float = 0.0
    weapon_coating: Optional[str] = "light"  # None or "fire"|"water"|"wind"|"earth"|"light"|"dark"
    refine_level: int = 10
    is_two_handed: bool = False
    offhand_type: str = "none"          # "none"|"shield"|"orb"|"catalyst"|"lantern"|"shuriken"|"saya"|"quiver"
    level: int = 120

    @property
    def bonus_stats(self) -> Dict[str, int]:
        return {
            "str": self.str_v,
            "agi": self.agi,
            "vit": self.vit,
            "int": self.int_v,
            "dex": self.dex,
            "luk": self.luk,
        }

    @property
    def crit_rate(self) -> float:
        return self.crit

    @property
    def mcrit_rate(self) -> float:
        return self.mcrit


@dataclass
class TargetProfile:
    target_def: int = 255
    target_mdef: int = 240
    target_flee: int = 500
    element: str = "dark"
    is_monster: bool = True
    is_party: bool = False
    preset_id: str = "tier6_dark_boss"
    name: str = "Eclipse Warlord (Tier VI Dark MVP)"
    level: int = 120

    @property
    def phys_def(self) -> int:
        return self.target_def

    @property
    def magic_def(self) -> int:
        return self.target_mdef

    @property
    def flee(self) -> int:
        return self.target_flee

    @property
    def is_pvp(self) -> bool:
        return not self.is_monster


@dataclass
class CardSpec:
    card_id: str
    name: str
    slot: str                           # Primary slot label (e.g. "weapon", "shield", "head", "armor", "garment", "shoes", "accessory")
    slots: Tuple[str, ...] = ("all",)   # Wiki slot list (e.g. ("head", "face", "mouth") or ("sword",))
    tier: str = "S"                     # "C" | "B" | "A" | "S" | "SS" | "Limited" | "MVP"
    is_limited: bool = False
    bonuses: Dict[str, float] = field(default_factory=dict)
    mechanics: Tuple[str, ...] = ()     # Wiki m* mechanic keys (e.g. ("mTitan",), ("mSwarm",))
    description: str = ""
    source_monsters: Tuple[str, ...] = ()
    removable: bool = False
    max_per_item: int = 1
    lm01_pack_info: Optional[Dict[str, Any]] = None
    recommended_for: Tuple[str, ...] = ("physical", "magic", "hybrid", "hp")
