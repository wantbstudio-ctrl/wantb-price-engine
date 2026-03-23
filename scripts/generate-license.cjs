const fs = require("fs");
const path = require("path");

const TOTAL_CODES = 3000;
const PREFIX = "WW";
const MIN_NUMBER = 10000;
const MAX_NUMBER = 99999;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function generateCode() {
  const number = randomInt(MIN_NUMBER, MAX_NUMBER);
  const letter = randomLetter();
  return `${PREFIX}${number}${letter}`;
}

function generateUniqueCodes(total) {
  const set = new Set();

  while (set.size < total) {
    set.add(generateCode());
  }

  return Array.from(set);
}

function buildCodeObjects(codes) {
  return codes.map((code, index) => ({
    no: index + 1,
    code,
    status: "unused",
    assignedTo: "",
    assignedAt: "",
    usedAt: "",
    note: "",
  }));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function saveCsv(filePath, items) {
  const header = [
    "no",
    "code",
    "status",
    "assignedTo",
    "assignedAt",
    "usedAt",
    "note",
  ];

  const rows = items.map((item) =>
    [
      item.no,
      item.code,
      item.status,
      item.assignedTo,
      item.assignedAt,
      item.usedAt,
      item.note,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  fs.writeFileSync(filePath, csv, "utf-8");
}

function main() {
  const codes = generateUniqueCodes(TOTAL_CODES);
  const codeObjects = buildCodeObjects(codes);

  const outputDir = path.join(__dirname, "../license-data");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, "license-codes.json");
  const csvPath = path.join(outputDir, "license-codes.csv");
  const txtPath = path.join(outputDir, "license-codes.txt");

  saveJson(jsonPath, codeObjects);
  saveCsv(csvPath, codeObjects);
  fs.writeFileSync(txtPath, codes.join("\n"), "utf-8");

  console.log("라이센스 코드 생성 완료");
  console.log(`총 생성 수량: ${TOTAL_CODES}개`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV : ${csvPath}`);
  console.log(`TXT : ${txtPath}`);
  console.log("");
  console.log("샘플 코드 10개:");
  console.log(codes.slice(0, 10).join("\n"));
}

main();