import React, { useState, useMemo, useRef, useEffect } from "react";
import { Heart, Pencil, MinusCircle, ChevronDown, ChevronUp, Upload, Search, X, Plus, CheckCircle2, Sparkles, FileText, ScanLine, Loader2, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";
import { useNavigate } from "react-router-dom";
import './TeacherDashboard.css';
import { clearSession, getSession } from "../../utils/session";
import { clearSavedPortalPage, getSavedPortalPage, savePortalPage } from "../../utils/portalPage";
import { liraAlert, showError, showWarning } from "../../utils/alerts";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function countWords(str) {
  return (str || "").trim().split(/\s+/).filter(Boolean).length;
}

// ---------- OCR a scanned/photographed page (Scan Documents) ----------
async function extractImagePages(file) {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    const cleaned = text.replace(/\s+\n/g, "\n").trim();
    return [
      {
        id: 1,
        text: cleaned || "(No readable text was found in this image. You can type the content in manually.)",
      },
    ];
  } finally {
    await worker.terminate();
  }
}

function removeRepeatedPdfHeader(pageTexts) {
  if (pageTexts.length < 2) return pageTexts;

  const tokenizedPages = pageTexts.map((text) => text.split(/\s+/));
  const shortestLength = Math.min(...tokenizedPages.map((tokens) => tokens.length));
  let sharedTokens = 0;
  while (
    sharedTokens < shortestLength
    && tokenizedPages.every((tokens) => tokens[sharedTokens] === tokenizedPages[0][sharedTokens])
  ) {
    sharedTokens += 1;
  }

  if (sharedTokens < 4) return pageTexts;

  const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerPattern = new RegExp(
    `^${tokenizedPages[0].slice(0, sharedTokens).map(escapePattern).join("\\s+")}\\s*`
  );
  return pageTexts.map((text) => text.replace(headerPattern, "").trim());
}

function parseMultipleChoiceQuestions(text) {
  const questions = [];
  const questionPattern = /(\d+)\.\s+([\s\S]*?)(?=\s+\d+\.\s+|$)/g;
  let questionMatch;

  while ((questionMatch = questionPattern.exec(text)) !== null) {
    const body = questionMatch[2].trim();
    const firstOption = body.search(/\bA\)\s+/);
    if (firstOption < 0) continue;

    const question = body.slice(0, firstOption).trim();
    const optionText = body.slice(firstOption);
    const options = [];
    const optionPattern = /([A-D])\)\s+([\s\S]*?)(?=\s+[A-D]\)\s+|$)/g;
    let optionMatch;
    while ((optionMatch = optionPattern.exec(optionText)) !== null) {
      options.push(optionMatch[2].trim());
    }

    if (question && options.length >= 2) {
      questions.push({
        id: Number(questionMatch[1]),
        question,
        options,
        correct: null,
      });
    }
  }
  return questions;
}

function splitPdfStoryAndQuestions(pageTexts) {
  const cleanedPages = removeRepeatedPdfHeader(pageTexts);
  const markerPattern = /\bQUESTIONS?\b/i;
  const questionStartPage = cleanedPages.findIndex((text) => markerPattern.test(text));

  if (questionStartPage < 0) {
    return {
      pages: cleanedPages.map((text, index) => ({ id: index + 1, text })),
      questions: [],
    };
  }

  const markerMatch = cleanedPages[questionStartPage].match(markerPattern);
  const markerIndex = markerMatch?.index ?? cleanedPages[questionStartPage].length;
  const storyTextSections = [
    ...cleanedPages.slice(0, questionStartPage),
    cleanedPages[questionStartPage].slice(0, markerIndex).trim(),
  ].filter(Boolean);
  storyTextSections[0] = storyTextSections[0]
    .replace(/^[\s\S]*?\bStory by\b[^\n]*(?:\n\s*\n|$)/i, "")
    .trim();
  const storyParagraphs = storyTextSections
    .flatMap((text) => text.split(/\n\s*\n/))
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const questionText = [
    cleanedPages[questionStartPage].slice(markerIndex + (markerMatch?.[0].length ?? 0)),
    ...cleanedPages.slice(questionStartPage + 1),
  ].join(" ");

  return {
    pages: storyParagraphs.map((text, index) => ({ id: index + 1, text })),
    questions: parseMultipleChoiceQuestions(questionText),
  };
}

function extractPdfPageText(content) {
  const lines = [];
  for (const item of content.items) {
    const value = "str" in item ? item.str.trim() : "";
    if (!value || !item.transform) continue;
    const y = item.transform[5];
    const currentLine = lines.at(-1);
    if (currentLine && Math.abs(currentLine.y - y) < 1) {
      currentLine.text = `${currentLine.text} ${value}`.replace(/\s+/g, " ").trim();
    } else {
      lines.push({ y, text: value });
    }
  }

  const ordinaryGaps = lines
    .slice(1)
    .map((line, index) => Math.abs(lines[index].y - line.y))
    .filter((gap) => gap > 1 && gap < 24)
    .sort((a, b) => a - b);
  const lineHeight = ordinaryGaps[Math.floor(ordinaryGaps.length / 2)] || 16;

  return lines.map((line, index) => {
    if (index === lines.length - 1) return line.text;
    const gap = Math.abs(line.y - lines[index + 1].y);
    return `${line.text}${gap > lineHeight * 1.45 ? "\n\n" : " "}`;
  }).join("").trim();
}

async function extractPdfPages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = extractPdfPageText(content);
    pageTexts.push(text || `(No selectable text was found on page ${i} of the PDF — it may be a scanned image. You can type the content in manually.)`);
  }
  return splitPdfStoryAndQuestions(pageTexts);
}

function isPdfFile(file) {
  return Boolean(file) && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
}

function prepareCoverImage(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith("image/")) {
      reject(new Error("Please choose a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 8 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The selected image could not be opened."));
      image.onload = () => {
        const maxWidth = 900;
        const maxHeight = 1080;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const C = {
  cream: "#FBF6EC",
  sidebarTop: "#F9EAE1",
  sidebarBottom: "#F2BEC2",
  cardBg: "#FFFFFF",
  cardBorder: "#F0E6DB",
  text: "#4A4A4A",
  textMuted: "#8C8C86",
  coral: "#E2938C",
  coralDark: "#D97F76",
  activeText: "#BD7A45",
  activePill: "#F6E6DE",
  low: "#EDDB98",
  lowText: "#8A6E1F",
  moderate: "#F3B86B",
  moderateText: "#8A4E17",
  high: "#C54034",
  noData: "#D8D5CE",
  noDataText: "#68645D",
  highRowBg: "#F3D9D4",
  warningBg: "#E9B8AF",
  dropzoneBg: "#CDEEF5",
  dropzoneBorder: "#8FCFE0",
  blueDot: "#8FCFE0",
  easyBorder: "#9FD8E6",
  easyPill: "#CDEEF5",
  easyText: "#2E7791",
  mediumBorder: "#E59778",
  mediumPill: "#FFCAB4",
  mediumText: "#9A4E22",
  hardBorder: "#5F7F62",
  hardPill: "#A8D5BA",
  hardText: "#2E5A38",
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiErrorMessage(response, fallbackMessage) {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText).message || fallbackMessage;
  } catch {
    return `${fallbackMessage} The API returned HTML instead of JSON. Make sure the backend is running at ${API_URL}.`;
  }
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function csvHeaderKey(value) {
  return String(value || "").replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z]/g, "");
}

function learnerToStudent(learner) {
  const [birthYear = "", birthMonth = "", birthDay = ""] = (learner.birthdate || "").split("-");
  return {
    id: learner._id,
    lastName: learner.lastName,
    section: learner.section,
    birthMonth,
    birthDay,
    birthYear,
    wpm: null,
    accuracy: null,
    historyDate: "--",
    hasReadingData: false,
    expanded: false,
  };
}

function riskOf(student) {
  if (student.hasReadingData === false || student.accuracy == null) return "noData";
  if (student.accuracy >= 90) return "low";
  if (student.accuracy >= 70) return "moderate";
  return "high";
}
const riskLabel = { low: "Low Risk", moderate: "Moderate Risk", high: "High Risk", noData: "No Data" };
const riskColor = { low: C.low, moderate: C.moderate, high: C.high, noData: C.noData };
const riskText = { low: C.lowText, moderate: C.moderateText, high: "#FFFFFF", noData: C.noDataText };

