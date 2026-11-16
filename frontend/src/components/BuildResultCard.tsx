import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Crown,
  Layers,
  Shield,
  Sliders,
} from 'lucide-react';
import {
  ArmorSetMeta,
  BuildCandidate,
  CardMechanicMeta,
  EvaluateResponse,
  GearInput,
  JobMeta,
  OptimizeResponse,
  PassiveMeta,
  calcCumulativeStatCost,
  calcSingleStepCost,
} from '../api/client';
import { SimState } from '../utils/simState';
import { DpsCharts } from './DpsCharts';
import { EquipmentPaperdoll } from './EquipmentPaperdoll';

type AnalyticsTabId = 'dps' | 'passives_sets' | 'stat_costs';

interface BuildResultCardProps {
  optimizeResult: OptimizeResponse;
  selectedRank: number;
  cardMode: 'limited' | 'budget';
  refineLevel?: number;
  cardMechanics?: Record<string, CardMechanicMeta>;
  allPassives?: PassiveMeta[];
  allArmorSets?: ArmorSetMeta[];
  allJobs?: JobMeta[];
  selectedJobId?: string;
  levelInput?: number;
  gearConfig?: GearInput;
  simState?: SimState | null;
  simResult?: EvaluateResponse | null;
  isSimulating?: boolean;
  onChangeCardMode: (mode: 'limited' | 'budget') => void;
  onSelectRank: (rank: number) => void;
  onToggleLightCoating: (useLight: boolean) => void;
  onChangeJob?: (jobId: string) => void;
  onChangeLevel?: (level: number) => void;
  onChangeGearConfig?: (nextGear: GearInput, reoptimize?: boolean) => void;
  onChangeSimState?: (updater: (prev: SimState) => SimState) => void;
  onResetSimToBenchmark?: () => void;
  onZeroSimGearStats?: () => void;
  onOpenCardPicker?: (cardSlotKey: string) => void;
  onOpenBuildJsonModal?: (tab: 'export' | 'import') => void;
  importNotice?: string | null;
}

