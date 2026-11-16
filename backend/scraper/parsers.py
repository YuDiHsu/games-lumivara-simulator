"""BeautifulSoup4 HTML & Vite JS-Bundle Parsers for Lumivara Online Wiki and Changelog."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup

SLOT_MAP: Dict[str, str] = {
    "sword": "weapon",
    "weapon": "weapon",
    "shield": "shield",
    "head": "head_upper",
    "head_upper": "head_upper",
    "face": "head_mid",
    "head_mid": "head_mid",
    "mouth": "head_lower",
    "head_lower": "head_lower",
    "armor": "body",
    "body": "body",
    "garment": "garment",
    "shoes": "shoes",
    "accessory": "accessory",
    "accessory1": "accessory_1",
    "accessory2": "accessory_2",
    "all": "all",
}

PCT_BONUS_MAP: Dict[str, str] = {
    "atkPct": "atk_pct",
    "matkPct": "matk_pct",
    "pierce": "phys_pierce",
    "mpierce": "magic_pierce",
    "crit": "crit",
    "mcrit": "mcrit",
    "critDmg": "crit_dmg",
    "earthDmg": "earth_dmg",
    "castReduce": "cast_reduce_pct",
    "moveSpeed": "move_speed_pct",
    "lifesteal": "lifesteal_pct",
    "reflect": "reflect_pct",
    "resBurn": "res_burn_pct",
    "resFreeze": "res_freeze_pct",
    "resStun": "res_stun_pct",
    "freezeHit": "freeze_hit_pct",
    "dealtCut": "dealt_cut_pct",
}

DIRECT_BONUS_MAP: Dict[str, str] = {
    "atk": "flat_atk",
    "matk": "flat_matk",
    "hp": "flat_hp",
    "sp": "flat_sp",
    "aspd": "aspd_flat",
    "hit": "hit",
    "flee": "flee",
    "def": "def",
    "mdef": "mdef",
    "str": "str",
    "agi": "agi",
    "vit": "vit",
    "int": "int",
    "dex": "dex",
    "luk": "luk",
    "spRegen": "sp_regen",
    "spDrain": "sp_drain",
    "weight": "weight",
}


def normalize_bonuses(raw: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert raw Wiki camelCase/percentage stat keys into normalized snake_case fractional stats."""
    if not raw or not isinstance(raw, dict):
        return {}
    out: Dict[str, Any] = {}
    for k, v in raw.items():
        if k in PCT_BONUS_MAP and isinstance(v, (int, float)):
            out[PCT_BONUS_MAP[k]] = round(float(v) / 100.0, 6)
        elif k in DIRECT_BONUS_MAP and isinstance(v, (int, float)):
            out[DIRECT_BONUS_MAP[k]] = int(v) if isinstance(v, int) or float(v).is_integer() else float(v)
        else:
            out[k] = v
    return out


def normalize_slots(raw_slots: Optional[List[str]]) -> Tuple[str, List[str]]:
    """Map raw Wiki slot names to canonical optimizer slot identifiers."""
    if not raw_slots:
        return "all", ["all"]
    mapped = [SLOT_MAP.get(s, s) for s in raw_slots]
    return mapped[0], mapped


def _extract_balanced(text: str, start_idx: int, open_ch: str = "{", close_ch: str = "}") -> str:
    """Extract a balanced `{...}` or `[...]` block from JS source while respecting string literals."""
    depth = 0
    in_str: Optional[str] = None
    esc = False
    n = len(text)
    i = start_idx
    while i < n:
        ch = text[i]
        if in_str is not None:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            if ch in ('"', "'", "`"):
                in_str = ch
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[start_idx : i + 1]
        i += 1
    return ""


def _parse_js_object_top_level(block: str) -> Dict[str, str]:
    """Split a `{key1: val1, key2: val2, ...}` JS object literal into `{key: raw_val_str}`."""
    if not block.startswith("{") or not block.endswith("}"):
        return {}
    inner = block[1:-1]
    result: Dict[str, str] = {}
    i = 0
    n = len(inner)
    while i < n:
        while i < n and inner[i] in " \t\r\n,":
            i += 1
        if i >= n:
            break
        # Read key (quoted or bare identifier)
        if inner[i] in ('"', "'"):
            q = inner[i]
            i += 1
            k_start = i
            while i < n and inner[i] != q:
                if inner[i] == "\\":
                    i += 2
                    continue
                i += 1
            key = inner[k_start:i]
            i += 1
        else:
            k_start = i
            while i < n and (inner[i].isalnum() or inner[i] in "_$"):
                i += 1
            key = inner[k_start:i]

        while i < n and inner[i] in " \t\r\n":
            i += 1
        if i >= n or inner[i] != ":":
            break
        i += 1
        while i < n and inner[i] in " \t\r\n":
            i += 1

        # Read value until top-level comma or end
        v_start = i
        depth_brace = 0
        depth_brack = 0
        depth_paren = 0
        in_str: Optional[str] = None
        esc = False
        while i < n:
            ch = inner[i]
            if in_str is not None:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == in_str:
                    in_str = None
            else:
                if ch in ('"', "'", "`"):
                    in_str = ch
                elif ch == "{":
                    depth_brace += 1
                elif ch == "}":
                    depth_brace -= 1
                elif ch == "[":
                    depth_brack += 1
                elif ch == "]":
                    depth_brack -= 1
                elif ch == "(":
                    depth_paren += 1
                elif ch == ")":
                    depth_paren -= 1
                elif ch == "," and depth_brace == 0 and depth_brack == 0 and depth_paren == 0:
                    break
            i += 1
        result[key] = inner[v_start:i].strip()
        i += 1
    return result


def _parse_js_value(raw: str) -> Any:
    """Safely evaluate simple JS primitives, arrays, and flat objects without executing code."""
    s = raw.strip()
    if s == "!0" or s == "true":
        return True
    if s == "!1" or s == "false":
        return False
    if s == "null" or s == "void 0" or s == "undefined":
        return None
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ('"', "'"):
        inner = s[1:-1]
        return inner.encode("utf-8").decode("unicode_escape") if "\\" in inner else inner
    if re.fullmatch(r"-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?", s):
        val = float(s)
        return int(val) if val.is_integer() and "." not in s and "e" not in s.lower() else val
    if s.startswith("[") and s.endswith("]"):
        items: List[Any] = []
        inner = s[1:-1].strip()
        if not inner:
            return items
        i = 0
        n = len(inner)
        while i < n:
            while i < n and inner[i] in " \t\r\n,":
                i += 1
            if i >= n:
                break
            start = i
            db = dp = dbr = 0
            in_str: Optional[str] = None
            esc = False
            while i < n:
                ch = inner[i]
                if in_str:
                    if esc:
                        esc = False
                    elif ch == "\\":
                        esc = True
                    elif ch == in_str:
                        in_str = None
                else:
                    if ch in ('"', "'", "`"):
                        in_str = ch
                    elif ch == "{":
                        db += 1
                    elif ch == "}":
                        db -= 1
                    elif ch == "[":
                        dbr += 1
                    elif ch == "]":
                        dbr -= 1
                    elif ch == "(":
                        dp += 1
                    elif ch == ")":
                        dp -= 1
                    elif ch == "," and db == 0 and dbr == 0 and dp == 0:
                        break
                i += 1
            items.append(_parse_js_value(inner[start:i]))
            i += 1
        return items
    if s.startswith("{") and s.endswith("}"):
        pairs = _parse_js_object_top_level(s)
        return {k: _parse_js_value(v) for k, v in pairs.items()}
    return s


def parse_wiki_html(html: str) -> Dict[str, Any]:
    """Parse Lumivara Online main wiki HTML for metadata, headings, tables, and live Vite JS bundle paths."""
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else "Lumivara Online Wiki"

    headings: List[str] = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        txt = h.get_text(" ", strip=True)
        if txt:
            headings.append(txt)

    extracted_notes: Dict[str, str] = {}
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
        if len(cells) >= 2 and cells[0]:
            extracted_notes[cells[0]] = " | ".join(cells[1:])

    bundle_paths: List[str] = []
    for script in soup.find_all("script"):
        src = script.get("src")
        if src and ".js" in src:
            bundle_paths.append(src)
    for link in soup.find_all("link"):
        href = link.get("href")
        if href and ".js" in href and href not in bundle_paths:
            bundle_paths.append(href)

    return {
        "title": title,
        "headings_count": len(headings),
        "headings": headings[:30],
        "table_rows_parsed": len(extracted_notes),
        "extracted_notes": extracted_notes,
        "bundle_paths": bundle_paths,
    }


def parse_job_page_html(html: str, job_id: str) -> Dict[str, Any]:
    """Parse `/wiki/jobs/<job_id>/` static HTML for live job stat bonuses and skill rows."""
    soup = BeautifulSoup(html, "html.parser")
    skills: List[Dict[str, str]] = []
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
        if len(cells) == 4 and cells[1].isdigit():
            skills.append(
                {
                    "name": cells[0],
                    "job_level": cells[1],
                    "kind": cells[2],
                    "description": cells[3],
                }
            )
    return {"job_id": job_id, "skills_parsed": skills}


