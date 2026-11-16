# AGENTS.md — Lumivara Online Build & DPS Optimizer

本文件為 **Lumivara Online 全職業配點、跨職業被動與裝備套裝最佳化專案**的通用開發規範。任何針對特定職業（如 Templar、Kensei、The King、Wicked Necromancer 等）的實作、現況數據與進度，請另行維護於 `HANDOFF.md`，本文件僅規範跨職業通用的遊戲公式、架構邊界與驗證標準。

## 1. 開發與執行環境
* **全端架構（Full-Stack Architecture）**：
  * **資料層與 CDC 爬蟲（`backend/db/`, `backend/scraper/`）**：使用 **SQLite**（`data/lumivara.db`）儲存全 15 職業、技能、跨職業被動、裝備、防具套裝、卡片與目標怪物資料；搭配 `httpx` + `beautifulsoup4` 定期同步 [Lumivara Online Wiki](https://lumivaraonline.com/wiki/) 與更新日誌，並透過 Canonical JSON SHA-256 雜湊實作 **CDC（Change Data Capture）變更偵測**（寫入 `entity_hashes` 與 `data_changes`）。
  * **後端 API 與最佳化引擎（`backend/engine/`, `backend/api/`, `backend/main.py`）**：以 **FastAPI + Pydantic** 提供 RESTful API，核心秒傷計算與多階段尋優引擎維持高內聚、無外部狀態耦合設計，並以 `data/wiki_ground_truth.json` 作為 Wiki 公式基準。
  * **前端互動儀表板（`frontend/`）**：使用 **React + Vite + Tailwind CSS**（支援離線 Fallback：`frontend/src/api/wikiFallbackData.ts`）呈現頂部 CDC 改版異動通知列、精簡全寬控制列（`ControlPanel.tsx`：討伐目標與跨職被動池）、Top 5 推薦方案切換與統一紙娃娃互動模擬器（`EquipmentPaperdoll.tsx`，整合職業／等級、6 維配點、10 部位 Tier I–VI 裝備詞綴／原生白字／飾品白字／套裝／精煉塗層與 4/4 被動）、Wiki 全文卡片搜尋視窗（`CardPickerModal.tsx`）、JSON 匯出／匯入視窗（`BuildJsonModal.tsx`），以及 DPS 構成拆解圖表。裝備階級與詞池規則由 `/api/meta` 的 `equipment_affix_system` 動態提供，不於前端寫死。
* **套件與虛擬環境管理（`uv` / `npm`）**：
  * Python 依賴透過 `pyproject.toml` 與 **`uv`** 統一管理（虛擬環境位於專案根目錄 `.venv`）：
    ```bash
    # 安裝與同步環境依賴
    uv sync

    # 執行單元測試與公式驗證
    uv run pytest -v

    # 啟動後端 FastAPI 開發伺服器
    uv run uvicorn backend.main:app --reload --port 8000

    # 前端建置與開發伺服器
    npm --prefix frontend run build
    npm --prefix frontend run dev

    # 執行單機最佳化腳本驗證
    uv run python lumivara_optimizer.py
    ```

## 2. 全職業通用遊戲機制與硬性限制（Domain Invariants）
所有計算模組必須嚴格遵守 [Lumivara Online Wiki](https://lumivaraonline.com/wiki/) 的既有規則，不得自行捏造或覆寫公式：

1. **屬性上限與點數成本**（[Combat & Stats](https://lumivaraonline.com/wiki/#combat)）：
   * 單項基礎屬性起點為 `1`，標準上限 `99`，Lv.119 解鎖後上限為 **`119`**。
   * 升級獲得點數：$\sum_{L=2}^{\text{Lv}} (\lfloor L/5 \rfloor + 3)$。
   * 提升 1 點屬性成本：$\lfloor (\text{cur}-1)/10 \rfloor + 2$。
2. **跨職業被動欄位限制**（[Levelling & Passives](https://lumivaraonline.com/wiki/#progress)）：
   * 額外攜帶的跨職業被動欄位上限為 **`4 / 4`** 格（職業固有被動與生活技能不佔此欄位）。
   * 必須區分被動的生效條件：全職業通用、限特定武器（近戰 / 遠程 / 弓 / 苦無 / 武士刀 / 拳套 / Lionheart Aegis 等）、或條件觸發（如 The King 的 `STR = INT`）。
3. **防禦、減傷、血量與穿透**（[Combat & Stats](https://lumivaraonline.com/wiki/#combat)）：
   * 玩家 $\text{DEF} = \text{裝備與精煉 DEF} + \lfloor \text{VIT}/15 \rfloor$；$\text{MDEF} = \text{裝備與精煉 MDEF} + \lfloor \text{INT}/10 \rfloor$，兩者總和上限皆為 **`255`**（最高 **85%** 減傷）。
   * 減傷與穿透公式：$\text{最終傷害} = \text{原始傷害} \times (1 - \max(0, \min(255, \text{DEF或MDEF})/300 - \text{Pierce}))$。
   * 暴擊**不穿透護甲**；穿透超過目標減傷率（最高 85%）後不再提供額外增傷。
   * **Nov 13 VIT Rebalance 血量公式**：$\text{BodyHP} = \lfloor (\lfloor (100 + (\text{Lv}-1)\cdot 5 + \text{VIT}\cdot 10)\times (1+\text{Bn.hp})\rfloor + \text{GearHP}) \times (1 + \text{PassiveHP\%} + \text{AegisHP\%}) \rfloor$，加上 $\text{VIT\_Refund}$ 後乘上 $\text{vit\_hp\_mult}$（PvE：`1 + VIT*0.006` ≤100 / `1.6 + (VIT-100)*0.002` >100；PvP：`1 + VIT*0.003` ≤100 / `1.3 + (VIT-100)*0.001` >100）與 `1.07`（Naga Card）。
   * **`BodyHP` 與 `VIT_Refund` 邊界**：`Vigor`（`maxHpAtkPct`）等 HP 轉 ATK 被動吃的是乘上 `vit_hp_mult` 與 `VIT_Refund` **之前**的 **`BodyHP`**（`calc_body_hp`），不得誤傳膨脹後的 `MaxHP`；裝備與卡片 `+VIT` 均會吃到 `BodyHP`、`vit_hp_mult` 與 `Naga Card` 乘區，僅 `VIT_Refund` 專屬人物配點 `base_vit`。
4. **命中、閃避與暴擊**（[Combat & Stats](https://lumivaraonline.com/wiki/#combat)）：
   * **HIT（與 ASPD 完全獨立）**：$\text{HIT} = \lfloor (100 + \text{Lv} + 2\cdot\text{DEX} + \lfloor \text{LUK}/3 \rfloor + \text{Gear/Card/Passive}) \times (1 + \text{Hit\%}) \times (0.85\ \text{if Quake Card}) \rfloor$。
   * 命中率：$\text{HitChance} = \text{clamp}(1.0 + (\text{HIT} - \text{FLEE}) \times 0.0025,\ 0.40,\ 1.00)$。
   * 暴擊基礎傷害為 **2.0×**，爆傷以乘法疊加：$\text{CritMult} = 2.0 \times (1 + \text{CritDmg\%})$；物理暴擊含 $( \text{Lv}-1 )\times 0.1\%$（Thief 匕首/雙匕首 $\times 2$），法術暴擊率 $= \lfloor \text{LUK}/3 \rfloor + \text{裝備與卡片 M.CRIT}$。
5. **攻速與詠唱時間**（[Combat & Stats](https://lumivaraonline.com/wiki/#combat)）：
   * **ASPD（與 HIT 完全獨立）**：$\text{BaseASPD} = \text{ClassBase} + \text{WeaponOffset} - (8\ \text{if 實際盾牌})$，$\text{Raw} = \text{BaseASPD} + (\text{AGI}\cdot 0.3 + \text{DEX}\cdot 0.02)\times (1 - (\text{BaseASPD}-144)/50)$，套用 $(200 - \text{Raw})\times \text{ASPD\%}$ 與裝備／藥水及 **單張最高卡片 ASPD（卡片固定 ASPD 不疊加）**，超過 **180** 起折半軟上限，硬上限 **`193`**；攻擊間隔 $\max(140, \text{round}((200 - \text{ASPD}) \times 20))\text{ ms}$，且超過 170 每點提供 $+1.5\%$ 普攻增傷。
   * 總 `DEX 150` 達成瞬間可變詠唱；超過 150 後每點使多段法術施放加速 **0.6%**（至 DEX 250 最高 60%），卡片減詠唱總上限 30%。
6. **屬性相剋與武器塗層**（[Elements & Combos](https://lumivaraonline.com/wiki/#elements)）：
   * 四大元素循環（Wind → Water → Fire → Earth → Wind）剋制 **125%**、被剋 **75%**；**Light ↔ Dark** 互打 **150%**、四大元素打 Light/Dark **75%**（Eclipse Warlord Card 將屬性倍率限制在 **100%～115%** 之間）。
   * 武器塗層卷軸僅改變**普攻與無屬性技能**的屬性；帶有固定屬性的技能不受武器塗層覆蓋。
7. **精煉、雙手武器與防具套裝規則**（[Refine & Gear Systems](https://lumivaraonline.com/wiki/#gear)）：
   * 僅頭上/中/下、身體、披風、鞋子共 **6 個部位**帶有套裝，支援 `2件套`（最多 3 組）、`4件套 + 2件套`，或 `6件套`（Blood Lord）；套裝搜尋需過濾不相容流派（如純物理不搭配純法傷套裝）。
   * 精煉最高 `+10`；雙手武器（如 Lionheart Aegis、Royal Tablet、Twin Pistols 等）鎖定盾牌格，但提供 **2 倍基礎屬性、2 倍精煉 ATK/MATK（+60）、2 倍精煉穿透（+10%）與 2 個武器插卡格**。
8. **裝備詞綴池、雙 6 維屬性與飾品雙帶規則**（[Refine & Gear Systems](https://lumivaraonline.com/wiki/#gear)）：
   * 一般裝備隨機骰出 1 種 6 維基礎屬性（`extraStat = 25%` 機率出 2 種，單件上限 **2 種**）；戒指固定必出 **2 種**。Tier VI 單條範圍 `+6..+18`。
   * 頭上／中／下、身體、披風、鞋子與實際盾牌沒有攻擊型特別詞綴（亦不出現平面 `CRIT`）；每件裝備獨立骰出的 `HIT` / `FLEE`（Tier VI 各 `0..+24`）以及戒指原生白字（`Obsidian Ring CRIT +6..+12`、`Emerald Ring M.CRIT +6..+12`、`Platinum Ring ATK`、`Diamond Ring MATK`）不佔用 2 格 6 維名額，UI 與 API 應與「第 3 備選順位」清楚分離。
   * 角色 2 格飾品槽皆屬於 `"accessory"` 裝備類型：純物理職業可雙帶 2 顆物理戒指（`accessory1` 詞池）、純法系職業可雙帶 2 顆法系戒指（`accessory2` 詞池）、雙修職業（The King）可各帶一顆；特別詞綴推薦需依 `weapon -> offhand -> accessory1 -> accessory2` 順序扣減剩餘穿透空間。
9. **條件被動與召喚物機制真實性**：
   * 條件型跨職業被動不得當作無條件常駐增益（例如 `Twilight Equilibrium` 為施放治療／增益後觸發下次攻擊技能 `next_skill_dmg_pct +20%`，純攻擊輸出循環不視作常駐 `+20% skill_dmg_pct`）；`Wicked Necromancer` 等職業需依實際 `INT >= 300` 與召喚物（3 Black Cats）完整參與 DPS 評估。

## 3. 通用秒傷（DPS）架構規範
開發或擴充優化器時，應將職業與技能抽象化，以**秒傷（DPS）**作為統一尋優目標：
* **目標函數**：
  $$\text{Total DPS} = \text{Auto\_Attack\_DPS}(\text{ASPD}, \text{Procs}) + \sum_{s \in \text{Skills}} \frac{\text{Expected\_Damage}(s)}{\text{Effective\_CD}(s)}$$
* **技能屬性標記（`SkillSpec`）**：每個技能需明確定義傷害類型（物理 / 魔法 / 混合）、縮放來源（ATK% / MATK% / MaxHP% / VIT 門檻）、是否必中、是否可暴擊、是否吃 DEF/MDEF、基礎冷卻秒數，以及屬性來源（固定屬性或跟隨武器塗層）。
* **被動與套裝搜尋空間**：在 `4/4` 被動限制與 `3 × 2件套`（或 `4件套 + 2件套`）限制下，透過可設定的裝備詞綴與目標怪物（DEF / FLEE / 屬性 / PvE 或 PvP）條件執行自動化搜尋。
