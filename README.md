# Lumivara Online — 全職業配裝最佳化與互動模擬器

針對 **Lumivara Online**（全 15 職業、Lv.1–150）打造的全端配點、跨職業被動、裝備套裝與真實秒傷（Real DPS）**最佳化引擎與互動模擬器**。

---

## 核心功能特色

### 1. 多階段全職業 DPS 最佳化搜尋（Top 5 推薦）
* 涵蓋全 **15 個職業**（`Templar`、`The King`、`Kensei`、`Wicked Necromancer`、`Nekobaku`、`Mamushi`、`Iron Fist`、`Sinister`、`Archer`、`Mage`、`Acolyte`、`Swordman`、`Merchant`、`Thief`、`Novice`）。
* 依目標怪物（`DEF` / `MDEF` / `FLEE` / 屬性 / PvE 或 PvP）與已解鎖跨職業被動池，自動計算 **Top 5 推薦配置**：
  * **6 維基礎配點**（支援 Lv.119 後 119 上限與階梯成本最佳化）
  * **4/4 跨職業被動**（依武器限制與條件觸發過濾，按職業與繁體中文分類呈現）
  * **6 部位防具套裝**（最多 `3×2` 件套、`4+2` 或 `6` 件套）
  * **全身插卡推薦**（區分 `Limited` 頂配與 `Budget` 平民，支援雙手武器雙武器卡槽）
  * **10 部位詞綴優先序推薦**（特別詞綴、雙 6 維、獨立 `HIT/FLEE`）

### 2. 互動式角色裝備面板與配裝模擬器
* **紙娃娃 10 部位即時微調**：
  * **分部位階級 `I ~ VI` 混搭**：自由調整各格位階級，動態聯動該階級 6 維上限、獨立 `HIT`/`FLEE` 上限、特別詞綴數值與原生白字範圍。
  * **全 10 部位原生白字屬性滑桿**：包含武器 `ATK`/`MATK`（雙手 `2×`）、防具 `DEF`、頭中／下 `MDEF`、副手特殊屬性（`Orb/Lantern` 之 `MATK` 與 `MaxSP`、`Saya` 刀鞘 `ATK` + 固有 `CRIT%`、`Shuriken` `ATK` + 固有 `ASPD`），以及飾品白字類型／數值（`Platinum ATK`、`Obsidian CRIT%`、`Diamond MATK`、`Emerald M.CRIT%`）。
  * **武器精煉 `+0 ~ +10` 與屬性塗層**、**單件防具套裝切換**、**4/4 跨職被動微調**。
  * **Wiki 全文卡片選擇器**：支援依格位、關鍵字與卡片描述即時搜尋替換各部位卡片。
* **即時 DPS 落差對比**：每次調整防抖呼叫 `/api/evaluate`，即時對照推薦最佳配置顯示 DPS 增減與核心戰鬥面板（`MaxHP`、`ASPD`、`命中率`、`物／魔穿`、`DPS 構成圖表`）。
* **一鍵操作**：支援「全裝 6 維歸零」與「重置全部回推薦」。

### 3. 配裝 JSON 匯出與匯入（`lumivara-build-v1`）
* **匯出 JSON**：一鍵複製完整配置 JSON 或下載為 `.json` 檔案（包含職業、等級、6 維配點、武器精煉與塗層、10 部位階級／詞綴／白字、套裝、卡片與被動）。
* **匯入 JSON**：支援貼上 JSON 文字或上傳 `.json` 檔案，自動進行格式與數值邊界防呆驗證；即使目前檢視其他職業／等級，也能**自動切換職業與等級並還原完整配裝與模擬 DPS**。

