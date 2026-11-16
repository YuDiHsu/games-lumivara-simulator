import React from 'react';
import {
  Activity,
  BarChart3,
  Crosshair,
  Flame,
  Gauge,
  Heart,
  Shield,
  Swords,
  Target,
  Zap,
} from 'lucide-react';
import { BuildCandidate, OptimizeResponse } from '../api/client';

interface DpsChartsProps {
  build: BuildCandidate;
  optimizeResult: OptimizeResponse;
  onToggleLightCoating: (useLight: boolean) => void;
}

const SLICE_COLORS = [
  '#9A6B22', // Muted Brass (Auto Attack)
  '#2B5B84', // Arcane Cobalt (Skill 1)
  '#9E2A2B', // Crimson (Skill 2)
  '#2D6A4F', // Forest (Skill 3)
  '#6B4C7B', // Plum (Skill 4)
];

export const DpsCharts: React.FC<DpsChartsProps> = ({
  build,
  optimizeResult,
  onToggleLightCoating,
}) => {
  const { combat_metrics: cm, skill_breakdown: skills } = build;
  const { coating_comparison: cc, weapon_coating } = optimizeResult;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  const hitDelta = Math.round(cm.hit_total - cm.target_flee);
  const aspdGap = Math.max(0, cm.aspd_cap - cm.aspd);

  return (
    <div className="space-y-4">
      {/* 1. DPS Composition Breakdown */}
      <section className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1E1914] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#9A6B22]" />
              <span>秒傷構成與技能明細</span>
            </h3>
            <p className="text-xs text-[#5C4E3C] mt-0.5">
              含攻速、命中率、冷卻縮減、暴擊期望值與護甲穿透後的持續輸出占比
            </p>
          </div>

          {/* Coating A/B Comparison Pill */}
          <div className="flex items-center gap-2.5 bg-[#F5F0E6] px-3 py-1.5 rounded-md border border-[#D3C6B0] text-xs">
            <Flame className="w-4 h-4 text-[#9A6B22] shrink-0" />
            <div>
              <div className="text-[#1E1914] font-medium">
                光塗層效益：
                <strong className="text-[#2D6A4F] font-mono">
                  {cc.gain_pct >= 0 ? '+' : ''}
                  {cc.gain_pct.toFixed(1)}% DPS
                </strong>
              </div>
              <div className="text-[11px] font-mono text-[#5C4E3C]">
                有塗層 {Math.round(cc.with_light_coating_dps).toLocaleString()} / 無塗層{' '}
                {Math.round(cc.without_coating_dps).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleLightCoating(weapon_coating !== 'light')}
              className={`ml-1 px-2.5 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                weapon_coating === 'light'
                  ? 'bg-[#9A6B22] border-[#9A6B22] text-[#FAF6EE]'
                  : 'bg-[#EDE5D5] border-[#C5B69D] text-[#1E1914] hover:bg-[#E4D9C4]'
              }`}
            >
              {weapon_coating === 'light' ? '切換無塗層' : '啟用光塗層'}
            </button>
          </div>
        </div>

        {/* Horizontal Stacked Bar */}
        <div>
          <div className="h-4 w-full rounded bg-[#EDE5D5] overflow-hidden flex border border-[#D3C6B0] p-0.5 gap-0.5">
            {skills.map((sk, idx) => (
              <div
                key={sk.skill_id}
                style={{
                  width: `${Math.max(2, sk.share_pct)}%`,
                  backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length],
                }}
                className="h-full first:rounded-l-sm last:rounded-r-sm transition-all duration-300"
                title={`${sk.zh_name}: ${Math.round(sk.dps).toLocaleString()} DPS (${sk.share_pct.toFixed(1)}%)`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs">
            {skills.map((sk, idx) => (
              <div key={sk.skill_id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                />
                <span className="text-[#1E1914] font-medium">{sk.zh_name}</span>
                <span className="font-mono font-bold text-[#1E1914]">
                  {Math.round(sk.dps).toLocaleString()}/s
                </span>
                <span className="font-mono text-[#5C4E3C]">({sk.share_pct.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Donut + Detailed Skill Breakdown Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#F5F0E6] rounded-md p-3.5 border border-[#D3C6B0]">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="transparent"
                  stroke="#EDE5D5"
                  strokeWidth="18"
                />
                {skills.map((sk, idx) => {
                  const strokeDasharray = `${(sk.share_pct / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativePct / 100) * circumference);
                  cumulativePct += sk.share_pct;
                  return (
                    <circle
                      key={sk.skill_id}
                      cx="75"
                      cy="75"
                      r={radius}
                      fill="transparent"
                      stroke={SLICE_COLORS[idx % SLICE_COLORS.length]}
                      strokeWidth="18"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono uppercase text-[#5C4E3C]">Total DPS</span>
                <span className="text-base font-extrabold font-mono text-[#9E2A2B]">
                  {Math.round(build.total_dps).toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-[#9A6B22]">Rank #{build.rank}</span>
              </div>
            </div>

            <div className="w-full mt-3 pt-2.5 border-t border-[#D3C6B0] grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#FAF6EE] p-1.5 rounded border border-[#D3C6B0]">
                <div className="text-[10px] text-[#5C4E3C]">普攻與連段</div>
                <div className="font-mono font-bold text-[#9A6B22]">
                  {((build.auto_dps / Math.max(1, build.total_dps)) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#FAF6EE] p-1.5 rounded border border-[#D3C6B0]">
                <div className="text-[10px] text-[#5C4E3C]">主動 / 召喚技能</div>
                <div className="font-mono font-bold text-[#2B5B84]">
                  {((build.skill_dps / Math.max(1, build.total_dps)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D3C6B0] text-[11px] font-semibold text-[#5C4E3C]">
                  <th className="py-2 px-2">技能 / 傷害來源</th>
                  <th className="py-2 px-2">屬性倍率</th>
                  <th className="py-2 px-2 text-right">單發期望傷</th>
                  <th className="py-2 px-2 text-right">冷卻 / 攻頻</th>
                  <th className="py-2 px-2 text-right">命中 / 暴擊</th>
                  <th className="py-2 px-2 text-right">秒傷貢獻</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3C6B0]/60">
                {skills.map((sk, idx) => (
                  <tr key={sk.skill_id} className="hover:bg-[#EDE5D5]/50 transition">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                        />
                        <div>
                          <div className="font-bold text-[#1E1914]">{sk.zh_name}</div>
                          <div className="text-[11px] text-[#5C4E3C]">{sk.notes}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          sk.element === 'light'
                            ? 'bg-[#9A6B22]/15 text-[#9A6B22] border-[#9A6B22]/40'
                            : sk.element === 'dark'
                            ? 'bg-[#6B4C7B]/15 text-[#6B4C7B] border-[#6B4C7B]/40'
                            : 'bg-[#EDE5D5] text-[#5C4E3C] border-[#D3C6B0]'
                        }`}
                      >
                        {sk.element} {sk.elem_mult.toFixed(2)}×
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[#1E1914]">
                      {Math.round(sk.expected_dmg_per_cast).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[#2B5B84]">
                      {sk.skill_id === 'auto_attack'
                        ? `${(1 / Math.max(0.05, sk.effective_cd)).toFixed(2)} 下/秒`
                        : `${sk.effective_cd.toFixed(2)}s`}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[#5C4E3C]">
                      {sk.hit_chance.toFixed(0)}% / {sk.crit_chance.toFixed(0)}%
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      <div className="font-bold text-[#9E2A2B]">
                        {Math.round(sk.dps).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#5C4E3C]">{sk.share_pct.toFixed(1)}%</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. Separated HIT vs ASPD + Core Combat Gauges */}
      <section className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#1E1914] flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#2B5B84]" />
            <span>命中、攻速與戰鬥檢核</span>
          </h3>
          <span className="text-[11px] text-[#5C4E3C]">
            命中 (HIT) 與攻速 (ASPD) 各自獨立結算
          </span>
        </div>

        {/* Two Distinct Cards: HIT vs ASPD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card A: HIT vs Target FLEE */}
          <div className="rounded-md bg-[#F5F0E6] border border-[#2B5B84]/40 p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[#2B5B84] flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                <span>命中率 (HIT vs 目標 FLEE)</span>
              </span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                  cm.hit_chance_pct >= 99.9
                    ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/30'
                    : 'bg-[#9E2A2B]/10 text-[#9E2A2B] border-[#9E2A2B]/30'
                }`}
              >
                {hitDelta >= 0 ? `裕度 +${hitDelta}` : `不足 ${hitDelta}`}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-extrabold font-mono text-[#1E1914]">
                {cm.hit_chance_pct.toFixed(1)}%{' '}
                <span className="text-xs font-normal text-[#5C4E3C]">實際命中</span>
              </div>
              <div className="text-xs font-mono text-[#3E3529]">
                自身 HIT <strong className="text-[#2B5B84]">{Math.round(cm.hit_total)}</strong> / 目標 FLEE{' '}
                <strong className="text-[#9E2A2B]">{cm.target_flee}</strong>
              </div>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[#D3C6B0] text-[11px] text-[#5C4E3C]">
              受等級、DEX×2、LUK/3 與裝備 HIT 影響；必中技能除外 · 自身 FLEE {Math.round(cm.player_flee)}
            </div>
          </div>

          {/* Card B: ASPD / Cap 193 */}
          <div className="rounded-md bg-[#F5F0E6] border border-[#9A6B22]/40 p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[#9A6B22] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>攻擊速度 (ASPD / 上限 193)</span>
              </span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                  cm.aspd >= 192.9
                    ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/30'
                    : 'bg-[#EDE5D5] text-[#9A6B22] border-[#C5B69D]'
                }`}
              >
                {cm.aspd >= 192.9 ? '已達 193 上限' : `距上限差 ${aspdGap.toFixed(1)}`}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-extrabold font-mono text-[#1E1914]">
                ASPD {cm.aspd.toFixed(1)}{' '}
                <span className="text-xs font-normal text-[#5C4E3C]">/ {cm.aspd_cap}</span>
              </div>
              <div className="text-xs font-mono text-[#3E3529]">
                <strong className="text-[#9A6B22]">{cm.attacks_per_sec.toFixed(2)}</strong> 下/秒 ({cm.attack_interval_ms}ms)
              </div>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[#D3C6B0] text-[11px] text-[#5C4E3C]">
              受基礎武器、AGI/DEX、ASPD% 與單張最高攻速卡影響；超過 170 每點普攻{' '}
              <strong className="text-[#2D6A4F]">+1.5%</strong> (目前 +{cm.high_aspd_basic_bonus_pct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Core Stat Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5C4E3C]">
              <span>MaxHP / MaxSP</span>
              <Heart className="w-3.5 h-3.5 text-[#9E2A2B]" />
            </div>
            <div className="text-sm font-extrabold font-mono text-[#1E1914] mt-0.5">
              {Math.round(cm.max_hp).toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-[#5C4E3C]">
              SP {Math.round(cm.max_sp).toLocaleString()}
            </div>
          </div>

          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5C4E3C]">
              <span>面板 ATK / MATK</span>
              <Swords className="w-3.5 h-3.5 text-[#9A6B22]" />
            </div>
            <div className="text-sm font-extrabold font-mono text-[#1E1914] mt-0.5">
              {Math.round(cm.total_atk).toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-[#2B5B84]">
              MATK {Math.round(cm.total_matk).toLocaleString()}
            </div>
          </div>

          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5C4E3C]">
              <span>物穿 / 魔穿</span>
              <Zap className="w-3.5 h-3.5 text-[#2D6A4F]" />
            </div>
            <div className="text-sm font-extrabold font-mono text-[#2D6A4F] mt-0.5">
              {cm.phys_pierce_pct.toFixed(1)}% / {cm.magic_pierce_pct.toFixed(1)}%
            </div>
            <div className="text-[11px] font-mono text-[#5C4E3C]">
              對敵物減實傷 {(cm.effective_phys_mult * 100).toFixed(1)}%
            </div>
          </div>

          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5C4E3C]">
              <span>物理暴擊 / 法術暴擊</span>
              <Target className="w-3.5 h-3.5 text-[#9A6B22]" />
            </div>
            <div className="text-sm font-extrabold font-mono text-[#1E1914] mt-0.5">
              {cm.crit_rate_pct.toFixed(1)}% / {cm.mcrit_rate_pct.toFixed(1)}%
            </div>
            <div className="text-[11px] font-mono text-[#5C4E3C]">
              爆傷 {(cm.crit_dmg_mult * 100).toFixed(0)}% (不穿甲)
            </div>
          </div>

          <div className="rounded-md bg-[#F5F0E6] border border-[#D3C6B0] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5C4E3C]">
              <span>自身雙防 (上限 255)</span>
              <Shield className="w-3.5 h-3.5 text-[#6B4C7B]" />
            </div>
            <div className="text-sm font-extrabold font-mono text-[#1E1914] mt-0.5">
              {cm.player_def} / {cm.player_mdef}
            </div>
            <div className="text-[11px] font-mono text-[#5C4E3C]">
              減傷 {cm.player_phys_dr_pct.toFixed(1)}% / {cm.player_magic_dr_pct.toFixed(1)}%
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