def parse_changelog_html(html: str) -> List[Dict[str, Any]]:
    """Parse Lumivara Online changelog HTML (JSON-LD dates, headings, and update cards)."""
    soup = BeautifulSoup(html, "html.parser")
    patches: List[Dict[str, Any]] = []
    date_pattern = re.compile(r"(202\d[-/]\d{2}[-/]\d{2})")

    # 1. Check heading-based patch sections
    for header in soup.find_all(["h1", "h2", "h3", "h4"]):
        header_text = header.get_text(" ", strip=True)
        match = date_pattern.search(header_text)
        if match:
            version = match.group(1).replace("/", "-")
            bullets: List[str] = []
            nxt = header.find_next_sibling()
            while nxt and nxt.name not in ("h1", "h2", "h3"):
                if nxt.name in ("ul", "ol"):
                    for li in nxt.find_all("li"):
                        t = li.get_text(" ", strip=True)
                        if t:
                            bullets.append(t)
                nxt = nxt.find_next_sibling()
            patches.append({"patch_version": version, "title": header_text, "notes": bullets})

    # 2. Check JSON-LD dateModified / datePublished (Lumivara changelog embeds structured Article JSON-LD)
    if not patches:
        dates_found: List[str] = []
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            txt = script.string or ""
            for m in date_pattern.finditer(txt):
                d = m.group(1).replace("/", "-")
                if d not in dates_found:
                    dates_found.append(d)
        if not dates_found:
            for m in date_pattern.finditer(html):
                d = m.group(1).replace("/", "-")
                if d not in dates_found:
                    dates_found.append(d)
        dates_found.sort(reverse=True)
        notes = [
            h.get_text(" ", strip=True)
            for h in soup.find_all(["h2", "h3"])
            if h.get_text(" ", strip=True)
        ][:15]
        if dates_found:
            patches.append(
                {
                    "patch_version": dates_found[0],
                    "title": f"Lumivara Changelog ({dates_found[0]})",
                    "notes": notes,
                }
            )

    return patches


def parse_wiki_bundle_js(js_text: str) -> Dict[str, Any]:
    """
    Parse live Lumivara Online Vite JS bundle (`wiki-*.js`) using semantic markers
    and balanced-bracket extraction to retrieve live Cards, Card Slots, Armor Sets,
    Equipment Templates, Monsters, and Skill Constants.
    """
    parsed: Dict[str, Any] = {
        "cards": {},
        "card_slots": {},
        "card_sources": {},
        "armor_sets": {},
        "monsters": {},
        "templar_devastation": {},
        "equipment_count": 0,
    }

    # 1. Cards dictionary: `{hopper_card:{name:"Prism Hopper Card",...}, ...}`
    m_cards = re.search(r"=\{(?=hopper_card:\{name:\"Prism Hopper Card\")", js_text)
    if m_cards:
        blk = _extract_balanced(js_text, m_cards.start() + 1, "{", "}")
        for card_key, raw_obj in _parse_js_object_top_level(blk).items():
            fields = _parse_js_object_top_level(raw_obj)
            name = _parse_js_value(fields["name"]) if "name" in fields else card_key
            bonuses = _parse_js_value(fields["bonuses"]) if "bonuses" in fields else {}
            price = _parse_js_value(fields["price"]) if "price" in fields else 0
            if isinstance(bonuses, dict):
                parsed["cards"][card_key] = {
                    "name": name,
                    "bonuses": bonuses,
                    "price": price,
                }

    # 2. Card slots dictionary: `{hopper_card:["all"], ...}`
    m_slots = re.search(r"=\{(?=hopper_card:\[\"all\"\])", js_text)
    if m_slots:
        blk = _extract_balanced(js_text, m_slots.start() + 1, "{", "}")
        for card_key, raw_val in _parse_js_object_top_level(blk).items():
            val = _parse_js_value(raw_val)
            if isinstance(val, list):
                parsed["card_slots"][card_key] = val

    # 3. Card drop sources dictionary: `{...,colossus_card:["Sunfire Colossus"],...}`
    m_src = re.search(r"=\{(?=[^}]*colossus_card:\[\"Sunfire Colossus\"\])", js_text)
    if m_src:
        blk = _extract_balanced(js_text, m_src.start() + 1, "{", "}")
        for card_key, raw_val in _parse_js_object_top_level(blk).items():
            val = _parse_js_value(raw_val)
            if isinstance(val, list):
                parsed["card_sources"][card_key] = val

    # 4. Armor sets dictionary: `{might:{name:"Warlord",rarity:"common",pieces:2,bonus:{atkPct:10}}, ...}`
    m_sets = re.search(r"=\{(?=might:\{name:\"Warlord\")", js_text)
    if m_sets:
        blk = _extract_balanced(js_text, m_sets.start() + 1, "{", "}")
        for set_key, raw_obj in _parse_js_object_top_level(blk).items():
            fields = _parse_js_object_top_level(raw_obj)
            bonus_raw = _parse_js_value(fields.get("bonus", "{}"))
            parsed["armor_sets"][set_key] = {
                "name": _parse_js_value(fields.get("name", f'"{set_key}"')),
                "rarity": _parse_js_value(fields.get("rarity", '"common"')),
                "pieces": _parse_js_value(fields.get("pieces", "2")),
                "bonuses": bonus_raw if isinstance(bonus_raw, dict) else {},
            }

    # 5. Monsters level + names (`E("moss-mushroom","Moss Mushroom",10)`) and stats (`"moss-mushroom":M(...)`)
    m_mlvl = re.search(r"=\[(?=E\(\"moss-mushroom\",\"Moss Mushroom\")", js_text)
    monster_levels: Dict[str, Dict[str, Any]] = {}
    if m_mlvl:
        blk = _extract_balanced(js_text, m_mlvl.start() + 1, "[", "]")
        for m in re.finditer(r'E\("([^"]+)","([^"]+)",(\d+)\)', blk):
            monster_levels[m.group(1)] = {"name": m.group(2), "level": int(m.group(3))}

    m_mstats = re.search(r"=\{(?=\"prism-hopper\":M\()", js_text)
    if m_mstats:
        blk = _extract_balanced(js_text, m_mstats.start() + 1, "{", "}")
        for m_key, raw_call in _parse_js_object_top_level(blk).items():
            m_args = re.match(r"M\(([^)]+)\)", raw_call)
            if m_args:
                nums = [_parse_js_value(x) for x in m_args.group(1).split(",")]
                if len(nums) >= 8 and all(isinstance(x, (int, float)) for x in nums[:8]):
                    meta_info = monster_levels.get(m_key, {})
                    parsed["monsters"][m_key] = {
                        "name": meta_info.get("name", m_key),
                        "level": meta_info.get("level", 1),
                        "hp": int(nums[0]),
                        "def": int(nums[3]),
                        "mdef": int(nums[4]),
                        "hit": int(nums[5]),
                        "flee": int(nums[6]),
                    }

    # 6. Equipment template count sanity check
    m_eq = re.search(r"=\[(?=\{key:\"knife\",slot:\"sword\")", js_text)
    if m_eq:
        blk = _extract_balanced(js_text, m_eq.start() + 1, "[", "]")
        parsed["equipment_count"] = len(re.findall(r'slot:"', blk))

    # 7. Templar Grand Light Devastation constants (`{vitSteps:[100,200,300],hp:[...],atk:[...],...}`)
    m_gld = re.search(r"\{vitSteps:\[100,200,300\],", js_text)
    if m_gld:
        blk = _extract_balanced(js_text, m_gld.start(), "{", "}")
        fields = _parse_js_object_top_level(blk)
        if "atk" in fields and "hp" in fields and "cooldown" in fields:
            parsed["templar_devastation"] = {
                "atk": _parse_js_value(fields["atk"]),
                "hp": _parse_js_value(fields["hp"]),
                "cooldown": _parse_js_value(fields["cooldown"]),
            }

    return parsed


# ---------------------------------------------------------------------------
# Traditional Chinese Localization & Farmable / Limited Classification
# ---------------------------------------------------------------------------

THAI_CHAR_RE = re.compile(r"[\u0E00-\u0E7F]")

