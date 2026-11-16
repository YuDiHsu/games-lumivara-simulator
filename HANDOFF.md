# Lumivara Online — 全職業配點、跨職業被動與裝備套裝秒傷最佳化交接文件 (Handoff)

## 1. 專案目標與全端系統架構
* **目標**：針對 [Lumivara Online](https://lumivaraonline.com/) 全 **15 個職業**（以 **Templar Lv.118 / Lv.121 / Lv.150** 為核心標竿，並涵蓋 **The King、Kensei、Wicked Necromancer、Nekobaku、Mamushi、Iron Fist、Sinister、Archer、Mage、Acolyte、Swordman、Merchant、Thief、Novice**），建立支援 **Lv.1 至 Lv.150 終局階段**的全端配裝與真實秒傷（Real DPS）最佳化系統。
* **全端架構（Full-Stack Architecture）**：
  1. **SQLite 資料層與 Canonical JSON SHA-256 CDC 爬蟲引擎（`backend/db/`, `backend/scraper/`）**：
     * 以 `data/lumivara.db`（共 9 張資料表：`jobs`, `skills`, `cross_passives`, `equipment`, `armor_sets`, `cards`, `monsters`, `entity_hashes`, `data_changes`）作為執行期唯一資料來源（Single Source of Truth），搭配 `data/wiki_ground_truth.json` 記錄 Wiki 原始公式與驗證基準。
     * 透過 `httpx` + `beautifulsoup4` 同步 [Lumivara Online Wiki](https://lumivaraonline.com/wiki/) 與 [更新日誌](https://lumivaraonline.com/changelog/)，對每個實體計算 **Canonical JSON SHA-256 雜湊**，自動偵測改版數值異動並紀錄欄位級 Diff（`old -> new`）與受影響職業。
  2. **多階段秒傷最佳化引擎與 FastAPI 伺服器（`backend/engine/`, `backend/api/`, `backend/main.py`）**：
     * `combat_math.py`：純 Python 領域公式（含 `calc_body_hp` / `calc_max_hp`、`stat_step_cost`、DEF/MDEF 減傷與穿透上限、獨立 HIT vs ASPD、180 軟上限與 193 硬上限、DEX 150 瞬詠與 250 多段加速、元素矩陣與 Eclipse Warlord Card）。
     * `job_specs.py`：15 職業技能組、裝備預設與卡片／被動／套裝規格庫（含 `build_runtime_catalog` 與 SQLite 合併）。
     * `optimizer.py`：兩階段最佳化（Pass 1 門檻種子與座標上升尋優被動／套裝 -> 貪婪最佳插卡 -> Pass 2 帶卡重配屬性點），並輸出 `gear_affix_recommendations`（10 部位裝備特別詞綴、雙 6 維屬性與獨立副條推薦）。
     * API 端點：`GET /api/health`、`GET /api/meta`（含 `equipment_affix_system` 動態詞綴系統）、`GET /api/cdc/status`、`GET /api/cdc/changes`、`POST /api/cdc/sync`、`POST /api/optimize`、`POST /api/evaluate`。
  3. **React + Vite + Tailwind CSS 互動分析儀表板（`frontend/src/`）**：
     * 採用復古手抄本羊皮紙與墨色風格（`#F5F0E6` / `#FAF6EE`），支援後端離線時以 [wikiFallbackData.ts](file:///d:/Apps/PyProject/lumivara/frontend/src/api/wikiFallbackData.ts) 與 [client.ts](file:///d:/Apps/PyProject/lumivara/frontend/src/api/client.ts) 本地演算完整運作。
     * 頂部 **CDC 改版異動通知列（`CdcBanner.tsx`）**：顯示更新摘要、雜湊狀態，提供 `Sync Wiki Now` 與 `Simulate Balance Patch` 測試按鈕，並在同步後自動重新拉取 `/api/meta`。
     * 頂部 **精簡控制列（`ControlPanel.tsx`）**：整合討伐目標預設、自訂 DEF/MDEF/FLEE、目標屬性、PvE/PvP 切換、**單人 / 組隊（`is_party`）戰鬥模式切換**、依職業與 Wiki 繁體中文效果分組的 **跨職被動池** 選擇器，以及「立即計算最佳配裝」觸發鈕。
     * **Top 5 排行與統一互動紙娃娃模擬器（`BuildResultCard.tsx`, `EquipmentPaperdoll.tsx`, `CardPickerModal.tsx`, `BuildJsonModal.tsx`, `DpsCharts.tsx`）**：
       * 中央整合 15 職業切換、Lv.1–150 等級調整、6 維基礎配點滑桿、4/4 跨職被動微調與 **本職技能欄位選單（含推薦／可切換 `disabled_skills`）**。
       * 10 部位裝備支援 **分部位階級 `I ~ VI` 混用**、雙 6 維屬性（依階級與 2H 規則動態限縮）、特別詞綴（由 `/api/meta` `equipment_affix_system` 動態載入各部位詞池）、全 10 部位原生白字屬性／飾品白字類型與數值滑桿、獨立 `HIT`/`FLEE`/`HP` 微調、單件防具套裝指派、武器精煉 `+0 ~ +10`／屬性附魔（預設「無附魔」，武器格與 DPS 圖表區同步「日蝕／聖附魔」開關）與 Wiki 全文卡片搜尋選卡（含單人／Boss 實戰風險提示）；微調後防抖呼叫 `/api/evaluate` 即時比較與基準配裝的 DPS 落差，且於切換 PvE/PvP、單人/組隊、討伐目標、被動池或卡片模式時保留所有自訂配置。
       * 支援 **`lumivara-build-v1` JSON 匯出／匯入**（剪貼簿複製、`.json` 檔案下載／上傳、防呆檢查與跨職業／等級自動切換還原）。

---

## 2. 已驗證之核心遊戲機制與關鍵修正紀錄

### 2.1 屬性點數、BodyHP 與 Vigor 邊界
* **升級總點數**：Lv.118 `1,708`（單項上限 `99`）；Lv.119 解鎖上限 **`119`**；Lv.121 `1,788`；Lv.150 **`2,652`**。單點升級成本 $\lfloor (\text{cur}-1)/10 \rfloor + 2$（`1→119` 累計 **`874`** 點）。
* **BodyHP vs MaxHP 分離修正（`calc_body_hp`）**：
  * `Vigor`（`10% BodyHP -> Base ATK`）依 Wiki 吃的是乘上 `vit_hp_mult`（PvE 最高 2.0×+）與 `VIT Rebalance Refund` **之前**的 **`BodyHP`**。
  * 已於 `combat_math.py` 拆出 `calc_body_hp(...)` 供 `evaluate_dps` 傳入 `calc_total_atk(body_hp=body_hp)`，修正先前誤傳 `max_hp` 導致 **The King**（`VIT 93 -> VIT 1`）與多數物理職誤塞高 VIT 的結構性偏差。
  * **裝備／卡片 `+VIT` 血量說明**：裝備／卡片的 `+VIT` 一樣完整吃滿 `BodyHP`（`(1+JobHP%) × (1+PassiveHP%+AegisHP%)`）與 `vit_hp_mult`（例如 Templar 總 VIT 285->300 時 `+15 VIT` 直接增加 **`+1,499` HP**；300->315 增加 **`+1,530` HP**）；僅 `VIT_Refund`（Templar 每 1 點 `base_vit` 多 `30 - 10×2.35 = 6.5` 基礎 HP，即 `13` MaxHP）專屬人物升級配點。

### 2.2 裝備詞綴池、雙 6 維限制與雙同型戒指規則
* **防具套裝流派過濾**：於 `optimizer.py`（`_generate_valid_set_combos`）與前端 `client.ts` 過濾不相容流派，確保純物理職業不搭配法傷套裝，純法系職業不搭配純物傷套裝。
* **雙同型飾品槽（`accessory1` / `accessory2`）**：角色兩格飾品槽共用 `"accessory"` 裝備類型：
  * 純物理職業可在兩格皆裝 **物理戒指**（`Obsidian Ring` / `Physical ATK Ring`，`accessory1` 詞池：`atkPct / pierce / critDmg`）。
  * 純法系職業可在兩格皆裝 **法系戒指**（`Emerald Ring` / `Magic MATK Ring`，`accessory2` 詞池：`matkPct / mpierce / critDmg`）。
  * 雙修（The King）則一物理、一法系。
  * 特別詞綴依 `weapon -> offhand -> accessory1 -> accessory2` 順序扣除剩餘穿透空間（每顆 `Piercing` / `Runic` 扣 `6%`），不浪費在超過目標減傷上限（最高 `85%`）之後。
* **單件裝備最多 2 種 6 維屬性**：
  * 一般裝備骰 1 種 6 維屬性（25% 機率骰出 2 種，上限 **2 種**）；戒指固定 **2 種**；Tier VI 單條 `+6..+18`。
  * 頭上／中／下、身體、披風、鞋子與實際盾牌的詞池無攻擊特別詞綴（亦不出現平面 `CRIT`）；`HIT` / `FLEE`（Tier VI `0..+24`）及戒指原生白字（`Obsidian CRIT +6..+12`、`Emerald M.CRIT +6..+12`、`Platinum ATK`、`Diamond MATK`）為獨立副條，於 API 與 UI（`EquipmentPaperdoll.tsx`）明確與 **前 2 名 6 維屬性（`primary_stat_targets`）** 及 **第 3 備選順位（`fallback_stat_target`）** 分離顯示。

### 2.3 條件被動修正（`Twilight Equilibrium`）
* `Twilight Equilibrium`（Acolyte 跨職被動）為「施放治療或增益後使下次攻擊技能傷害 `+20%`（`next_skill_dmg_pct`）」，於 `job_specs.py` 修正為不對純攻擊循環無條件套用常駐 `+20% skill_dmg_pct`，避免 **Mage** 等純輸出法系誤選。

### 2.4 觸發技拆分與本職技能欄位開關（`disabled_skills`）
* Templar 的 `Sacred Guillotine Chain`（每 5 次普攻觸發 4 段聖光鎖鏈）與 `Colossus Radiant Bash`（普攻 35% 機率觸發 115% ATK + 6% MaxHP）已由原先混入普攻改為獨立拆列於 `dps_breakdown`，並於紙娃娃模擬器「本職技能欄位 (含推薦)」與 `EvaluatePayload.disabled_skills` 支援即時勾選／停用主動技、普攻觸發技與固有被動（含 `Templar Mastery`）。

### 2.5 武器附魔預設與單人／組隊卡片機制真實化（`is_party`）
* **統一稱呼「附魔」與預設無附魔**：全站由「塗層」更名為「附魔」，全職業預設 `weapon_coating = None`（無附魔）；並使武器檢視格與 `DpsCharts.tsx` 的「日蝕（聖附魔）效益」開關皆綁定同一組 `simState.weapon_coating`（`coating_comparison` 亦同步納入 `evaluate_build_api` 與前端 `runLocalEvaluate`）。
* **卡片實戰條件驗證**：新增 `TargetProfile.is_party`（`單人 / 組隊`）：
  * `Void Skitter Card`（`mWeakSpot`：對異常狀態目標 `+12%`）：檢查該職業技能是否具備穩定異常狀態來源；無穩定 Debuff 來源的職業（如單人 Templar）於單人模式計為 `0%`，組隊模式才給折算協同增益。
  * `Karasu Tengu Card`（`mOpener`：第一擊/高血量首擊加成）：高血量 Boss 戰於多人搶傷或持續戰（`is_party=True`）計為 `0%`，單人長戰僅採極低首擊比例。
  * 同時於 `client.ts`（`getCardMechanicWarning`）與 `CardPickerModal.tsx` 補齊 `mCocoa`（對一般/Boss 怪 `-10%` 技傷）、`mSurprise`（持續輸出 0%）等機制說明與風險警示。

### 2.6 ASPD 雙門檻與穿透甜蜜點實碼查核
* **ASPD 雙門檻（對照實裝 JS `assets/jobs-D0vlQhz7.js` 與 `main-DsJe3pd1.js`）**：
  * 攻速軟上限 `180` 折半計算、硬上限 `193`（對應最快間隔 `140ms`）；
  * 遊戲本體實裝 `qn = { from: 170, perPoint: 0.015 }`（`basicFactor = 1 + max(0, finalAspd - 170) * 0.015`，屬於遊戲程式碼實裝但 Wiki 條目未寫出的隱藏普攻增傷）；已於 `DpsCharts.tsx` 分行清楚標示兩個門檻。
* **DEF / MDEF 與穿透甜蜜點**：目標減傷率 $\min(255,\ \text{DEF或MDEF})/300$（上限 `85%`），暴擊不穿甲且溢出 `85%` 無負防增傷；刷圖日常區甜蜜點約 `50%–70%`，終局 Boss（如 `Tempest Drake` / `Eclipse Warlord` / `Regolith Golem` / `Fallen Seraph` 常見 200–255 防／魔防）與 PvP 甜蜜點為 `75%–85%`（`85%` 硬頂）。

---

## 3. 目前實測基準數據（Lv.150 vs `tier6_dark_boss` Eclipse Warlord）

以下數據以 `optimize_build_api`（預設裝備參數、`card_tier_filter="standard_only"`，目標 DEF 255 / MDEF 240 / FLEE 500 / Dark）在先前基準條件下測得（後續更新後預設值改為 `weapon_coating = None` 無附魔）：

### 3.1 Templar（Lv.150 標竿與武器附魔對照）
1. **聖屬性附魔開啟（`weapon_coating = "light"`）**：
   * **總秒傷（Total DPS）**：**`4,120,285.73 DPS`**（普攻與連鎖 `254,719.64` + 技能 `3,865,566.09`）。
   * **基礎配點**：`STR 91 / AGI 61 / VIT 119 / INT 1 / DEX 31 / LUK 119`（含裝備與卡片總和：`STR 134 / AGI 100 / VIT 315 / DEX 61 / LUK 155`，`MaxHP 38,823`、`ASPD 182.9`、`HIT 100%`、物理穿透 **`54.0%`**、`GLD 25.0×`）。
   * **前端預設基準參數對比**：[App.tsx](file:///d:/Apps/PyProject/lumivara/frontend/src/App.tsx#L33-L63) 採用零額外穿透的純淨初始 `DEFAULT_GEAR`（`weapon_refine = 4`、`phys_pierce = 0`），實際由 10 部位紙娃娃與卡片加總獲得屬性，推薦與模擬 DPS 基準一致。
   * **4/4 跨職業被動**：`['Vigor', 'Light & Shadow', 'Sovereign Dividend Yield', 'Close-Combat Mastery']`。
   * **6 件防具套裝（後端預設）**：`['Armor Breaker', 'Armor Breaker', 'Armor Breaker']`（`+21% P.Pierce`）。
   * **推薦插卡（Standard Tier VI）**：
     * `weapon_1` / `weapon_2`：`Titan Frame Card` + `Sunfire Colossus Card`（Limited 模式為 `Critical King Card` + `Bloodcrystal Dragon Card`）
     * `head_upper / mid / lower`：`Storm Roc Card × 3`
     * `body`：`Jack-o'-Lantern Card`
     * `garment`：`Void Skitter Card`
     * `shoes`：`Bog Toad Card`（`VIT +15`）
     * `accessory_1 / 2`：`Forest Wolf Card × 2`（共 `+4% P.Pierce`）
   * **雙物理戒指推薦**：`Piercing Obsidian Ring` × 2。
2. **無附魔預設基準（`weapon_coating = None`）**：
   * **總秒傷**：**`3,086,308.30 DPS`**（被動轉為 `Vigor + Sovereign Dividend Yield + Zanshin + Close-Combat Mastery`；後續另針對單人模式過濾 `Void Skitter Card` 並保留純無附魔基準）。
   * **聖附魔增益**：**`+1,033,977.43 DPS`（`+33.50%`）**。

### 3.2 其他重點職業（Lv.150 / `standard_only`）
* **The King（皇權雙修）**：**`1,317,759.52 DPS`**；基礎配點 `STR 107 / INT 107 / VIT 1 / DEX 64 / LUK 119 / AGI 17`（100% 鎖定 `STR == INT` 且無錯配 VIT）；被動 `['Mentality', 'Light & Shadow', 'Battle Momentum', 'Zanshin']`；套裝 `['Spell Breaker', 'Spell Breaker', 'Executioner']`；戒指 `Lethal Physical ATK Ring` + `Runic Emerald Ring`。
* **Kensei（雙手太刀暴擊流）**：**`2,278,763.92 DPS`**；基礎配點 `STR 119 / AGI 119 / VIT 78 / INT 1 / DEX 32 / LUK 76`（`ASPD 192.9`）；被動 `['Vigor', 'Close-Combat Mastery', 'Light & Shadow', 'Sovereign Dividend Yield']`；套裝 `Armor Breaker × 3`；雙物理戒指 `Piercing Physical ATK Ring × 2`。
* **Wicked Necromancer（暗法＋三隻黑貓）**：**`581,260.06 DPS`**（自動衝過 **總 `INT 313 ≥ 300`** 觸發 3 Black Cats 與 **總 `DEX 150`** 瞬詠，`ASPD 193.0`）；被動 `['Mentality', 'Light & Shadow', 'Alchemy Mastery', 'Sovereign Dividend Yield']`；套裝 `Spell Breaker × 3`；雙法系戒指 `Runic Emerald Ring × 2`。
* **Mage（純法系）**：**`587,505.6 DPS`**；基礎配點 `INT 113 / DEX 119 / LUK 106 / AGI 61 / VIT 1`；被動 `['Sovereign Dividend Yield', 'Alchemy Mastery', 'Far Sight', 'Zanshin']`；套裝 `Spell Breaker × 3`；雙法系戒指 `Runic Emerald Ring × 2`。

---

## 4. 啟動、測試與已知待延伸項目

### 4.1 驗證與啟動指令
```bash
# 1. 同步 Python 虛擬環境依賴
uv sync

# 2. 執行完整測試套件（目前 33/33 全數通過）
uv run pytest -v

# 3. 執行單機 CLI 秒傷最佳化驗證腳本
uv run python lumivara_optimizer.py

# 4. 啟動後端 FastAPI 伺服器（http://127.0.0.1:8000，含 /docs）
uv run uvicorn backend.main:app --reload --port 8000

# 5. 前端 TypeScript 檢查、建置與開發伺服器（http://127.0.0.1:5173）
npm --prefix frontend run build
npm --prefix frontend run dev
```

### 4.2 後續可進一步強化的項目（非阻塞）
1. **裝備詞綴與屬性點聯合退點計算**：目前 `stat_priority_guide` 顯示固定基礎點數下裝備 `+12` 屬性的直接 DPS 增量；後續可額外計算「裝備／卡片補高成本區間（如 `VIT 99+`）後退回屬性點轉投低成本區間」的聯合置換價值。
2. **多組配裝書籤比對視圖**：目前已支援單組 `lumivara-build-v1` JSON 匯出／匯入與本地保存，後續可於前端加入 `localStorage` 多組配置書籤清單以並排比較多套裝備方案。
