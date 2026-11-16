import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileJson,
  Upload,
  X,
} from 'lucide-react';
import type { JobMeta } from '../api/client';
import {
  LumivaraBuildExportV1,
  SimState,
  exportSimBuildToJsonObj,
  parseAndValidateBuildImport,
} from '../utils/simState';

interface BuildJsonModalProps {
  initialTab: 'export' | 'import';
  simState: SimState;
  currentJob: JobMeta;
  currentLevel: number;
  allJobs: JobMeta[];
  onImportBuild: (payload: LumivaraBuildExportV1, targetJob: JobMeta) => void;
  onClose: () => void;
}

export const BuildJsonModal: React.FC<BuildJsonModalProps> = ({
  initialTab,
  simState,
  currentJob,
  currentLevel,
  allJobs,
  onImportBuild,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportObj = useMemo(
    () => exportSimBuildToJsonObj(simState, currentJob, currentLevel),
    [simState, currentJob, currentLevel]
  );

  const exportJsonText = useMemo(
    () => JSON.stringify(exportObj, null, 2),
    [exportObj]
  );

  const importValidation = useMemo(() => {
    if (!importText.trim()) return null;
    return parseAndValidateBuildImport(
      importText,
      allJobs,
      currentJob.id,
      currentLevel
    );
  }, [importText, allJobs, currentJob.id, currentLevel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJsonText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement('textarea');
      el.value = exportJsonText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([exportJsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumivara-${currentJob.id}-lv${currentLevel}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportText(reader.result);
      } else {
        setFileError('無法讀取檔案內容，請確認為 UTF-8 編碼的 JSON 檔案。');
      }
    };
    reader.onerror = () => {
      setFileError('讀取檔案時發生錯誤。');
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importValidation || !importValidation.ok) return;
    onImportBuild(importValidation.data, importValidation.targetJob);
    onClose();
  };

  const exportCardCount = Object.values(exportObj.cards_by_slot).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="配裝 JSON 匯出與匯入"
        className="w-full max-w-2xl rounded-xl bg-[#FAF6EE] border border-[#C9B99B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#EDE5D5] border-b border-[#D3C6B0]">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-[#9A6B22]" />
            <h4 className="text-sm font-bold text-[#1E1914]">
              配裝模擬器 JSON 匯出／匯入
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="p-1 rounded text-[#5C4E3C] hover:text-[#1E1914] hover:bg-[#E4DAC7] cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-[#F5F0E6] border-b border-[#D3C6B0]">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t border border-b-0 cursor-pointer transition ${
              activeTab === 'export'
                ? 'bg-[#FAF6EE] border-[#D3C6B0] text-[#9A6B22] -mb-[1px]'
                : 'bg-transparent border-transparent text-[#5C4E3C] hover:text-[#1E1914]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            匯出目前配裝 JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t border border-b-0 cursor-pointer transition ${
              activeTab === 'import'
                ? 'bg-[#FAF6EE] border-[#D3C6B0] text-[#9A6B22] -mb-[1px]'
                : 'bg-transparent border-transparent text-[#5C4E3C] hover:text-[#1E1914]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            匯入配裝 JSON
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {activeTab === 'export' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#F5F0E6] border border-[#D3C6B0] rounded-md px-3 py-2">
                <div className="text-[#5C4E3C]">
                  目前配置：<span className="font-bold text-[#1E1914]">{currentJob.zh_name}</span> ·{' '}
                  <span className="font-mono font-semibold text-[#1E1914]">Lv.{currentLevel}</span> ·{' '}
                  武器 <span className="font-mono font-semibold">+{exportObj.weapon_refine}</span> ·{' '}
                  被動 <span className="font-mono font-semibold">{exportObj.passives.length}/4</span> ·{' '}
                  卡片 <span className="font-mono font-semibold">{exportCardCount}</span> 張
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer transition ${
                      copied
                        ? 'border-[#2E6F40] bg-[#2E6F40] text-white'
                        : 'border-[#D3C6B0] bg-[#FAF6EE] text-[#1E1914] hover:border-[#9A6B22]'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已複製 JSON' : '複製 JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#9A6B22] bg-[#9A6B22] text-[#FAF6EE] hover:bg-[#825819] text-xs font-semibold cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載 .json 檔案
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={exportJsonText}
                rows={14}
                spellCheck={false}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-[#D3C6B0] bg-[#F5F0E6]/70 p-3 font-mono text-[11px] leading-relaxed text-[#1E1914] focus:outline-none focus:border-[#9A6B22]"
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-[#5C4E3C]">
                  貼上先前匯出的 JSON 文字，或直接讀取本機 <code className="font-mono">.json</code> 檔案，即可還原 6 維、裝備 10 部位階級／詞綴／套裝／卡片與被動。
                </p>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D3C6B0] bg-[#F5F0E6] text-[#1E1914] hover:border-[#9A6B22] font-semibold cursor-pointer transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#9A6B22]" />
                    選擇 .json 檔案
                  </button>
                </div>
              </div>

              <textarea
                value={importText}
                onChange={(e) => {
                  setFileError(null);
                  setImportText(e.target.value);
                }}
                rows={12}
                spellCheck={false}
                placeholder='貼上 {"schema": "lumivara-build-v1", ...} 配裝 JSON 內容，或點擊右上方「選擇 .json 檔案」...'
                className="w-full rounded-md border border-[#D3C6B0] bg-white p-3 font-mono text-[11px] leading-relaxed text-[#1E1914] focus:outline-none focus:border-[#9A6B22]"
              />

              {fileError && (
                <div className="flex items-start gap-2 rounded-md border border-[#9E2A2B]/40 bg-[#9E2A2B]/10 px-3 py-2 text-xs text-[#9E2A2B]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {importValidation && !importValidation.ok && (
                <div className="flex items-start gap-2 rounded-md border border-[#9E2A2B]/40 bg-[#9E2A2B]/10 px-3 py-2 text-xs text-[#9E2A2B]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importValidation.error}</span>
                </div>
              )}

              {importValidation && importValidation.ok && (
                <div className="rounded-md border border-[#2E6F40]/40 bg-[#2E6F40]/10 px-3 py-2 text-xs text-[#1E1914] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#2E6F40]">
                    <Check className="w-4 h-4" />
                    <span>
                      已驗證配裝：{importValidation.targetJob.zh_name} · Lv.{importValidation.data.level} · 武器 +
                      {importValidation.data.weapon_refine} ·{' '}
                      {Object.keys(importValidation.data.slot_gear).length} 個裝備格 ·{' '}
                      {Object.values(importValidation.data.cards_by_slot).filter(Boolean).length} 張卡片 ·{' '}
                      {importValidation.data.passives.length}/4 被動
                    </span>
                  </div>
                  {(importValidation.targetJob.id !== currentJob.id ||
                    importValidation.data.level !== currentLevel) && (
                    <div className="text-[11px] text-[#9A6B22] font-medium">
                      套用時將自動把目前職業／等級切換為「{importValidation.targetJob.zh_name} Lv.
                      {importValidation.data.level}」並帶入全部裝備設定。
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#EDE5D5] border-t border-[#D3C6B0]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-[#D3C6B0] bg-[#FAF6EE] text-xs font-medium text-[#5C4E3C] hover:text-[#1E1914] cursor-pointer transition"
          >
            關閉
          </button>
          {activeTab === 'import' && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!importValidation || !importValidation.ok}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded border text-xs font-bold transition ${
                importValidation && importValidation.ok
                  ? 'border-[#2E6F40] bg-[#2E6F40] text-white hover:bg-[#245832] cursor-pointer'
                  : 'border-[#D3C6B0] bg-[#E4DAC7] text-[#8A7963] cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              套用此配裝 JSON
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