CARD_MECHANIC_ZH: Dict[str, Tuple[str, str]] = {
    "mMagicWard": ("🜂 抗魔傘", "來自怪物的魔法傷害 −20%（包含怪物元素技能與遠程施法攻擊）"),
    "mLantern": ("🜂 鬼火提燈", "命中時 5% 機率使怪物陷入燃燒狀態 5 秒（技能每次施放僅對首個命中目標隨機判定 1 次）"),
    "mOpener": ("🜂 烏鴉搶攻", "對尚未被攻擊過的滿血目標首次攻擊傷害 +20%（適用普攻與單體技能）"),
    "mRage": ("🜂 越戰越勇", "每損失 4% HP，ATK 與 MATK +1%，最高 +15%"),
    "mFoxTails": ("🜂 九尾之力", "在前次擊殺後 4 秒內擊殺怪物獲得 1 條尾（最多 9 條），每條使 ASPD 與移動速度 +1.5%"),
    "mWeakSpot": ("🜂 弱點追擊", "攻擊處於異常狀態的怪物時，傷害 +12%"),
    "mFarShot": ("🜂 遠距狙擊", "裝備遠程武器時：目標距離超過攻擊距離 85% 時傷害 +12%；近於 120 px 時傷害 −10%"),
    "mStarShield": ("🜂 星辰護盾", "獲得相當於自身 MaxHP 6% 的怪物傷害吸收護盾，護盾破裂 20 秒後重新生成"),
    "mMeteor": ("🜂 隕石爆裂", "擊殺怪物時 20% 機率引爆殘骸，對周圍 120 px 內最多 8 隻怪物造成致死一擊所扣 HP 的 40% 傷害（對 Leader 與 Boss 無效；每次施放最多觸發 1 次）"),
    "mReef": ("🜂 珊瑚屏障", "3 秒內受到 3 隻以上不同怪物攻擊時，所受傷害 −20%"),
    "mLure": ("🜂 誘餌仇恨", "你的傷害所產生的仇恨值（Aggro）×1.5（不含治療仇恨）"),
    "mTideSong": ("🜂 潮汐之歌", "你的治療技能治療量 +10%，並為受治療的隊友恢復 2% MaxSP（不含自身，每名隊友每 5 秒最多觸發 1 次）"),
    "mGrasp": ("🜂 觸手束縛", "普攻命中時 5% 機率束縛怪物使其無法移動 2 秒（對 Leader 與 Boss 無效）"),
    "mSwarm": ("🜂 連擊蜂群", "連續攻擊同一隻怪物時，每次疊加 ASPD +2%（最多 10 層，切換目標減半）；達 ASPD 上限後改為每層傷害 +1%"),
    "mExecute": ("🜂 斬殺收割", "攻擊 HP 低於 35% 的怪物時，傷害 +30%"),
    "mBulwark": ("🜂 鋼鐵壁壘", "200 px 內的隊友所受怪物傷害 −10%（不含自身，多張同名卡不疊加）"),
    "mTitan": ("🜂 破王專武（首領增傷）", "對 Leader 與 Boss 傷害 +25%；對一般怪物傷害 −10%"),
    "mMoonDust": ("🜂 月塵閃擊", "成功閃避怪物普攻或技能後，3 秒內下一次命中必為暴擊（每 2 秒最多觸發 1 次）"),
    "mFullMoon": ("🜂 滿月回魔", "擊殺怪物時恢復佩戴者 2% MaxSP；多張同名卡可疊加，最多 3 張（單次技能最多計算 3 隻）"),
    "mLowGravity": ("🜂 低重力緩震", "受怪物致命傷時保留 1 HP 並免疫怪物傷害 2 秒，冷卻 90 秒（Nine Lives 或 Last Stand 冷卻期間不觸發）"),
    "mEclipse": ("🜂 日蝕平衡", "屬性相剋不會使你的傷害低於 100%，但屬性剋制增傷上限為 115%"),
    "mQuake": ("🜂 震地獠牙", "普攻命中時產生震波，對目標周圍 150 px 內最多 6 隻其他怪物造成 40% 傷害；HIT −15%"),
    "mCatchMe": ("🜂 抓不到我", "受到怪物普攻或元素技能命中時，25% 機率使該怪物陷入緩速 3 秒（移速 −35%、攻速 −15%，Leader 與 Boss 無效）"),
    "mHug": ("🜂 緊緊擁抱", "普攻命中怪物時恢復 1% MaxHP（每 0.5 秒最多 1 次）；佩戴期間藥水與回血道具恢復量 −50%"),
    "mSurprise": ("🜂 驚喜突襲！", "未施放任何技能達 6 秒後，下一次施放的技能對怪物傷害 +35%（涵蓋該次施放的所有目標與段數）"),
    "mCrack": ("🜂 碎甲破殼", "命中時 5% 機率擊碎怪物護甲，使其 DEF −20% 持續 4 秒（技能每次施放僅對首個命中目標判定；Leader 與 Boss 無效）"),
    "mBounce": ("🜂 彈跳閃避", "成功閃避怪物普攻或技能後，移動速度 +30% 持續 2 秒（每 4 秒最多觸發 1 次）"),
    "mCocoa": ("🜂 暖心可可", "你的治療技能使受治療者每秒恢復 2% MaxHP 持續 4 秒（不疊加，重複治療刷新時間）；你的技能對怪物傷害 −10%"),
    "mSoft": ("🜂 軟綿緩衝", "單次受到怪物超過 15% MaxHP 的傷害時，超出部分減免 50%（與其他減傷卡合計上限 30%）"),
    "mMelt": ("🜂 融化巧克力", "以普攻擊殺怪物時留下融化巧克力 3 秒，使 100 px 內其他怪物陷入緩速（Leader 與 Boss 無效；每 3 秒最多 1 攤；技能擊殺不觸發）"),
    "mTani": ("🜂 沉淵水妖", "來自水屬性怪物的傷害 −25%；使用衝刺（Dash）後移速 +25% 並恢復 5% MaxSP 持續 5 秒（每 15 秒最多觸發 1 次）"),
    "mNaga": ("🜂 納迦水癒光環", "戰鬥中每 15 秒為 150 px 內隊友（含自身）淨化暈眩、冰凍、定身、致盲與緩速，並賦予相當於佩戴者 MaxHP 7% 的護盾持續 5 秒"),
}

