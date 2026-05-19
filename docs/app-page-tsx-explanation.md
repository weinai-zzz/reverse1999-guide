# `app/page.tsx` 程式說明

本文逐段說明 `app/page.tsx` 的用途、資料流與畫面組成。這個檔案是 Next.js App Router 首頁，也就是網站 `/` 路由的主要畫面。

## 1. Client Component 與匯入

```tsx
'use client'
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
```

`'use client'` 代表整個檔案都會被視為 Client Component。這是必要的，因為頁面大量使用 `useState`、`useEffect`、`onClick`、`onMouseEnter`、`window.innerWidth` 等只能在瀏覽器端執行的互動邏輯。

`useState` 用來保存頁籤、篩選條件、載入狀態、目前選中的角色與隊伍回合。`useEffect` 用來在元件掛載後讀取 Supabase 資料，以及監聽視窗寬度變化。`supabase` 來自 `lib/supabase.ts`，透過 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 建立前端可用的 Supabase client。

## 2. 篩選選項與分類常數

```tsx
const STAR_OPTIONS = [2, 3, 4, 5, 6];
const INSIGHT_OPTIONS = ["獸", "木", "星", "岩", "靈", "智"];
const ROLE_OPTIONS = ["輸出", "輔助", "治療"];
const SPELL_TYPES = ["#Attack", "#Health", "#Buff", "#Debuff", "#Counter","#ultimate"];
const FUNCTION_TAGS = ["電能", "儀式", "啟示", "護盾", "毒霧", "火焰", "物理"];
const DAMAGE = ["現實創傷", "精神創傷"];
```

這一段定義角色資料會用到的固定選項。

`STAR_OPTIONS` 用在角色頁星級篩選按鈕。`INSIGHT_OPTIONS` 是角色靈感類型，例如獸、木、星。`ROLE_OPTIONS` 是角色定位，例如輸出、輔助、治療。

`SPELL_TYPES`、`FUNCTION_TAGS`、`DAMAGE` 目前在檔案中主要是資料定義用途，其中 `SPELL_TYPES` 沒有直接用來渲染選單，而是由每個技能自己的 `types` 陣列搭配 `SpellTypeTag` 顯示。`FUNCTION_TAGS` 與 `DAMAGE` 目前也沒有被實際引用，偏向預留資料。

## 3. `TEAM_SKILL_MAP`：隊伍出牌圖對照表

```tsx
const TEAM_SKILL_MAP = {
  poison: [
    ["露西", "/images/spells/lucy_spell1.png", ...],
  ],
  fire: [...],
  physical: [...],
};
```

這個物件負責把隊伍、角色、技能索引轉成圖片路徑。

每一個隊伍類型，例如 `poison`、`fire`、`physical`，底下都是多列角色資料。每列格式是：

```txt
[角色名稱, 神秘術1圖片, 神秘術2圖片, 至終儀式圖片, 任意動作或預備牌圖片]
```

在隊伍頁的回合出牌表中，程式會用 `team.team_id` 找到對應隊伍，再用 `card.char` 找到角色那一列，最後用 `card.spellIdx` 取出對應圖片。如果 `spellIdx` 沒有設定，預設使用索引 `1`，也就是第一張神秘術圖。

## 4. `TEAM_LIST`：本地隊伍範例資料

```tsx
const TEAM_LIST = [
  {
    id: "poison",
    name: "毒霧穿透",
    desc: "...",
    members: [...],
    rounds: [...],
  },
];
```

`TEAM_LIST` 定義了三種本地隊伍範例：毒霧穿透、火焰灼燒、物理收割。每個隊伍包含：

- `id`：隊伍識別字。
- `name`：隊伍名稱。
- `desc`：隊伍說明。
- `members`：隊員、靈感、傷害類型、標籤、心相推薦。
- `rounds`：每回合出牌順序與戰術筆記。

不過目前 `TeamPage` 實際資料來源是 Supabase 的 `teams` 資料表，不是這個 `TEAM_LIST`。因此這段目前比較像備用資料或舊版靜態資料。若 Supabase 沒資料，程式不會自動 fallback 到 `TEAM_LIST`。

## 5. `CHARACTERS`：本地角色範例資料

```tsx
const CHARACTERS = [
  {
    id: 1,
    name: "露西",
    star: 6,
    insight: "智",
    role: "輸出",
    damage: "精神創傷",
    tags: ["電能"],
    psycubes: [...],
    resonance: {...},
    spells: [...],
    ritual: {...},
  },
];
```

