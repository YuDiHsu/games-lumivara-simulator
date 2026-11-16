import React, { useState } from 'react';
import {
  BookOpen,
  FileDiff,
  FlaskConical,
  RefreshCw,
  ScrollText,
  X,
} from 'lucide-react';
import { CdcChangeRecord, CdcStatusResponse } from '../api/client';

interface CdcBannerProps {
  status: CdcStatusResponse | null;
  changes: CdcChangeRecord[];
  selectedJobId: string;
  selectedJobName: string;
  activePassives: string[];
  activeSets: string[];
  onSyncWiki: (simulatePatch: boolean) => Promise<void>;
  isSyncing: boolean;
  syncMessage: string | null;
}

export const CdcBanner: React.FC<CdcBannerProps> = ({
  status,
  changes,
  selectedJobId,
  selectedJobName,
  activePassives,
  activeSets,
  onSyncWiki,
  isSyncing,
  syncMessage,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'current_job' | 'all'>('current_job');

  const affectingCurrentBuild = changes.filter(
    (c) =>
      c.affected_jobs.includes(selectedJobId) ||
      activePassives.includes(c.entity_id) ||
      activeSets.includes(c.entity_id)
  );

  const displayedChanges = filterMode === 'current_job' ? affectingCurrentBuild : changes;
  const patchLabel = (status?.active_patch_version ?? '2026-11-13').replace(/-/g, '.');

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#D3C6B0] bg-[#FAF6EE]/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 min-h-[48px] flex items-center justify-between gap-3">
          {/* Brand & Active Context */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#9A6B22] flex items-center justify-center text-[#FAF6EE] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold tracking-tight text-[#1E1914] text-sm sm:text-base truncate">
                Lumivara Online 冒險者配裝誌
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[#EDE5D5] border border-[#D3C6B0] text-[11px] font-medium text-[#5C4E3C]">
                {selectedJobName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[11px] font-mono text-[#9A6B22]">
                Ver. {patchLabel}
              </span>
            </div>
          </div>

          {/* Discreet Changelog & Sync Trigger */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EDE5D5] hover:bg-[#E4D9C4] border border-[#D3C6B0] text-[#1E1914] text-xs font-medium transition cursor-pointer shrink-0"
          >
            <ScrollText className="w-3.5 h-3.5 text-[#9A6B22]" />
            <span>改版紀錄與資料同步</span>
            {affectingCurrentBuild.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-[#9E2A2B] text-[#FAF6EE] text-[10px] font-mono font-bold">
                {affectingCurrentBuild.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Changelog & Sync Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1914]/50 backdrop-blur-[1px]">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-[#FAF6EE] border border-[#C5B69D] shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-[#EDE5D5] border-b border-[#D3C6B0] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileDiff className="w-4 h-4 text-[#9A6B22]" />
                <h2 className="text-sm font-bold text-[#1E1914]">
                  遊戲版本異動與圖鑑資料同步 ({status?.tracked_entities_count ?? 467} 筆資料)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-[#D3C6B0]/60 text-[#5C4E3C]"
                aria-label="關閉視窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="px-4 py-2.5 bg-[#F5F0E6] border-b border-[#D3C6B0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('current_job')}
                  className={`px-2.5 py-1 rounded border font-medium transition ${
                    filterMode === 'current_job'
                      ? 'bg-[#9A6B22] text-[#FAF6EE] border-[#9A6B22]'
                      : 'bg-[#FAF6EE] text-[#5C4E3C] border-[#D3C6B0] hover:bg-[#EDE5D5]'
                  }`}
                >
                  影響目前職業 ({affectingCurrentBuild.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded border font-medium transition ${
                    filterMode === 'all'
                      ? 'bg-[#9A6B22] text-[#FAF6EE] border-[#9A6B22]'
                      : 'bg-[#FAF6EE] text-[#5C4E3C] border-[#D3C6B0] hover:bg-[#EDE5D5]'
                  }`}
                >
                  全部紀錄 ({changes.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSyncWiki(false)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2B5B84] hover:bg-[#224A6D] text-[#FAF6EE] font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>同步圖鑑資料</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSyncWiki(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDE5D5] hover:bg-[#E4D9C4] border border-[#C5B69D] text-[#5C4E3C] font-medium transition disabled:opacity-50"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-[#9A6B22]" />
                  <span>模擬測試改版</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-2.5 text-xs">
              {syncMessage && (
                <div className="px-3 py-2 rounded bg-[#EDE5D5] border border-[#9A6B22]/40 text-[#1E1914] font-medium">
                  {syncMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5C4E3C] pb-1">
                <span>最後同步時間：{status?.last_sync_at ?? '2026-11-15'}</span>
                <span>連線模式：{status?.backend_online ? '即時伺服器運算' : '離線圖鑑模式'}</span>
              </div>

              {displayedChanges.length === 0 ? (
                <div className="p-4 rounded bg-[#EDE5D5]/70 border border-[#D3C6B0] text-center text-[#5C4E3C]">
                  目前職業在此版本無專屬數值異動。
                </div>
              ) : (
                displayedChanges.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-md bg-[#F5F0E6] border border-[#D3C6B0] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            rec.impact_level === 'HIGH'
                              ? 'bg-[#9E2A2B]/10 text-[#9E2A2B] border-[#9E2A2B]/30'
                              : 'bg-[#9A6B22]/10 text-[#9A6B22] border-[#9A6B22]/30'
                          }`}
                        >
                          {rec.entity_type}
                        </span>
                        <span className="font-bold text-[#1E1914]">{rec.entity_name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#5C4E3C]">{rec.patch_version}</span>
                    </div>
                    <p className="text-[#3E3529] leading-relaxed">{rec.summary}</p>
                    {Object.keys(rec.diff_json || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(rec.diff_json).map(([field, vals]) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] font-mono text-[11px]"
                          >
                            <span className="text-[#5C4E3C]">{field}: </span>
                            <span className="text-[#9E2A2B] line-through">{String(vals.old)}</span>
                            <span className="text-[#5C4E3C]"> → </span>
                            <span className="text-[#2D6A4F] font-semibold">{String(vals.new)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
