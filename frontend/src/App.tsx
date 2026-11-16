import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArmorSetMeta,
  BUILTIN_JOBS,
  BUILTIN_PASSIVES,
  BUILTIN_TARGET_PRESETS,
  CardMechanicMeta,
  CardMeta,
  CdcChangeRecord,
  CdcStatusResponse,
  EvaluateResponse,
  fetchCdcChanges,
  fetchCdcStatus,
  fetchMeta,
  GearInput,
  getCachedMeta,
  INITIAL_CDC_CHANGES,
  JobMeta,
  OptimizeResponse,
  PassiveMeta,
  runEvaluate,
  runLocalOptimizer,
  runOptimize,
  TargetInput,
  triggerCdcSync,
} from './api/client';
import { BuildJsonModal } from './components/BuildJsonModal';
import { BuildResultCard } from './components/BuildResultCard';
import { CardPickerModal } from './components/CardPickerModal';
import { CdcBanner } from './components/CdcBanner';
import { ControlPanel } from './components/ControlPanel';
import {
  applyImportedBuildToSimState,
  buildInitialSimState,
  deriveEvaluateArgs,
  LumivaraBuildExportV1,
  preserveSimStateWithNewBenchmark,
  SimState,
} from './utils/simState';

const DEFAULT_GEAR: GearInput = {
  weapon_refine: 4,
  is_two_handed: true,
  offhand_type: 'none',
  weapon_coating: null,
  phys_pierce: 0,
  magic_pierce: 0,
  vit: 0,
  str: 0,
  agi: 0,
  dex: 0,
  int: 0,
  luk: 0,
  flat_atk: 120,
  flat_matk: 120,
  atk_pct: 0,
  matk_pct: 0,
  crit: 0,
  mcrit: 0,
  crit_dmg: 0,
  hit: 0,
  flee: 0,
  aspd_flat: 0,
  aspd_pct: 0,
  gear_def: 40,
  gear_mdef: 30,
  flat_hp: 0,
  hp_pct: 0,
  flat_sp: 0,
  sp_pct: 0,
};

const DEFAULT_TARGET: TargetInput = BUILTIN_TARGET_PRESETS[0]
  ? { ...BUILTIN_TARGET_PRESETS[0], is_party: false }
  : {
      preset_id: 'tier6_dark_boss',
      name: 'Eclipse Warlord (Lv.311 Dark Boss | DEF 255 / FLEE 500)',
      level: 311,
      target_def: 255,
      target_mdef: 240,
      target_flee: 500,
      element: 'dark',
      is_monster: true,
      is_party: false,
    };

function buildBaselineGearForJob(job?: JobMeta): GearInput {
  if (!job) return { ...DEFAULT_GEAR };
  return {
    ...DEFAULT_GEAR,
    is_two_handed: job.is_two_handed,
    offhand_type: job.offhand_type,
    weapon_coating: null,
  };
}