SKILL_DESC_LV10_ZH: Dict[str, str] = {
    "bash": "單體攻擊造成 420% ATK + 目標 MaxHP 1% 傷害（對 Leader、Morvath 與 Vyrmora 減為 1/10；對 Terragorn 與 Tomb Boss 減為 1/100），總傷害上限 7,000% ATK；攻擊距離 64；37% 機率暈眩 2.5 秒（對 Leader 無效）；可依角色暴擊率暴擊；無屬性，隨普攻與武器塗層屬性；對遠處怪物施放時以 2 倍跑速衝近。",
    "magnum": "將劍插入地面引爆周圍火焰，造成 300% ATK × 3 段傷害；範圍 100；37% 機率施加燃燒 5 秒（每秒損失 5% HP；Leader/Morvath/Vyrmora 1/10，Terragorn/Tomb Boss 1/100；每秒不超過 ATK 或 MATK 較高者之 200%）；可依角色暴擊率暴擊；火屬性（Hephaestus）。",
    "endure": "DEF +60，持續 10 秒，每秒恢復 1% HP（僅限自身）。",
    "firstaid": "恢復自身 14% MaxHP；水屬性（Poseidon）。",
    "firebolt": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；對目標周圍半徑 140 內所有敵人造成傷害，施法距離 240；75% 機率施加燃燒 5 秒（每秒 −5% HP，上限 ATK/MATK 較高者 200%）；依魔法暴擊率（LUK 與裝備 M.CRIT）暴擊；詠唱結束後可立即銜接其他技能；火屬性（Hephaestus）。",
    "coldbolt": "480% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；範圍 150，施法距離 240；55% 機率施加冰凍 2 秒（對 Leader 無效：無法移動、所受魔法傷害 +55%）；可依魔法暴擊率暴擊；詠唱結束後可立即銜接其他技能；對暈眩目標傷害 +50%；水屬性（Poseidon）。",
    "thunderstorm": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；範圍 120，施法距離 240；55% 機率施加暈眩 1.8 秒（對 Leader 無效）；可依魔法暴擊率暴擊；詠唱結束後可立即銜接其他技能；對冰凍目標傷害 +50%；風屬性（Aeolus）。",
    "doublestrafe": "單體射擊 250% ATK × 2 段，距離 320；25% 機率改為射出 4 段；不重置 Momentum，命中時如同普攻疊加 1 層 Momentum；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。",
    "arrowshower": "箭雨造成 310% ATK × 5 段傷害；圓形半徑 7 格、施法距離 280；25% 機率施加緩速 2 秒（移動速度 −50%）；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。",
    "piercingshot": "單體貫穿射擊 800% ATK，距離 320；75% 機率施加破甲 5 秒（所受傷害 +20%）；可依角色暴擊率暴擊；無屬性，隨武器塗層屬性。",
    "briarseed": "投擲荊棘種子至距離 180 處（偵測半徑 50、持續 55 秒、最多同時存在 3 顆，對敵對玩家隱藏）；敵人踩中後藤蔓定身（Root）2.5 秒並造成 220% ATK 傷害，隨後於半徑 110 爆裂造成 820% ATK 傷害並施加破甲 5 秒（所受傷害 +20%）；可暴擊；無屬性，隨武器塗層屬性。",
    "heal": "恢復自身與半徑 300 內隊友 500 + 1×INT + 2×VIT 點 HP。",
    "holylight": "向周圍爆裂聖光造成 830% MATK 傷害（對暗屬性敵人 +88%）；詠唱 2.98 秒（受 DEX 縮減）；半徑 200；25% 機率施加致盲 3 秒（HIT −35%）；依魔法暴擊率暴擊；光屬性（Apollo）。",
    "sacredradiance": "在目標地面召喚聖光法陣（施法距離 150、半徑 200、持續 2.5 秒），每 0.5 秒爆發一次（共 5 次），每次對陣內敵人造成 350% MATK 光屬性傷害並有 25% 機率致盲 5 秒（HIT −25%），同時為陣內自身與隊友恢復 500 + 1×INT + 2×VIT HP；詠唱 2.98 秒（受 DEX 縮減）；可魔法暴擊；光屬性（Apollo）。",
    "blessedjudgment": "被動 · 治療效果（Heal Power）依等級 +5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15%；對致盲敵人傷害依等級 +4/8/12/16/20/24/28/32/36/40%（Lv.10）。",
    "holyguard": "自身與同地圖所有隊友 DEF +90、MDEF +90，持續 65 秒。",
    "blessing": "自身與同地圖所有隊友 STR/AGI/INT/DEX +15、ATK +10%、MATK +10%、FLEE +5%、移速 +7%、技能冷卻 −15%、受治療量 +20%，持續 65 秒。",
    "remedylight": "為自身與同地圖所有隊友淨化全部異常狀態並免疫 5 秒；顯現半徑 170 內隱身敵人 10 秒（不破除自身隱身）。",
    "mammonite": "單體重擊 800% ATK，距離 72；以此技能擊殺時 50% 機率獲得 1–5 Silver；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放時以 2 倍跑速衝近。",
    "cartstrike": "駕駛手推車朝指定方向衝鋒 220 距離，對路徑半徑 80 內所有敵人造成 850% ATK 傷害（必中）；90% 機率擊退 3 格並暈眩 2.5 秒（對 Leader 無效）；施加衰弱 5 秒（目標造成傷害 −20%、受到傷害 +20%）；可暴擊；無屬性，隨武器塗層屬性。",
    "hammerfall": "震擊周圍造成 470% ATK × 5 段傷害，半徑 180（必中）；35% 機率暈眩 2.5 秒（對 Leader 無效）；可暴擊；地屬性（Gaia）。",
    "overthrust": "自身與同地圖所有隊友傷害 +38%、MaxHP +75%，持續 65 秒。",
    "twinfang": "單體突刺 750% ATK（從背後 60° 內或 Shadow Blink 後 3 秒內對同一目標施放提升至 1,860% ATK；於 Vanish 或 Assassinate 狀態下施放傷害 ×4 並現形）；距離 72；可觸發 Twin Strike 二連擊；目標周圍 1.5 格濺射 30% 傷害；可暴擊；Thief 本人擊殺敵人時立即重置 Thief 全部 4 招冷卻；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "venomknife": "瞬移至目標身後 40 距離面向目標斬擊 450% ATK，施法距離 220；施加破甲切傷 4 秒（DEF −20%）與暈眩 0.5 秒（對 Leader 無效）；可暴擊；Thief 親手擊殺目標時重置 Thief 全部 4 招冷卻；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "shadowburst": "引爆煙霧彈對半徑 130 內敵人造成 600% ATK 傷害；施加致盲 5 秒（HIT −25%）；可暴擊；顯現半徑內隱身敵人 5 秒；可在 Vanish 期間施放而不破除隱身；對玩家傷害減為 50%；Thief 親手擊殺目標時重置全部 4 招冷卻；無屬性，隨武器塗層屬性。",
    "challenging": "挑釁半徑 270 內敵人（含 Leader）立即轉向攻擊自身：自身仇恨置頂 +500 並強制鎖定 3 秒；使敵人 ATK −10%、受到傷害 +10% 持續 3 秒（對玩家 5 秒）；造成目標 MaxHP 1.5% 傷害（Leader/Morvath/Vyrmora 1/10；Terragorn/Tomb Boss 1/100），上限 7,000% ATK，產生 5 倍仇恨。",
    "tierra": "460% MATK × 5 段傷害；詠唱 2.98 秒（受 DEX 縮減）；攻擊目標周圍半徑 130 內所有敵人，施法距離 240；75% 機率降低 MDEF 10% 持續 2.5 秒；可魔法暴擊；詠唱結束後可立即銜接其他技能；地屬性（Gaia）。",
    "spiritinstinct": "AGI +20%、DEX +40%，持續 75 秒；立即驅散半徑 300 內敵人的隱身與 Assassinate 狀態。",
    "leapshot": "射擊目標造成 1,200% ATK 傷害並引爆疾風，對周圍半徑 200 內敵人造成 100% 濺射傷害（對周圍玩家為 50% 且不擊退）；距離 250；使敵對玩家擊退 5 格（怪物與 Leader 不擊退）；可暴擊；風屬性（Aeolus）。",
    "vanish": "潛入暗影隱身 20 秒：敵方玩家無法看見或選取、怪物停止追擊（除非被顯影）；移速 +30%、所受最終傷害 −50%（DEF/MDEF 後計算）、免疫所有異常狀態；攻擊或施放攻擊技能會現形（Shadow Bomb 除外）；隱身中施放 Shadow Strike 傷害 ×4；以其他方式現形時獲得 3 秒 Assassinate（下次 Shadow Strike ×4）；普攻命中每次冷卻 −1 秒；冷卻於現形後開始計算；Thief 親手擊殺重置全部 4 招冷卻。",
    "viperfang": "單體投擲 770% ATK，距離 200；50% 機率向周圍半徑 200 內所有敵人（含主目標重複命中）擴散 462% ATK 飛刀（60% 傷害），額外消耗 1 把 Throwing Blades；本身不附蛇毒（開啟 Venom Overload 時觸發）；可暴擊；無屬性，隨武器塗層屬性。",
    "shadowdecoy": "在原地召喚繼承本體屬性的影分身持續 2 秒：怪物轉火攻擊分身（不吸引玩家）；分身依本體 ASPD 向半徑 200 內投擲 60% Viper Fang 傷害的飛刀（不消耗 Throwing Blades）；本體進入半透明狀態並獲得 FLEE +200 至分身結束（攻擊不破除）；分身結束或 HP 歸零時於半徑 150 爆裂造成 1,200% ATK 傷害、施加 5 層蛇毒與暈眩 1 秒（Leader 無效）；可暴擊；無屬性，隨武器塗層屬性。",
    "bouncingshuriken": "投擲巨型手裏劍彈射自身半徑 300 內所有敵人（不限數量、傷害不衰減），每個目標造成 1,342% ATK 傷害並施加 5 層蛇毒；每次普攻或攻擊技能命中冷卻 −1 秒；施加緩速 5 秒（移速 −30%）；可暴擊；無屬性，隨武器塗層屬性。",
    "venomoverload": "增益 20 秒：所有命中（本體、擴散飛刀與分身）額外疊加 1 層蛇毒。學習後常駐被動：身上帶有自身蛇毒的敵人死亡時，於半徑 150 爆裂造成每層 65% ATK 傷害並傳染 3 層蛇毒（可連鎖引爆）；同一目標身上自身蛇毒達 20 層時立即於半徑 150 爆裂造成 1,967% ATK 傷害、暈眩主目標 1 秒與周圍 0.5 秒（Leader 無效），並清空主目標層數；無屬性，隨武器塗層屬性。",
    "iaigiri": "單體居合拔刀斬 480% ATK，距離 72；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "oboro": "0.6 秒內於周圍半徑 220 隨機瞬移斬擊 7 次（可重複命中同一目標），每次 700% ATK；施放期間處於無敵狀態；距離 220；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "issen": "瞬間突進穿刺目標路徑，對沿途所有敵人造成 600% ATK 傷害；距離 220；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "meikyo": "ASPD +20%、CRIT +20、暴擊傷害 +10%，持續 25 秒。",
    "nekoflask": "投擲魔藥瓶對目標與周圍 1.5 格所有敵人造成等額 382% MATK 傷害；距離 200；對沾油目標傷害 +20%；可魔法暴擊；水屬性（Poseidon）。",
    "tarflask": "朝地面投擲油瓶造成 400% MATK 傷害，半徑 80、施法距離 220；施加沾油狀態 6 秒（移速 −20%）；可魔法暴擊；地屬性（Gaia）。",
    "bigkaboom": "引爆火藥桶造成 720% MATK 傷害，半徑 100、施法距離 220；對沾油目標傷害 +100%；50% 機率施加燃燒 5 秒（每秒 −3% HP，上限 ATK/MATK 較高者 200%）；可魔法暴擊；火屬性（Hephaestus）。",
    "catbrew": "ASPD +20%、M.CRIT +15，持續 17 秒；Multi Cast：Nekobaku 攻擊技能有 10% 機率雙重施法（×2）、4% 機率三重施法（×3）；風屬性（Aeolus）。",
    "tigerpounce": "第 1 段：朝 250 距離內指定終點直線突進，對寬 44 路徑上敵人造成 1,210% ATK（可空放、撞牆停止），每命中 1 名敵人 Adrenaline +1。第 2 段：1.5 秒內再按一次施放 Smash 躍擊 250 內任一目標造成 1,485% ATK 與暈眩 1 秒（Leader 無效）並獲得 Adrenaline +1；兩段分別耗魔、冷卻自第 1 段起算；附帶燃燒 3 秒（每秒 −0.7% HP）與 Chain Combo（3 秒內連用 Iron Fist 技能每層 +4% 傷害，上限 5 層）；無屬性，隨武器塗層屬性。",
    "groundpound": "於 Flash Dash 後 1.5 秒內再次按鍵發動：躍起砸擊 250 內目標造成 1,485% ATK 傷害、Adrenaline +1 與暈眩 1 秒（Leader 無效）；可暴擊；附帶燃燒 3 秒與 Chain Combo（每層 +4%，上限 5 層）；無屬性，隨武器塗層屬性；對遠處怪物以 2 倍跑速衝近。",
    "viciouselbow": "橫掃踢擊半徑 130 內所有敵人造成 1,364% ATK 傷害，每命中 1 敵 Adrenaline +1；擊退敵人至距離自身 4 格處（不擊退已暈眩或穿牆，Leader 無效）；最多儲存 2 次充能（每 3 秒恢復 1 次）；施加緩速 1.5 秒（移速與攻速 −50%）；可暴擊；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。",
    "clinch": "於 Iron Counter 成功反擊後 2 秒內再按一次發動：穿牆飛踢反擊對象（最遠 300 距離）造成 1,100% ATK 傷害、Adrenaline +1 與暈眩 1 秒（Leader 無效）；可暴擊；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。",
    "guardcounter": "架起防禦姿態 2 秒，100% 格擋下一次攻擊並立即穿牆反擊 880% ATK（可暴擊、Adrenaline +1）；反擊後 2 秒內可再按一次接續 Flying Dropkick 造成 1,100% ATK 並暈眩 1 秒；兩段分開耗魔、冷卻於技能結束後起算；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。",
    "ironspirit": "僅於 God Zone 狀態下可用：長按蓄力（可移動，移速 −30%）後釋放衝刺攻擊寬 32 路徑與終點半徑 40（每名敵人受擊 1 次）：未滿 1 秒 2,356.4% ATK（距離 50）、1 秒 3,366.3% ATK（距離 100）、2 秒 6,732.7% ATK（距離 150）、3 秒以上 13,600% ATK（距離 250），撞牆停止並立即結束 God Zone；蓄力遭暈眩將取消；附帶燃燒 3 秒與 Chain Combo；無屬性，隨武器塗層屬性。",
    "blackcatknight": "召喚紫焰暗鎧黑貓騎士（坦克型）：MaxHP 為施法者（MATK + MaxHP）的 300%，普攻 100% MATK（距離 56，每次命中 +200 仇恨）。INT 100 解鎖 Shadow Taunt（嘲諷 250 內敵人 3 秒，150% ATK，CD 5 秒，SP 18）；INT 200 解鎖 Shadow Hook（抓取 300 內最多 2 名攻擊主人的遠處敵人至身前並造成 250% MATK，CD 10 秒，SP 49）；INT 300 解鎖 Abyssal Fortress（DEF/MDEF +30，擊殺目標立即重置騎士技能冷卻）。繼承主人 DEF/MDEF、ASPD 與 M.CRIT；暗屬性（Chaos）；消耗 30% MaxSP，死亡/取消冷卻 8 秒。",
    "blackcatspells": "發射 10 枚黑貓靈彈合併為單次 1,150% MATK 傷害；詠唱 0.817 秒（受 DEX 縮減）；距離 240；94% 機率施加衰弱 5 秒（敵人造成傷害 −20%，對世界王無效）；可魔法暴擊；詠唱結束可立即銜接其他技能；暗屬性（Chaos）。",
    "blackcatarcher": "召喚紫焰黑貓弓箭手（遠程 DPS 型）：MaxHP 為施法者（MATK + MaxHP）的 100%，普攻 100% MATK，射程隨總 INT 0/100/200/300 提升為 70/100/150/180；INT 100：暴擊率 +10%；INT 200：Shadow Shot 50% 機率（INT 300 為 100%）附帶 +210% ATK 傷害（SP 12/發）；INT 300：Shadow Piercing 直線貫穿 2,000% ATK（CD 5 秒，SP 29）。繼承主人 DEF/MDEF、ASPD 與 M.CRIT；暗屬性（Chaos）；消耗 30% MaxSP。",
    "lowerresist": "為自身、所有召喚物與同地圖隊友提供 ASPD +10%；同時賦予自身可格擋任意 2 次傷害的暗影護盾，持續 10 秒（格擋滿 2 次即消散）；暗屬性（Chaos）。",
    "blackcatcleric": "召喚持紫焰法杖的黑貓牧師（控場／法術型）：MaxHP 為施法者（MATK + MaxHP）的 100%，不普攻而於距離 200 依序循環施放 3 招：Abyssal Vortex（將半徑 200 敵人吸至中心，1,200% MATK，SP 35）→ Black Meteor（半徑 180 隕石 1,200% MATK，30% 機率暈眩 1 秒，SP 40）→ Shadow Mend（恢復所有召喚物 20% MaxHP，SP 25）；每招施放間隔隨總 INT 0/100/200/300 縮短為 4/3/2/1 秒。繼承主人 DEF/MDEF、ASPD 與 M.CRIT；暗屬性（Chaos）；消耗 30% MaxSP。",
    "summoncommand": "指令所有黑貓召喚物集火攻擊指定目標，距離 240；Wicked Necromancer 固有 Lv.1 技能（不耗技能點與 SP）；暗屬性（Chaos）。",
    "btcsoul": "彈射金幣攻擊敵人並於最近目標間乒乓反彈：依總 STR 與 INT 動態切換公式——STR 主導為 280% ATK + 160% MATK（物理，不回彈同目標，最多 4 段）；INT 主導為 280% MATK + 160% ATK（魔法，可回彈，最多 4 段）；STR = INT 為 440% ATK + 440% MATK（魔法，可回彈且不衰減，最多 5 段，全段附緩速 20% 1 秒且對已緩速目標 +20% 傷害）；若無可彈射目標金幣回手且開啟 Dividend Yield 時回報 +10%；必中、距離 200（開光環 350）；對怪物傷害 ×1.2；隨武器塗層屬性。",
    "dividendyield": "切換光環：每秒消耗 5% MaxSP（不可減免）；普攻與技能射程擴至 350；累積報酬率最高 +300% 全傷害加成（站立每秒 +1%、每次命中 +1%、STR = INT +2%、金幣回手 +10%，觸發時有 (LUK÷3)% 機率再額外獲得，上限 70%；衝刺 −20%、受擊 −10%）；SP 不足/換裝/死亡/換圖重置，開啟時除 Cash Flow 外無法吸魔；關閉後冷卻 8 秒。",
    "stoploss": "消耗當前一半報酬率進入無敵並淨化且免疫所有異常 2 秒（移速 +10%）；消耗愈高冷卻愈短：未滿 50% 為 30 秒、50%+ 為 24 秒、100%+ 為 18 秒、150%+ 為 12 秒；暈眩或冰凍中亦可施放；不消耗 SP。",
    "candlestorm": "僅於 Dividend Yield 開啟時可用的單鍵三段連招（須於 1.5 秒內接下一段）：第 1 段 Candle Storm 攻擊目標周圍半徑 150 並將怪物吸向中心（Boss 除外）：STR 主導 224% ATK + 128% MATK、INT 主導 224% MATK + 128% ATK、STR = INT 352% ATK + 352% MATK；第 2 段 Break Out、第 3 段 Take Profit；必中、距離 350、結束後冷卻 10 秒；對怪物傷害 ×1.2；隨武器塗層屬性。",
    "breakout": "三段連招第 2 段（於 Candle Storm 後 1.5 秒內連按）：朝目標直線射出寬 20 長 350 貫穿金幣波，STR 主導 420% ATK + 240% MATK、INT 主導 420% MATK + 240% ATK、STR = INT 660% ATK + 660% MATK；命中敵人附加 FOMO 狀態 2 秒；對怪物傷害 ×1.2；隨武器塗層屬性。",
    "takeprofit": "三段連招第 3 段（於 Break Out 後 1.5 秒內連按）：於帶有 FOMO 敵人間彈射共 3 段（半徑 100，傷害不衰減；無 FOMO 目標時集中打鎖定目標 3 段），STR 主導 560% ATK + 320% MATK、INT 主導 560% MATK + 320% ATK、STR = INT 每段 880% ATK + 880% MATK；對 FOMO 目標傷害 +30%；對怪物傷害 ×1.2；隨武器塗層屬性。",
    "triplevolley": "自身增益 80 秒：對怪物普攻同時射擊最多 4 名不同目標（副目標承受 100% 首箭傷害，對玩家為 2 名）；傷害 +25%、暴擊傷害 +15%、命中減速 30% 持續 3 秒、射程 +30；期間免疫反傷；冷卻 17 秒；隨武器塗層屬性。",
    "poonattention": "ASPD +20%、ATK +30%、移動速度 +10%，持續 80 秒；自身與 Poon-poon 可看穿半徑 300 內隱身敵人。",
    "poondestroy": "指令 Poon-poon 撲咬目標造成 550% Poon-poon 攻擊力傷害並減速 40% 持續 5 秒；可依角色暴擊率暴擊；距離 340（需 Poon-poon 在場）；隨武器塗層屬性。",
    "crossfire": "固定詠唱 0.2 秒（不受 DEX 縮減）；與 Poon-poon 繞行單一目標連射：第 1–6 輪 550% ATK × 12 段、第 7 輪終結 3,500% ATK × 2 段，期間無敵 0.7 秒；可暴擊；暴擊傷害 +10%（總 DEX > 200 為 +20%，> 300 為 +30%）；冷卻 7 秒、距離 350；隨武器塗層屬性。",
    "lightsembrace": "揮出長 270 寬 40 的聖光鎖鏈（末端半徑 40），穿牆將沿途所有敵人拉至身前並造成 550% ATK + 15% MaxHP 傷害；隨武器塗層屬性；可暴擊、必中；強制挑釁怪物 5 秒（仇恨置頂 +500 並鎖定攻擊自身；對 Leader 僅挑釁不拉動）；對遠處怪物施放以 2 倍跑速衝近。",
    "sacrificestrike": "以太陽聖光包覆盾牌橫掃半徑 170 周圍敵人，造成 1,450% ATK × 2 段 + 40% MaxHP 傷害（對怪物施放時技能 ATK 部分傷害 ×3）；隨武器塗層屬性；可暴擊、必中；消耗自身 3% MaxHP。每次命中疊加 1 層聖印（上限 6 層、持續 8 秒），帶聖印敵人陣亡時引爆半徑 170 造成每層 400% ATK + 20% Templar MaxHP 傷害並擴散 2 層聖印；擊殺任意敵人立即重置本技能冷卻；對玩家不觸發吸血。",
    "soullink": "與半徑 300 內 1 名隊友締結聖光契約 15 秒：代為承擔該隊友 85% 所受傷害，期間自身所受傷害 −20%（分攤傷害不會使自身 HP 低於 1）；消耗 5% MaxHP；同時間僅能連結 1 人且不可對其他 Templar 施放。",
    "lightbarrier": "展開耀光盾壁 5 秒：將 45% 物理傷害與 25% 魔法傷害以攻擊者原有屬性反射回去；消耗 5% MaxHP。",
    "lightdevastation": "將盾牌重插地面定身半徑 150 內所有敵人 1.5 秒後引爆 5 段十字聖光柱：總傷害為 10 / 15 / 20 / 25 倍自身 MaxHP（依自身總 VIT <100 / 100+ / 200+ / 300+ 分階）+ 5,000% ATK；光屬性（Apollo）；計算 DEF、可暴擊並依 HIT/FLEE 判定命中；消耗 35% MaxHP；對怪物傷害 +50%。",
    "swordmastery": "被動 · 裝備近戰武器（Lionheart Aegis、太刀、劍、匕首、細劍、錘、斧、長槍、爪、拳套；不含法杖／魔杖）時每級 ATK +6%、ASPD +2%（滿級 ATK +60% / ASPD +20%）；對暈眩或燃燒敵人傷害 +40%（僅限物理攻擊，Lv.10）。",
    "hprecovery": "被動 · 每級使 ATK 增加相當於 MaxHP 1%（滿級 10%）、自然回血與藥水回血效果各提升 10%，且每 2 級 SP 恢復 +1（Lv.10）。",
    "sp_recovery": "被動 · 每 2 級 SP 恢復 +1；每級降低技能 SP 消耗 4%（滿級 −40%，Lv.10）。",
    "owleye": "被動 · 每級 DEX +2、HIT +1%（滿級 +20 / +10%）；每級 ATK 增加相當於 HIT 的 2% 與 DEX 的 4.5%（滿級 20% HIT + 45% DEX，Lv.10）。",
    "vultureeye": "被動 · 每級遠程攻擊距離 +6（跨職減半）；裝備弓類時每級傷害 +6%（滿級 +60%），其他遠程武器跨職上限 +20%（Lv.10）。",
    "divineprotection": "復活 1 名倒下玩家並以 100% HP 復原（消耗 25% MaxSP 與 1 個 Sacred Feather，距離 350；未指定時復活地圖內最近倒下隊友；競技場無法使用）；光屬性（Apollo）。",
    "demonbane": "被動 · 每級 DEF +2、MDEF +3（滿級 DEF +20 / MDEF +30），且 ATK 與 MATK 每級 +2.5%（滿級 +25%，Lv.10）。",
    "lightshadow": "被動 · Cleric 固有 Lv.10 被動（免點數）；光與暗屬性物理及魔法傷害每級 +2%（滿級 +20%），技能冷卻每級 −1%（滿級 −10%，Lv.10）。",
    "discount": "被動 · 每級向 NPC 購買折扣與出售加價各 +2%（滿級 20%，Lv.10）。",
    "overcharge": "被動 · 依等級增加 MaxHP +100/311/522/733/944/1155/1366/1577/1788/2000（僅限 Merchant 本職，Lv.10）。",
    "doubleattack": "被動 · 近戰武器普攻每級獲得 5% 二連擊機率（滿級 50%）與 HIT +1（滿級 +10，Lv.10）。",
    "improvedodge": "被動 · 每級 FLEE +2%（滿級 +20%）與移動速度 +1.5%（滿級 +15%，Lv.10）。",
    "ironbody": "被動 · 每級 VIT +2、MaxHP +0.5%（滿級 VIT +20 / MaxHP +5%，Lv.10）。",
    "mentality": "被動 · 每級 INT +2、MaxSP +1%（滿級 +20 / +10%）；MATK 增加相當於 MaxSP 的 1.5% 與 DEX 的 15%/級（滿級 15% SP + 150% DEX）；MATK 每級 +6%（滿級 +60%）；技能耗魔每級 −1%（滿級 −10%，Lv.10）。",
    "magemastery": "格擋任意形式攻擊 3 次（含反傷與真實傷害），持續 30 秒或格擋次數用盡（僅限自身）。",
    "weighttraining": "被動 · 每級 STR +1、ATK +4.5%、負重上限 +100（滿級 STR +10 / ATK +45% / 負重 +1,000），並使 ATK 增加相當於最大負重 0.125%/級（滿級 1.25%，Lv.10）。",
    "venommastery": "被動 · 須裝備苦無：蛇毒傷害每級 +10%（滿級 +100%），ATK 依等級 +5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15%（Lv.10）。",
    "numbingtoxin": "被動 · 須裝備苦無：中蛇毒的敵人每層 HIT −1/級（滿級每層 −10），自身 HIT 每級 +10（滿級 +100，Lv.10）。",
    "predator": "被動 · 須裝備苦無：對中蛇毒的敵人物理傷害依等級 +10/13.9/17.8/21.7/25.6/29.4/33.3/37.2/41.1/45%（Lv.10）。",
    "katanamastery": "被動 · 裝備太刀時每級 ATK +4%（滿級 +40%），CRIT 每級 +1（滿級 +10，Lv.10）。",
    "shukuchi": "被動 · 每級移動速度 +2%（滿級 +20%）、FLEE +1%（滿級 +10%，Lv.10）。",
    "zanshin": "被動 · 每級暴擊傷害 +3%（滿級 +30%），並使 ATK 增加相當於 AGI 的 5%/級（滿級 50% AGI，Lv.10）。",
    "fatalsense": "被動 · 每級暴擊傷害 +2%、ASPD +1%（滿級 +20% / +10%），並使 ATK 增加相當於 AGI 的 5.5%/級（滿級 55% AGI，Lv.10）。",
    "alchemymastery": "被動 · 每級 MATK +5%（滿級 +50%，Lv.10）。",
    "ninelives": "被動 · 受到怪物或異常狀態致命傷時免死並恢復 10% + 2%/級 MaxHP（Lv.10 為 30%）；冷卻 10 分鐘每級縮短 30 秒（Lv.10 為 5 分鐘）；決鬥與競技場不觸發（Lv.10）。",
    "catreflex": "被動 · 每級 ASPD +1%（滿級 +10%），並使 MATK 增加相當於 AGI 的 4%/級（滿級 40% AGI，Lv.10）。",
    "ironhide": "被動 · 裝備拳套（Cestus）時，對 HP 高於 85% 的敵人傷害依等級 +10/11/12/13/14/16/17/18/19/20%；可跨職業裝備於被動欄位（Lv.10）。",
    "fivetriple": "被動 · 受到致命傷時鎖定 HP 為 1 持續 5 秒並進入無敵（免疫異常，無法回血或使用道具，可正常攻擊與施法），5 秒後死亡（若同時裝備 Nine Lives 則會接續觸發）；冷卻依等級 60/57/53/50/47/43/40/37/33/30 秒；全地圖適用且可跨職裝備（Lv.10）。",
    "vanguard": "被動 · 僅於裝備拳套（Cestus）時每級 ATK +6%（滿級 +60%，僅限 Iron Fist 本職，Lv.10）。",
    "blackrestore": "被動 · 自身或召喚物擊殺敵人時，所有存活召喚物恢復每級 0.5% MaxHP（滿級 5%）；僅治療召喚物，僅限 Wicked Necromancer 本職（Lv.10）。",
    "summonmastery": "被動 · 所有召喚物攻擊力每級 +1%、MaxHP 每級 +0.5%（滿級 +10% / +5%）；僅影響召喚物，僅限 Wicked Necromancer 本職（Lv.10）。",
    "peratio": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：物理穿透與魔法穿透每級 +1%（滿級 +10%）；可跨職業裝備（Lv.10）。",
    "priceceiling": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：全技能冷卻每級 −1.5%、LUK 每級 +3（滿級冷卻 −15% / LUK +30）；可跨職業裝備（Lv.10）。",
    "dogseye": "被動 · 僅限雙槍：攻擊距離每級 +22（總射程上限 330），雙槍與 Poon-poon 的 ATK 每級 +4.5%（滿級 +45%，僅限 Sinister 本職，Lv.10）。",
    "dogsbane": "被動 · Poon-poon 攻擊力 = 角色 ATK + 總 DEX × 155/166/177/188/200/211/222/233/244/255%（僅限 Sinister 本職，Lv.10）。",
    "poonstrike": "被動 · 僅限雙槍：普攻命中每級 4% 機率（滿級 40%）觸發 Poon-poon 衝咬 4 段，每段造成角色 ATK + 115% Poon-poon 攻擊力傷害（每段 7% 機率流血）；僅限 Sinister 本職（Lv.10）。",
    "callpoon": "職業固有被動（免點數，其他職業亦可裝備於被動欄位召喚 Poon-poon）：召喚無敵且不被選取的 Poon-poon 隨行戰鬥，每 2 次角色攻擊協助撲咬同一目標，距離超過 400 自動瞬移回身旁（Lv.10）。",
    "templarmastery": "被動 · 裝備 Lionheart Aegis 時每級 VIT +6、DEF +3、MDEF +3、MaxHP +1%（滿級 VIT +60 / DEF +30 / MDEF +30 / MaxHP +10%，僅限 Templar 本職，Lv.10）。",
    "bastionshield": "被動 · 裝備 Lionheart Aegis 受物理攻擊時每級 1.7% 機率舉盾格擋（滿級 17%），成功時以 1.25 倍全額必中反傷（對玩家每次不超過攻擊者 10% MaxHP，不與 Light-Reflect Barrier 疊加）；Lv.10 成功舉盾時移速 +10% 持續 5 秒（最多 3 層），僅限 Templar 本職。",
    "undyingdawn": "Templar 固有被動（免點數）：受到致命傷時不死並無敵 1 秒、淨化全異常且恢復 50% MaxHP，冷卻 100 秒（優先於 Last Stand／Nine Lives 觸發）；全地圖適用，僅限 Templar 本職（Lv.10）。",
    "pricefloor": "被動 · 當面板總 STR = INT（含裝備與職業加成）時生效：普攻有 (LUK÷3)% 機率恢復 5/7/9/12/14/16/18/21/23/25 點 SP；裝備本被動後無論 STR 是否等於 INT 皆無法從套裝／卡片／裝備吸魔；可跨職裝備（Lv.10）。",
    "vanguardcharge": "衝鋒攻擊 220 距離內目標，對路徑上所有敵人造成 650% ATK 傷害並向兩側推開、暈眩 1.5 秒（Leader 無效）；可暴擊；無屬性，隨武器塗層屬性；對遠處怪物施放以 2 倍跑速衝近。",
    "battlemomentum": "被動 · 主動技能命中時獲得 1 層 Battle Momentum（上限 5 層，持續 6 秒）：每層依等級提供 ASPD +1~10%（Lv.10 共 +50% ASPD）且主動技能冷卻 −0.2 秒（Lv.10）。",
    "unyieldinggrit": "被動 · 當 HP 低於 15/17/19/21/22/24/25/27/28/30% 時，全傷害減免（含物/魔/反傷/真傷）與藥水回血量依等級 +5/7/8/9/10/11/12/13/14/15%（Lv.10）。",
    "elementalresonance": "全地圖常駐光環：為自身與同地圖所有隊友提升全部屬性攻擊（物理與魔法）傷害，依等級 +3/3.8/4.6/5.3/6.1/6.9/7.7/8.4/9.2/10%（同隊多名法師取最高等級計算，Lv.10）。",
    "arcaneconduit": "被動 · 施放技能時恢復 0.3/0.6/0.9/1.2/1.5/1.8/2.1/2.4/2.7/3% MaxHP，冷卻依等級為 5~2.5 秒（Lv.10 為 3% MaxHP、冷卻 2.5 秒）。",
    "spellweave": "被動 · 施放技能後獲得 Spellweave 狀態 5 秒：縮短詠唱時間 5/6.1/7.2/8.3/9.4/10.6/11.7/12.8/13.9/15% 並提升 M.CRIT +1~10（Lv.10 為 −15% 詠唱、M.CRIT +10）。",
    "elementalquiver": "被動 · 為武器塗層任意屬性後，普攻與攻擊技能傷害依等級 +4/5.2/6.4/7.7/8.9/10.1/11.3/12.6/13.8/15%（未塗層則不生效，Lv.10）。",
    "focusroot": "被動 · 被 Briar Seed Trap 定身的敵人 DEF 依等級 −1~10%，每次攻擊受定身目標使藤蔓爆裂傷害 +1~10%（上限 3 層）且爆裂暴傷 +1~10%；僅限 Archer 本職（Lv.10）。",
    "huntingjob": "生活職業固有被動（Job Lv.16 自動習得 Lv.10，不佔被動格且全職業通用）：對當日狩獵契約怪物傷害 +5%，可於獵人佈告欄接取每日契約獲得經驗與 Hunter's Mark，狩獵有 10% 機率獲得肉類素材。",
    "solarijudgment": "被動 · 攻擊技能命中時有 10/12.2/14.4/16.7/18.9/21.1/23.3/25.6/27.8/30% 機率召喚 Solari 光束，對目標造成 250~500% MATK 光屬性傷害（Lv.10 為 30% 機率、500% MATK）。",
    "twilightequilibrium": "被動 · 施放治療或增益後使下次攻擊技能傷害依等級 +4~20%（Lv.10 +20%）；施放攻擊技能後使下次治療量依等級 +5~20%（Lv.10 +20%）。",
    "decoytotem": "於 200 距離內設置存在 5 秒、HP 為自身 50% MaxHP 的金幣圖騰：吸引半徑 180 內怪物攻擊圖騰；時間結束或遭摧毀時對周圍造成 1,800% ATK 爆裂傷害；可暴擊；無屬性，隨武器塗層屬性。",
    "cartwheels": "被動 · 移動速度依等級 +2/4/6/8/10/12/14/16/18/20%（Lv.10）。",
    "heavycart": "被動 · 負重超過 50% 時所受傷害依等級減免 2/3.1/4.2/5.3/6.4/7.6/8.7/9.8/10.9/12%（Lv.10）。",
    "envenompact": "為武器塗毒 30 秒：普攻與攻擊技能有 30% 機率施加劇毒（每 0.5 秒損失 1.5% HP，持續 5 秒）。",
    "counterstep": "被動 · 閃避物理攻擊時有 25~75% 機率反擊斬造成 50~150% ATK 傷害並恢復 1~10 SP（冷卻 2 秒；Lv.10 為 75% 機率、150% ATK、+10 SP）。",
    "combofinisher": "被動 · Twin Strike 觸發二連擊時獲得 1 點連擊點（上限 5 點）；集滿後下次攻擊技能免消耗 SP、傷害依等級 +5~50% ATK 並恢復 2~7% MaxHP（Lv.10 為 +50% ATK、+7% MaxHP）。",
    "viperscoil": "擲出苦無繩索束縛 240 距離內目標造成 910% ATK 傷害，定身 3 秒（Leader 無效）並使 DEF −5%（已中蛇毒則 −10%）持續 3 秒；可暴擊；隨武器塗層屬性。",
    "sheddingskin": "被動 · 單次受到超過 20% MaxHP 傷害時立即淨化全部異常狀態，並於 5 秒內獲得 FLEE +10~40% 與移速 +5~20%（冷卻 10 秒；Lv.10 為 FLEE +40%、移速 +20%）。",
    "coldblooded": "被動 · 攻擊中毒或蛇毒目標時，暴擊傷害依等級 +2~20%、無視防禦（物理穿透）依等級 +0.5~5%（Lv.10 為暴傷 +20%、物理穿透 +5%）。",
    "gravityvortex": "投擲重力瓶至最遠 300 處展開半徑 180 黑洞 3 秒將敵人吸向中心；黑洞坍縮時造成 870% MATK 傷害並緩速 25% 持續 3 秒；可魔法暴擊；暗屬性（Chaos）。",
    "unstableconcoction": "被動 · 攻擊技能有 15~35% 機率觸發隨機異變：冰凍 1.5 秒、MDEF −15% 持續 1.5 秒，或額外引爆 50~150% MATK 傷害（Lv.10 為 35% 機率、150% MATK）。",
    "alchemyjob": "生活職業固有被動（習得一次全職業通用，不佔被動格）：開啟煉金介面使用肉類素材煉製增益藥水，肉質愈佳藥效愈強（Lv.10）。",
    "mirrorparry": "架刀格擋 1.75 秒（不可移動），完全抵擋下一次攻擊並朝目標方向衝刺斬擊長 180 直線造成 840% ATK 傷害且暴擊傷害 +25%；格擋成功冷卻減半；必中、可暴擊；隨武器塗層屬性。",
    "kasumiedge": "被動 · 普攻有 5~20% 機率以刀柄擊暈目標 1.5 秒（Leader 無效）並接續 2 段斬擊，每段 150~450% ATK 且施加流血（冷卻 5 秒；Lv.10 為 20% 機率、每段 450% ATK）。",
    "akatsukikenki": "被動 · 擊殺敵人或累計暴擊 10 次時覺醒 Akatsuki Kenki 10 秒：普攻距離依等級 +15~60，且普攻對目標周圍半徑 90 內敵人造成 25~50% ATK 濺射傷害（Lv.10 為距離 +60、50% ATK 濺射）。",
    "machinenine": "對單體連續打出 8 拳（每拳 104% ATK）並以第 9 拳（167% ATK）終結：每拳賦予 Adrenaline +1 與暈眩 0.2 秒，最後一拳擊退 3 格（Leader 無效）並施加流血 5 秒；必中、可暴擊；隨武器塗層屬性；對遠處怪物以 2 倍跑速衝近。",
    "pistonrhythm": "被動 · 普攻暴擊時，所有主動技能剩餘冷卻依等級縮短 0.05/0.1/0.15/0.2/0.25/0.3/0.35/0.4/0.45/0.5 秒（Lv.10）。",
    "ironcladknuckle": "被動 · 將總 DEF 的 15/20/25/30/35/40/45/50/55/60% 轉化為 ATK（Lv.10 為 60%）。",
    "grimpurr": "被動 · 魔法攻擊技能命中時有 10~30% 機率詛咒目標 4 秒，期間目標獲得的治療將轉化為該治療量 95~195% 的暗屬性傷害（Lv.10 為 30% 機率、195% 轉傷）。",
    "soullantern": "被動 · 半徑 240 內有敵人或召喚物死亡時獲得 1 盞靈魂燈火（上限 5 盞，持續 15 秒）：每盞使召喚物傷害依等級 +2~10%（Lv.10 每盞 +10%，滿層 +50%）、MATK 依等級 +2~7%（Lv.10 每盞 +7%，滿層 +35%）。",
    "felinepact": "被動 · 所有召喚物所受傷害依等級減免 2/4/6/8/10/12/14/16/18/20%（Lv.10）。",
    "bullishcandle": "射出長 320 直線貫穿綠色 K 線造成 1,030% MATK 傷害：每貫穿 1 名敵人傷害 +10%（上限 +50%）；40% 機率施加爆倉狀態（MDEF −15%，持續 5 秒）；可魔法暴擊；對怪物傷害 ×1.2；隨武器塗層屬性。",
    "circuitbreaker": "被動 · 單次受到超過 MaxHP 45~25% 的傷害時將該次傷害截斷至上限值，冷卻 20 秒（Lv.10 上限為 25% MaxHP）。",
    "sovereigndividend": "被動 · 複利滾雪球：連續命中同一目標時每次傷害依等級 +0.5~2.5%（上限 10 層，Lv.10 滿層 +25%），切換目標重新計算。",
    "bulletwaltz": "旋轉掃射半徑 180 周圍敵人連續 3 輪，每輪造成 855% ATK 傷害並將近身敵人推離 50 距離；可暴擊；隨武器塗層屬性。",
    "ankleclamp": "被動 · Poon-poon 撲咬時有 5~15% 機率定身目標 0.5~1.5 秒（Leader 無效）並使 FLEE −15~30%（Lv.10 為 15% 機率、定身 1.5 秒、FLEE −30%）。",
    "sacredguillotine": "被動 · 每累計 5 次普攻觸發聖光鎖鏈 4 段連擊：首段造成 90~190% ATK（Lv.10 為 190%），每段遞增 +10% 傷害且最後一段暴擊傷害 +10%（Lv.10）。",
    "colossusbash": "被動 · 僅於裝備 Lionheart Aegis 時生效：普攻有 15~35% 機率重擊盾牌造成 50~115% ATK + 2~6% MaxHP 傷害（Lv.10 為 35% 機率、115% ATK + 6% MaxHP）；可依角色暴擊率暴擊。",
}