function seedFlashcards() {
  const sample = {
    easy: [
      "Pip is a little orange cat. He loves to sleep in the warm sun.",
      "The sun is up. It is a bright day.",
      "I see a red ball. The ball is big.",
      "My dog likes to run and play.",
      "We eat rice for lunch.",
    ],
    medium: [
      "The garden was full of butterflies dancing between the flowers.",
      "Maria packed her bag before the long trip to the province.",
      "The old tree gave shade to the tired travelers.",
      "Every morning, the fisherman rows his boat to the sea.",
      "The children practiced their reading every afternoon.",
    ],
    hard: [
      "Despite the storm, the villagers worked together to rebuild the bridge.",
      "The scientist carefully recorded every observation from the experiment.",
      "Perseverance and patience helped her finally solve the puzzle.",
      "The council debated the proposal long into the evening.",
      "Understanding the story required paying attention to small details.",
    ],
  };
  const rows = [];
  let id = 1;
  ["easy", "medium", "hard"].forEach((cat) => {
    sample[cat].forEach((content, i) => {
      rows.push({ id: id++, title: `Item ${i + 1}`, content, category: cat });
    });
  });
  return rows;
}
const CAT_META = {
  easy: { label: "Easy", border: C.easyBorder, pill: C.easyPill, text: C.easyText, heart: C.easyBorder },
  medium: { label: "Medium", border: C.mediumBorder, pill: C.mediumPill, text: C.mediumText, heart: C.mediumBorder },
  hard: { label: "Hard", border: C.hardBorder, pill: C.hardPill, text: C.hardText, heart: C.hardBorder },
};

function Logo() {
  return (
    <div className="flex items-center">
      <svg
        width="345"
        height="100"
        viewBox="0 0 345 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="70" cy="50" rx="63" ry="47" fill="#F7F3E6" />
        <path
          d="M70 13 C45 12 25 28 25 51 C25 76 42 91 69 91 C78 91 83 88 84 84 L84 32 C82 21 77 15 70 13 Z"
          fill="#9DD8E7"
        />
        <path
          d="M84 32 C89 20 99 14 113 15 C132 16 144 31 143 50 C143 75 126 91 102 91 C94 91 88 89 84 84 Z"
          fill="#F3DE91"
        />
        <path
          d="M84 51 C83 39 82 28 78 22 C75 18 72 16 69 14"
          fill="none"
          stroke="#73A95B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M77 22 C69 21 62 15 61 9 C70 8 78 12 82 18 C82 20 80 22 77 22 Z"
          fill="#75B45F"
        />
        <circle cx="88" cy="10" r="5" fill="#F2B17A" />
        <circle cx="84" cy="17" r="2.2" fill="#F2B17A" />
        <text
          x="118"
          y="65"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="50"
          fontWeight="600"
          letterSpacing="-"
          fill="#4C6949"
        >
          LIRA
        </text>
      </svg>
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center px-5 py-3 rounded-xl mb-2 font-medium transition-colors"
      style={{
        background: active ? C.activePill : "transparent",
        color: active ? C.activeText : C.text,
      }}
    >
      {label}
    </button>
  );
}

function Sidebar({ page, setPage, onLogout }) {
  return (
    <div
      className="w-56 shrink-0 flex flex-col justify-between px-4 py-6"
      style={{
        background: `linear-gradient(180deg, ${C.sidebarTop} 0%, ${C.sidebarBottom} 100%)`,
        minHeight: "100%",
      }}
    >
      <div>
        <div className="mb-8"><Logo /></div>
        <NavItem label="Dashboard" active={page === "dashboard"} onClick={() => setPage("dashboard")} />
        <NavItem label="Students" active={page === "students"} onClick={() => setPage("students")} />
        <NavItem label="Flashcards" active={page === "flashcards"} onClick={() => setPage("flashcards")} />
        <NavItem label="Stories" active={page === "stories"} onClick={() => setPage("stories")} />
      </div>
      <button className="w-full text-center px-5 py-2 font-medium" style={{ color: "#C0504D" }} onClick={onLogout}>
        ↩ Logout
      </button>
    </div>
  );
}

function StatCard({ value, dotColor, label }) {
  return (
    <div className="rounded-2xl px-5 py-4 flex-1" style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold" style={{ color: C.text }}>{value}</span>
        <span className="w-3 h-3 rounded-full inline-block" style={{ background: dotColor }} />
      </div>
      <div className="text-sm mt-1" style={{ color: C.textMuted }}>{label}</div>
    </div>
  );
}