`CHARACTERS` 是本地角色範例資料。每個角色包含基本資訊、心相、共鳴、神秘術、至終儀式等欄位。

角色技能資料有兩種格式：

1. 新格式：技能內含 `initial` 與 `sublimation`，可切換初始或昇華說明。
2. 舊格式：技能直接使用 `desc`，沒有 `initial` 或 `sublimation`。

`CharacterPanel` 有做相容處理，因此兩種格式都能顯示。不過目前 `CharactersPage` 實際資料來源是 Supabase 的 `characters` 資料表，不是這個 `CHARACTERS` 陣列。

## 6. 顏色對照表

```tsx
const INSIGHT_COLORS = {...};
const ROLE_COLORS = {...};
const DAMAGE_COLORS = {...};
```

這三個物件把資料分類轉成 UI 顏色。

`INSIGHT_COLORS` 讓不同靈感有不同色彩。`ROLE_COLORS` 讓輸出、輔助、治療有不同標籤色。`DAMAGE_COLORS` 回傳文字色與背景色，用於現實創傷、精神創傷標籤。

這些對照表高度依賴資料值完全一致。例如資料庫若存的是 `damage_type`，但本地資料用的是 `damage`，顯示時就必須確保元件讀到正確欄位。

## 7. `Avatar`：沒有圖片時的角色頭像

```tsx
const Avatar = ({ name, size = 48, insight }) => {
  const colors = {...};
  const bg = colors[insight] || "#333";
  return <div>{name.slice(0, 2)}</div>;
};
```

`Avatar` 是圖片缺失時的替代顯示。它根據角色 `insight` 選背景色，並顯示角色名稱前兩個字。

`size` 控制頭像寬高與字體大小。`flexShrink: 0` 避免在 flex layout 裡被壓縮。這個元件在角色卡、隊員卡、圖片缺失時都會使用。

## 8. `Tag`、`DamageTag`、`StarDisplay`、`SpellTypeTag`

```tsx
const Tag = ({ label, color, bg, small }) => (...);
const DamageTag = ({ damage, small }) => (...);
const StarDisplay = ({ count }) => (...);
const SpellTypeTag = ({ type }) => (...);
```

這幾個是小型展示元件。

`Tag` 是通用標籤元件，可控制文字、文字色、背景色與尺寸。`DamageTag` 依照 `DAMAGE_COLORS` 包裝出傷害類型標籤。`StarDisplay` 用 `✦` 重複顯示星級數量。`SpellTypeTag` 把技能類型，例如 `#Attack`、`#Buff`，轉換成帶顏色的標籤。

這些元件讓後面的大型畫面不用重複寫標籤樣式。

## 9. `ImagePlaceholder`：圖片或佔位區

```tsx
const ImagePlaceholder = ({ label, w = "100%", h = 80, src }) => (
  src ? <img ... /> : <div>...</div>
);
```

`ImagePlaceholder` 是統一處理圖片的元件。

如果有 `src`，就顯示圖片。如果沒有 `src`，就顯示深色漸層背景、虛線邊框與提示文字。這讓角色立繪、心相圖、共鳴圖、技能圖、儀式圖即使資料還沒補齊，也不會讓版面破掉。

## 10. `CharacterPanel`：角色詳情彈窗

```tsx
function CharacterPanel({ char, onClose }) {
  const [spellMode, setSpellMode] = useState("initial");
  const hasSublimation = char.spells?.some(s => s.sublimation) || char.ritual?.sublimation;
  ...
}
```

`CharacterPanel` 是點擊角色卡後出現的彈窗。它使用固定定位覆蓋整個畫面，外層半透明黑色遮罩可點擊關閉，內層內容區使用 `stopPropagation` 避免點擊內容時關閉。

`spellMode` 控制技能說明要顯示 `initial` 還是 `sublimation`。`hasSublimation` 檢查角色任一神秘術或至終儀式是否有昇華資料，若有才顯示「初始 / 昇華」切換按鈕。

彈窗內容分成幾塊：

- Header：角色圖片、名稱、星級、靈感、職業、傷害類型、功能標籤、角色簡介。
- 心相推薦：用卡片列出 `char.psycubes`。
- 共鳴擺法：顯示共鳴圖、固定字串與 `char.resonance.desc`。
- 神秘術：逐一顯示 `char.spells`，並依 `spellMode` 決定使用初始或昇華資料。
- 至終儀式：顯示 `char.ritual`，同樣支援初始與昇華版本。