_CARD_STAT_ZH_ORDER: List[Tuple[str, str, bool]] = [
    ("str", "STR", False),
    ("agi", "AGI", False),
    ("vit", "VIT", False),
    ("int", "INT", False),
    ("dex", "DEX", False),
    ("luk", "LUK", False),
    ("flat_atk", "ATK", False),
    ("flat_matk", "MATK", False),
    ("atk_pct", "ATK", True),
    ("matk_pct", "MATK", True),
    ("phys_pierce", "物理穿透", True),
    ("magic_pierce", "魔法穿透", True),
    ("crit", "CRIT", False),
    ("mcrit", "M.CRIT", False),
    ("crit_dmg", "暴擊傷害", True),
    ("earth_dmg", "對地屬性傷害", True),
    ("aspd_flat", "ASPD", False),
    ("hit", "HIT", False),
    ("flee", "FLEE", False),
    ("def", "DEF", False),
    ("mdef", "MDEF", False),
    ("flat_hp", "MaxHP", False),
    ("flat_sp", "MaxSP", False),
    ("move_speed_pct", "移動速度", True),
    ("cast_reduce_pct", "減詠唱", True),
    ("sp_regen", "SP 自然恢復", False),
    ("lifesteal_pct", "吸血", True),
    ("reflect_pct", "物理反射", True),
    ("res_stun_pct", "暈眩抗性", True),
    ("res_freeze_pct", "冰凍抗性", True),
    ("res_burn_pct", "燃燒抗性", True),
    ("freeze_hit_pct", "普攻機率冰凍", True),
]

