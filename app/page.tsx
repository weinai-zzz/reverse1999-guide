'use client'
import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

type Psycube = {
  name: string;
  img?: string | null;
  desc?: string;
};

type SpellContent = {
  img?: string | null;
  desc?: string | string[];
};

type Spell = {
  name: string;
  img?: string | null;
  desc?: string | string[];
  initial?: SpellContent;
  sublimation?: SpellContent | null;
  types: string[];
};

type Ritual = {
  name: string;
  img?: string | null;
  desc?: string;
  initial?: { desc: string };
  sublimation?: { img?: string | null; desc: string } | null;
  types: string[];
};

type Character = {
  id: number | string;
  name: string;
  star: number;
  insight: string;
  role: string;
  damage_type?: string;
  tags: string[];
  psycubes: Psycube[];
  resonance: {
    img?: string | null;
    desc: string;
    resonance_code?: string | null; // 👈 新增
  };
  spells: Spell[];
  ritual: Ritual;
  img?: string | null;
  bio?: string | null;
};

type TeamCard = {
  char: string;
  skill?: string;
  skillZh: string;
  spellIdx?: number;
  img?: string | null;
};

type TeamRound = {
  round: number;
  cards: TeamCard[];
  note: string;
};

type TeamMember = {
  name: string;
  insight: string;
  damage_type?: string;
  img?: string | null;
  psycubes: Psycube[];
};

type Team = {
  id: number | string;
  team_id: string;
  name: string;
  description: string;
  members: TeamMember[];
  rounds: TeamRound[];
};

type Filters = {
  stars: Array<number | string>;
  insights: Array<number | string>;
  roles: Array<number | string>;
};

const STAR_OPTIONS = [2, 3, 4, 5, 6];
const INSIGHT_OPTIONS = ["獸", "木", "星", "岩", "靈", "智"];
const ROLE_OPTIONS = ["輸出", "輔助", "治療"];
const SPELL_TYPES = ["#Attack", "#Health", "#Buff", "#Debuff", "#Counter","#ultimate"];
const FUNCTION_TAGS = ["電能", "儀式", "啟示", "護盾", "毒霧", "火焰", "物理"];
const DAMAGE = ["現實創傷", "精神創傷"];

const INSIGHT_COLORS: Record<string, string> = {
  獸: "#c2665a", 木: "#64af67", 星: "#84a9d4",
  岩: "#daa76e", 靈: "#deb4f8", 智: "#fcff52",
};
const ROLE_COLORS: Record<string, string> = { 輸出: "#da2525", 輔助: "#8b6432", 治療: "#1B5E20" };
const DAMAGE_COLORS: Record<string, { color: string; bg: string }> = {
  "現實創傷": { color: "#e98854", bg: "#E6510022" },
  "精神創傷": { color: "#a1bad6", bg: "#1565C022" },
};

const Avatar = ({ name, size = 48, insight }: { name: string; size?: number; insight: string }) => {
  const colors: Record<string, string> = { 獸: "#ff5741", 木: "#388E3C", 星: "#1976D2", 岩: "#d1852e", 靈: "#7B1FA2", 智: "#b68d06" };
  const bg = colors[insight] || "#333";
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)", fontSize: size * 0.32, fontWeight: 700, color: "#fff", letterSpacing: "-1px", fontFamily: "serif" }}>
      {name.slice(0, 2)}
    </div>
  );
};

const Tag = ({ label, color = "#333", bg = "#f0f0f0", small }: { label?: string | number; color?: string; bg?: string; small?: boolean }) => (
  <span style={{ padding: small ? "1px 6px" : "2px 8px", borderRadius: 4, background: bg, color, fontSize: small ? 10 : 11, fontWeight: 600, border: `1px solid ${color}22`, whiteSpace: "nowrap" }}>{label}</span>
);

const DamageTag = ({ damage, small }: { damage?: string; small?: boolean }) => {
  const label = damage || "未知創傷";
  const style = DAMAGE_COLORS[label] || { color: "#888", bg: "#1e1e1e" };
  return (
    <Tag label={label} color={style.color} bg={style.bg} small={small} />
  );
};

