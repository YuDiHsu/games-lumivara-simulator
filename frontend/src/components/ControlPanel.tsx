import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Layers,
  Swords,
} from 'lucide-react';
import {
  BUILTIN_TARGET_PRESETS,
  ElementType,
  GearInput,
  JOB_ZH_LABELS,
  JobMeta,
  PassiveMeta,
  TargetInput,
} from '../api/client';

const JOB_GROUP_ORDER = [
  'swordman',
  'mage',
  'archer',
  'acolyte',
  'merchant',
  'thief',
  'templar',
  'kensei',
  'king',
  'necromancer',
  'mamushi',
  'nekobaku',
  'ironfist',
  'sinister',
];

export const TARGET_PRESETS: TargetInput[] = BUILTIN_TARGET_PRESETS;

const COATING_LABEL_MAP: Record<string, string> = {
  light: '聖附魔',
  dark: '暗附魔',
  fire: '火附魔',
  water: '水附魔',
  wind: '風附魔',
  earth: '地附魔',
};

interface ControlPanelProps {
  selectedJob: JobMeta;
  passives: PassiveMeta[];
  targetPresets?: TargetInput[];
  level: number;
  gear: GearInput;
  target: TargetInput;
  unlockedPassives: string[];
  onChangeTarget: (nextTarget: TargetInput) => void;
  onChangeUnlockedPassives: (nextIds: string[]) => void;
  onRunOptimize: () => void;
  isOptimizing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedJob,
  passives,
  targetPresets,
  level,
  gear,
  target,
  unlockedPassives,
  onChangeTarget,
  onChangeUnlockedPassives,
  onRunOptimize,
  isOptimizing,
}) => {
  const [showPassivesDrawer, setShowPassivesDrawer] = useState(false);

  const presetsList =
    targetPresets && targetPresets.length > 0 ? targetPresets : TARGET_PRESETS;

  const togglePassive = (pid: string) => {
    if (unlockedPassives.includes(pid)) {
      if (unlockedPassives.length <= 4) return;
      onChangeUnlockedPassives(unlockedPassives.filter((x) => x !== pid));
    } else {
      onChangeUnlockedPassives([...unlockedPassives, pid]);
    }
  };

  const coatingLabel = gear.weapon_coating
    ? COATING_LABEL_MAP[gear.weapon_coating] ?? gear.weapon_coating
    : '無附魔';

  return (
    <section
      aria-label="討伐目標與跨職被動設定列"
      className="rounded-lg bg-[#FAF6EE] border border-[#D3C6B0] shadow-[0_1px_3px_rgba(30,25,20,0.06)] p-3 space-y-2.5"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
        {/* Target Boss / PvP Profile */}
        <div className="xl:col-span-6 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E1914] shrink-0">
            <Crosshair className="w-3.5 h-3.5 text-[#9E2A2B]" />
            <span>討伐目標</span>
          </div>

          <select
            aria-label="討伐目標預設"
            value={target.preset_id}
            onChange={(e) => {
              const found = presetsList.find((t) => t.preset_id === e.target.value);
              if (found) onChangeTarget({ ...found, is_party: target.is_party ?? false });
            }}
            className="flex-1 min-w-[200px] rounded-md bg-[#F5F0E6] border border-[#C5B69D] px-2.5 py-1.5 text-xs font-medium text-[#1E1914] focus:outline-none focus:border-[#9A6B22]"
          >
            {presetsList.map((tp) => (
              <option key={tp.preset_id} value={tp.preset_id}>
                {tp.name}
              </option>
            ))}
            <option value="custom">自訂目標參數</option>
          </select>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <label className="flex items-center gap-1 bg-[#F5F0E6] px-2 py-1 rounded border border-[#D3C6B0]">
              <span className="text-[10px] text-[#5C4E3C]">DEF</span>
              <input
                type="number"
                aria-label="目標 DEF"
                min={0}
                max={255}
                value={target.target_def}
                onChange={(e) =>
                  onChangeTarget({
                    ...target,
                    preset_id: 'custom',
                    target_def: Math.max(0, Math.min(255, Number(e.target.value) || 0)),
                  })
                }
                className="w-10 bg-transparent font-bold text-xs text-[#9E2A2B] focus:outline-none text-right"
              />
            </label>
            <label className="flex items-center gap-1 bg-[#F5F0E6] px-2 py-1 rounded border border-[#D3C6B0]">
              <span className="text-[10px] text-[#5C4E3C]">MDEF</span>
              <input
                type="number"
                aria-label="目標 MDEF"
                min={0}
                max={255}
                value={target.target_mdef}
                onChange={(e) =>
                  onChangeTarget({
                    ...target,
                    preset_id: 'custom',
                    target_mdef: Math.max(0, Math.min(255, Number(e.target.value) || 0)),
                  })
                }
                className="w-10 bg-transparent font-bold text-xs text-[#2B5B84] focus:outline-none text-right"
              />
            </label>
            <label className="flex items-center gap-1 bg-[#F5F0E6] px-2 py-1 rounded border border-[#D3C6B0]">
              <span className="text-[10px] text-[#5C4E3C]">FLEE</span>
              <input
                type="number"
                aria-label="目標 FLEE"
                min={0}
                max={1200}
                value={target.target_flee}
                onChange={(e) =>
                  onChangeTarget({
                    ...target,
                    preset_id: 'custom',
                    target_flee: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-11 bg-transparent font-bold text-xs text-[#9A6B22] focus:outline-none text-right"
              />
            </label>
          </div>

          <select
            aria-label="目標屬性"
            value={target.element}
            onChange={(e) =>
              onChangeTarget({
                ...target,
                preset_id: 'custom',
                element: e.target.value as ElementType,
              })
            }
            className="rounded-md bg-[#F5F0E6] border border-[#C5B69D] px-2 py-1 text-xs text-[#1E1914] font-mono"
          >
            <option value="dark">暗 (Dark)</option>
            <option value="light">光 (Light)</option>
            <option value="neutral">無 (Neutral)</option>
            <option value="fire">火 (Fire)</option>
            <option value="water">水 (Water)</option>
            <option value="wind">風 (Wind)</option>
            <option value="earth">地 (Earth)</option>
          </select>

          <div className="inline-flex rounded-md bg-[#EDE5D5] p-0.5 border border-[#D3C6B0] text-[11px]">
            <button
              type="button"
              onClick={() => onChangeTarget({ ...target, is_monster: true })}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                target.is_monster ? 'bg-[#9E2A2B] text-[#FAF6EE]' : 'text-[#5C4E3C]'
              }`}
            >
              PvE
            </button>
            <button
              type="button"
              onClick={() => onChangeTarget({ ...target, is_monster: false })}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                !target.is_monster ? 'bg-[#9E2A2B] text-[#FAF6EE]' : 'text-[#5C4E3C]'
              }`}
            >
              PvP
            </button>
          </div>

          {target.is_monster && (
            <div
              className="inline-flex rounded-md bg-[#EDE5D5] p-0.5 border border-[#D3C6B0] text-[11px]"
              title="單人/組隊影響機制卡判定（例如：弱點追擊無異常職業需組隊觸發；先手一擊組隊多人時無效）"
            >
              <button
                type="button"
                onClick={() => onChangeTarget({ ...target, is_party: false })}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  !target.is_party ? 'bg-[#2B5B84] text-[#FAF6EE]' : 'text-[#5C4E3C]'
                }`}
              >
                單人
              </button>
              <button
                type="button"
                onClick={() => onChangeTarget({ ...target, is_party: true })}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  target.is_party ? 'bg-[#2B5B84] text-[#FAF6EE]' : 'text-[#5C4E3C]'
                }`}
              >
                組隊
              </button>
            </div>
          )}
        </div>

        {/* Unlocked Passives Pool Bar */}
        <div className="xl:col-span-3 flex flex-wrap items-center justify-between gap-1.5 xl:border-l xl:border-[#D3C6B0] xl:pl-3">
          <button
            type="button"
            onClick={() => setShowPassivesDrawer((v) => !v)}
            className="text-xs font-semibold text-[#1E1914] flex items-center gap-1.5 hover:text-[#9A6B22] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#2B5B84]" />
            <span>
              跨職被動池 ({unlockedPassives.length}/{passives.length})
            </span>
            {showPassivesDrawer ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() =>
                onChangeUnlockedPassives(passives.filter((p) => p.handoff_default).map((p) => p.id))
              }
              className="px-1.5 py-0.5 rounded bg-[#EDE5D5] border border-[#C5B69D] text-[#1E1914] hover:bg-[#E4D9C4] cursor-pointer"
            >
              常用
            </button>
            <button
              type="button"
              onClick={() => onChangeUnlockedPassives(passives.map((p) => p.id))}
              className="px-1.5 py-0.5 rounded bg-[#F5F0E6] border border-[#D3C6B0] text-[#5C4E3C] hover:bg-[#EDE5D5] cursor-pointer"
            >
              全選
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeUnlockedPassives(['swordmastery', 'hprecovery', 'ironbody', 'zanshin'])
              }
              className="px-1.5 py-0.5 rounded bg-[#F5F0E6] border border-[#D3C6B0] text-[#5C4E3C] hover:bg-[#EDE5D5] cursor-pointer"
            >
              僅4格
            </button>
          </div>
        </div>

        {/* Optimize CTA + Active Character Context Pill */}
        <div className="xl:col-span-3 flex items-center justify-between gap-2 xl:border-l xl:border-[#D3C6B0] xl:pl-3">
          <div className="min-w-0 text-[11px] leading-tight hidden sm:block">
            <div className="font-bold text-[#1E1914] truncate">{selectedJob.zh_name}</div>
            <div className="text-[10px] font-mono text-[#5C4E3C] truncate">
              Lv.{level} · +{gear.weapon_refine} · {coatingLabel} · 物減 {(Math.min(255, target.target_def) / 3).toFixed(0)}%
            </div>
          </div>

          <button
            type="button"
            onClick={onRunOptimize}
            disabled={isOptimizing}
            className="flex-1 sm:flex-initial py-2 px-4 rounded-lg bg-[#9E2A2B] hover:bg-[#842122] text-[#FAF6EE] border border-[#7A1E1F] font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{isOptimizing ? '配裝推演中...' : '立即計算最佳配裝'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Cross-Class Passive Selector Drawer (Grouped by Origin Job + Wiki Chinese Descriptions) */}
      {showPassivesDrawer && (() => {
        const groupedMap = new Map<string, PassiveMeta[]>();
        for (const p of passives) {
          const key = p.origin_job || 'all';
          const list = groupedMap.get(key) ?? [];
          list.push(p);
          groupedMap.set(key, list);
        }
        const orderedJobIds = [
          ...JOB_GROUP_ORDER.filter((jid) => groupedMap.has(jid)),
          ...Array.from(groupedMap.keys()).filter((jid) => !JOB_GROUP_ORDER.includes(jid)),
        ];

        const selectJobGroup = (jobPassives: PassiveMeta[], selectAll: boolean) => {
          const ids = jobPassives.map((x) => x.id);
          if (selectAll) {
            onChangeUnlockedPassives(Array.from(new Set([...unlockedPassives, ...ids])));
          } else {
            const next = unlockedPassives.filter((id) => !ids.includes(id));
            if (next.length >= 4) {
              onChangeUnlockedPassives(next);
            }
          }
        };

        return (
          <div className="pt-2.5 border-t border-[#D3C6B0] max-h-[380px] overflow-y-auto pr-1 space-y-3">
            {orderedJobIds.map((jid) => {
              const groupList = groupedMap.get(jid) ?? [];
              const checkedCount = groupList.filter((p) => unlockedPassives.includes(p.id)).length;
              const allChecked = checkedCount === groupList.length;
              const jobTitle = JOB_ZH_LABELS[jid] ?? jid;
              return (
                <div key={jid} className="rounded-md bg-[#F5F0E6]/70 border border-[#D3C6B0] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#D3C6B0]/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1E1914]">
                      <span>{jobTitle}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDE5D5] text-[#5C4E3C] border border-[#D3C6B0]">
                        {checkedCount} / {groupList.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectJobGroup(groupList, !allChecked)}
                      className="text-[10px] px-2 py-0.5 rounded border border-[#C5B69D] bg-[#FAF6EE] hover:bg-[#EDE5D5] text-[#5C4E3C] font-medium cursor-pointer transition"
                    >
                      {allChecked ? '取消本職' : '全選本職'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                    {groupList.map((p) => {
                      const checked = unlockedPassives.includes(p.id);
                      const incompatible =
                        (p.melee_only && !selectedJob.is_melee) ||
                        (p.ranged_only && selectedJob.is_melee) ||
                        (p.aegis_only && selectedJob.id !== 'templar') ||
                        (p.katana_only && selectedJob.id !== 'kensei') ||
                        (p.kunai_only && selectedJob.id !== 'mamushi') ||
                        (p.cestus_only && selectedJob.id !== 'ironfist') ||
                        (p.str_eq_int_only && selectedJob.id !== 'king');
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 p-2 rounded border text-[11px] cursor-pointer select-none transition ${
                            incompatible
                              ? 'bg-[#EDE5D5]/45 border-[#D3C6B0]/60 opacity-60'
                              : checked
                              ? 'bg-[#2B5B84]/10 border-[#2B5B84]/40 text-[#1E1914]'
                              : 'bg-[#FAF6EE] border-[#D3C6B0] text-[#5C4E3C] hover:bg-[#F5F0E6]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePassive(p.id)}
                            className="mt-0.5 rounded accent-[#2B5B84] shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-bold text-[#1E1914] flex flex-wrap items-center justify-between gap-1">
                              <span>{p.zh_name}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 font-medium ${
                                  incompatible
                                    ? 'bg-[#9E2A2B]/10 border-[#9E2A2B]/35 text-[#9E2A2B]'
                                    : p.restriction === 'all'
                                    ? 'bg-[#2D6A4F]/10 border-[#2D6A4F]/30 text-[#2D6A4F]'
                                    : 'bg-[#9A6B22]/12 border-[#9A6B22]/35 text-[#9A6B22]'
                                }`}
                              >
                                {incompatible ? `不適用 (${p.condition_desc})` : p.condition_desc}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#5C4E3C] leading-relaxed">
                              {p.summary}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </section>
  );
};