_CARD_SPECIAL_NOTES_ZH: Dict[str, str] = {
    "boss_card": "極稀有頭目掉落卡片",
    "loy_tani_card": "MDEF +10% · 滿月龍王洞窟稀有卡片",
    "loy_naga_card": "MaxHP +7% · 滿月龍王洞窟稀有卡片",
    "terragorn_card": "世界王 Terragorn 專屬卡片",
    "tomb_vampire_card": "萬聖節墓園（Halloween Tomb）稀有卡片",
    "tomb_jack_card": "萬聖節墓園（Halloween Tomb）稀有卡片",
    "lm01_rare_card": "LM-01 Critical 卡包 · Rare",
    "lm01_epic_card": "LM-01 Critical 卡包 · Epic",
    "lm01_legendary_card": "LM-01 Critical 卡包 · Legendary",
    "lm01_limited_card": "LM-01 Critical 卡包 · Limited",
    "lm01p_rare_card": "LM-01 Armor Breaker 卡包 · Rare",
    "lm01p_epic_card": "LM-01 Armor Breaker 卡包 · Epic",
    "lm01p_legendary_card": "LM-01 Armor Breaker 卡包 · Legendary",
    "lm01p_limited_card": "LM-01 Armor Breaker 卡包 · Limited",
    "lm01m_rare_card": "LM-01 Arcane Piercer 卡包 · Rare",
    "lm01m_epic_card": "LM-01 Arcane Piercer 卡包 · Epic",
    "lm01m_legendary_card": "LM-01 Arcane Piercer 卡包 · Legendary",
    "lm01m_limited_card": "LM-01 Arcane Piercer 卡包 · Limited",
}