export const BuildResultCard: React.FC<BuildResultCardProps> = ({
  optimizeResult,
  selectedRank,
  cardMode,
  refineLevel = 10,
  cardMechanics,
  allPassives = [],
  allArmorSets = [],
  allJobs = [],
  selectedJobId,
  levelInput,
  gearConfig,
  simState,
  simResult,
  isSimulating = false,
  onChangeCardMode,
  onSelectRank,
  onToggleLightCoating,
  onChangeJob,
  onChangeLevel,
  onChangeGearConfig,
  onChangeSimState,
  onResetSimToBenchmark,
  onZeroSimGearStats,
  onOpenCardPicker,
  onOpenBuildJsonModal,
  importNotice,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('dps');

  const builds = optimizeResult.top_builds;
  const currentBuild: BuildCandidate =
    builds.find((b) => b.rank === selectedRank) ?? builds[0];

  if (!currentBuild) {
    return null;
  }

  const statOrder = ['vit', 'str', 'agi', 'dex', 'int', 'luk'] as const;
  const affixRec =
    currentBuild.gear_affix_recommendations ?? optimizeResult.gear_affix_recommendations;
  const benchmarkCardRec =
    currentBuild.card_recommendations ?? optimizeResult.card_recommendations;
  const innateName = optimizeResult.job.innate_passive_name;
  const innateDesc = optimizeResult.job.innate_passive_desc;
  const innateClassPassives =
    currentBuild.innate_class_passives ?? optimizeResult.job.innate_class_passives ?? [];
  const armorSetAlts = optimizeResult.armor_set_alternatives ?? [];

  // Build displayedBuild merging live simulated EvaluateResponse when present
  const displayedBuild: BuildCandidate = React.useMemo(() => {
    if (!simResult) return currentBuild;

    const passiveMap = new Map(allPassives.map((p) => [p.id, p]));
    const setMap = new Map(allArmorSets.map((s) => [s.id, s]));
    const updatedStats: typeof currentBuild.stats = {};

    for (const k of statOrder) {
      const prevSt = currentBuild.stats[k];
      const base = Number(simResult.stat_sources.base?.[k] ?? simResult.base_stats?.[k] ?? prevSt?.base ?? 1);
      const jb = Number(simResult.stat_sources.job?.[k] ?? prevSt?.job_bonus ?? 0);
      const inn = Number(simResult.stat_sources.innate?.[k] ?? prevSt?.innate_bonus ?? 0);
      const gearB = Number(simResult.stat_sources.gear?.[k] ?? simResult.gear_stats?.[k] ?? 0);
      const cardB = Number(simResult.stat_sources.cards?.[k] ?? 0);
      const setB = Number(simResult.stat_sources.sets?.[k] ?? 0);
      const passB = Number(simResult.stat_sources.passives?.[k] ?? 0);
      const total = Number(simResult.total_stats?.[k] ?? base + jb + inn + gearB + cardB + setB + passB);

      updatedStats[k] = {
        ...(prevSt ?? {
          stat: k,
          label: k.toUpperCase(),
          marginal_dps_per_point: 0,
          marginal_dps_per_cost: 0,
          threshold_badges: [],
        }),
        base,
        job_bonus: jb,
        innate_bonus: inn,
        gear_bonus: gearB,
        card_bonus: cardB,
        set_bonus: setB,
        passive_bonus: passB,
        total,
        points_spent: calcCumulativeStatCost(base),
        next_step_cost: base < simResult.stat_cap ? calcSingleStepCost(base) : 0,
      };
    }

    const countMap = new Map<string, number>();
    for (const sid of simResult.armor_sets) {
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }
    const setSummary = Array.from(countMap.entries()).map(([sid, count]) => {
      const sm = setMap.get(sid);
      const reqPc = sm?.pieces_required ?? 2;
      return {
        name: sm?.name ?? sid,
        zh_name: sm?.zh_name ?? sid,
        count,
        pieces: count * reqPc,
        effect: sm?.two_piece_effect ?? '',
      };
    });

    return {
      ...currentBuild,
      total_dps: simResult.total_dps,
      auto_dps: simResult.auto_dps,
      skill_dps: simResult.skill_dps,
      points_used: simResult.points_spent,
      points_budget: simResult.total_stat_points,
      stat_cap: simResult.stat_cap,
      stats: updatedStats,
      passives:
        simResult.passives.length > 0
          ? simResult.passives.map((pid) => passiveMap.get(pid) ?? currentBuild.passives.find((p) => p.id === pid) ?? {
              id: pid,
              name: pid,
              zh_name: pid,
              origin_job: '',
              restriction: 'all',
              category: 'Universal' as const,
              condition_desc: '',
              bonuses: {},
              summary: '',
            })
          : currentBuild.passives,
      armor_sets:
        setSummary.length > 0
          ? { combo: simResult.armor_sets, summary: setSummary }
          : currentBuild.armor_sets,
      skill_breakdown:
        simResult.skill_breakdown.length > 0
          ? simResult.skill_breakdown
          : currentBuild.skill_breakdown,
      combat_metrics: simResult.combat_metrics,
    };
  }, [currentBuild, simResult, allPassives, allArmorSets]);

  return (
    <div className="space-y-3.5">
      {/* 1. Top 5 Builds Selector Strip */}
      <section className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] p-3.5 shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#9A6B22]" />
            <h2 className="text-sm font-bold text-[#1E1914] tracking-wide">
              最佳配裝排行
            </h2>
            <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#EDE5D5] border border-[#D3C6B0] text-[#5C4E3C]">
              {optimizeResult.job.zh_name} · Lv.{optimizeResult.level}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Card Pool Switcher */}
            <div className="inline-flex rounded bg-[#EDE5D5] border border-[#D3C6B0] p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => onChangeCardMode('limited')}
                className={`px-2.5 py-1 rounded transition ${
                  cardMode === 'limited'
                    ? 'bg-[#9A6B22] text-[#FAF6EE] font-semibold shadow-sm'
                    : 'text-[#5C4E3C] hover:text-[#1E1914]'
                }`}
              >
                含禮包限定卡
              </button>
              <button
                type="button"
                onClick={() => onChangeCardMode('budget')}
                className={`px-2.5 py-1 rounded transition ${
                  cardMode === 'budget'
                    ? 'bg-[#2D6A4F] text-[#FAF6EE] font-semibold shadow-sm'
                    : 'text-[#5C4E3C] hover:text-[#1E1914]'
                }`}
              >
                純怪物掉落卡
              </button>
            </div>

            <span className="text-[11px] font-mono tabular-nums px-2 py-1 rounded bg-[#EDE5D5] border border-[#D3C6B0] text-[#5C4E3C]">
              前 {builds.length} 名方案
            </span>
          </div>
        </div>

        {/* Top 5 Candidate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {builds.map((b) => {
            const isSelected = b.rank === currentBuild.rank;
            const setLabel = b.armor_sets.summary
              .map((s) => `${s.name}×${s.pieces / (s.pieces >= 4 ? s.pieces : 2)}`)
              .join(' + ');

            return (
              <button
                key={b.rank}
                type="button"
                onClick={() => onSelectRank(b.rank)}
                className={`text-left rounded-md border p-2.5 transition flex flex-col justify-between min-h-[104px] ${
                  isSelected
                    ? 'bg-[#FAF6EE] border-[#9A6B22] ring-1 ring-[#9A6B22]/40 shadow-[0_2px_6px_rgba(154,107,34,0.14)]'
                    : 'bg-[#EDE5D5]/65 border-[#D3C6B0] hover:bg-[#FAF6EE] hover:border-[#9A6B22]/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[11px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded ${
                        b.rank === 1
                          ? 'bg-[#9A6B22] text-[#FAF6EE]'
                          : 'bg-[#E5DAC5] text-[#5C4E3C]'
                      }`}
                    >
                      #{b.rank}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#8A7963]">
                      HP {Math.round(b.combat_metrics.max_hp).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-1.5 font-mono tabular-nums text-base font-extrabold text-[#9E2A2B] leading-tight">
                    {Math.round(b.total_dps).toLocaleString()}
                    <span className="text-[10px] font-semibold text-[#5C4E3C] ml-1">
                      DPS
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#D3C6B0]/80 space-y-1">
                  <div className="text-[10px] text-[#5C4E3C] truncate" title={setLabel}>
                    {setLabel || '無套裝組合'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {b.passives.slice(0, 2).map((p) => (
                      <span
                        key={p.id}
                        className="text-[9px] px-1 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[#5C4E3C] truncate max-w-[92px]"
                      >
                        {p.zh_name}
                      </span>
                    ))}
                    {b.passives.length > 2 && (
                      <span className="text-[9px] font-mono tabular-nums text-[#8A7963]">
                        +{b.passives.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Unified In-Game Paperdoll & Live Build Simulator */}
      <EquipmentPaperdoll
        build={displayedBuild}
        benchmarkBuild={currentBuild}
        job={optimizeResult.job}
        level={optimizeResult.level}
        refineLevel={simState?.weapon_refine ?? refineLevel}
        gearAffixRecommendations={affixRec}
        cardRecommendations={benchmarkCardRec}
        cardMechanics={cardMechanics}
        simCardsBySlot={simResult?.cards_by_slot}
        simState={simState}
        simResult={simResult}
        isSimulating={isSimulating}
        allPassives={allPassives}
        allArmorSets={allArmorSets}
        allJobs={allJobs}
        selectedJobId={selectedJobId}
        levelInput={levelInput}
        gearConfig={gearConfig}
        onChangeJob={onChangeJob}
        onChangeLevel={onChangeLevel}
        onChangeGearConfig={onChangeGearConfig}
        onChangeSimState={onChangeSimState}
        onResetToBenchmark={onResetSimToBenchmark}
        onZeroAllGearStats={onZeroSimGearStats}
        onOpenCardPicker={onOpenCardPicker}
        onOpenBuildJsonModal={onOpenBuildJsonModal}
        importNotice={importNotice}
      />

      {/* 3. Single Tabbed Analytics Area */}
      <section className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] shadow-[0_1px_3px_rgba(30,25,20,0.06)] overflow-hidden">
        <div
          role="tablist"
          aria-label="配裝詳細分析分頁"
          className="flex flex-wrap items-center gap-1 px-3 pt-2.5 border-b border-[#D3C6B0] bg-[#EDE5D5]/70"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dps'}
            onClick={() => setActiveTab('dps')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-md border-t border-x transition flex items-center gap-1.5 -mb-px ${
              activeTab === 'dps'
                ? 'bg-[#FAF6EE] border-[#D3C6B0] text-[#1E1914]'
                : 'bg-transparent border-transparent text-[#5C4E3C] hover:text-[#1E1914]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#9E2A2B]" />
            <span>傷害構成與技能明細</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'passives_sets'}
            onClick={() => setActiveTab('passives_sets')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-md border-t border-x transition flex items-center gap-1.5 -mb-px ${
              activeTab === 'passives_sets'
                ? 'bg-[#FAF6EE] border-[#D3C6B0] text-[#1E1914]'
                : 'bg-transparent border-transparent text-[#5C4E3C] hover:text-[#1E1914]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#9A6B22]" />
            <span>本職天賦與 4/4 跨職被動 &amp; 6 件套裝</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stat_costs'}
            onClick={() => setActiveTab('stat_costs')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-md border-t border-x transition flex items-center gap-1.5 -mb-px ${
              activeTab === 'stat_costs'
                ? 'bg-[#FAF6EE] border-[#D3C6B0] text-[#1E1914]'
                : 'bg-transparent border-transparent text-[#5C4E3C] hover:text-[#1E1914]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#2B5B84]" />
            <span>六維配點點數成本</span>
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'dps' && (
            <DpsCharts
              build={displayedBuild}
              optimizeResult={optimizeResult}
              onToggleLightCoating={onToggleLightCoating}
            />
          )}

          {activeTab === 'passives_sets' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Innate Job Passive + 4/4 Cross-Class Passives */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1E1914] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#9A6B22]" />
                    <span>本職固有天賦 &amp; 跨職被動 (4 / 4 欄)</span>
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#EDE5D5] border border-[#D3C6B0] text-[#5C4E3C]">
                  {displayedBuild.passives.length} / 4 已裝備
                  </span>
                </div>

                {/* Innate Job Passive (does not consume 4/4 slot) */}
                {(innateName || innateDesc || innateClassPassives.length > 0) && (
                  <div className="rounded-md bg-[#EDE5D5] border border-[#9A6B22]/45 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-[#1E1914] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#9A6B22]" />
                        {innateName || `${optimizeResult.job.zh_name} 固有天賦`}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[#9A6B22]">
                        固有天賦 (不佔 4 格)
                      </span>
                    </div>
                    {innateDesc && (
                      <p className="text-xs text-[#5C4E3C] leading-relaxed">
                        {innateDesc}
                      </p>
                    )}
                    {innateClassPassives.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[#D3C6B0]/80">
                        {innateClassPassives.map((ip) => (
                          <span
                            key={ip}
                            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#FAF6EE] border border-[#9A6B22]/50 text-[#1E1914]"
                          >
                            {ip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4/4 Cross-Class Passives */}
                <div className="space-y-2">
                  {displayedBuild.passives.map((p, idx) => (
                    <div
                      key={p.id}
                      className="rounded-md bg-[#EDE5D5]/55 border border-[#D3C6B0] p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[#5C4E3C]">
                            欄位 {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-[#1E1914]">
                            {p.zh_name}
                          </span>
                          <span className="text-[10px] text-[#8A7963]">
                            ({p.origin_job})
                          </span>
                        </div>
                        <p className="text-xs text-[#5C4E3C] mt-1 leading-relaxed">
                          {p.summary}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[#2B5B84]">
                        {p.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: 6-Piece Armor Sets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1E1914] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#2B5B84]" />
                    <span>6 件防具套裝搭配</span>
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#EDE5D5] border border-[#D3C6B0] text-[#2B5B84]">
                    {displayedBuild.armor_sets.summary.reduce((acc, s) => acc + s.pieces, 0)} / 6 部位
                  </span>
                </div>

                <div className="space-y-2">
                  {displayedBuild.armor_sets.summary.map((s) => (
                    <div
                      key={s.name}
                      className="rounded-md bg-[#EDE5D5]/55 border border-[#D3C6B0] p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#2B5B84] text-[#FAF6EE] font-mono tabular-nums font-bold text-[10px]">
                            {s.count} 組 ({s.pieces} 件)
                          </span>
                          <span className="font-bold text-xs text-[#1E1914]">
                            {s.zh_name}
                          </span>
                        </div>
                        <p className="text-xs text-[#5C4E3C] mt-1 leading-relaxed">
                          {s.effect}
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums text-[11px] text-[#2B5B84] shrink-0">
                        {s.pieces} / 6
                      </div>
                    </div>
                  ))}
                </div>

                {armorSetAlts.length > 1 && (
                  <div className="rounded-md bg-[#EDE5D5]/55 border border-[#D3C6B0] p-3">
                    <div className="text-[11px] font-bold text-[#1E1914] mb-2">
                      候選套裝組合比較
                    </div>
                    <div className="space-y-1.5">
                      {armorSetAlts.map((alt, idx) => (
                        <div
                          key={alt.armor_set_summary + idx}
                          className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums px-2 py-1 rounded bg-[#FAF6EE] border border-[#D3C6B0]/80"
                        >
                          <span className="text-[#1E1914] truncate">
                            {alt.armor_set_summary}
                          </span>
                          <span
                            className={`shrink-0 font-bold ${
                              alt.is_recommended
                                ? 'text-[#2D6A4F]'
                                : 'text-[#5C4E3C]'
                            }`}
                          >
                            {Math.round(alt.total_dps).toLocaleString()} DPS (
                            {alt.dps_delta_pct >= 0 ? `+${alt.dps_delta_pct.toFixed(2)}%` : `${alt.dps_delta_pct.toFixed(2)}%`})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-md bg-[#EDE5D5] border border-[#D3C6B0] text-xs text-[#5C4E3C] leading-relaxed">
                  頭上、頭中、頭下、身體、披風、鞋子共 6 部位可觸發套裝效果，支援{' '}
                  <strong className="text-[#1E1914]">3 組 2 件套</strong>、
                  <strong className="text-[#1E1914]">4 件套 + 2 件套</strong> 或{' '}
                  <strong className="text-[#1E1914]">6 件套 (Blood Lord)</strong>。
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stat_costs' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D3C6B0]">
                <div className="text-xs text-[#5C4E3C]">
                  單項基礎上限{' '}
                  <span className="font-mono tabular-nums font-bold text-[#1E1914]">
                    {currentBuild.stat_cap}
                  </span>{' '}
                  · 每點成本{' '}
                  <span className="font-mono text-[#2B5B84]">
                    ⌊(cur - 1) / 10⌋ + 2
                  </span>
                </div>
                <div className="text-xs font-mono tabular-nums text-[#2D6A4F] font-semibold">
                  已分配點數：{displayedBuild.points_used.toLocaleString()} /{' '}
                  {displayedBuild.points_budget.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {statOrder.map((stKey) => {
                  const st = displayedBuild.stats[stKey];
                  if (!st) return null;
                  const cardB = st.card_bonus ?? 0;
                  const setB = st.set_bonus ?? 0;
                  const bonusSum =
                    st.job_bonus + st.innate_bonus + st.gear_bonus + cardB + setB + st.passive_bonus;
                  const pctOfCap = Math.min(
                    100,
                    (st.base / displayedBuild.stat_cap) * 100
                  );

                  return (
                    <div
                      key={stKey}
                      className="rounded-md bg-[#EDE5D5]/55 border border-[#D3C6B0] p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-[#1E1914]">
                            {st.label}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#FAF6EE] text-[#5C4E3C] border border-[#D3C6B0]">
                            消耗 {st.points_spent} pt
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between my-1.5">
                          <div className="flex items-baseline gap-1 font-mono tabular-nums">
                            <span className="text-2xl font-extrabold text-[#9A6B22]">
                              {st.base}
                            </span>
                            <span className="text-xs font-semibold text-[#2D6A4F]">
                              +{bonusSum}
                            </span>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <span className="text-[10px] text-[#8A7963]">總計 </span>
                            <span className="text-base font-bold text-[#1E1914]">
                              {st.total}
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-[#E5DAC5] overflow-hidden mb-2">
                          <div
                            className="h-full bg-[#9A6B22] rounded-full"
                            style={{ width: `${pctOfCap}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono tabular-nums text-[#5C4E3C] bg-[#FAF6EE] p-1.5 rounded border border-[#D3C6B0]/80">
                          <div>職+{st.job_bonus}</div>
                          <div>天+{st.innate_bonus}</div>
                          <div className="font-bold text-[#2B5B84]">裝+{st.gear_bonus}</div>
                          <div>卡+{cardB}</div>
                          <div>套+{setB}</div>
                          <div>被+{st.passive_bonus}</div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#D3C6B0]/80 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="font-mono tabular-nums text-[#5C4E3C]">
                          下點成本:{' '}
                          <strong className="text-[#1E1914]">
                            {st.next_step_cost > 0 ? `${st.next_step_cost} pt` : 'MAX'}
                          </strong>
                        </span>
                        {st.marginal_dps_per_point > 0 && (
                          <span className="font-mono tabular-nums text-[#2B5B84] font-semibold">
                            +1 邊際: +{Math.round(st.marginal_dps_per_point).toLocaleString()} DPS
                          </span>
                        )}
                      </div>

                      {st.threshold_badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {st.threshold_badges.map((b, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#2D6A4F]/12 text-[#2D6A4F] border border-[#2D6A4F]/35"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