// ---------- Dashboard page ----------
function SectionSelect({ sections, selectedSection, onChange, className = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 font-semibold text-sm transition-colors ${className}`}
        style={{ background: C.coral, color: "#fff" }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedSection}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-2 min-w-full overflow-hidden rounded-2xl py-1 shadow-lg"
          style={{ background: "#FFFFFF", border: `1px solid ${C.cardBorder}` }}
          role="listbox"
        >
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              role="option"
              aria-selected={section === selectedSection}
              onClick={() => { onChange(section); setOpen(false); }}
              className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-[#FBEDEA]"
              style={{ color: section === selectedSection ? C.coralDark : C.text }}
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard({ students, sections, sectionName, onSectionChange, teacherName }) {
  const total = students.length;
  const low = students.filter((s) => riskOf(s) === "low").length;
  const mod = students.filter((s) => riskOf(s) === "moderate").length;
  const high = students.filter((s) => riskOf(s) === "high").length;
  const noData = students.filter((s) => riskOf(s) === "noData").length;

  const chartData = useMemo(() => {
    const groups = Array.from({ length: 10 }, (_, i) => ({
      name: `Surname ${i + 1}`,
      low: 0,
      moderate: 0,
      high: 0,
      noData: 0,
    }));
    students.forEach((s, i) => {
      const g = groups[i % 10];
      const r = riskOf(s);
      g[r] += 1;
    });
    return groups;
  }, [students]);

  const heatmapCells = students.slice(0, 28);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold" style={{ color: C.text }}>Good day, Teacher {teacherName}!</h1>
        <img
          src="/UI_Designs/ANIMALS/mascot_owl.svg"
          alt="Owl"
          className="w-13 h-13 object-contain"
        />
      </div>
      <p className="text-sm mt-1" style={{ color: C.textMuted }}>School Year 2025–2026</p>

      <div
        className="w-full rounded-2xl px-6 py-4 mt-6"
        style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: C.text }}>
            {sections.length} <Heart size={18} fill="#7FAE6C" color="#7FAE6C" />
          </div>
          {sections.length > 0 && <SectionSelect sections={sections} selectedSection={sectionName} onChange={onSectionChange} className="rounded-full px-4 py-2" />}
        </div>
        <div className="text-sm" style={{ color: C.textMuted }}>Total sections — choose one to view its learners.</div>
      </div>

      <div className="flex gap-4 mt-4 flex-wrap">
        <StatCard value={total} dotColor={C.blueDot} label="Total learners" />
        <StatCard value={low} dotColor={C.low} label="Low Risk" />
        <StatCard value={mod} dotColor={C.moderate} label="Moderate Risk" />
        <StatCard value={high} dotColor={C.high} label="High Risk" />
        <StatCard value={noData} dotColor={C.noData} label="No Data" />
      </div>

      <div className="flex gap-4 mt-4 flex-col lg:flex-row">
        <div className="flex-1 rounded-2xl p-5" style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center gap-4 text-xs mb-2" style={{ color: C.textMuted }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.low }} /> Low Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.moderate }} /> Moderate Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.high }} /> High Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.noData }} /> No Data</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="#F0E6DB" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
              <Bar dataKey="low" stackId="a" fill={C.low} radius={[0, 0, 0, 0]} />
              <Bar dataKey="moderate" stackId="a" fill={C.moderate} />
              <Bar dataKey="high" stackId="a" fill={C.high} radius={[4, 4, 0, 0]} />
              <Bar dataKey="noData" stackId="a" fill={C.noData} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 rounded-2xl p-5" style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
          <div className="text-center font-semibold mb-4" style={{ color: C.text }}>Reading Heatmaps - WPM Growth</div>
          <div className="grid grid-cols-7 gap-2">
            {heatmapCells.map((s) => (
              <div
                key={s.id}
                title={`${s.lastName}: ${s.wpm == null ? "No Data" : `${s.wpm} wpm`}`}
                className="aspect-square rounded-lg"
                style={{ background: riskColor[riskOf(s)] }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Modals ----------
function Field({ label, children, required }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1" style={{ color: C.text }}>
        {label} {required && <span style={{ color: C.coralDark }}>*</span>}
      </label>
      {children}
    </div>
  );
}
const selectStyle = { border: `1px solid #D8E8D0`, background: "#F5FAF2" };

function LearnerFormModal({ mode, initial, sectionName, onCancel, onSubmit }) {
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [month, setMonth] = useState(initial?.birthMonth || "");
  const [day, setDay] = useState(initial?.birthDay || "");
  const [year, setYear] = useState(initial?.birthYear || "");

  const clear = () => { setLastName(""); setMonth(""); setDay(""); setYear(""); };
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

  const valid = lastName.trim() && month && day && /^\d{4}$/.test(year);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(60,50,45,0.35)" }}>
      <div className="rounded-3xl p-7 w-[380px]" style={{ background: C.cream }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xl font-bold" style={{ color: C.text }}>
            <img
              src="/UI_Designs/ANIMALS/F_Fox.png"
              alt="Fox"
              className="w-6 h-6 object-contain"
            /> {mode === "add" ? "Add Learner" : "Edit Learner"}
          </div>
          <button onClick={clear} className="text-xs px-3 py-1 rounded-full" style={{ background: C.low, color: C.lowText }}>clear</button>
        </div>

        <Field label="Type your Last Name" required>
          <input
            value={lastName}
            maxLength={50}
            onChange={(e) => {
              const value = e.target.value;
              if (/^[A-Za-zÀ-ÖØ-öø-ÿ' -]*$/.test(value)) {
                setLastName(value);
              }
            }}
            className="w-full rounded-lg px-3 py-2 outline-none"
            style={selectStyle}
          />
        </Field>

        <Field label="Birthdate" required>
          <div className="flex gap-2">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg px-2 py-2" style={selectStyle}>
              <option value="">Month</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="w-full rounded-lg px-2 py-2" style={selectStyle}>
              <option value="">Day</option>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="text"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Year"
              maxLength={4}
              className="w-full rounded-lg px-2 py-2 outline-none"
              style={selectStyle}
              aria-label="Birth year"
            />
          </div>
        </Field>

        <div
          className="mb-5 px-1 text-sm tracking-wide transition-all duration-300 hover:opacity-70"
          style={{ color: C.text }}
        >
          <span className="opacity-50">Section</span>
          <span className="mx-2 opacity-30">/</span>
          <strong className="font-medium">{sectionName}</strong>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 rounded-full py-2 font-medium" style={{ border: `1px solid ${C.cardBorder}`, color: C.text }}>
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => valid && onSubmit({ lastName: lastName.trim(), birthMonth: month, birthDay: day, birthYear: year })}
            className="flex-1 rounded-full py-2 font-semibold text-white"
            style={{ background: valid ? "#EDA751" : "#EAD9BE" }}
          >
            {mode === "add" ? "Add Learner" : "Save Edit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ title = "Remove this learner?", subtitle, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[70]" style={{ background: "rgba(60,50,45,0.35)" }}>
      <div className="rounded-3xl p-8 w-[360px] text-center" style={{ background: "#FFFFFF" }}>
        <div className="flex justify-center mb-3">
          <div className="rounded-full p-3" style={{ background: "#FBEAE8" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C0504D" strokeWidth="2">
              <path d="M3 6h18" strokeLinecap="round" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="text-lg font-bold" style={{ color: C.text }}>{title}</div>
        <div className="text-sm mt-1" style={{ color: C.textMuted }}>{subtitle}</div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 rounded-full py-2 font-medium" style={{ border: `1px solid ${C.cardBorder}`, color: C.text }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-full py-2 font-semibold text-white" style={{ background: "#C0504D" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Students page ----------
function StudentRow({ s, onEdit, onDelete, onToggle }) {
  const risk = riskOf(s);
  const isHigh = risk === "high";
  return (
    <div className="mb-2 rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.cardBorder}` }}>
      <div
        className="grid items-center px-5 py-4 cursor-pointer"
        style={{
          gridTemplateColumns: "1.4fr 0.8fr 0.8fr 1fr 1fr 0.8fr",
          background: isHigh ? C.highRowBg : C.cardBg,
          color: isHigh ? "#FFFFFF" : C.text,
        }}
        onClick={() => onToggle(s.id)}
      >
        <div className="font-semibold">{s.lastName}</div>
        <div className="font-semibold">{s.wpm == null ? "--" : `${s.wpm} wpm`}</div>
        <div className="font-semibold">{s.accuracy == null ? "--" : `${s.accuracy}%`}</div>
        <div>{s.historyDate}</div>
        <div>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: riskColor[risk], color: riskText[risk] }}
          >
            {riskLabel[risk]}
          </span>
        </div>
        <div className="flex items-center gap-3 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit(s)}><Pencil size={16} color={isHigh ? "#fff" : "#666"} /></button>
          <button onClick={() => onDelete(s)}><MinusCircle size={18} color="#C0504D" /></button>
          <button onClick={() => onToggle(s.id)}>
            {s.expanded ? <ChevronUp size={16} color={isHigh ? "#fff" : "#666"} /> : <ChevronDown size={16} color={isHigh ? "#fff" : "#666"} />}
          </button>
        </div>
      </div>
      {s.expanded && (
        <div className="px-5 py-4 text-sm" style={{ background: isHigh ? C.warningBg : "#F7F3EA", color: isHigh ? "#fff" : C.text }}>
          {risk === "noData"
            ? `No reading data has been recorded for ${s.lastName} yet.`
            : isHigh
            ? `Warning! ${s.lastName} is at a high risk for low reading comprehension, currently demonstrating a reading fluency of ${s.wpm} WPM at ${s.accuracy}% accuracy; immediate intervention should focus on targeted phonics review and guided oral reading practice to rebuild foundational decoding skills.`
            : `${s.lastName} is reading at ${s.wpm} WPM with ${s.accuracy}% accuracy, which is within the expected range for this section.`}
        </div>
      )}
    </div>
  );
}

function Students({ students, setStudents, sections, sectionName, onSectionChange, loading, error, onRefresh, currentTeacher }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const fileRef = useRef(null);

  const filtered = students.filter((s) => s.lastName.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id) => setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));

  const saveLearner = async (data, id) => {
    const payload = {
      lastName: data.lastName,
      birthdate: `${data.birthYear}-${data.birthMonth}-${data.birthDay}`,
      section: data.section || sectionName,
    };
    const response = await fetch(`${API_URL}/api/learners${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "X-Teacher-Id": currentTeacher?.id || "" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not save learner."));
    return learnerToStudent(await response.json());
  };

  const addLearner = async (data) => {
    try {
      const lastName = data.lastName?.trim();

      if (!lastName) {
        await showWarning("Please enter the learner's surname.");
        return;
      }

      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(lastName)) {
        await showWarning("Letters, spaces, apostrophes, and hyphens are allowed.", "Please enter a valid surname");
        return;
      }

      const learner = await saveLearner({
        ...data,
        lastName,
      });

      setStudents((prev) => [...prev, learner]);
      setModal(null);
      await liraAlert.fire({
        icon: "success",
        title: "The learner has been added successfully",
        confirmButtonText: "OK"
      });
    } catch (requestError) {
      await showError(requestError.message);
    }
  };

  const editLearner = async (data) => {
    try {
      const learner = await saveLearner(data, modal.student.id);
      setStudents((prev) => prev.map((s) => (s.id === learner.id ? { ...learner, expanded: s.expanded } : s)));
      setModal(null);
      await liraAlert.fire({
        icon: "success",
        title: "The learner has been updated successfully",
        confirmButtonText: "OK"
      });
    } catch (requestError) {
      await showError(requestError.message);
    }
  };

  const deleteLearner = async (student) => {
    const confirmation = await liraAlert.fire({
      icon: "warning",
      title: "Remove this learner?",
      text: `${student.lastName} will be removed from your class roster.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/learners/${student.id}`, {
        method: "DELETE",
        headers: { "X-Teacher-Id": currentTeacher?.id || "" },
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not delete learner."));
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      await liraAlert.fire({
        icon: "success",
        title: "The learner has been successfully deleted",
        confirmButtonText: "OK"
      });
    } catch (requestError) {
      await showError(requestError.message);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      const headers = parseCsvLine(lines[0] || "").map(csvHeaderKey);
      const lastNameColumn = headers.findIndex((header) =>
        ["lastname", "surname", "studentlastname", "learnerlastname"].includes(header)
      );
      const birthdateColumn = headers.findIndex((header) =>
        ["birthdate", "dateofbirth", "dob", "studentbirthdate", "learnerbirthdate"].includes(header)
      );
      const sectionColumn = headers.findIndex((header) =>
        ["section", "sectionname", "classsection", "studentsection", "learnersection"].includes(header)
      );
      const hasHeaders = lastNameColumn >= 0 && birthdateColumn >= 0 && sectionColumn >= 0;
      if (!hasHeaders) {
        const missingHeaders = [];
        if (lastNameColumn < 0) missingHeaders.push("Last Name");
        if (birthdateColumn < 0) missingHeaders.push("Birthdate");
        if (sectionColumn < 0) missingHeaders.push("Section");
        await showWarning(
          `The CSV header is not recognizable. Missing required column${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}. Columns may be in any order, and additional columns are allowed.`,
          "CSV cannot be imported"
        );
        return;
      }
      const columns = { lastName: lastNameColumn, birthdate: birthdateColumn, section: sectionColumn };
      const startIdx = 1;
      const newRows = [];
      const invalidRows = [];
      const duplicateRows = [];
      const csvLearners = new Set();
      for (let i = startIdx; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        const lastName = String(row[columns.lastName] || "").trim();
        const birthdate = String(row[columns.birthdate] || "").trim();
        const section = String(row[columns.section] || "").trim();
        const usesSpaceSeparatedDate = /^\d{1,2}\s+\d{1,2}\s+\d{4}$/.test(birthdate);
        const dateParts = (birthdate || "").split(usesSpaceSeparatedDate ? /\s+/ : /[-/]/).map((part) => part.trim());
        const isIsoDate = /^\d{4}$/.test(dateParts[0]);
        const [by, bm, bd] = isIsoDate
          ? dateParts
          : usesSpaceSeparatedDate
            ? [dateParts[2], dateParts[1], dateParts[0]]
            : [dateParts[2], dateParts[0], dateParts[1]];

        if (!lastName) continue;
        if (!section || !/^\d{4}$/.test(by || "") || !/^\d{1,2}$/.test(bm || "") || !/^\d{1,2}$/.test(bd || "")) {
          invalidRows.push(i + 1);
          continue;
        }
        const normalizedBirthdate = `${by}-${bm.padStart(2, "0")}-${bd.padStart(2, "0")}`;
        const learnerKey = `${lastName.toLowerCase()}|${normalizedBirthdate}|${section.toLowerCase()}`;
        if (csvLearners.has(learnerKey)) {
          duplicateRows.push(i + 1);
          continue;
        }
        csvLearners.add(learnerKey);
        newRows.push({
          lastName,
          birthMonth: bm.padStart(2, "0"),
          birthDay: bd.padStart(2, "0"),
          birthYear: by,
          section,
        });
      }
      const results = await Promise.allSettled(
        newRows.map(({ lastName, birthMonth, birthDay, birthYear, section }) =>
          saveLearner({ lastName, birthMonth, birthDay, birthYear, section }))
      );
      const failed = results.filter((result) => result.status === "rejected");
      const isDuplicateFailure = (result) => /already listed|duplicate key|E11000/i.test(result.reason?.message || "");
      const storedDuplicates = failed.filter(isDuplicateFailure);
      const ownershipFailures = failed.filter((result) => /managed by/i.test(result.reason?.message || ""));
      const otherFailures = failed.filter((result) => !isDuplicateFailure(result) && !/managed by/i.test(result.reason?.message || ""));
      await onRefresh();
      const importedCount = results.length - failed.length;
      const duplicateCount = duplicateRows.length + storedDuplicates.length;
      if (duplicateCount > 0 || invalidRows.length > 0 || ownershipFailures.length > 0 || otherFailures.length > 0) {
        const summary = [`<div><strong>${importedCount}</strong> learner(s) imported</div>`];
        if (duplicateCount > 0) summary.push(`<div><strong>${duplicateCount}</strong> duplicate row(s) skipped</div>`);
        if (invalidRows.length > 0) summary.push(`<div><strong>${invalidRows.length}</strong> invalid row(s) skipped</div>`);
        if (ownershipFailures.length > 0) {
          summary.push(`<div style="margin-top:8px"><strong>Managed by another teacher:</strong></div>`);
          ownershipFailures.forEach((result) => {
            const safeMessage = String(result.reason?.message || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
            summary.push(`<div>• ${safeMessage}</div>`);
          });
        }
        if (otherFailures.length > 0) summary.push(`<div><strong>${otherFailures.length}</strong> row(s) could not be imported</div>`);
        await liraAlert.fire({
          icon: ownershipFailures.length > 0 || otherFailures.length > 0 ? "warning" : "info",
          title: ownershipFailures.length > 0 ? "Section managed by another teacher" : "CSV import complete",
          html: `<div style="display:grid;gap:8px;text-align:left;max-width:300px;margin:0 auto">${summary.join("")}</div>`,
          footer: ownershipFailures.length > 0
            ? "Only the assigned teacher can manage learners in that section."
            : otherFailures.length > 0 ? "Please review the CSV data and try again." : undefined
        });
      }
    };
    reader.readAsText(file);
  };

  const printReport = () => window.print();

  return (
    <div>
      <h1 className="text-3xl font-bold" style={{ color: C.text }}>Manage Students</h1>
      <p className="text-sm mt-1" style={{ color: C.textMuted }}>Your class roster and quick-view reading stats</p>
      {error && <div className="text-sm mt-3" style={{ color: "#C0504D" }}>{error} <button onClick={onRefresh} className="underline">Try again</button></div>}

      <div
        className="mt-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer"
        style={{ background: C.dropzoneBg, borderColor: C.dropzoneBorder }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
      >
        <Upload size={20} color="#4A4A4A" />
        <div className="font-medium mt-2" style={{ color: C.text }}>Drag & Drop your CSV roster here, or click to upload</div>
        <div className="text-xs mt-1" style={{ color: C.textMuted }}>Columns expected: Last Name, Birthdate, Section</div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {sections.length > 0 && <SectionSelect sections={sections} selectedSection={sectionName} onChange={onSectionChange} className="rounded-full px-4 py-2" />}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-full px-4 py-2" style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
          <Search size={16} color={C.textMuted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learners..."
            className="outline-none flex-1 text-sm bg-transparent"
          />
        </div>
        <button onClick={printReport} className="px-5 py-2 rounded-full font-semibold text-white" style={{ background: C.coral }}>
          Print a Report
        </button>

        <button onClick={() => setModal({ type: "add" })} className="px-5 py-2 rounded-full font-semibold" style={{ background: "#fff", border: `1px solid ${C.cardBorder}`, color: C.text }}>
          + Add learner
        </button>
      </div>

      <div className="grid px-5 py-2 mt-5 text-xs font-semibold" style={{ gridTemplateColumns: "1.4fr 0.8fr 0.8fr 1fr 1fr 0.8fr", color: C.textMuted }}>
        <div>Learner</div><div>WPM</div><div>Accuracy</div><div>History</div><div>Risk Level</div><div className="text-right">Actions</div>
      </div>

      {loading && <div className="text-center py-10 text-sm" style={{ color: C.textMuted }}>Loading learners...</div>}
      {!loading && filtered.map((s) => (
        <StudentRow
          key={s.id}
          s={s}
          onEdit={(st) => setModal({ type: "edit", student: st })}
          onDelete={deleteLearner}
          onToggle={toggle}
        />
      ))}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: C.textMuted }}>No learners match your search.</div>
      )}

      {modal?.type === "add" && (
        <LearnerFormModal mode="add" sectionName={sectionName} onCancel={() => setModal(null)} onSubmit={addLearner} />
      )}
      {modal?.type === "edit" && (
        <LearnerFormModal mode="edit" initial={modal.student} sectionName={sectionName} onCancel={() => setModal(null)} onSubmit={editLearner} />
      )}
    </div>
  );
}

// ---------- Add Flashcard modal ----------
function AddFlashcardModal({ onCancel, onSubmit }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("easy");
  const clear = () => { setText(""); setCategory("easy"); };
  
  const words = countWords(text);
  const isOverLimit = words > 250;
  const valid = text.trim().length > 0 && !isOverLimit;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(60,50,45,0.35)" }}
    >
      <div
        className="rounded-3xl p-7 w-[420px]"
        style={{ background: C.cream }}
      >
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex items-center gap-2 text-xl font-bold"
            style={{ color: C.text }}
          >
            <img
              src="/UI_Designs/ANIMALS/I_Pig.png"
              alt="Pig"
              className="w-8 h-8 object-contain"
            />
            Add an item
          </div>

          <button
            onClick={clear}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.low, color: C.lowText }}
          >
            clear
          </button>
        </div>

        <Field label="Type your item" required>
          <textarea
            value={text}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{ background: "#FBE3C0" }}
            placeholder="Type word, phrase, or sentence..."
          />
          <div className="flex justify-between items-center mt-1 text-xs">
            <span style={{ color: isOverLimit ? "#C0504D" : C.textMuted }}>
              {isOverLimit && "Exceeded limit! "}Max 250 words
            </span>
            <span style={{ color: isOverLimit ? "#C0504D" : C.textMuted, fontWeight: isOverLimit ? 700 : 500 }}>
              {words}/250 words
            </span>
          </div>
        </Field>

        <Field label="Category" required>
          <div className="flex gap-3">
            {Object.entries(CAT_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className="flex-1 rounded-lg py-2 font-semibold text-sm text-white"
                style={{
                  background: meta.border,
                  outline: category === key ? `3px solid ${C.text}33` : "none",
                  opacity: category === key ? 1 : 0.55,
                }}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 rounded-full py-2 font-medium" style={{ border: `1px solid ${C.cardBorder}`, color: C.text }}>
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => valid && onSubmit({ title: `Item`, content: text.trim(), category })}
            className="flex-1 rounded-full py-2 font-semibold text-white"
            style={{ background: valid ? "#EDA751" : "#EAD9BE" }}
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Flashcard item chip + expanded detail card ----------
function FlashcardChip({ item, onDragStart, onDropItem, onClick }) {
  const meta = CAT_META[item.category];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(item.id));
        onDragStart(e, item.id);
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove("dragging");
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropItem(e, item.id, item.category);
      }}
      onClick={() => onClick(item.id)}
      className={`flashcard-chip ${item.category}`}
      style={{ background: meta.pill, color: meta.text }}
      title="Click to edit • Drag to move"
    >
      {item.title}
    </div>
  );
}

function FlashcardDetail({ item, onClose, onSave, onDeleteRequest }) {
  const [content, setContent] = useState(item.content);
  const meta = CAT_META[item.category];

  const words = countWords(content);
  const isOverLimit = words > 250;

  return (
    <div
      className="flashcard-detail"
      style={{ background: meta.pill }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flashcard-detail-card"
        style={{ background: "#fff", border: `1px solid ${C.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold" style={{ color: C.text }}>{item.title}</div>
          <button
            onClick={() => setContent("")}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.low, color: C.lowText }}
          >
            clear
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
          style={{ background: "#EFEFEF", color: C.text }}
        />

        <div className="flex justify-between items-center mt-1 text-xs">
          <span style={{ color: isOverLimit ? "#C0504D" : C.textMuted }}>
            {isOverLimit && "Exceeded limit! "}Max 250 words
          </span>
          <span style={{ color: isOverLimit ? "#C0504D" : C.textMuted, fontWeight: isOverLimit ? 700 : 500 }}>
            {words}/250 words
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            className="icon-btn flashcard-action-btn"
            disabled={isOverLimit}
            onClick={() => {
              if (isOverLimit) return;
              onSave(item.id, content);
              onClose();
            }}
            title={isOverLimit ? "Cannot save: exceeds 250 words" : "Save"}
            aria-label="Save flashcard"
            style={{ opacity: isOverLimit ? 0.4 : 1, cursor: isOverLimit ? "not-allowed" : "pointer" }}
          >
            <CheckCircle2 size={22} color="#4FA96A" />
          </button>

          <button
            className="icon-btn flashcard-action-btn"
            onClick={() => onDeleteRequest(item)}
            title="Delete"
            aria-label="Delete flashcard"
          >
            <MinusCircle size={22} color="#C0504D" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FlashcardColumn({
  cat,
  items,
  onDropColumn,
  onDropItem,
  onDragStart,
  onOpen,
  openId,
  onSave,
  onClose,
  onDeleteRequest,
}) {
  const meta = CAT_META[cat];
  const opened = items.find((i) => i.id === openId);

  return (
    <div className="mb-5">
      <div
        className="flex items-center gap-2 text-sm font-semibold mb-2"
        style={{ color: C.text }}
      >
        <Heart size={14} fill={meta.heart} color={meta.heart} />
        {meta.label}
      </div>

      <div
        className={`flashcard-column ${cat}`}
        style={{ background: "#fff", border: `1.5px solid ${meta.border}` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove("drag-over");
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          if (e.target.closest(".flashcard-chip")) return;
          onDropColumn(e, cat);
        }}
      >
        {items.length > 5 && (
          <div
            className="flashcard-overflow-dot"
            title="More than 5 items"
          />
        )}

        {items.length === 0 && (
          <div className="flashcard-empty">
            Drop flashcards here
          </div>
        )}

        {items.map((item) => (
          <FlashcardChip
            key={item.id}
            item={item}
            onDragStart={onDragStart}
            onDropItem={onDropItem}
            onClick={onOpen}
          />
        ))}

        {opened && (
          <FlashcardDetail
            item={opened}
            onClose={onClose}
            onSave={onSave}
            onDeleteRequest={onDeleteRequest}
          />
        )}
      </div>
    </div>
  );
}

function Flashcards() {
  const [items, setItems] = useState(seedFlashcards);
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const onDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    e.currentTarget.classList.add("dragging");
  };

  const onDropColumn = (e, cat) => {
    e.preventDefault();

    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!id) return;

    setItems((prev) => {
      const draggedItem = prev.find((item) => item.id === id);
      if (!draggedItem) return prev;

      const remaining = prev.filter((item) => item.id !== id);
      const movedItem = { ...draggedItem, category: cat };

      let lastIndex = -1;
      remaining.forEach((item, index) => {
        if (item.category === cat) lastIndex = index;
      });

      const result = [...remaining];

      if (lastIndex === -1) {
        result.push(movedItem);
      } else {
        result.splice(lastIndex + 1, 0, movedItem);
      }

      return result;
    });
  };

  const onDropItem = (e, targetId, targetCategory) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = Number(e.dataTransfer.getData("text/plain"));

    if (!draggedId || draggedId === targetId) return;

    setItems((prev) => {
      const draggedItem = prev.find((item) => item.id === draggedId);
      if (!draggedItem) return prev;

      const remaining = prev.filter((item) => item.id !== draggedId);
      const movedItem = { ...draggedItem, category: targetCategory };

      const targetIndex = remaining.findIndex(
        (item) => item.id === targetId
      );

      if (targetIndex === -1) {
        return [...remaining, movedItem];
      }

      const result = [...remaining];
      result.splice(targetIndex, 0, movedItem);
      return result;
    });
  };

  const onSaveContent = (id, content) => {
    if (countWords(content) > 250) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, content } : it))
    );
  };

  const addItem = (data) => {
    if (countWords(data.content) > 250) return;
    setItems((prev) => {
      const countInCat = prev.filter(
        (p) => p.category === data.category
      ).length;

      return [
        ...prev,
        {
          id: Math.max(0, ...prev.map((p) => p.id)) + 1,
          title: `Item ${countInCat + 1}`,
          content: data.content,
          category: data.category,
        },
      ];
    });

    setShowAdd(false);
  };

  const confirmDelete = () => {
    setItems((prev) =>
      prev.filter((it) => it.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    setOpenId(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: C.text }}
          >
            Manage Flashcards
          </h1>

          <p
            className="text-sm mt-1"
            style={{ color: C.textMuted }}
          >
            Drag words between columns to change difficulty.
            <br />
            You can also drag items within a category to reorder them.
            <br />
            Maximum of 5 items per category are recommended (up to 250 words per item).
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-5 py-2 rounded-full font-semibold whitespace-nowrap"
          style={{
            background: "#fff",
            border: `1px solid ${C.cardBorder}`,
            color: C.text,
          }}
        >
          + Add flashcard
        </button>
      </div>

      <div className="mt-6">
        {["easy", "medium", "hard"].map((cat) => (
          <FlashcardColumn
            key={cat}
            cat={cat}
            items={items.filter((i) => i.category === cat)}
            onDropColumn={onDropColumn}
            onDropItem={onDropItem}
            onDragStart={onDragStart}
            onOpen={setOpenId}
            openId={openId}
            onSave={onSaveContent}
            onClose={() => setOpenId(null)}
            onDeleteRequest={setDeleteTarget}
          />
        ))}
      </div>

      {showAdd && (
        <AddFlashcardModal
          onCancel={() => setShowAdd(false)}
          onSubmit={addItem}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Remove this item?"
          subtitle={`${deleteTarget.title} will be removed from your flashcards.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ---------- Story cover card ----------
function StoryCover({ story, canManage, onEdit, onDeleteRequest }) {
  return (
    <div className="relative">
      <div
        className={`relative rounded-xl overflow-hidden flex flex-col justify-between p-3 ${canManage ? "cursor-pointer" : ""}`}
        style={{ background: story.coverImage ? "#000" : story.cover, aspectRatio: "3/3.6", border: "1px solid rgba(0,0,0,0.05)" }}
        onClick={() => canManage && onEdit(story)}
        role={canManage ? "button" : undefined}
        tabIndex={canManage ? 0 : undefined}
        onKeyDown={(e) => { if (canManage && e.key === "Enter") onEdit(story); }}
        aria-label={canManage ? `Open ${story.title}` : undefined}
      >
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt={story.title}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}
        {story.coverImage && (
          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}
          />
        )}
        {!story.coverImage && (
          <div className="relative font-extrabold text-lg leading-tight" style={{ color: story.coverText }}>{story.title}</div>
        )}
        <div className="absolute bottom-3 left-3">
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "#FBE3C0",
              color: "#8A6B2A",
            }}
          >
            {story.questions.filter((q) => q.question).length} Qs
          </span>
        </div>
      </div>
      <div className="text-xs mt-2 truncate" style={{ color: C.textMuted }}>Uploaded by {story.uploadedBy || "Unknown teacher"}</div>
      {canManage && <button
        onClick={(e) => { e.stopPropagation(); onDeleteRequest(story); }}
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
        style={{ background: "#C0504D" }}
        aria-label={`Remove ${story.title}`}
      >
        <MinusCircle size={16} />
      </button>}
      {canManage && <button
        onClick={(e) => { e.stopPropagation(); onEdit(story); }}
        className="absolute top-6 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-white shadow"
        aria-label={`Edit ${story.title}`}
      >
        <Pencil size={12} color="#666" />
      </button>}
    </div>
  );
}

function AddStoryCard({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      className="rounded-xl border-2 border-dashed flex items-center justify-center"
      style={{ aspectRatio: "3/3.6", borderColor: "#D8CFC2", color: "#8C8C86" }}
    >
      <Plus size={28} />
    </button>
  );
}

// ---------- Add a Story modal ----------
const ADD_STORY_METHODS = [
  { key: "pdf", label: "Upload PDF", icon: FileText, iconColor: "#C0504D", accept: "application/pdf" },
  { key: "scan", label: "Scan Documents", icon: ScanLine, iconColor: "#4A4A4A", accept: "image/*" },
  { key: "ai", label: "Generate AI", icon: Sparkles, iconColor: "#8B6DD6", accept: null },
];

function AddStoryModal({ onCancel, onSubmit }) {
  const [method, setMethod] = useState(null);
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [generation, setGeneration] = useState({
    topic: "",
    readingLevel: "Grade 3",
    paragraphCount: 6,
    questionCount: 5,
    moral: "",
  });
  const fileRef = useRef(null);

  const chooseMethod = (m) => {
    setMethod(m.key);
    setFile(null);
    setScanError("");
    if (m.accept) {
      setTimeout(() => fileRef.current?.click(), 0);
    }
  };

  const needsFile = method === "pdf" || method === "scan";
  const valid = method !== null
    && !scanning
    && (!needsFile || Boolean(file))
    && (method !== "ai" || Boolean(generation.topic.trim()));

  const updateGeneration = (field, value) => {
    setGeneration((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!valid) return;
    if (method === "ai") {
      setScanning(true);
      setScanError("");
      try {
        await onSubmit({ method, generation });
      } catch (error) {
        setScanError(error.message || "Could not generate a story. Please try again.");
      } finally {
        setScanning(false);
      }
      return;
    }
    if (needsFile && file) {
      setScanning(true);
      setScanError("");
      try {
        const extracted = method === "pdf" ? await extractPdfPages(file) : { pages: await extractImagePages(file), questions: [] };
        onSubmit({ method, file, ...extracted });
      } catch {
        setScanError(
          method === "pdf"
            ? "We couldn't extract text from that PDF. An editable story has been created so you can add the text manually."
            : "Couldn't scan that image. You can still add it and type the content in manually."
        );
        onSubmit({
          method,
          file,
          pages: [{
            id: 1,
            text: `We couldn't extract text from "${file.name}". Type or paste the story content here.`,
          }],
        });
        setScanning(false);
      }
      return;
    }
    onSubmit({ method, file });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(60,50,45,0.35)" }}
    >
      <div
        className="rounded-3xl p-7 w-[480px] max-h-[90vh] overflow-y-auto"
        style={{ background: C.cream }}
      >
        <div
          className="flex items-center gap-2 text-xl font-bold mb-5"
          style={{ color: C.text }}
        >
          <img
            src="/UI_Designs/ANIMALS/K_Squirrel.png"
            alt="squirrel"
            className="w-8 h-8 object-contain"
          />
          Add a Story
        </div>

        <div className="grid grid-cols-3 gap-4">
          {ADD_STORY_METHODS.map((m) => {
            const Icon = m.icon;
            const selected = method === m.key;
            return (
              <button
                key={m.key}
                onClick={() => chooseMethod(m)}
                aria-pressed={selected}
                className="relative rounded-2xl py-6 flex flex-col items-center gap-2 transition-all"
                style={{
                  background: selected ? "#EAF7EE" : "#fff",
                  border: `${selected ? 3 : 2}px solid ${selected ? "#3D995A" : "#8FBF9F"}`,
                  boxShadow: selected ? "0 0 0 4px rgba(61,153,90,0.18), 0 6px 14px rgba(61,153,90,0.16)" : "none",
                  transform: selected ? "translateY(-2px)" : "none",
                }}
              >
                {selected && (
                  <span
                    className="absolute -top-3 -right-3 rounded-full p-1 text-white"
                    style={{ background: "#3D995A", border: `3px solid ${C.cream}` }}
                    aria-label="Selected"
                  >
                    <CheckCircle2 size={17} strokeWidth={3} />
                  </span>
                )}
                <Icon size={26} color={m.iconColor} />
                <span className="text-xs text-center" style={{ color: selected ? "#287A42" : C.text, fontWeight: selected ? 700 : 500 }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {method && (method === "pdf" || method === "scan") && !scanning && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm"
            style={{
              color: file ? "#287A42" : C.textMuted,
              background: file ? "#EAF7EE" : "rgba(255,255,255,0.55)",
              border: `1.5px solid ${file ? "#7ABB8D" : C.cardBorder}`,
            }}
          >
            {file && <CheckCircle2 size={18} color="#3D995A" className="shrink-0" />}
            <span className="min-w-0">
              {file && <strong>Selected: </strong>}
              <span className={file ? "font-medium break-all" : ""}>{file ? file.name : "Choose a file to continue…"}</span>
            </span>
          </div>
        )}
        {method === "ai" && (
          <div className="mt-4 rounded-2xl p-4 grid grid-cols-2 gap-3" style={{ background: "#fff", border: `1px solid ${C.cardBorder}` }}>
            <label className="col-span-2 text-xs font-semibold" style={{ color: C.text }}>
              Topic or theme
              <input
                value={generation.topic}
                onChange={(event) => updateGeneration("topic", event.target.value)}
                maxLength={180}
                placeholder="e.g. friendship, courage, caring for nature"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none font-normal"
                style={{ background: "#F6F3EE", border: `1px solid ${C.cardBorder}` }}
              />
            </label>
            <label className="text-xs font-semibold" style={{ color: C.text }}>
              Paragraphs
              <input
                type="number"
                min="3"
                max="15"
                value={generation.paragraphCount}
                onChange={(event) => updateGeneration("paragraphCount", event.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none font-normal"
                style={{ background: "#F6F3EE", border: `1px solid ${C.cardBorder}` }}
              />
            </label>
            <label className="text-xs font-semibold" style={{ color: C.text }}>
              Questions
              <input
                type="number"
                min="3"
                max="10"
                value={generation.questionCount}
                onChange={(event) => updateGeneration("questionCount", event.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none font-normal"
                style={{ background: "#F6F3EE", border: `1px solid ${C.cardBorder}` }}
              />
            </label>
            <label className="text-xs font-semibold" style={{ color: C.text }}>
              Lesson (optional)
              <input
                value={generation.moral}
                onChange={(event) => updateGeneration("moral", event.target.value)}
                maxLength={180}
                placeholder="e.g. honesty matters"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none font-normal"
                style={{ background: "#F6F3EE", border: `1px solid ${C.cardBorder}` }}
              />
            </label>
          </div>
        )}
        {scanning && (
          <div className="flex items-center justify-center gap-2 text-xs mt-3" style={{ color: C.textMuted }}>
            <Loader2 size={14} className="animate-spin" />
            {method === "pdf"
              ? "Scanning your PDF and pulling out the text…"
              : method === "ai"
                ? "Generating your story and questions…"
                : "Scanning your image and pulling out the text…"}
          </div>
        )}
        {scanError && (
          <div className="text-xs text-center mt-3" style={{ color: "#C0504D" }}>{scanError}</div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ADD_STORY_METHODS.find((m) => m.key === method)?.accept || undefined}
          className="hidden"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            if (method === "pdf" && selectedFile && !isPdfFile(selectedFile)) {
              setFile(null);
              setScanError("Please choose a PDF file.");
            } else {
              setFile(selectedFile);
              setScanError("");
            }
            e.target.value = "";
          }}
        />

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 rounded-full py-2 font-medium" style={{ border: `1px solid ${C.cardBorder}`, color: C.text }}>
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={handleSubmit}
            className="flex-1 rounded-full py-2 font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: valid ? "#EDA751" : "#EAD9BE" }}
          >
            {scanning && <Loader2 size={16} className="animate-spin" />}
            {needsFile && !file ? "Choose a File" : method === "ai" ? "Generate Story" : "Add Story"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Unified In-Place Story & Questions Modal ----------
function StoryEditModal({ story, onCancel, onSave, onRegenerateQuestions }) {
  const [activeTab, setActiveTab] = useState("story");
  const [title, setTitle] = useState(story.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [pages, setPages] = useState(story.pages);
  const [questions, setQuestions] = useState(story.questions);
  const [deletePageTarget, setDeletePageTarget] = useState(null);
  const [coverImage, setCoverImage] = useState(story.coverImage || null);
  const [coverError, setCoverError] = useState("");
  const [processingCover, setProcessingCover] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");

  const coverInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const usesParagraphs = story.contentUnit === "paragraph";

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const chooseCover = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;
    setProcessingCover(true);
    setCoverError("");
    try {
      setCoverImage(await prepareCoverImage(selectedFile));
    } catch (error) {
      setCoverError(error.message);
    } finally {
      setProcessingCover(false);
    }
  };

  const updatePage = (id, text) => setPages((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)));
  const addPage = () => setPages((prev) => [...prev, { id: Math.max(0, ...prev.map((p) => p.id)) + 1, text: "" }]);
  const confirmDeletePage = () => {
    setPages((prev) => prev.filter((p) => p.id !== deletePageTarget.id));
    setDeletePageTarget(null);
  };

  const updateQuestion = (id, field, value) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  const updateOption = (id, idx, value) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q)));
  const addQuestion = () =>
    setQuestions((prev) => [...prev, { id: Math.max(0, ...prev.map((p) => p.id)) + 1, question: "", options: ["", "", "", ""], correct: 0 }]);
  const requestDeleteQuestion = async (question) => {
    const result = await liraAlert.fire({
      icon: "warning",
      title: "Remove this question?",
      text: `Question ${question.id} will be removed.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    });
    if (result.isConfirmed) {
      setQuestions((prev) =>
        prev
          .filter((q) => q.id !== question.id)
          .map((q, index) => ({ ...q, id: index + 1 }))
      );
      await liraAlert.fire({
        icon: "success",
        title: "The question has been successfully removed",
        confirmButtonText: "OK"
      });
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    setRegenerateError("");
    try {
      const regenerated = await onRegenerateQuestions({
        pages,
        language: story.lang,
        questionCount: Math.max(3, questions.length || 5),
      });
      setQuestions(regenerated);
    } catch (error) {
      setRegenerateError(error.message || "Could not regenerate the questions.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(60,50,45,0.35)" }}>
      <div className="rounded-3xl w-[520px] max-h-[85vh] flex flex-col transition-all" style={{ background: C.cream }}>
        
        {/* ===================== VIEW 1: STORY CONTENT ===================== */}
        {activeTab === "story" && (
          <>
            <div className="p-6 pb-3">
              <div className="flex items-start gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-20 rounded-lg overflow-hidden shadow flex items-center justify-center shrink-0"
                    style={{ background: coverImage ? "#222" : story.cover }}
                  >
                    {coverImage
                      ? <img src={coverImage} alt={`${title} cover`} className="w-full h-full object-cover" />
                      : <FileText size={25} color={story.coverText} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold" style={{ color: C.text }}>Manage Stories</div>
                    {editingTitle ? (
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onBlur={() => {
                          if (!title.trim()) setTitle(story.title);
                          setEditingTitle(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                          if (event.key === "Escape") {
                            setTitle(story.title);
                            setEditingTitle(false);
                          }
                        }}
                        maxLength={120}
                        className="mt-1 w-full rounded-md px-2 py-1 text-sm outline-none font-semibold"
                        style={{ background: "#fff", border: `1px solid ${C.cardBorder}`, color: "#C77C74" }}
                        aria-label="Story title"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitle(true)}
                        className="mt-1 flex max-w-full items-center gap-1.5 text-left"
                        aria-label="Edit story title"
                      >
                        <span className="truncate text-sm font-semibold" style={{ color: "#C77C74" }}>{title}</span>
                        <Pencil size={13} color="#8A8178" className="shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white shrink-0" style={{ background: "#7FAE6C" }}>{story.badge}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={chooseCover}
                />
                <button
                  type="button"
                  disabled={processingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2"
                  style={{ background: "#fff", border: `1px solid ${C.cardBorder}`, color: C.text }}
                >
                  {processingCover ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {processingCover ? "Preparing…" : coverImage ? "Replace cover" : "Upload cover"}
                </button>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => { setCoverImage(null); setCoverError(""); }}
                    className="rounded-full px-3 py-2 text-xs font-semibold flex items-center gap-1"
                    style={{ background: "#fff", border: "1px solid #DFA5A2", color: "#A94844" }}
                  >
                    <X size={13} /> Remove
                  </button>
                )}
                <span className="text-[11px]" style={{ color: C.textMuted }}>JPG, PNG or WebP · max 8 MB</span>
              </div>
              {coverError && <div className="text-xs mt-2" style={{ color: "#C0504D" }}>{coverError}</div>}
              <p className="text-xs mt-2" style={{ color: C.textMuted }}>{story.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-semibold" style={{ color: C.text }}>
                  {pages.length} {usesParagraphs ? "paragraphs" : "pages"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("questions")}
                  className="text-xs px-4 py-2 rounded-full font-semibold flex items-center gap-1.5 shadow-sm"
                  style={{ background: "#fff", border: `1px solid ${C.cardBorder}`, color: C.text }}
                >
                  Manage Questions ({questions.filter((q) => q.question).length}) &rarr;
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {pages.map((p, idx) => (
                <div key={p.id} className="relative rounded-xl p-4 mb-3" style={{ background: "#fff", border: `1.5px solid #9FD8E6` }}>
                  <div className="absolute -top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#8FCFE0" }}>
                    {usesParagraphs ? "P" : "P"}{idx + 1}
                  </div>
                  <button onClick={() => setDeletePageTarget({ id: p.id, index: idx + 1 })} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "#C0504D" }}>
                    <MinusCircle size={14} />
                  </button>
                  <textarea
                    value={p.text}
                    onChange={(e) => updatePage(p.id, e.target.value)}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none mt-2"
                    style={{ background: "#EFEFEF", color: C.text }}
                  />
                </div>
              ))}
              <button onClick={addPage} className="w-full rounded-full py-2 mb-4 text-sm font-medium border-2 border-dashed" style={{ borderColor: "#D8CFC2", color: C.textMuted }}>
                + Add {usesParagraphs ? "paragraph" : "page"}
              </button>
            </div>
          </>
        )}

        {/* ===================== VIEW 2: QUESTIONS (IN-PLACE SWITCH) ===================== */}
        {activeTab === "questions" && (
          <>
            <div className="p-6 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("story")}
                    className="text-xs font-semibold flex items-center gap-1 mb-1.5 opacity-80 hover:opacity-100"
                    style={{ color: C.text }}
                  >
                    <ArrowLeft size={13} /> Back to Story Content
                  </button>
                  <div className="text-xl font-bold" style={{ color: C.text }}>Manage Questions</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "#7FAE6C" }}>
                  {story.badge === "AI-generated" ? "AI-generated" : "Imported"}
                </span>
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: "#C77C74" }}>{title}</div>
              <p className="text-xs mt-2" style={{ color: C.textMuted }}>
                {story.badge === "AI-generated"
                  ? "These comprehension questions were generated automatically. Review before saving."
                  : "Review the question wording and select the correct answer for each option."}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-semibold" style={{ color: C.text }}>{questions.length} questions</span>
                <button disabled={regenerating} onClick={regenerate} className="text-xs px-4 py-2 rounded-full font-semibold flex items-center gap-2" style={{ background: "#fff", border: `1px solid ${C.cardBorder}`, color: C.text, opacity: regenerating ? 0.7 : 1 }}>
                  {regenerating && <Loader2 size={13} className="animate-spin" />}
                  {regenerating ? "Generating…" : "Re-generate with AI"}
                </button>
              </div>
              {regenerateError && <div className="text-xs mt-2" style={{ color: "#C0504D" }}>{regenerateError}</div>}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-3" style={{ scrollbarGutter: "stable" }}>
              {questions.map((q) => (
                <div key={q.id} className="relative rounded-xl p-4 mb-3" style={{ background: "#fff", border: `1.5px solid #9FD8E6` }}>
                  <div className="absolute -top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#8FCFE0" }}>
                    Q{q.id}
                  </div>
                  <button onClick={() => requestDeleteQuestion(q)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "#C0504D" }}>
                    <MinusCircle size={14} />
                  </button>
                  <input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                    placeholder="Type question here..."
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none mt-2 mb-2"
                    style={{ background: "#CDEEF5", color: C.text }}
                  />
                  {q.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={q.correct === idx}
                        onChange={() => updateQuestion(q.id, "correct", idx)}
                        style={{ accentColor: "#4F84A3" }}
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(q.id, idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: "#CDEEF5", color: C.text }}
                      />
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={addQuestion} className="w-full rounded-full py-2 mb-4 text-sm font-medium border-2 border-dashed" style={{ borderColor: "#D8CFC2", color: C.textMuted }}>
                + Add questions manually
              </button>
            </div>
          </>
        )}

        {/* ===================== SINGLE CLEAN BOTTOM ACTION BAR ===================== */}
        <div className="flex gap-3 p-5 bg-white rounded-b-3xl border-t" style={{ borderColor: C.cardBorder }}>
          <button onClick={onCancel} className="flex-1 rounded-full py-2 font-medium" style={{ border: `1px solid ${C.cardBorder}`, color: C.text }}>
            Cancel
          </button>
          <button
            disabled={processingCover || regenerating || !title.trim()}
            onClick={() => onSave({ ...story, title: title.trim(), coverImage, pages, questions })}
            className="flex-1 rounded-full py-2 font-semibold text-white"
            style={{ background: processingCover || regenerating || !title.trim() ? "#EAD9BE" : "#EDA751" }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {deletePageTarget && (
        <DeleteConfirmModal
          title={`Remove this ${usesParagraphs ? "paragraph" : "page"}?`}
          subtitle={`${usesParagraphs ? "Paragraph" : "Page"} ${deletePageTarget.index} will be removed from your story.`}
          onCancel={() => setDeletePageTarget(null)}
          onConfirm={confirmDeletePage}
        />
      )}
    </div>
  );
}