def is_limited_card(card_id: str, source_monsters: Optional[List[str]] = None) -> int:
    """Only LM-01 / gacha-pack cards are limited (1); all monster/boss/dungeon drops are farmable (0)."""
    if str(card_id).startswith("lm01"):
        return 1
    for src in source_monsters or []:
        if "pack" in str(src).lower():
            return 1
    return 0


def build_card_description_zh(card: Dict[str, Any]) -> str:
    """Build a crisp Traditional Chinese card description from structured card fields (zero Thai)."""
    cid = str(card.get("id") or "")
    bonuses = card.get("bonuses") or {}
    parts: List[str] = []

    for key in bonuses:
        if key in CARD_MECHANIC_ZH:
            title_zh, desc_zh = CARD_MECHANIC_ZH[key]
            parts.append(f"{title_zh}：{desc_zh}")

    stat_tokens: List[str] = []
    for key, label, is_pct in _CARD_STAT_ZH_ORDER:
        if key not in bonuses:
            continue
        val = bonuses[key]
        if not isinstance(val, (int, float)):
            continue
        if is_pct:
            pct = round(float(val) * 100.0, 2)
            pct_str = f"{int(pct)}" if float(pct).is_integer() else f"{pct:g}"
            token = f"{label} +{pct_str}%"
            if key == "res_stun_pct":
                token += "（合計上限 80%）"
            elif key == "res_freeze_pct":
                token += "（合計上限 80%）"
            elif key == "res_burn_pct":
                token += "（合計上限 80%）"
            elif key == "reflect_pct":
                token += "（合計上限 20%）"
            elif key == "cast_reduce_pct":
                token += "（合計上限 30%）"
            elif key == "move_speed_pct":
                token += "（合計上限 50%）"
            elif key == "freeze_hit_pct":
                token += "（合計上限 15%，對 Leader 無效）"
            stat_tokens.append(token)
        else:
            num = int(val) if float(val).is_integer() else val
            token = f"{label} +{num}"
            if key == "aspd_flat":
                token += "（卡片固定 ASPD 不疊加）"
            stat_tokens.append(token)

    if stat_tokens:
        parts.append("、".join(stat_tokens))

    if any(k in CARD_MECHANIC_ZH for k in bonuses):
        parts.append("單卡限用 1 張（重複無效），僅對怪物有效（PvP 無效）")
    if bonuses.get("lifesteal_pct"):
        parts.append("Shield Sacrificial Strike 對玩家不觸發吸血")

    max_per_item = int(card.get("max_per_item") or 1)
    removable_str = "可付費拆卸（消耗 Silver）" if card.get("removable") else "不可拆卸"
    parts.append(f"每件裝備限鑲嵌 {max_per_item} 張 · {removable_str}")

    if cid in _CARD_SPECIAL_NOTES_ZH:
        parts.append(_CARD_SPECIAL_NOTES_ZH[cid])

    return " · ".join(parts) if parts else f"{card.get('name', cid)} · 每件裝備限鑲嵌 {max_per_item} 張"