### 4. Wiki 動態對齊與 SQLite CDC 變更偵測
* 後端透過 `httpx` + `beautifulsoup4` 抓取 [Lumivara Online Wiki](https://lumivaraonline.com/wiki/) 與更新日誌，並以 **Canonical JSON SHA-256** 追蹤實體異動寫入 SQLite（`data/lumivara.db`）。
* 裝備階級、詞池與數值上限由 `/api/meta`（`equipment_affix_system`）動態供應，並於後端離線時自動切換至前端 Wiki 驗證基準（`frontend/src/api/wikiFallbackData.ts`）本地演算。

---

## 系統架構

```text
lumivara/
├── backend/
│   ├── main.py                 # FastAPI 應用程式進入點與 DB 初始化
│   ├── api/
│   │   ├── routes_meta.py      # GET /api/meta (職業、被動、卡片、套裝、詞綴系統)
│   │   ├── routes_optimize.py  # POST /api/optimize, POST /api/evaluate
│   │   └── routes_cdc.py       # GET /api/cdc/status, /changes, POST /api/cdc/sync
│   ├── db/
│   │   ├── database.py         # SQLite 連線與查詢輔助
│   │   └── schema.sql          # 9 張資料表 Schema 與 CDC Hash 紀錄
│   ├── engine/
│   │   ├── combat_math.py      # Wiki 戰鬥、HP/DEF/ASPD/HIT/暴擊/元素相剋公式
│   │   ├── job_specs.py        # 15 職業技能組與資源型錄建構
│   │   └── optimizer.py        # 多階段尋優引擎、詞綴推薦與單組配裝評估
│   └── scraper/
│       └── cdc_engine.py       # Wiki 同步與 Canonical JSON SHA-256 CDC
├── frontend/
│   ├── vite.config.ts          # Vite 開發伺服器與 /api -> :8000 代理設定
│   └── src/
│       ├── App.tsx             # 主控台狀態、防抖模擬與跨職業 JSON 匯入流程
│       ├── api/
│       │   ├── client.ts       # API 客戶端、中文對照與離線備援引擎
│       │   └── wikiFallbackData.ts
│       ├── components/
│       │   ├── CdcBanner.tsx
│       │   ├── ControlPanel.tsx
│       │   ├── BuildResultCard.tsx
│       │   ├── EquipmentPaperdoll.tsx
│       │   ├── CardPickerModal.tsx
│       │   ├── BuildJsonModal.tsx
│       │   └── DpsCharts.tsx
│       └── utils/
│           └── simState.ts     # 模擬器 10 部位狀態、Wiki 動態階級與 JSON 編解碼
├── data/
│   └── wiki_ground_truth.json  # Wiki 公式、詞綴與基準驗證資料
├── tests/
│   ├── test_cdc.py
│   ├── test_combat_math.py
│   └── test_optimizer.py
├── lumivara_optimizer.py       # 單機版最佳化驗證腳本
├── pyproject.toml
├── AGENTS.md                   # 通用開發規範與遊戲機制邊界
└── HANDOFF.md                  # 職業驗證數據與實作紀錄
```

---

## 快速開始

### 環境需求
* **Python >= 3.11**（建議使用 [`uv`](https://docs.astral.sh/uv/) 管理虛擬環境與依賴）
* **Node.js >= 18** 與 **npm**

### 1. 啟動後端（FastAPI）

```bash
# 安裝並同步 Python 依賴
uv sync

# 啟動 FastAPI 伺服器（預設 http://127.0.0.1:8000，首次啟動會自動初始化 data/lumivara.db）
uv run uvicorn backend.main:app --reload --port 8000
```

### 2. 啟動前端（React + Vite + Tailwind CSS）

```bash
# 安裝前端依賴
npm --prefix frontend install

# 啟動開發伺服器（預設 http://127.0.0.1:5173，自動將 /api 轉發至 127.0.0.1:8000）
npm --prefix frontend run dev
```

開啟瀏覽器前往 `http://127.0.0.1:5173/` 即可開始使用。

> 若後端暫時未啟動，前端仍會自動啟用 `wikiFallbackData.ts` 離線基準引擎運作。

---

## 開發測試與建置

```bash
# 執行後端單元測試與 Wiki 公式／最佳化整合測試
uv run pytest -v

# 前端 TypeScript 型別檢查與 Vite 正式建置
npm --prefix frontend run build

# 執行單機版最佳化腳本
uv run python lumivara_optimizer.py
```

---

## 主要 API 端點

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/api/health` | 伺服器與 SQLite CDC 就緒狀態檢查 |
| `GET` | `/api/meta` | 取得全職業、跨職被動、防具套裝、卡片、怪物預設與 `equipment_affix_system` |
| `POST` | `/api/optimize` | 執行全職業最佳化搜尋並回傳 Top 5 配裝與詞綴／插卡推薦 |
| `POST` | `/api/evaluate` | 針對模擬器微調後的單組配裝進行即時 DPS 與戰鬥面板試算 |
| `GET` | `/api/cdc/status` | 查詢目前 CDC 追蹤實體數量與生效版本 |
| `GET` | `/api/cdc/changes` | 取得 Wiki 數值異動紀錄（`old -> new`） |
| `POST` | `/api/cdc/sync` | 觸發 Wiki 同步檢查或模擬改版異動測試 |

---

## 相關文件

* [AGENTS.md](AGENTS.md)：通用遊戲公式、屬性／被動／套裝／雙手武器硬性規範與開發邊界。
* [HANDOFF.md](HANDOFF.md)：各職業基準數據、機制實測對照與設計紀錄。
