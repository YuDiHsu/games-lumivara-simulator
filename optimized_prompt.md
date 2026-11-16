# 通用型 Antigravity 開發 Prompt（Lumivara Online 全職業配裝與 DPS 最佳化系統）

```markdown
請先閱讀專案中的 `AGENTS.md`，並為 **Lumivara Online 全職業（共 15 職業）** 設計並實作一套「Wiki 爬蟲同步（含 CDC 變更偵測）+ 本地資料庫 + 秒傷（DPS）最佳化引擎 + 前端互動儀表板」的完整應用程式。

### 一、系統架構需求
1. **資料擷取與輕量級 CDC（Change Data Capture）**：
   - 實作 Python 爬蟲定期（或由前端觸發）抓取 `https://lumivaraonline.com/wiki/`（職業、技能、怪物卡片、裝備、套裝、戰鬥公式）與 `https://lumivaraonline.com/changelog/`。
   - 使用 **SQLite** 儲存結構化資料，並為每筆資料計算內容雜湊（SHA-256 Hash）實作 **CDC 變更偵測**：當遊戲改版導致技能倍率、卡片數值或公式變動時，自動寫入 `data_changes` 紀錄表並在前端提示「影響目前配裝的改版異動」。

2. **通用型後端 API 與 DPS 最佳化引擎（FastAPI + Python 3）**：
   - 嚴格遵守 `AGENTS.md` 中的全職業通用公式與硬性限制（Lv.119 後單項屬性上限 `119`、跨職業被動上限 `4/4`、DEF/MDEF 上限 `255`、防具 6 部位最多 `3×2` 件套、ASPD 上限 `193`、DEX `150` 瞬發等）。
   - 將職業與技能抽象為資料驅動（Data-Driven），支援從 SQLite 讀取任意職業的主／被動技能、武器限制與屬性（物理／魔法／混合、固定屬性／跟隨武器塗層、CD 秒數）。
   - 以 **真實秒傷（Total DPS = Auto_Attack_DPS + Σ(Skill_Dmg / Effective_CD)）** 為目標函數，依使用者選擇的職業、等級（Lv.1–150）、已解鎖被動池、武器屬性塗層與目標怪物（DEF / FLEE / 屬性 / PvE 或 PvP），自動求解 Top 5 最佳「屬性配點 + 4/4 被動 + 套裝 + 各部位卡片」組合。

3. **前端互動儀表板（React / Vite 或 Next.js + Tailwind）**：
   - **頂部 CDC 通知列**：顯示最近一次 Wiki 同步時間與偵測到的技能／卡片數值變動摘要。
   - **左側控制面板**：選擇職業、角色等級（1–150）、勾選已解鎖的跨職業被動、設定裝備基礎詞綴預算、選擇武器屬性塗層與目標怪物預設（或自訂 DEF/FLEE）。
   - **右側視覺化結果區**：
     - 顯示最佳屬性配點（含邊際點數成本）、4/4 推薦被動、6 件防具套裝組合與全身 8 部位推薦卡片（區分高預算 Limited 與平民替代）。
     - 以圖表拆解 **Total DPS 構成比例**（普攻 vs 各技能秒傷貢獻）與核心面板指標（MaxHP、ATK/MATK、物/魔穿%、暴擊率、命中率、減傷%）。
   - **其他覺得必要的呈現內容**
請先輸出資料庫 Schema（SQLite）、CDC 流程圖與專案目錄結構，確認後再開始實作程式碼。
```