def localize_snapshot_to_zh(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Enforce Traditional Chinese descriptions & accurate is_limited flags across a full Wiki snapshot."""
    card_mechanics = snapshot.get("card_mechanics") or {}
    for mkey, mval in card_mechanics.items():
        if isinstance(mval, dict) and mkey in CARD_MECHANIC_ZH:
            title_zh, desc_zh = CARD_MECHANIC_ZH[mkey]
            mval["title"] = title_zh
            mval["description"] = desc_zh

    for card in snapshot.get("cards") or []:
        cid = str(card.get("id") or "")
        srcs = list(card.get("source_monsters") or [])
        card["is_limited"] = is_limited_card(cid, srcs)
        existing_desc = str(card.get("description") or "")
        if not existing_desc.startswith("[Simulated Patch") or THAI_CHAR_RE.search(existing_desc):
            card["description"] = build_card_description_zh(card)

    for sk in snapshot.get("skills") or []:
        sid = str(sk.get("id") or "")
        if sid in SKILL_DESC_LV10_ZH:
            existing_lv10 = str(sk.get("description_lv10") or "")
            if not existing_lv10 or THAI_CHAR_RE.search(existing_lv10):
                sk["description_lv10"] = SKILL_DESC_LV10_ZH[sid]
            elif not str(sk.get("description") or "").startswith("Lv.10 [Simulated Patch]"):
                sk["description_lv10"] = SKILL_DESC_LV10_ZH[sid]
        elif THAI_CHAR_RE.search(str(sk.get("description_lv10") or "")):
            sk["description_lv10"] = str(sk.get("description") or sk.get("name") or sid)
        if THAI_CHAR_RE.search(str(sk.get("description") or "")):
            sk["description"] = str(sk.get("name") or sid)

    for cp in snapshot.get("cross_passives") or []:
        pid = str(cp.get("id") or "")
        if pid in SKILL_DESC_LV10_ZH:
            cp["description"] = SKILL_DESC_LV10_ZH[pid]
        elif THAI_CHAR_RE.search(str(cp.get("description") or "")):
            cp["description"] = str(cp.get("name") or pid)

    return snapshot