const StarDisplay = ({ count }: { count: number }) => (
  <span style={{ color: "#FFB300", fontSize: 12, letterSpacing: 1 }}>{"✦".repeat(count)}</span>
);

const SpellTypeTag = ({ type }: { type: string }) => {
  const colors: Record<string, [string, string]> = { "#Attack": ["#B71C1C", "#FFEBEE"], "#Health": ["#1B5E20", "#E8F5E9"], "#Buff": ["#1565C0", "#E3F2FD"], "#Debuff": ["#4A148C", "#F3E5F5"], "#Counter": ["#E65100", "#FFF3E0"] , "#ultimate": ["#E65100", "#FFF3E0"]};
  const [c, bg] = colors[type] || ["#555", "#eee"];
  return <Tag label={`${type} `} color={c} bg={bg} small />;
};

const ImagePlaceholder = ({ label, w = "100%", h = 80, src }: { label: string; w?: number | string; h?: number | string; src?: string | null }) => (
  src
    ? <img src={src} alt={label} style={{ width: w, height: h, borderRadius: 6, objectFit: "contain", flexShrink: 0 }} />
    : <div style={{
        width: w, height: h,
        background: "linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)",
        borderRadius: 6, border: "1px dashed #444",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <span style={{ color: "#555", fontSize: 11 }}>{label}</span>
      </div>
);

{/* 角色介紹頁 */}
function CharacterPanel({ char, onClose }: { char: Character; onClose: () => void }) {
  // 新增這行
  const [spellMode, setSpellMode] = useState("initial");

  // 每張神秘術卡片的階段 (1/2/3)，key 為 spell index，預設 1 階
    const [spellLevels, setSpellLevels] = useState<Record<number, number>>({});

  // 判斷這個角色是否有任何昇華內容
  const hasSublimation =
    char.spells?.some((s) => s.sublimation) ||
    char.ritual?.sublimation;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <div className="no-scrollbar" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          <ImagePlaceholder label="角色立繪" src={char.img} w={120} h={160} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>{char.name}</h2>
              <StarDisplay count={char.star} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <Tag label={char.insight + "系"} color={INSIGHT_COLORS[char.insight]} bg={INSIGHT_COLORS[char.insight] + "22"} />
              <Tag label={char.role} color={ROLE_COLORS[char.role]} bg={ROLE_COLORS[char.role] + "22"} />
              <DamageTag damage={char.damage_type} />
            </div>
            {/* tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {char.tags.map(t => <Tag key={t} label={t} color="#aaa" bg="#222" />)}
            </div>
            {/* 新增：角色簡介 */}
            {char.bio && (
              <p style={{
                margin: "12px 0 0",
                fontSize: 12,
                color: "#888",
                lineHeight: 1.8,
                borderLeft: "2px solid #333",
                paddingLeft: 10,
              }}>
                {char.bio}
              </p>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: "#222", marginBottom: 20 }} />

        {/* Psycubes */}
        <Section title="心相推薦" >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {char.psycubes.map((p, i) => (
              <div key={i} style={{ background: "#1a1a1a", borderRadius: 8, padding: 12, border: "1px solid #2a2a2a" }}>
                <ImagePlaceholder label="心相圖" src={p.img || null} w={120} h={120} />
                <p style={{ margin: "8px 0 4px", fontWeight: 600, color: "#ddd", fontSize: 13 }}>{p.name}</p>
                <p style={{ margin: 0, color: "#888", fontSize: 12, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Resonance */}
        <Section title="共鳴擺法">
          <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12, border: "1px solid #2a2a2a", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <ImagePlaceholder label="共鳴圖" src={char.resonance.img || null} w={120} h={120} />
            <div style={{ display: "grid", alignItems: "center", flex: "1 1 180px", minWidth: 0 }}>
              <p style={{ margin: 0, color: "#7ec88a",fontSize: 13, lineHeight: 1.8, overflowWrap: "anywhere", wordBreak: "break-word" }}>{char.resonance.resonance_code}</p>
              <p style={{ margin: 0, color: "#aaa", fontSize: 13, lineHeight: 1.8, overflowWrap: "anywhere", wordBreak: "break-word" }}>{char.resonance.desc}</p>
            </div>
          </div>
        </Section>

        {/* Spells */}
        <Section >
          {/* 神秘術 + 初始/昇華按鈕 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
            神秘術
          </h3>
          {hasSublimation && (
            <div style={{ display: "flex", gap: 4 }}>
              {["initial", "sublimation"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSpellMode(mode)}
                  style={{
                    padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${spellMode === mode ? "#fff" : "#444"}`,
                    background: spellMode === mode ? "#fff" : "transparent",
                    color: spellMode === mode ? "#000" : "#666",
                  }}
                >
                  {mode === "initial" ? "初始" : "昇華"}
                </button>
              ))}
            </div>
          )}
        </div>
          {char.spells.map((s, i) => {
          // 依模式取對應資料，昇華沒有就 fallback 回 initial
          const modeData = spellMode === "sublimation" && s.sublimation
            ? s.sublimation
            : s.initial || s;  // 相容舊資料格式
          const modeImg = (spellMode === "sublimation" && s.sublimation?.img)
            ? s.sublimation.img
            : s.img;

            // 此卡片的階段描述陣列
            const descArr = Array.isArray(modeData.desc) ? modeData.desc : [modeData.desc];
            const totalLevels = descArr.length;
            const currentLevel = spellLevels[i] ?? 1; // 預設第 1 階
            const displayDesc = descArr[currentLevel - 1];


          return (
            <div key={i} style={{ background: "#1a1a1a", borderRadius: 8, padding: 12, marginBottom: 10, border: `1px solid ${spellMode === "sublimation" && s.sublimation ? "#4A148C44" : "#2a2a2a"}` }}>
              {/* 上方：圖片區 + 右側說明 */}
              <div style={{ display: "flex", gap: 12 }}>
                {/* 左側：圖片 + 名稱 + tag */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <ImagePlaceholder label="技能圖" src={modeImg} w={70} h={100} />
                  <p style={{ margin: 0, fontWeight: 600, color: "#ddd", fontSize: 14, textAlign: "center" }}>
                    {s.name}
                    {spellMode === "sublimation" && s.sublimation && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: "#9C27B0", fontWeight: 700 }}>✦</span>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                    {s.types.map((t) => <SpellTypeTag key={t} type={t} />)}
                  </div>
                </div>

                {/* 右側：階段按鈕 + 說明 */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                  {/* 1/2/3 階按鈕（只有多階時才顯示） */}
                  {totalLevels > 1 && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {Array.from({ length: totalLevels }, (_, li) => {
                        const lv = li + 1;
                        const active = currentLevel === lv;
                        const stars = ["✦", "✦✦", "✦✦✦"][li];
                        return (
                          <button
                            key={lv}
                            onClick={() => setSpellLevels(prev => ({ ...prev, [i]: lv }))}
                            style={{
                              padding: "2px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                              cursor: "pointer", transition: "all 0.15s",
                              border: `1px solid ${active ? "#FFB300" : "#333"}`,
                              background: active ? "#FFB30022" : "transparent",
                              color: active ? "#FFB300" : "#555",
                            }}
                          >
                            {stars}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* 當前階段說明 */}
                  <p style={{ margin: 0, color: "#888", fontSize: 13, lineHeight: 1.6 }}>{displayDesc}</p>
                </div>


              </div>
            </div>
          );
        })}
        </Section>

        {/* Ritual */}
        <Section title="至終儀式">
          {(() => {
            const ritualData = spellMode === "sublimation" && char.ritual.sublimation
              ? char.ritual.sublimation
              : char.ritual.initial || char.ritual;

            const ritualImg = spellMode === "sublimation" && char.ritual.sublimation?.img
              ? char.ritual.sublimation.img
              : char.ritual.img;

           return (
            <div style={{ background: "linear-gradient(135deg,#1a1200 0%,#1a1a1a 100%)", borderRadius: 8, padding: 12, border: `1px solid ${spellMode === "sublimation" && char.ritual.sublimation ? "#9C27B0" : "#444"}` }}>
              {/* 上方：圖片區 + 右側說明 */}
              <div style={{ display: "flex", gap: 8 }}>
                {/* 左側：圖片 + 名稱 + tag */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <ImagePlaceholder label="儀式圖" src={ritualImg} w={60} h={100} />
                  <p style={{ margin: 0, fontWeight: 700, color: "#FFB300", fontSize: 14, textAlign: "center" }}>
                    {char.ritual.name}
                    {spellMode === "sublimation" && char.ritual.sublimation && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: "#9C27B0", fontWeight: 700 }}>✦</span>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                    {char.ritual.types.map((t) => <SpellTypeTag key={t} type={t} />)}
                  </div>
                </div>
                {/* 右側：說明 */}
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <p style={{ margin: 0, color: "#aaa", fontSize: 13, lineHeight: 1.8 }}>{ritualData.desc}</p>
                </div>
              </div>
            </div>
          );
          })()}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, margin: "0 0 10px" }}>{title}</h3>
      {children}
    </div>
  );
}

function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ stars: [], insights: [], roles: [] });
  const [selected, setSelected] = useState<Character | null>(null);

  useEffect(() => {
    async function fetchCharacters() {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('star', { ascending: false });
      if (!error && data) setCharacters(data as Character[]);
      setLoading(false);
    }
    fetchCharacters();
  }, []);

  const toggle = (key: keyof Filters, val: number | string) => {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
    }));
  };

  const filtered = characters.filter(c =>
    (filters.stars.length === 0 || filters.stars.includes(c.star)) &&
    (filters.insights.length === 0 || filters.insights.includes(c.insight)) &&
    (filters.roles.length === 0 || filters.roles.includes(c.role))
  );

  const FilterBtn = ({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) => (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 4, border: `1px solid ${active ? (color || "#fff") : "#333"}`,
      background: active ? (color ? color + "22" : "#222") : "transparent",
      color: active ? (color || "#fff") : "#666", cursor: "pointer", fontSize: 12, fontWeight: 600,
      transition: "all 0.15s"
    }}>{label}</button>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
        <FilterRow label="星級">
          {STAR_OPTIONS.map(s => (
            <FilterBtn key={s} active={filters.stars.includes(s)} onClick={() => toggle("stars", s)} label={`${s}★`} color="#FFB300" />
          ))}
        </FilterRow>
        <FilterRow label="靈感">
          {INSIGHT_OPTIONS.map(i => (
            <FilterBtn key={i} active={filters.insights.includes(i)} onClick={() => toggle("insights", i)} label={i} color={INSIGHT_COLORS[i]} />
          ))}
        </FilterRow>
        <FilterRow label="職業">
          {ROLE_OPTIONS.map(r => (
            <FilterBtn key={r} active={filters.roles.includes(r)} onClick={() => toggle("roles", r)} label={r} color={ROLE_COLORS[r]} />
          ))}
        </FilterRow>
      </div>

      {/* Character Grid */}
      {loading ? (
  <p style={{ color: "#555", fontSize: 14 }}>載入中...</p>
) : (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
    {filtered.map(char => (
    <div key={char.id} style={{ cursor: "pointer" }} onClick={() => setSelected(char)}>
    {/* 圖片卡片 */}
    <div style={{
      position: "relative", borderRadius: 10, overflow: "hidden",
      transition: "transform 0.15s", aspectRatio: "3/4", background: "#1a1a1a",
      border: "1px solid #2a2a2a",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
    >
      {/* 立繪圖片 */}
      {char.img
        ? (
          <img
            src={char.img}
            alt={char.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Avatar name={char.name} size={64} insight={char.insight} />
          </div>
        )
      }
      {/* 底部漸層：名稱 + 屬性 tag */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        padding: "28px 8px 8px",
      }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#fff", fontSize: 16 }}>{char.name}</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <Tag label={char.insight} color={INSIGHT_COLORS[char.insight]} bg={INSIGHT_COLORS[char.insight] + "33"} small />
          <Tag label={char.role} color={ROLE_COLORS[char.role]} bg={ROLE_COLORS[char.role] + "33"} small />
        </div>
      </div>
      {/* 右上角靈感 icon */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        width: 24, height: 24, borderRadius: "50%",
        background: INSIGHT_COLORS[char.insight] + "cc",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#fff",
      }}>
        {char.insight}
      </div>
    </div>
  </div>

    ))}
    {filtered.length === 0 && (
      <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#555" }}>
        <p style={{ margin: 0, fontSize: 14 }}>無符合條件的角色</p>
      </div>
    )}
  </div>
)}
      {selected && <CharacterPanel char={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", minWidth: 28, textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}
{/* 隊伍推薦頁 */}
function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    async function fetchTeams() {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('id');
      if (!error && data) setTeams(data as Team[]);
      setLoading(false);
    }
    fetchTeams();
  }, []);

  if (loading) return <p style={{ color: "#555", fontSize: 14 }}>載入中...</p>;
  if (teams.length === 0) return <p style={{ color: "#555", fontSize: 14 }}>暫無配隊資料</p>;

  const team = teams[activeTeam];
  const roundData = team.rounds[round];

  return (
    <div>
      {/* Team Selector 隊伍選擇器 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {teams.map((t, i) => (
          <button key={t.id} onClick={() => { setActiveTeam(i); setRound(0); }} style={{
            padding: "10px 18px", borderRadius: 8, border: `1px solid ${activeTeam === i ? "#fff" : "#333"}`,
            background: activeTeam === i ? "#fff" : "transparent",
            color: activeTeam === i ? "#000" : "#888", cursor: "pointer",
            fontWeight: activeTeam === i ? 700 : 400, fontSize: 13, transition: "all 0.15s"
          }}>{t.name}</button>
        ))}
      </div>

      {/* Team Desc 隊伍詳細資訊*/}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>{team.description}</p>
      </div>

      {/* Member Cards 人物卡片*/}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 20 , textAlign: "center"}}>
        {team.members.map((m, i) => (
    <div key={i} style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* 立繪圖片 */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 8, overflow: "hidden", background: "#1a1a1a", marginBottom: 10 }}>
        {m.img
          ? (
            <img
              src={m.img}
              alt={m.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Avatar name={m.name} size={52} insight={m.insight} />
            </div>
          )
        }
        {/* 底部漸層 */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          padding: "20px 6px 6px",
          display: "flex", gap: 3, flexWrap: "wrap",
        }}>
          <Tag label={m.insight} color={INSIGHT_COLORS[m.insight]} bg={INSIGHT_COLORS[m.insight] + "33"} small />
          <DamageTag damage={m.damage_type} small />
        </div>
      </div>

      {/* 名稱 */}
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#e0e0e0", fontSize: 14, textAlign: "center" }}>{m.name}</p>

      {/* 心相 */}
      <div style={{ height: 1, background: "#222", width: "100%", margin: "0 0 8px" }} />
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {m.psycubes.map((p, j) => (
          <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <ImagePlaceholder label="" src={p.img || null} w={80} h={80} />
            <span style={{ fontSize: 10, color: "#aaa", textAlign: "center" }}>{p.name}</span>
          </div>
        ))}
      </div>

    </div>
  ))}
      </div>

      {/* Round Guide  8回合滾動式出牌表*/}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 700 }}>出牌順序 — 第 {round + 1} 回合</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setRound(r => Math.max(0, r - 1))} disabled={round === 0} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #333", background: "transparent", color: round === 0 ? "#444" : "#fff", cursor: round === 0 ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <span style={{ fontSize: 12, color: "#666" }}>{round + 1} / {team.rounds.length}</span>
            <button onClick={() => setRound(r => Math.min(team.rounds.length - 1, r + 1))} disabled={round === team.rounds.length - 1} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #333", background: "transparent", color: round === team.rounds.length - 1 ? "#444" : "#fff", cursor: round === team.rounds.length - 1 ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>

        {/* Round dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {team.rounds.map((_, i) => (
            <button key={i} onClick={() => setRound(i)} style={{ width: 20, height: 6, borderRadius: 3, border: "none", background: i === round ? "#fff" : "#333", cursor: "pointer", padding: 0, transition: "background 0.15s" }} />
          ))}
        </div>

        {/* Cards row */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {roundData.cards.map((card, i) => {
            // 從 TEAM_SKILL_MAP 找到這張牌對應的技能圖
            const skillImg = card.img;

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {/* 技能圖 */}
                  {skillImg
                    ? (
                      <img
                        src={skillImg}
                        alt={card.skillZh}
                        style={{ width: 70, height: 100, borderRadius: 10, objectFit: "cover", border: "1px solid #2a2a2a" }}
                      />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: 10, background: "#1a1a1a", border: "1px dashed #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#444", fontSize: 10 }}>技能圖</span>
                      </div>
                    )
                  }
                  {/* 技能中文名 */}
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa", fontWeight: 600 }}>{card.skillZh}</p>
                </div>
                {/* 箭頭 */}
                {i < roundData.cards.length - 1 && (
                  <span style={{ color: "#444", fontSize: 16, flexShrink: 0, marginBottom: 20 }}>→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Tactical Note */}
        <div style={{ background: "#0d1117", border: "1px solid #1e2a1e", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "#2e7d32", fontWeight: 700, letterSpacing: "0.06em" }}>⚡ 戰術筆記</p>
          <p style={{ margin: 0, fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{roundData.note}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("characters");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navItems = [
    { id: "characters", label: "角色介紹", icon: "👤" },
    { id: "teams", label: "配隊推薦", icon: "⚔" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif", display: "flex", flexDirection: isMobile ? "column" : "row" }}>
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Sidebar (desktop) */}
      {!isMobile && (
        <aside style={{ width: 220, flexShrink: 0, background: "#0d0d0d", borderRight: "1px solid #1a1a1a", padding: "24px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1a1a1a", marginBottom: 16 }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#555", letterSpacing: "0.15em", fontWeight: 700 }}>REVERSE：1999</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>攻略指南</h1>
          </div>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
              background: page === item.id ? "#1a1a1a" : "transparent",
              border: "none", borderLeft: `3px solid ${page === item.id ? "#fff" : "transparent"}`,
              color: page === item.id ? "#fff" : "#666", cursor: "pointer",
              fontSize: 14, fontWeight: page === item.id ? 700 : 400, textAlign: "left",
              transition: "all 0.15s", width: "100%"
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1a1a1a" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#333", lineHeight: 1.5 }}>資料以遊戲版本為準<br />持續更新中</p>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="no-scrollbar" style={{ flex: 1, padding: isMobile ? "16px 14px 80px" : "28px 32px", overflowY: "auto" }}>
        <div style={{ maxWidth: 860 }}>
          {/* Mobile header */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: "#444", letterSpacing: "0.12em" }}>REVERSE：1999</p>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>攻略指南</h1>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {page === "characters" ? "角色介紹" : "配隊推薦"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
              {page === "characters" ? "篩選並點擊角色卡片查看詳細資訊" : "選擇隊伍類型，查看完整出牌策略"}
            </p>
          </div>

          {page === "characters" ? <CharactersPage /> : <TeamPage />}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d0d0d", borderTop: "1px solid #1a1a1a", display: "flex", zIndex: 100 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              flex: 1, padding: "12px 0 10px", border: "none",
              background: "transparent", color: page === item.id ? "#fff" : "#555",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: page === item.id ? 700 : 400 }}>{item.label}</span>
              {page === item.id && <span style={{ width: 20, height: 2, background: "#fff", borderRadius: 1 }} />}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