export const App: React.FC = () => {
  const [jobs, setJobs] = useState<JobMeta[]>(BUILTIN_JOBS);
  const [passives, setPassives] = useState<PassiveMeta[]>(BUILTIN_PASSIVES);
  const [cards, setCards] = useState<CardMeta[]>(() => getCachedMeta().cards || []);
  const [armorSets, setArmorSets] = useState<ArmorSetMeta[]>(() => getCachedMeta().armor_sets || []);
  const [targetPresets, setTargetPresets] = useState<TargetInput[]>(BUILTIN_TARGET_PRESETS);
  const [cardMechanics, setCardMechanics] = useState<Record<string, CardMechanicMeta>>(
    () => getCachedMeta().card_mechanics || {}
  );
  const [cdcStatus, setCdcStatus] = useState<CdcStatusResponse | null>(null);
  const [cdcChanges, setCdcChanges] = useState<CdcChangeRecord[]>(INITIAL_CDC_CHANGES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string>('templar');
  const [level, setLevel] = useState<number>(150);
  const [gear, setGear] = useState<GearInput>(DEFAULT_GEAR);
  const [target, setTarget] = useState<TargetInput>(DEFAULT_TARGET);
  const [cardMode, setCardMode] = useState<'limited' | 'budget'>('limited');
  const [unlockedPassives, setUnlockedPassives] = useState<string[]>(
    BUILTIN_PASSIVES.filter((p) => p.handoff_default).map((p) => p.id)
  );

  const [selectedRank, setSelectedRank] = useState<number>(1);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResponse>(() =>
    runLocalOptimizer({
      job_id: 'templar',
      level: 150,
      unlocked_passives: BUILTIN_PASSIVES.filter((p) => p.handoff_default).map((p) => p.id),
      gear: DEFAULT_GEAR,
      target: DEFAULT_TARGET,
      card_budget_mode: 'limited',
      auto_gear_stats: true,
    })
  );

  // Interactive Simulator & Card Picker state
  const [simState, setSimState] = useState<SimState | null>(null);
  const [simDirty, setSimDirty] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<EvaluateResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [cardPickerSlotKey, setCardPickerSlotKey] = useState<string | null>(null);
  const [buildJsonModalTab, setBuildJsonModalTab] = useState<'export' | 'import' | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const pendingImportRef = useRef<LumivaraBuildExportV1 | null>(null);
  const simStateRef = useRef<SimState | null>(null);
  const simDirtyRef = useRef<boolean>(false);
  const prevBenchJobIdRef = useRef<string>(optimizeResult.job.id);
  const forceResetSimRef = useRef<boolean>(false);
  const evalAbortRef = useRef<AbortController | null>(null);
  const evalSeqRef = useRef<number>(0);

  simStateRef.current = simState;
  simDirtyRef.current = simDirty;

  // Load initial metadata & CDC state from SQLite-backed FastAPI endpoints
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [metaData, statusData, changesData] = await Promise.all([
        fetchMeta(),
        fetchCdcStatus(),
        fetchCdcChanges(),
      ]);
      if (!mounted) return;
      setJobs(metaData.jobs);
      setPassives(metaData.passives);
      if (metaData.cards.length > 0) {
        setCards(metaData.cards);
      }
      if (metaData.armor_sets.length > 0) {
        setArmorSets(metaData.armor_sets);
      }
      if (metaData.card_mechanics) {
        setCardMechanics(metaData.card_mechanics);
      }
      if (metaData.target_presets.length > 0) {
        setTargetPresets(metaData.target_presets);
      }
      setCdcStatus(statusData);
      setCdcChanges(changesData);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const executeOptimize = useCallback(
    async (
      nextJobId = selectedJobId,
      nextLevel = level,
      nextGear = gear,
      nextTarget = target,
      nextUnlocked = unlockedPassives,
      nextCardMode = cardMode
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const reqSeq = ++requestSeqRef.current;

      setIsOptimizing(true);
      try {
        const res = await runOptimize(
          {
            job_id: nextJobId,
            level: nextLevel,
            unlocked_passives: nextUnlocked,
            gear: nextGear,
            target: nextTarget,
            card_budget_mode: nextCardMode,
            auto_gear_stats: true,
          },
          controller.signal
        );
        if (controller.signal.aborted || reqSeq !== requestSeqRef.current) {
          return;
        }
        setOptimizeResult(res);
        setSelectedRank(1);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      } finally {
        if (reqSeq === requestSeqRef.current) {
          setIsOptimizing(false);
        }
      }
    },
    [selectedJobId, level, gear, target, unlockedPassives, cardMode]
  );

  useEffect(() => {
    executeOptimize(selectedJobId, level, gear, target, unlockedPassives, cardMode);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [selectedJobId, level, gear, target, unlockedPassives, cardMode, executeOptimize]);

  const currentTopBuild =
    optimizeResult.top_builds[selectedRank - 1] ?? optimizeResult.top_builds[0];

  // Sync Simulator benchmark whenever optimizeResult or selectedRank changes
  useEffect(() => {
    if (!currentTopBuild) return;
    const benchCards =
      currentTopBuild.card_recommendations ?? optimizeResult.card_recommendations;
    const benchAffix =
      currentTopBuild.gear_affix_recommendations ?? optimizeResult.gear_affix_recommendations;
    const freshBase = buildInitialSimState(
      currentTopBuild,
      benchCards,
      benchAffix,
      gear.weapon_refine,
      optimizeResult.weapon_coating,
      optimizeResult.job.is_two_handed,
      armorSets,
      optimizeResult.job.primary_dmg_type,
      optimizeResult.job.offhand_type
    );
    const pending = pendingImportRef.current;
    const prevJobId = prevBenchJobIdRef.current;
    prevBenchJobIdRef.current = optimizeResult.job.id;

    if (
      pending &&
      pending.job_id.toLowerCase() === optimizeResult.job.id.toLowerCase() &&
      pending.level === optimizeResult.level
    ) {
      pendingImportRef.current = null;
      forceResetSimRef.current = false;
      const { simState: merged, warnings } = applyImportedBuildToSimState(
        freshBase,
        pending,
        optimizeResult.job,
        optimizeResult.level,
        armorSets,
        passives,
        cards
      );
      setSimState(merged);
      setSimDirty(true);
      setSimResult(null);
      setImportNotice(
        warnings.length > 0
          ? `已匯入 ${optimizeResult.job.zh_name} Lv.${optimizeResult.level} 配裝（${warnings[0]}）`
          : `已成功匯入 ${optimizeResult.job.zh_name} Lv.${optimizeResult.level} 配裝`
      );
      return;
    }

    if (
      simDirtyRef.current &&
      simStateRef.current &&
      prevJobId === optimizeResult.job.id &&
      !forceResetSimRef.current
    ) {
      const preserved = preserveSimStateWithNewBenchmark(
        simStateRef.current,
        freshBase,
        optimizeResult.level
      );
      setSimState(preserved);
      setSimDirty(true);
      return;
    }

    forceResetSimRef.current = false;
    setSimState(freshBase);
    setSimDirty(false);
    setSimResult(null);
  }, [optimizeResult, selectedRank]);

  // Debounced live `/api/evaluate` execution when user interacts with Simulator
  useEffect(() => {
    if (!simDirty || !simState) return;
    const timer = window.setTimeout(async () => {
      evalAbortRef.current?.abort();
      const controller = new AbortController();
      evalAbortRef.current = controller;
      const seq = ++evalSeqRef.current;
      setIsSimulating(true);
      try {
        const evalArgs = deriveEvaluateArgs(simState, optimizeResult.job, armorSets);
        const res = await runEvaluate(
          {
            job_id: optimizeResult.job.id,
            level: optimizeResult.level,
            ...evalArgs,
            target: optimizeResult.target,
          },
          controller.signal
        );
        if (controller.signal.aborted || seq !== evalSeqRef.current) return;
        setSimResult(res);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (seq === evalSeqRef.current) {
          setIsSimulating(false);
        }
      }
    }, 65);
    return () => {
      window.clearTimeout(timer);
      evalAbortRef.current?.abort();
    };
  }, [simDirty, simState, optimizeResult, armorSets]);

  const handleChangeSimState = (updater: (prev: SimState) => SimState) => {
    setSimState((prev) => (prev ? updater(prev) : prev));
    setSimDirty(true);
  };

  const handleResetSimToBenchmark = () => {
    if (!currentTopBuild) return;
    const benchCards =
      currentTopBuild.card_recommendations ?? optimizeResult.card_recommendations;
    const benchAffix =
      currentTopBuild.gear_affix_recommendations ?? optimizeResult.gear_affix_recommendations;
    setSimState(
      buildInitialSimState(
        currentTopBuild,
        benchCards,
        benchAffix,
        gear.weapon_refine,
        optimizeResult.weapon_coating,
        optimizeResult.job.is_two_handed,
        armorSets,
        optimizeResult.job.primary_dmg_type,
        optimizeResult.job.offhand_type
      )
    );
    setSimDirty(false);
    setSimResult(null);
    setImportNotice(null);
  };

  const handleImportBuild = (payload: LumivaraBuildExportV1, targetJob: JobMeta) => {
    if (
      targetJob.id.toLowerCase() === optimizeResult.job.id.toLowerCase() &&
      payload.level === optimizeResult.level &&
      simState
    ) {
      const { simState: merged, warnings } = applyImportedBuildToSimState(
        simState,
        payload,
        optimizeResult.job,
        optimizeResult.level,
        armorSets,
        passives,
        cards
      );
      setSimState(merged);
      setSimDirty(true);
      setImportNotice(
        warnings.length > 0
          ? `已匯入 ${optimizeResult.job.zh_name} Lv.${optimizeResult.level} 配裝（${warnings[0]}）`
          : `已成功匯入 ${optimizeResult.job.zh_name} Lv.${optimizeResult.level} 配裝`
      );
      return;
    }

    pendingImportRef.current = payload;
    setImportNotice(`正在切換至 ${targetJob.zh_name} Lv.${payload.level} 並匯入配裝...`);
    if (targetJob.id !== selectedJobId) {
      setSelectedJobId(targetJob.id);
      setGear(buildBaselineGearForJob(targetJob));
    }
    if (payload.level !== level) {
      setLevel(payload.level);
    }
  };

  const handleZeroSimGearStats = () => {
    setImportNotice(null);
    handleChangeSimState((prev) => {
      const zeroedSlots: SimState['slot_gear'] = {};
      for (const [k, slot] of Object.entries(prev.slot_gear)) {
        zeroedSlots[k] = {
          ...slot,
          val1: 0,
          val2: 0,
        };
      }
      return {
        ...prev,
        slot_gear: zeroedSlots,
        gear_stats_offset: { vit: 0, str: 0, agi: 0, dex: 0, int: 0, luk: 0 },
      };
    });
  };

  const handleChangeJob = (jid: string) => {
    pendingImportRef.current = null;
    forceResetSimRef.current = true;
    setImportNotice(null);
    setSelectedJobId(jid);
    const nextJob = jobs.find((j) => j.id === jid);
    if (nextJob) {
      setGear(buildBaselineGearForJob(nextJob));
    }
  };

  const handleSelectRank = (rank: number) => {
    forceResetSimRef.current = true;
    setImportNotice(null);
    setSelectedRank(rank);
  };

  const handleSyncWiki = async (simulatePatch: boolean) => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await triggerCdcSync(simulatePatch);
      setCdcStatus(result.status);
      setCdcChanges(result.changes);
      setSyncMessage(result.message);
      try {
        const metaData = await fetchMeta();
        if (metaData.jobs?.length) setJobs(metaData.jobs);
        if (metaData.passives?.length) setPassives(metaData.passives);
        if (metaData.cards?.length) setCards(metaData.cards);
        if (metaData.armor_sets?.length) setArmorSets(metaData.armor_sets);
        if (metaData.card_mechanics) setCardMechanics(metaData.card_mechanics);
      } catch {
        // Keep current cached metadata if refresh fails
      }
      await executeOptimize(selectedJobId, level, gear, target, unlockedPassives, cardMode);
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0];

  const benchmarkCardRecs =
    currentTopBuild?.card_recommendations ?? optimizeResult.card_recommendations;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E6] text-[#1E1914]">
      {/* Top Header */}
      <CdcBanner
        status={cdcStatus}
        changes={cdcChanges}
        selectedJobId={selectedJobId}
        selectedJobName={selectedJob.zh_name}
        activePassives={currentTopBuild ? currentTopBuild.passives.map((p) => p.id) : []}
        activeSets={currentTopBuild ? currentTopBuild.armor_sets.combo : []}
        onSyncWiki={handleSyncWiki}
        isSyncing={isSyncing}
        syncMessage={syncMessage}
      />

      {/* Main Dashboard Layout: Top Target/Passive Bar + Full-Width Paperdoll & Analytics */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 space-y-4">
        <ControlPanel
          selectedJob={selectedJob}
          passives={passives}
          targetPresets={targetPresets}
          level={level}
          gear={gear}
          target={target}
          unlockedPassives={unlockedPassives}
          onChangeTarget={(nextT) => {
            setTarget(nextT);
          }}
          onChangeUnlockedPassives={(nextP) => {
            setUnlockedPassives(nextP);
          }}
          onRunOptimize={() => executeOptimize()}
          isOptimizing={isOptimizing}
        />

        <BuildResultCard
          optimizeResult={optimizeResult}
          selectedRank={selectedRank}
          cardMode={cardMode}
          refineLevel={gear.weapon_refine}
          cardMechanics={cardMechanics}
          allPassives={passives}
          allArmorSets={armorSets}
          allJobs={jobs}
          selectedJobId={selectedJobId}
          levelInput={level}
          gearConfig={gear}
          simState={simState}
          simResult={simResult}
          isSimulating={isSimulating}
          onChangeCardMode={setCardMode}
          onSelectRank={handleSelectRank}
          onToggleLightCoating={(useLight) => {
            handleChangeSimState((prev) => ({
              ...prev,
              weapon_coating: useLight ? 'light' : null,
            }));
          }}
          onChangeJob={handleChangeJob}
          onChangeLevel={(lv) => setLevel(lv)}
          onChangeGearConfig={(nextG) => {
            setGear(nextG);
          }}
          onChangeSimState={handleChangeSimState}
          onResetSimToBenchmark={handleResetSimToBenchmark}
          onZeroSimGearStats={handleZeroSimGearStats}
          onOpenCardPicker={(slotKey) => setCardPickerSlotKey(slotKey)}
          onOpenBuildJsonModal={(tab) => setBuildJsonModalTab(tab)}
          importNotice={importNotice}
        />
      </main>

      {/* Build Simulator JSON Export / Import Modal */}
      {buildJsonModalTab && simState && (
        <BuildJsonModal
          initialTab={buildJsonModalTab}
          simState={simState}
          currentJob={optimizeResult.job}
          currentLevel={optimizeResult.level}
          allJobs={jobs}
          onImportBuild={handleImportBuild}
          onClose={() => setBuildJsonModalTab(null)}
        />
      )}

      {/* Wiki-Style Full-Text Card Picker Modal */}
      {cardPickerSlotKey && simState && (
        <CardPickerModal
          slotKey={cardPickerSlotKey}
          cards={cards}
          currentCardId={simState.cards_by_slot[cardPickerSlotKey] ?? null}
          recommendedCardId={
            benchmarkCardRecs.cards_by_slot[cardPickerSlotKey]?.card_id ?? null
          }
          cardMechanics={cardMechanics}
          job={optimizeResult.job}
          target={optimizeResult.target}
          onSelectCard={(nextCardId) => {
            handleChangeSimState((prev) => ({
              ...prev,
              cards_by_slot: {
                ...prev.cards_by_slot,
                [cardPickerSlotKey]: nextCardId,
              },
            }));
          }}
          onClose={() => setCardPickerSlotKey(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#D3C6B0] bg-[#EDE5D5] py-2.5 px-4 text-center text-[11px] text-[#5C4E3C] font-mono tabular-nums">
        Lumivara Online 冒險者配裝誌 · 上限 119 · 跨職被動 4/4 · 防具套裝 6 部位 · DEF/MDEF 上限 255 (85%) · ASPD 上限 193 · DEX 150 瞬發
      </footer>
    </div>
  );
};

export default App;
