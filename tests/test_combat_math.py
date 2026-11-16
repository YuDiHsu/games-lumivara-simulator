"""Unit tests for Lumivara Online domain combat math & Wiki formulas (AGENTS.md Section 2)."""

from __future__ import annotations

import pytest

from backend.engine.combat_math import (
    calc_aspd,
    calc_aspd_details,
    calc_attacks_per_sec,
    calc_cast_and_cd,
    calc_crit_multiplier,
    calc_damage_after_def,
    calc_def_reduction,
    calc_flee,
    calc_high_aspd_basic_bonus,
    calc_hit,
    calc_hit_chance,
    calc_max_hp,
    calc_phys_crit_rate,
    calc_player_def,
    calc_player_mdef,
    calc_refine_armor_hp,
    calc_refine_atk_matk,
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


def test_total_stat_points_milestones() -> None:
    """Verify exact stat points earned at key levels."""
    assert total_stat_points(1) == 0
    assert total_stat_points(118) == 1708
    assert total_stat_points(121) == 1788
    assert total_stat_points(130) == 2038
    assert total_stat_points(140) == 2335
    assert total_stat_points(150) == 2652


def test_stat_step_and_cumulative_cost() -> None:
    """Verify marginal step cost floor((cur-1)/10)+2 and cumulative cost checkpoints."""
    assert stat_step_cost(1) == 2
    assert stat_step_cost(10) == 2
    assert stat_step_cost(11) == 3
    assert stat_step_cost(99) == 11
    assert stat_step_cost(111) == 13
    assert stat_step_cost(118) == 13

    assert stat_cost(1) == 0
    assert stat_cost(81) == 440
    assert stat_cost(91) == 540
    assert stat_cost(101) == 650
    assert stat_cost(111) == 770
    assert stat_cost(119) == 874


def test_max_stat_cap_for_level() -> None:
    """Standard cap is 99; unlocks to 119 at Lv.119+."""
    assert max_stat_cap_for_level(1) == 99
    assert max_stat_cap_for_level(99) == 99
    assert max_stat_cap_for_level(118) == 99
    assert max_stat_cap_for_level(119) == 119
    assert max_stat_cap_for_level(121) == 119
    assert max_stat_cap_for_level(150) == 119


def test_player_def_mdef_and_reduction_cap() -> None:
    """Player DEF = Gear + floor(VIT/15), MDEF = Gear + floor(INT/10), capped at 255 (85% DR)."""
    assert calc_player_def(200, 300) == 220
    assert calc_player_def(250, 300) == 255
    assert calc_player_mdef(150, 125) == 162
    assert calc_player_mdef(250, 200) == 255

    assert calc_def_reduction(0) == pytest.approx(0.0)
    assert calc_def_reduction(150) == pytest.approx(0.50)
    assert calc_def_reduction(255) == pytest.approx(0.85)
    assert calc_def_reduction(400) == pytest.approx(0.85)


def test_damage_after_def_and_pierce_cap() -> None:
    """Pierce reduces target DR up to 0% effective DR; excess pierce grants no extra damage."""
    assert calc_damage_after_def(1000.0, 255, 0.0) == pytest.approx(150.0)
    assert calc_damage_after_def(1000.0, 255, 0.36) == pytest.approx(510.0)
    assert calc_damage_after_def(1000.0, 255, 0.85) == pytest.approx(1000.0)
    assert calc_damage_after_def(1000.0, 255, 1.20) == pytest.approx(1000.0)


def test_hit_and_flee_distinct_from_aspd() -> None:
    """Verify exact Wiki HIT/FLEE formulas are completely separate from ASPD."""
    # HIT = floor((100 + Lv + DEX*2 + floor(LUK/3) + Gear/Passive) * (1 + Hit%) * (0.85 if Quake))
    hit_base = calc_hit(level=120, total_dex=100, total_luk=30, flat_passive_hit=20, gear_card_set_hit=50)
    assert hit_base == 100 + 120 + 200 + 10 + 20 + 50  # 500
    hit_quake = calc_hit(level=120, total_dex=100, total_luk=30, flat_passive_hit=20, gear_card_set_hit=50, has_quake_card=True)
    assert hit_quake == int(500 * 0.85)  # 425

    # FLEE = floor((Lv + AGI*2 + floor(LUK/5) + Gear) * (1 + Flee%))
    flee_val = calc_flee(level=120, total_agi=100, total_luk=30, gear_card_set_flee=40)
    assert flee_val == 120 + 200 + 6 + 40

    # HitChance clamps strictly to [0.40, 1.00], and returns 1.0 when never_misses=True
    assert calc_hit_chance(500, 500) == pytest.approx(1.00)
    assert calc_hit_chance(460, 500) == pytest.approx(0.90)
    assert calc_hit_chance(100, 500) == pytest.approx(0.40)
    assert calc_hit_chance(800, 500) == pytest.approx(1.00)
    assert calc_hit_chance(100, 999, never_misses=True) == pytest.approx(1.00)


def test_aspd_wiki_formula_non_stacking_cards_and_shield_penalty() -> None:
    """Verify exact Wiki ASPD: non-stacking card ASPD, shield -8 penalty, >180 softcap, 193 hardcap."""
    # Card flat ASPD does NOT stack across cards — only max(card_aspd_values) applies
    d_single = calc_aspd_details("kensei", "katana", total_agi=90, total_dex=60, card_aspd_values=[3.0])
    d_multi = calc_aspd_details("kensei", "katana", total_agi=90, total_dex=60, card_aspd_values=[3.0, 3.0, 2.0])
    assert d_single["max_card_aspd"] == 3.0
    assert d_multi["max_card_aspd"] == 3.0
    assert d_single["aspd"] == d_multi["aspd"]

    # Shield penalty (-8) applies to base_aspd only for actual shields
    d_no_shield = calc_aspd_details("novice", "knife", total_agi=60, total_dex=40, has_actual_shield=False)
    d_shield = calc_aspd_details("novice", "knife", total_agi=60, total_dex=40, has_actual_shield=True)
    assert d_no_shield["base_aspd"] - d_shield["base_aspd"] == pytest.approx(8.0)

    # Hard cap at 193 & interval round((200 - aspd) * 20) ms
    capped = calc_aspd("sinister", "pistols", total_agi=150, total_dex=150, aspd_pct=0.50, flat_gear_set_potion_aspd=20)
    assert capped == 193.0
    assert calc_attacks_per_sec(193.0) == pytest.approx(1000.0 / 140.0, rel=1e-3)
    assert calc_high_aspd_basic_bonus(190.0) == pytest.approx(1.30)


def test_crit_multiplier_and_rates() -> None:
    """Crit multiplier is multiplicative: 2.0 * (1 + crit_dmg_bonus_pct); crit inputs are 0..100 pct points."""
    assert calc_crit_multiplier(0.0) == pytest.approx(2.0)
    assert calc_crit_multiplier(0.20) == pytest.approx(2.40)
    assert calc_crit_multiplier(0.35) == pytest.approx(2.70)

    # Thief knife doubles CRIT rate before 1.0 cap (gear_card_set_crit_pct=10.0 -> +10%)
    r_std = calc_phys_crit_rate(level=120, total_luk=60, gear_card_set_crit_pct=10.0, is_thief_knife=False)
    r_thief = calc_phys_crit_rate(level=120, total_luk=60, gear_card_set_crit_pct=10.0, is_thief_knife=True)
    assert r_thief == pytest.approx(min(1.0, r_std * 2.0))
    assert calc_spell_crit_rate(total_luk=60, gear_card_set_mcrit_pct=5.0) == pytest.approx(0.25)


def test_vit_rebalance_max_hp_and_atk_matk() -> None:
    """Verify Nov 13 VIT Rebalance MaxHP formula (PvE > PvP) and ATK/MATK calculations."""
    hp_pve = calc_max_hp(level=120, base_vit=100, total_vit=120, job_hp_pct=1.35, aegis_hp_pct=0.25, is_pvp=False)
    hp_naga = calc_max_hp(level=120, base_vit=100, total_vit=120, job_hp_pct=1.35, aegis_hp_pct=0.25, is_pvp=False, has_naga_card=True)
    assert hp_naga == pytest.approx(hp_pve * 1.07, rel=1e-3)
    hp_pvp = calc_max_hp(level=120, base_vit=100, total_vit=120, job_hp_pct=1.35, aegis_hp_pct=0.25, is_pvp=True)
    assert hp_pve > hp_pvp

    atk_melee = calc_total_atk(120, 120, 80, 30, 60, hp_pve, 500, 120, 0.30, is_ranged_dex_atk=False)
    atk_ranged = calc_total_atk(120, 30, 120, 30, 60, hp_pve, 500, 120, 0.30, is_ranged_dex_atk=True)
    assert atk_melee > 0 and atk_ranged > 0
    assert calc_total_matk(120, 120, 90, 40, 2000, 100, 0.25) > 0


def test_element_affinity_matrix_and_eclipse() -> None:
    """Verify 4-element cycle (1.25/0.75), Light<->Dark (1.50), and Eclipse Card [1.00, 1.15] clamp."""
    assert element_multiplier("wind", "water") == pytest.approx(1.25)
    assert element_multiplier("water", "fire") == pytest.approx(1.25)
    assert element_multiplier("fire", "earth") == pytest.approx(1.25)
    assert element_multiplier("earth", "wind") == pytest.approx(1.25)

    assert element_multiplier("water", "wind") == pytest.approx(0.75)
    assert element_multiplier("fire", "water") == pytest.approx(0.75)
    assert element_multiplier("earth", "fire") == pytest.approx(0.75)
    assert element_multiplier("wind", "earth") == pytest.approx(0.75)

    assert element_multiplier("light", "dark") == pytest.approx(1.50)
    assert element_multiplier("dark", "light") == pytest.approx(1.50)
    assert element_multiplier("light", "dark", has_eclipse_card=True) == pytest.approx(1.15)

    for elem in ("fire", "water", "wind", "earth"):
        assert element_multiplier(elem, "light") == pytest.approx(0.75)
        assert element_multiplier(elem, "dark") == pytest.approx(0.75)
        assert element_multiplier(elem, "light", has_eclipse_card=True) == pytest.approx(1.00)
        assert element_multiplier("light", elem) == pytest.approx(1.00)
        assert element_multiplier("dark", elem) == pytest.approx(1.00)

    assert element_multiplier("neutral", "dark") == pytest.approx(1.00)


def test_gld_vit_multiplier_tiers() -> None:
    """Grand Light Devastation MaxHP multiplier jumps at VIT 100, 200, and 300 (Lv.10 = 10/15/20/25x)."""
    assert gld_vit_multiplier(99) == pytest.approx(10.0)
    assert gld_vit_multiplier(100) == pytest.approx(15.0)
    assert gld_vit_multiplier(199) == pytest.approx(15.0)
    assert gld_vit_multiplier(200) == pytest.approx(20.0)
    assert gld_vit_multiplier(299) == pytest.approx(20.0)
    assert gld_vit_multiplier(300) == pytest.approx(25.0)
    assert gld_vit_multiplier(350) == pytest.approx(25.0)
    # Lv.1 preserved
    assert gld_vit_multiplier(99, skill_level=1) == pytest.approx(5.0)
    assert gld_vit_multiplier(300, skill_level=1) == pytest.approx(15.0)


def test_skill_cycle_time_and_vit_vs_flat_hp_delta() -> None:
    """Verify ASPD cooldown scaling modes and quantitative +12 VIT vs +180 Flat HP advantage."""
    # cooldown_from_aspd uses attack interval (~140ms at 193 ASPD)
    cd_aspd = calc_skill_cycle_time(
        base_cd=2.5, base_cast=0.0, total_dex=50, cd_red=0.0,
        aspd_scaling_type="cooldown_from_aspd", attack_interval_ms=140,
    )
    assert cd_aspd == pytest.approx(0.14)

    # aspd_floor prevents CD from dropping below attack_interval
    cd_floor = calc_skill_cycle_time(
        base_cd=0.5, base_cast=0.0, total_dex=50, cd_red=0.8,
        aspd_scaling_type="aspd_floor", attack_interval_ms=200,
    )
    assert cd_floor >= 0.20

    # +12 VIT outperforms +180 Flat HP (>2x HP gain even above 100 VIT softcap)
    cmp_res = calc_vit_vs_flat_hp_delta(
        level=150, base_vit=119, total_vit=300.0,
        job_hp_pct=1.25, aegis_hp_pct=0.25, has_naga_card=True,
    )
    assert cmp_res["vit_hp_gain"] > cmp_res["flat_hp_gain"] * 2.0
    assert cmp_res["vit_hp_ratio"] > 2.0


def test_dex_instant_cast_and_multi_hit_acceleration() -> None:
    """DEX 150 reaches 0s variable cast time; DEX > 150 accelerates multi-hit spells up to DEX 250."""
    cd_dex_75 = calc_cast_and_cd(base_cd=4.0, base_cast=2.0, total_dex=75, cd_red=0.0)
    assert cd_dex_75 == pytest.approx(5.0)

    cd_dex_150 = calc_cast_and_cd(
        base_cd=4.0, base_cast=2.0, total_dex=150, cd_red=0.0, multi_hit_spells=True
    )
    assert cd_dex_150 == pytest.approx(4.0)

    cd_dex_200 = calc_cast_and_cd(
        base_cd=4.0, base_cast=2.0, total_dex=200, cd_red=0.0, multi_hit_spells=True
    )
    cd_dex_250 = calc_cast_and_cd(
        base_cd=4.0, base_cast=2.0, total_dex=250, cd_red=0.0, multi_hit_spells=True
    )
    cd_dex_300 = calc_cast_and_cd(
        base_cd=4.0, base_cast=2.0, total_dex=300, cd_red=0.0, multi_hit_spells=True
    )
    assert cd_dex_200 < cd_dex_150
    assert cd_dex_250 < cd_dex_200
    assert cd_dex_300 == pytest.approx(cd_dex_250)


def test_refine_bonuses_1h_vs_2h_and_armor() -> None:
    """Refine +10 grants +5%/+30 (1H), +10%/+60 (2H), +17 (offhand), and +210 HP (armor)."""
    assert calc_refine_pierce(5, is_two_handed=False) == pytest.approx(0.0)
    assert calc_refine_pierce(10, is_two_handed=False) == pytest.approx(0.05)
    assert calc_refine_pierce(10, is_two_handed=True) == pytest.approx(0.10)

    assert calc_refine_atk_matk(10, is_two_handed=False) == 30
    assert calc_refine_atk_matk(10, is_two_handed=True) == 60
    assert calc_refine_atk_matk(10, is_offhand=True) == 17
    assert calc_refine_armor_hp(10) == 210
