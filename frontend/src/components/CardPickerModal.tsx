import React, { useMemo, useState } from 'react';
import { Check, Filter, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react';
import {
  CardMechanicMeta,
  CardMeta,
  JobMeta,
  TargetInput,
  getCardMechanicWarning,
} from '../api/client';

export const CARD_SLOT_LABELS: Record<string, string> = {
  weapon_1: '武器卡槽 ①',
  weapon_2: '武器卡槽 ② (雙手)',
  shield: '副手 / 盾牌卡槽',
  head_upper: '頭上卡槽',
  head_mid: '頭中 / 臉部卡槽',
  head_lower: '頭下 / 嘴部卡槽',
  body: '身體盔甲卡槽',
  garment: '披風卡槽',
  shoes: '鞋子卡槽',
  accessory_1: '飾品 ① 卡槽',
  accessory_2: '飾品 ② 卡槽',
};

export function cardMatchesSlot(card: CardMeta, equipSlot: string): boolean {
  const tags = new Set((card.slots && card.slots.length > 0 ? card.slots : [card.slot]).map((s) => s.toLowerCase()));
  if (tags.has('all')) return true;
  if (equipSlot === 'weapon_1' || equipSlot === 'weapon_2') {
    return tags.has('sword') || tags.has('weapon');
  }
  if (equipSlot === 'shield') {
    return tags.has('shield') || tags.has('offhand');
  }
  if (equipSlot === 'head_upper') {
    return tags.has('head') || tags.has('headgear') || tags.has('head_upper');
  }
  if (equipSlot === 'head_mid') {
    return tags.has('face') || tags.has('headgear') || tags.has('head') || tags.has('head_mid');
  }
  if (equipSlot === 'head_lower') {
    return tags.has('mouth') || tags.has('headgear') || tags.has('head') || tags.has('head_lower');
  }
  if (equipSlot === 'body') {
    return tags.has('armor') || tags.has('body');
  }
  if (equipSlot === 'garment') {
    return tags.has('garment');
  }
  if (equipSlot === 'shoes') {
    return tags.has('shoes');
  }
  if (equipSlot === 'accessory_1' || equipSlot === 'accessory_2') {
    return tags.has('accessory');
  }
  return false;
}

const BONUS_LABEL_MAP: Record<string, string> = {
  vit: 'VIT',
  str: 'STR',
  agi: 'AGI',
  dex: 'DEX',
  int: 'INT',
  luk: 'LUK',
  flat_atk: 'ATK',
  flat_matk: 'MATK',
  atk_pct: 'ATK%',
  matk_pct: 'MATK%',
  crit: 'CRIT',
  mcrit: 'M.CRIT',
  crit_dmg: '爆傷%',
  hit: 'HIT',
  flee: 'FLEE',
  aspd_flat: 'ASPD',
  aspd_pct: 'ASPD%',
  phys_pierce: '物穿%',
  magic_pierce: '魔穿%',
  flat_hp: 'HP',
  hp_pct: 'HP%',
  flat_sp: 'SP',
  sp_pct: 'SP%',
  def: 'DEF',
  mdef: 'MDEF',
  cast_reduce_pct: '減詠唱%',
};

function formatCardBonuses(bonuses: Record<string, number>): string[] {
  const pills: string[] = [];
  for (const [k, v] of Object.entries(bonuses || {})) {
    if (typeof v !== 'number' || v === 0) continue;
    const label = BONUS_LABEL_MAP[k] ?? k.toUpperCase();
    const isPct = k.endsWith('_pct') || k === 'crit_dmg' || k === 'phys_pierce' || k === 'magic_pierce';
    const valStr = isPct && Math.abs(v) < 2 ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(1).replace(/\.0$/, '')}%` : `${v > 0 ? '+' : ''}${v}`;
    pills.push(`${label} ${valStr}`);
  }
  return pills;
}

function tierBadgeClass(tier: string): string {
  const t = tier.toUpperCase();
  if (t.includes('S+') || t.includes('LIMITED')) {
    return 'bg-[#9E2A2B]/12 text-[#9E2A2B] border-[#9E2A2B]/40';
  }
  if (t.includes('S')) {
    return 'bg-[#9A6B22]/15 text-[#9A6B22] border-[#9A6B22]/40';
  }
  if (t.includes('A')) {
    return 'bg-[#2B5B84]/12 text-[#2B5B84] border-[#2B5B84]/35';
  }
  return 'bg-[#EDE5D5] text-[#5C4E3C] border-[#D3C6B0]';
}

interface CardPickerModalProps {
  slotKey: string;
  cards: CardMeta[];
  currentCardId: string | null;
  recommendedCardId: string | null;
  cardMechanics?: Record<string, CardMechanicMeta>;
  job?: JobMeta;
  target?: TargetInput;
  onSelectCard: (cardId: string | null) => void;
  onClose: () => void;
}

export const CardPickerModal: React.FC<CardPickerModalProps> = ({
  slotKey,
  cards,
  currentCardId,
  recommendedCardId,
  cardMechanics,
  job,
  target,
  onSelectCard,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [slotOnly, setSlotOnly] = useState(true);
  const [poolFilter, setPoolFilter] = useState<'all' | 'standard' | 'limited' | 'removable'>('all');

  const slotLabel = CARD_SLOT_LABELS[slotKey] ?? slotKey;

  const filteredCards = useMemo(() => {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return cards
      .filter((c) => {
        if (slotOnly && !cardMatchesSlot(c, slotKey)) return false;
        if (poolFilter === 'standard' && c.is_limited) return false;
        if (poolFilter === 'limited' && !c.is_limited) return false;
        if (poolFilter === 'removable' && !c.removable) return false;
        if (tokens.length === 0) return true;

        const mechText = (c.mechanics || [])
          .map((mk) => `${mk} ${cardMechanics?.[mk]?.title ?? ''} ${cardMechanics?.[mk]?.description ?? ''}`)
          .join(' ');
        const bonusesText = formatCardBonuses(c.bonuses).join(' ');
        const haystack = [
          c.id,
          c.name,
          c.description,
          c.tier ?? '',
          c.slot,
          ...(c.slots || []),
          ...(c.source_monsters || []),
          bonusesText,
          JSON.stringify(c.bonuses || {}),
          mechText,
          c.is_limited ? 'limited 限定' : 'standard 一般',
          c.removable ? 'removable 可拆' : 'permanent 不可拆',
        ]
          .join(' ')
          .toLowerCase();

        return tokens.every((tok) => haystack.includes(tok));
      })
      .sort((a, b) => {
        // Put current & recommended at the very top
        const aScore = (a.id === currentCardId ? 2 : 0) + (a.id === recommendedCardId ? 1 : 0);
        const bScore = (b.id === currentCardId ? 2 : 0) + (b.id === recommendedCardId ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      });
  }, [cards, slotKey, slotOnly, poolFilter, query, currentCardId, recommendedCardId, cardMechanics]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl bg-[#FAF6EE] border border-[#C5B69D] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#EDE5D5] border-b border-[#D3C6B0]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9A6B22]" />
              <h3 className="text-sm font-bold text-[#1E1914]">Wiki 卡片檢索與插槽替換 · {slotLabel}</h3>
            </div>
            <p className="text-[11px] text-[#5C4E3C] mt-0.5">
              支援多關鍵字空白分隔搜尋卡片名稱、完整效果敘述、詞條數值（如 crit / pierce / vit）、掉落怪物或機制關鍵字
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md border border-[#D3C6B0] bg-[#FAF6EE] text-[#5C4E3C] hover:text-[#1E1914] hover:border-[#9A6B22] transition cursor-pointer"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-3 bg-[#F5F0E6] border-b border-[#D3C6B0] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5C4E3C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="輸入關鍵字全文檢索，例如：crit vit、pierce、Baphomet、Aspd、Limited、Boss..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#FAF6EE] border border-[#C5B69D] text-xs text-[#1E1914] placeholder-[#8C7D68] focus:outline-none focus:border-[#9A6B22]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5C4E3C] hover:text-[#1E1914] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSlotOnly((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-medium cursor-pointer transition ${
                  slotOnly
                    ? 'bg-[#9A6B22] text-[#FAF6EE] border-[#9A6B22]'
                    : 'bg-[#FAF6EE] text-[#5C4E3C] border-[#D3C6B0] hover:border-[#9A6B22]'
                }`}
              >
                <Filter className="w-3 h-3" />
                {slotOnly ? `僅顯示 ${slotLabel} 可用` : '顯示全部位卡片'}
              </button>

              {(
                [
                  { id: 'all', label: '全部卡池' },
                  { id: 'standard', label: '一般常駐卡' },
                  { id: 'limited', label: '限定卡' },
                  { id: 'removable', label: '可拆卸' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPoolFilter(tab.id)}
                  className={`px-2 py-1 rounded border font-medium cursor-pointer transition ${
                    poolFilter === tab.id
                      ? 'bg-[#2B5B84] text-[#FAF6EE] border-[#2B5B84]'
                      : 'bg-[#FAF6EE] text-[#5C4E3C] border-[#D3C6B0] hover:border-[#2B5B84]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {recommendedCardId && recommendedCardId !== currentCardId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCard(recommendedCardId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#2D6A4F]/40 bg-[#2D6A4F]/10 text-[#2D6A4F] font-semibold hover:bg-[#2D6A4F]/20 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  還原推薦卡
                </button>
              )}
              {currentCardId !== null && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCard(null);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#9E2A2B]/35 bg-[#9E2A2B]/10 text-[#9E2A2B] font-semibold hover:bg-[#9E2A2B]/20 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  清空此格（無卡）
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#5C4E3C]">
            符合條件：{filteredCards.length} 張卡片（總圖鑑 {cards.length} 張）
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FAF6EE]">
          {filteredCards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#C5B69D] bg-[#F5F0E6] p-8 text-center text-xs text-[#5C4E3C]">
              找不到符合「{query}」的卡片，試著減少關鍵字或切換「顯示全部位卡片」。
            </div>
          ) : (
            filteredCards.map((card) => {
              const isCurrent = card.id === currentCardId;
              const isRecommended = card.id === recommendedCardId;
              const compatible = cardMatchesSlot(card, slotKey);
              const bonusPills = formatCardBonuses(card.bonuses);
              const mechWarning = job
                ? getCardMechanicWarning(card, {
                    jobId: job.id,
                    isMelee: job.is_melee,
                    isParty: target?.is_party,
                    isMonster: target?.is_monster,
                    targetName: target?.name,
                    targetDef: target?.target_def,
                  })
                : null;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    onSelectCard(card.id);
                    onClose();
                  }}
                  className={`w-full text-left rounded-lg border p-3 transition cursor-pointer ${
                    isCurrent
                      ? 'bg-[#EDE5D5] border-[#9A6B22] ring-1 ring-[#9A6B22]/40'
                      : 'bg-[#F5F0E6] border-[#D3C6B0] hover:bg-[#FAF6EE] hover:border-[#9A6B22]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${tierBadgeClass(card.tier ?? 'S')}`}>
                        {card.tier ?? (card.is_limited ? 'Limited' : 'S')}
                      </span>
                      <span className="text-xs font-bold text-[#1E1914]">{card.name}</span>
                      {card.is_limited && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#9E2A2B]/10 text-[#9E2A2B] border border-[#9E2A2B]/30 font-semibold">
                          限定卡
                        </span>
                      )}
                      {isRecommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2D6A4F]/15 text-[#2D6A4F] border border-[#2D6A4F]/35 font-bold">
                          演算法推薦
                        </span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#9A6B22] text-[#FAF6EE] font-bold">
                          <Check className="w-2.5 h-2.5" />
                          目前裝備
                        </span>
                      )}
                      {!compatible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D3C6B0]/60 text-[#5C4E3C] border border-[#C5B69D]">
                          非此部位 ({card.slots.join(', ')})
                        </span>
                      )}
                      {mechWarning && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B45309]/12 text-[#92400E] border border-[#B45309]/35 font-semibold">
                          ⚠ {mechWarning}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-[#5C4E3C] shrink-0">
                      部位：{card.slots.join(', ')} · {card.removable ? '可拆' : '綁定'} ·{' '}
                      {card.source_monsters.length > 0 ? card.source_monsters.join(', ') : '卡包 / 活動'}
                    </div>
                  </div>

                  {bonusPills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {bonusPills.map((pill) => (
                        <span
                          key={pill}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#D3C6B0] text-[#1E1914] font-mono font-semibold"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}

                  {card.description && (
                    <p className="mt-1.5 text-[11px] text-[#3E3529] leading-relaxed">{card.description}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