function Stories({ currentTeacher }) {
  const [stories, setStories] = useState([]);
  const [lang, setLang] = useState("ENG");
  const [editTarget, setEditTarget] = useState(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storyUrl = (id = "") => `${API_URL}/api/stories${id ? `/${id}` : ""}`;
  const teacherHeaders = () => ({ "X-Teacher-Id": currentTeacher?.id || "" });

  const loadStories = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(storyUrl(), { headers: teacherHeaders() });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not load stories from the database."));
      const databaseStories = await response.json();
      setStories(databaseStories.map((story) => ({ ...story, id: story._id })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStories(); }, []);

  const filtered = stories.filter((s) => s.lang === lang);

  const createStory = async ({ method, file, pages: extractedPages, questions: extractedQuestions = [], generation }) => {
    let newStory;
    if (method === "pdf" || method === "scan") {
      const name = file ? file.name.replace(/\.[^/.]+$/, "") : (method === "pdf" ? "Imported PDF" : "Scanned Document");
      const pages =
        extractedPages && extractedPages.length > 0
          ? extractedPages
          : [{ id: 1, text: file ? `Content extracted from "${file.name}". Edit this page to add or fix the story text.` : "Edit this page to add your story content." }];
      newStory = {
        title: name,
        lang,
        badge: "Custom Story",
        cover: "linear-gradient(160deg,#E7D8EE 0%,#B79AC7 100%)",
        coverText: "#3A2A47",
        coverImage: null,
        description:
          method === "pdf"
            ? "The story pages and multiple-choice questions were pulled from your uploaded PDF. Review the extracted content and mark any correct answers that were not included in the document before assigning it to your class."
            : "This story's text was scanned (OCR) from your uploaded photo. Review the text below, fix anything that didn't come through cleanly, or generate comprehension questions before assigning it to your class.",
        pages,
        contentUnit: method === "pdf" ? "paragraph" : "page",
        questions: extractedQuestions,
      };
    } else {
      let generated;
      try {
        const generationResponse = await fetch(`${storyUrl()}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...teacherHeaders() },
          body: JSON.stringify({ ...generation, language: lang }),
        });
        if (!generationResponse.ok) {
          throw new Error(await apiErrorMessage(generationResponse, "Could not generate a story."));
        }
        generated = await generationResponse.json();
      } catch (generationError) {
        setError(generationError.message);
        throw generationError;
      }
      newStory = {
        title: generated.title,
        lang,
        badge: "AI-generated",
        cover: "linear-gradient(160deg,#D7E7F5 0%,#9AB7D6 100%)",
        coverText: "#1E3A4A",
        coverImage: null,
        description: generated.description || "An AI-generated literacy story. Review all content before assigning it to your class.",
        contentUnit: "paragraph",
        pages: generated.pages,
        questions: generated.questions,
      };
    }
    try {
      const response = await fetch(storyUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...teacherHeaders() },
        body: JSON.stringify(newStory),
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not save story."));
      const savedStory = await response.json();
      const story = { ...savedStory, id: savedStory._id };
      setStories((prev) => [story, ...prev]);
      setShowAddStory(false);
      setEditTarget({ ...story, isNewStory: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveStory = async (updated) => {
    try {
      const { isNewStory, ...storyPayload } = updated;
      const response = await fetch(storyUrl(updated.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...teacherHeaders() },
        body: JSON.stringify(storyPayload),
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not update story."));
      const savedStory = await response.json();
      const story = { ...savedStory, id: savedStory._id };
      setStories((prev) => prev.map((existing) => (existing.id === story.id ? story : existing)));
      setEditTarget(null);
      await liraAlert.fire({
        icon: "success",
        title: isNewStory
          ? "New story has been added successfully"
          : "The story has been modified successfully",
        confirmButtonText: "OK"
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const regenerateQuestions = async ({ pages, language, questionCount }) => {
    const response = await fetch(`${storyUrl()}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...teacherHeaders() },
      body: JSON.stringify({ pages, language, questionCount }),
    });
    if (!response.ok) {
      throw new Error(await apiErrorMessage(response, "Could not regenerate the questions."));
    }
    const result = await response.json();
    return result.questions;
  };

  const confirmDeleteStory = async (storyToDelete) => {
    try {
      const response = await fetch(storyUrl(storyToDelete.id), { method: "DELETE", headers: teacherHeaders() });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not delete story."));
      setStories((prev) => prev.filter((story) => story.id !== storyToDelete.id));
      setEditTarget((prev) => (prev && prev.id === storyToDelete.id ? null : prev));
      await liraAlert.fire({
        icon: "success",
        title: "The story has been deleted successfully",
        confirmButtonText: "OK"
      });
    } catch (requestError) {
      setError(requestError.message);
      await showError(requestError.message);
    }
  };

  const requestDeleteStory = async (story) => {
    const result = await liraAlert.fire({
      icon: "warning",
      title: "Remove this story?",
      text: `${story.title} will be removed from your stories.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    });
    if (result.isConfirmed) await confirmDeleteStory(story);
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: C.text }}>Manage Stories</h1>
          <p className="text-sm mt-1" style={{ color: C.textMuted }}>Reading materials assigned to your class</p>
        </div>

        <div className="sm-lang-toggle" role="group" aria-label="Language filter">
          <button
            type="button"
            className={`sm-lang-option ${lang === 'ENG' ? 'is-active' : ''}`}
            onClick={() => setLang('ENG')}
          >
            ENG
          </button>
          <button
            type="button"
            className={`sm-lang-option ${lang === 'FIL' ? 'is-active' : ''}`}
            onClick={() => setLang('FIL')}
          >
            FIL
          </button>
        </div>
      </div>

      <div className="grid mt-6 gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {filtered.map((story) => (
          <StoryCover key={story.id} story={story} canManage={story.teacherId === currentTeacher?.id} onEdit={setEditTarget} onDeleteRequest={requestDeleteStory} />
        ))}
        <AddStoryCard onAdd={() => setShowAddStory(true)} />
      </div>
      {loading && <div className="text-sm mt-4" style={{ color: C.textMuted }}>Loading stories from the database…</div>}
      {error && <div className="text-sm mt-4" style={{ color: "#C0504D" }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm mt-2" style={{ color: C.textMuted }}>No stories yet in this language — add one with the + card.</div>
      )}

      {showAddStory && (
        <AddStoryModal onCancel={() => setShowAddStory(false)} onSubmit={createStory} />
      )}
      {editTarget && (
        <StoryEditModal
          story={editTarget}
          onCancel={() => setEditTarget(null)}
          onSave={saveStory}
          onRegenerateQuestions={regenerateQuestions}
        />
      )}
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState(() => getSavedPortalPage(
    "liraTeacherPortalPage",
    ["dashboard", "students", "flashcards", "stories"]
  ));
  const [students, setStudents] = useState([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnersError, setLearnersError] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const currentTeacher = getSession()?.user;
  const [sections, setSections] = useState([]);
  const sectionName = selectedSection || sections[0] || "";
  const sectionStudents = sectionName
    ? students.filter((student) => student.section === sectionName)
    : [];
  const teacher = getSession()?.user;
  const teacherName = [teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ") || "";

  const loadLearners = async () => {
    setLearnersLoading(true);
    setLearnersError("");
    try {
      const headers = { "X-Teacher-Id": currentTeacher?.id || "" };
      const [learnersResponse, sectionsResponse] = await Promise.all([
        fetch(`${API_URL}/api/learners`, { headers }),
        fetch(`${API_URL}/api/sections`, { headers }),
      ]);
      if (!learnersResponse.ok) throw new Error(await apiErrorMessage(learnersResponse, "Could not load learners from the database."));
      if (!sectionsResponse.ok) throw new Error(await apiErrorMessage(sectionsResponse, "Could not load your sections."));
      const [learners, ownedSections] = await Promise.all([learnersResponse.json(), sectionsResponse.json()]);
      const databaseStudents = learners.map(learnerToStudent);
      const databaseSections = ownedSections.map((section) => section.name).filter(Boolean);
      setStudents(databaseStudents);
      setSections(databaseSections);
      setSelectedSection((currentSection) => databaseSections.includes(currentSection) ? currentSection : (databaseSections[0] || ""));
    } catch (requestError) {
      setLearnersError(requestError.message);
    } finally {
      setLearnersLoading(false);
    }
  };

  useEffect(() => { loadLearners(); }, []);
  useEffect(() => { savePortalPage("liraTeacherPortalPage", page); }, [page]);

  function handleLogout() {
    clearSavedPortalPage("liraTeacherPortalPage");
    clearSession();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen" style={{ background: `linear-gradient(160deg, #FBF6EC 0%, #F7E4D6 100%)`, fontFamily: "'Segoe UI', ui-sans-serif, system-ui" }}>
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
      <div className="flex-1 p-8 overflow-auto">
        {page === "dashboard" && (
          <Dashboard students={sectionStudents} sections={sections} sectionName={sectionName} onSectionChange={setSelectedSection} teacherName={teacherName} />
        )}
        {page === "students" && <Students students={sectionStudents} setStudents={setStudents} sections={sections} sectionName={sectionName} onSectionChange={setSelectedSection} loading={learnersLoading} error={learnersError} onRefresh={loadLearners} currentTeacher={currentTeacher} />}
        {page === "flashcards" && <Flashcards />}
        {page === "stories" && <Stories currentTeacher={currentTeacher} />}
      </div>
    </div>
  );
}
