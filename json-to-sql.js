// json-to-sql.js
// 使用方式：node json-to-sql.js 你的檔案.json
// 輸出：對應的 Supabase SQL INSERT 語句，直接複製貼到 SQL Editor 執行

const fs = require("fs");
const path = require("path");

// ── 讀取檔案 ──────────────────────────────────────────────
const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ 請指定 JSON 檔案路徑");
  console.error("   用法：node json-to-sql.js template_character.json");
  process.exit(1);
}

const fullPath = path.resolve(filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ 找不到檔案：${fullPath}`);
  process.exit(1);
}

let data;
try {
  const raw = fs.readFileSync(fullPath, "utf8");
  data = JSON.parse(raw);
} catch (e) {
  console.error("❌ JSON 格式錯誤：", e.message);
  process.exit(1);
}

// ── 工具函式 ──────────────────────────────────────────────
function toJsonb(obj) {
  return `'${JSON.stringify(obj, null, 2).replace(/'/g, "''")}'::jsonb`;
}

function validate(data, requiredFields) {
  const missing = requiredFields.filter((f) => data[f] === undefined || data[f] === null || data[f] === "");
  if (missing.length > 0) {
    console.error(`❌ 缺少必填欄位：${missing.join(", ")}`);
    process.exit(1);
  }
}

// ── 角色 SQL 產生 ─────────────────────────────────────────
function generateCharacterSQL(d) {
  validate(d, ["name", "star", "insight", "role", "damage_type", "tags", "psycubes", "resonance", "spells", "ritual"]);

  // 驗證星級
  if (![2, 3, 4, 5, 6].includes(d.star)) {
    console.error(`❌ star 必須是 2~6，目前是：${d.star}`);
    process.exit(1);
  }

  // 驗證靈感
  const validInsights = ["獸", "木", "星", "岩", "靈", "智"];
  if (!validInsights.includes(d.insight)) {
    console.error(`❌ insight 必須是：${validInsights.join("、")}，目前是：${d.insight}`);
    process.exit(1);
  }

  // 驗證職業
  const validRoles = ["輸出", "輔助", "治療"];
  if (!validRoles.includes(d.role)) {
    console.error(`❌ role 必須是：${validRoles.join("、")}，目前是：${d.role}`);
    process.exit(1);
  }

  // 驗證心相數量
  if (!Array.isArray(d.psycubes) || d.psycubes.length !== 2) {
    console.error(`❌ psycubes 必須是 2 個，目前是：${d.psycubes?.length ?? 0} 個`);
    process.exit(1);
  }

  // 驗證神秘術數量
  if (!Array.isArray(d.spells) || d.spells.length !== 2) {
    console.error(`❌ spells 必須是 2 個，目前是：${d.spells?.length ?? 0} 個`);
    process.exit(1);
  }

  // 驗證神秘術描述（每個 desc 應為 3 階段陣列）
  d.spells.forEach((s, i) => {
    if (!Array.isArray(s.desc) || s.desc.length !== 3) {
      console.error(`❌ spells[${i}].desc 必須是 3 個階段的陣列，目前是：${JSON.stringify(s.desc)}`);
      process.exit(1);
    }
  });

  const imgField = d.img ? `, img` : "";
  const imgValue = d.img ? `,\n  '${d.img}'` : "";
  const tagsArray = `ARRAY[${d.tags.map((t) => `'${t}'`).join(", ")}]`;

  return `-- ✦ 角色：${d.name}
INSERT INTO characters (name, star, insight, role, damage_type${imgField}, tags, psycubes, resonance, spells, ritual)
VALUES (
  '${d.name}', ${d.star}, '${d.insight}', '${d.role}', '${d.damage_type}'${imgValue},
  ${tagsArray},
  ${toJsonb(d.psycubes)},
  ${toJsonb(d.resonance)},
  ${toJsonb(d.spells)},
  ${toJsonb(d.ritual)}
);`;
}

// ── 配隊 SQL 產生 ─────────────────────────────────────────
function generateTeamSQL(d) {
  validate(d, ["team_id", "name", "description", "members", "rounds"]);

  // 驗證成員數量
  if (!Array.isArray(d.members) || d.members.length !== 4) {
    console.error(`❌ members 必須是 4 位，目前是：${d.members?.length ?? 0} 位`);
    process.exit(1);
  }

  // 驗證回合數量
  if (!Array.isArray(d.rounds) || d.rounds.length === 0) {
    console.error(`❌ rounds 不能為空`);
    process.exit(1);
  }

  // 驗證每個回合
  d.rounds.forEach((r, i) => {
    if (!r.cards || r.cards.length === 0) {
      console.error(`❌ rounds[${i}].cards 不能為空`);
      process.exit(1);
    }
    if (!r.note) {
      console.error(`❌ rounds[${i}].note 不能為空`);
      process.exit(1);
    }
  });

  return `-- ✦ 配隊：${d.name}
INSERT INTO teams (team_id, name, description, members, rounds)
VALUES (
  '${d.team_id}',
  '${d.name}',
  '${d.description.replace(/'/g, "''")}',
  ${toJsonb(d.members)},
  ${toJsonb(d.rounds)}
);`;
}

// ── 主流程 ────────────────────────────────────────────────
let sql = "";

if (data.type === "character") {
  console.log(`\n✅ 偵測到角色資料：${data.name}`);
  sql = generateCharacterSQL(data);
} else if (data.type === "team") {
  console.log(`\n✅ 偵測到配隊資料：${data.name}`);
  sql = generateTeamSQL(data);
} else {
  console.error(`❌ 未知的 type：${data.type}，必須是 "character" 或 "team"`);
  process.exit(1);
}

// ── 輸出結果 ──────────────────────────────────────────────
const outputFileName = path.basename(filePath, ".json") + "_output.sql";
const outputPath = path.join(path.dirname(fullPath), outputFileName);

fs.writeFileSync(outputPath, sql, "utf8");

console.log(`\n📄 SQL 已輸出到：${outputFileName}`);
console.log(`\n${"─".repeat(60)}`);
console.log(sql);
console.log(`${"─".repeat(60)}\n`);
console.log(`📋 複製上方 SQL，貼到 Supabase SQL Editor 執行即可。\n`);