神秘術段落特別做了資料格式相容：

```tsx
const modeData = spellMode === "sublimation" && s.sublimation
  ? s.sublimation
  : s.initial || s;
```

意思是：如果目前是昇華模式且該技能有昇華資料，就用昇華資料；否則優先用 `initial`，如果連 `initial` 都沒有，就直接用舊格式的技能物件。

## 11. `Section`：區塊標題容器

```tsx
function Section({ title, children }) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

`Section` 是詳情彈窗中的區塊包裝元件。它統一每段間距和標題樣式，讓心相、共鳴、神秘術、至終儀式的視覺風格一致。

注意：有一處 `<Section>` 沒有傳入 `title`，但元件仍會渲染一個空的 `h3`。目前畫面可能不明顯，但若要整理程式，可考慮讓 `title` 存在時才顯示標題。

## 12. `CharactersPage`：角色列表與篩選頁

```tsx
function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stars: [], insights: [], roles: [] });
  const [selected, setSelected] = useState(null);
}
```

`CharactersPage` 是「角色介紹」頁的主要元件。

它有四個狀態：

- `characters`：從 Supabase 讀回來的角色資料。
- `loading`：控制是否顯示載入中。
- `filters`：目前啟用的星級、靈感、職業篩選條件。
- `selected`：目前被點擊並要顯示詳情的角色。

資料讀取流程：

```tsx
useEffect(() => {
  async function fetchCharacters() {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('star', { ascending: false });
    if (!error && data) setCharacters(data);
    setLoading(false);
  }
  fetchCharacters();
}, []);
```

元件第一次出現在畫面上時，會從 `characters` 表讀取全部欄位，並依 `star` 由高到低排序。成功時把資料放進 `characters`，最後關閉 loading。

篩選邏輯：

```tsx
const filtered = characters.filter(c =>
  (filters.stars.length === 0 || filters.stars.includes(c.star)) &&
  (filters.insights.length === 0 || filters.insights.includes(c.insight)) &&
  (filters.roles.length === 0 || filters.roles.includes(c.role))
);
```

每個篩選種類如果沒有選任何值，就代表不限制該類型。如果有選值，角色資料必須符合其中之一才會留下。三種篩選條件之間是 AND 關係。

畫面渲染分成：

- 篩選列：星級、靈感、職業三列按鈕。
- 角色卡網格：用 `auto-fill` 與 `minmax(120px, 1fr)` 自動排版。
- 空狀態：沒有符合條件時顯示提示文字。
- 詳情彈窗：`selected` 有值時渲染 `CharacterPanel`。

## 13. `FilterRow`：篩選列排版

```tsx
function FilterRow({ label, children }) {
  return (
    <div>
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}
```

`FilterRow` 負責包住一列篩選按鈕。`label` 是左側分類名稱，例如星級、靈感、職業。`children` 是這列中的多個 `FilterBtn`。

它使用 flex 與 `flexWrap`，因此在窄螢幕時按鈕可以自然換行。

## 14. `TeamPage`：配隊推薦頁

```tsx
function TeamPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState(0);
  const [round, setRound] = useState(0);
}
```

`TeamPage` 是「配隊推薦」頁的主要元件。

它有四個狀態：

- `teams`：從 Supabase 讀回來的隊伍資料。
- `loading`：控制是否顯示載入中。
- `activeTeam`：目前選中的隊伍索引。
- `round`：目前顯示第幾回合。

資料讀取流程：

```tsx
useEffect(() => {
  async function fetchTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('id');
    if (!error && data) setTeams(data);
    setLoading(false);
  }
  fetchTeams();
}, []);
```

元件掛載後從 `teams` 表讀取全部資料，並依 `id` 排序。載入中會顯示「載入中...」，若沒有資料會顯示「暫無配隊資料」。

載入完成後：

```tsx
const team = teams[activeTeam];
const roundData = team.rounds[round];
```

`team` 是目前選中的隊伍，`roundData` 是該隊伍目前回合的出牌資料。

畫面渲染分成：

- 隊伍選擇器：列出所有隊伍按鈕，點擊後切換隊伍並把回合重設為第 1 回合。
- 隊伍描述：顯示 `team.description`。
- 隊員卡：顯示隊員立繪或替代頭像、靈感、傷害類型、心相。
- 出牌順序：顯示目前回合的技能卡圖片、技能中文名與箭頭。
- 回合切換：左右按鈕與回合點點都能改變 `round`。
- 戰術筆記：顯示 `roundData.note`。

技能圖片查找邏輯：

```tsx
const skillMap = TEAM_SKILL_MAP[team.team_id] || [];
const charRow = skillMap.find(row => row[0] === card.char);
const skillImg = charRow?.[card.spellIdx ?? 1];
```

這代表 Supabase 的隊伍資料需要提供 `team_id`，且值要能對應 `TEAM_SKILL_MAP` 的 key，例如 `poison`、`fire`、`physical`。每張出牌資料的 `char` 也必須和 `TEAM_SKILL_MAP` 裡的角色名稱完全一致，否則找不到技能圖。

## 15. `App`：首頁根元件與版面切換

```tsx
export default function App() {
  const [page, setPage] = useState("characters");
  const [isMobile, setIsMobile] = useState(false);
}
```

`App` 是 `app/page.tsx` 的 default export，因此它是 `/` 路由實際渲染的主元件。

`page` 控制目前顯示哪個頁面：

- `"characters"`：角色介紹。
- `"teams"`：配隊推薦。

`isMobile` 控制版面是桌面側欄還是手機底部導覽列。

螢幕寬度監聽：

```tsx
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);
```

這段在瀏覽器端檢查 `window.innerWidth` 是否小於 `768`。小於時使用手機版配置，大於等於時使用桌面版配置。清理函式會移除 resize listener，避免元件卸載後仍保留事件監聽。

導覽資料：

```tsx
const navItems = [
  { id: "characters", label: "角色介紹", icon: "👤" },
  { id: "teams", label: "配隊推薦", icon: "⚔" },
];
```

這個陣列同時給桌面側邊欄與手機底部導覽列使用，避免兩邊重複寫頁籤資料。

整體版面：

- 最外層容器設定深色背景、文字顏色、字體與 flex 方向。
- 桌面版顯示左側 `aside`，固定寬度 220px，並使用 sticky 讓側欄保持在視窗內。
- 手機版不顯示側欄，改在內容上方顯示小標題，底部顯示固定導覽列。
- 中央 `main` 根據 `page` 決定渲染 `<CharactersPage />` 或 `<TeamPage />`。

## 16. 資料流總結

整個頁面的資料流可以理解成：

```txt
App
├─ page 狀態決定目前顯示角色頁或隊伍頁
├─ isMobile 狀態決定桌面側欄或手機底部導覽
├─ CharactersPage
│  ├─ 從 Supabase characters 表讀資料
│  ├─ 用 filters 篩選角色
│  ├─ 點角色後把 selected 設成該角色
│  └─ selected 有值時顯示 CharacterPanel
└─ TeamPage
   ├─ 從 Supabase teams 表讀資料
   ├─ activeTeam 決定目前隊伍
   ├─ round 決定目前回合
   └─ 用 TEAM_SKILL_MAP 補出回合技能圖片
```

## 17. 目前需要注意的地方

這份說明只描述目前程式邏輯，以下是閱讀時值得留意的資料一致性問題：

- `TEAM_LIST` 與 `CHARACTERS` 是本地靜態資料，但目前畫面實際讀 Supabase，因此它們不會直接出現在畫面上。
- 本地角色資料使用 `damage`，但畫面多處讀取 `damage_type`。如果 Supabase 欄位是 `damage_type` 就沒問題；若改用本地資料，傷害標籤會拿不到值。
- 本地隊伍資料使用 `id` 與 `desc`，但 `TeamPage` 讀的是 `team.team_id` 與 `team.description`。這代表 Supabase schema 和本地靜態資料命名不同。
- `Section` 被呼叫時有一處沒有給 `title`，會渲染空標題。
- `SpellTypeTag` 有 `#ultimate` 顏色設定，但 `SPELL_TYPES` 常數目前沒有實際驅動畫面。

## 18. 一句話理解

`app/page.tsx` 是一個深色風格的《重返未來：1999》攻略首頁：前端從 Supabase 讀角色與配隊資料，使用 React state 做篩選、頁籤、彈窗與回合切換，再用一組本地常數補上顏色、標籤與技能圖片對照。
