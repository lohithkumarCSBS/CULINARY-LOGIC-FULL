// src/pages/Dashboard.jsx
// ✅ Gemini called directly from frontend with proper prompt
// ✅ Recipes strictly based on user ingredients only
// ✅ Cooking time filter applied in prompt
// ✅ YouTube video embedded per recipe
// ✅ No duplicates on More Recipes (tracked by name set)
// ✅ Saved recipes persisted to localStorage
// ✅ Exact count always respected
// ✅ Image fallback on error

import { useState, useRef, useCallback, useEffect } from "react";
import { logOut, getToken } from "../firebase";

const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY   || "";
const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY || "";
const YT_KEY     = import.meta.env.VITE_YOUTUBE_API_KEY || "";
const API_BASE   = import.meta.env.VITE_API_BASE_URL    || "http://localhost:8080";

// ─────────────────────────────────────────────
// Gemini — strict ingredient-based prompt
// ─────────────────────────────────────────────
async function groqGenerate(ingredients, count, opts) {
  const { mealType, cuisine, cookTime } = opts;
  const maxTime = Math.min(cookTime, 45);
  const exampleJson = '[{"name":"Recipe Name","description":"2-sentence description","cuisine":"type","difficulty":"Beginner","totalMinutes":30,"servings":4,"ingredients":[{"qty":"200g","item":"ingredient"}],"steps":["step 1","step 2","step 3","step 4","step 5"],"tags":["tag1","tag2"]}]';
  const prompt = `You are an expert chef. Create exactly ${count} UNIQUE recipes using ONLY these ingredients: ${ingredients}.
DO NOT suggest recipes that require ingredients not listed.
Use only: ${ingredients} (plus basic pantry: salt, pepper, oil, water, common spices).
${cuisine  ? "Cuisine style: " + cuisine + "."  : ""}
${mealType ? "Meal type: " + mealType + "."     : ""}
Cooking time must be UNDER ${cookTime} minutes total.

Return ONLY a raw JSON array — no markdown, no backticks, no explanation.
Example format: ${exampleJson}

Rules:
- Exactly ${count} recipes
- Each recipe name must be unique and professional (no AI- prefix)
- Every ingredient MUST come from the provided list
- totalMinutes must be under ${cookTime}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert chef. Always respond with valid JSON array only. No markdown. No backticks. No special characters. No newlines inside strings. Use only straight double quotes." },
        { role: "user",   content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || "";

  // Extract JSON array from response
  let clean = raw;
  const fenceIdx = clean.indexOf("[");
  const fenceEnd = clean.lastIndexOf("]");
  if (fenceIdx === -1 || fenceEnd === -1) throw new Error("No JSON array in response. Try again.");
  clean = clean.slice(fenceIdx, fenceEnd + 1);
  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch(e2) {
    throw new Error("Recipe parsing failed. Please try again.");
  }
}

// ─────────────────────────────────────────────
// YouTube — search one video per recipe
// ─────────────────────────────────────────────
async function ytSearch(name) {
  if (!YT_KEY) return null;
  try {
    const q = encodeURIComponent(`how to make ${name} recipe`);
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=1&key=${YT_KEY}`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const it = d.items?.[0];
    if (!it) return null;
    return { videoId: it.id.videoId, title: it.snippet.title };
  } catch { return null; }
}

// ─────────────────────────────────────────────
// Food image via Unsplash source (free, no key)
// ─────────────────────────────────────────────
// Pexels image fetch — returns a real food photo URL for a recipe name
async function fetchPexelsImage(recipeName, cuisine) {
  if (!PEXELS_KEY) return null;
  try {
    const query = encodeURIComponent(recipeName + " food");
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data.photos?.[0];
    if (photo) return photo.src.medium;
    // fallback: search by cuisine
    if (cuisine) {
      const res2 = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(cuisine + " food dish")}&per_page=1&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY } }
      );
      const data2 = await res2.json();
      return data2.photos?.[0]?.src?.medium || null;
    }
    return null;
  } catch { return null; }
}

// ─────────────────────────────────────────────
// localStorage helpers for saved recipes
// ─────────────────────────────────────────────
const LS_SAVED     = "cl_saved_ids";
const LS_RECIPES   = "cl_saved_recipes";

function loadSaved() {
  try {
    const ids = JSON.parse(localStorage.getItem(LS_SAVED)  || "[]");
    const recs = JSON.parse(localStorage.getItem(LS_RECIPES) || "[]");
    return { ids: new Set(ids), recs };
  } catch { return { ids: new Set(), recs: [] }; }
}
function persistSaved(ids, recs) {
  try {
    localStorage.setItem(LS_SAVED,   JSON.stringify([...ids]));
    localStorage.setItem(LS_RECIPES, JSON.stringify(recs));
  } catch {}
}

const SEEDS = [];

const MEAL_TYPES = ["Any","Breakfast","Lunch","Dinner","Snack","Dessert"];
const CUISINES   = ["Any","Italian","Indian","Chinese","Mexican","French","Thai","Japanese","Mediterranean","American"];

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#faf7f2;color:#2d2d2d;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
@keyframes fadeUp  {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn  {from{opacity:0}to{opacity:1}}
@keyframes scaleIn {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes spin    {to{transform:rotate(360deg)}}
@keyframes shimmer {0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes slideUp {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp .5s ease both}.fu1{animation:fadeUp .5s .12s ease both}.si{animation:scaleIn .3s ease both}

/* Navbar */
.nb{position:sticky;top:0;z-index:100;height:70px;background:#fff;border-bottom:1px solid #eee;
  display:flex;align-items:center;justify-content:space-between;padding:0 48px;box-shadow:0 1px 8px rgba(0,0,0,.04)}
.nblogo{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#2d2d2d;display:flex;align-items:center;gap:10px}
.nblinks{display:flex;align-items:center;gap:4px}
.nlnk{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;color:#777;font-size:14px;
  font-weight:500;padding:8px 16px;border-radius:8px;transition:color .2s,background .2s}
.nlnk:hover{color:#2d2d2d;background:#f0f0f0}
.bp{background:#ff7a18;color:#fff;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;
  font-weight:600;padding:10px 22px;border-radius:8px;transition:all .2s;display:inline-flex;align-items:center;gap:7px}
.bp:hover{background:#e56d10;transform:translateY(-1px);box-shadow:0 4px 16px rgba(255,122,24,.3)}
.bp:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.bs{background:#f0f0f0;color:#2d2d2d;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;
  font-size:14px;font-weight:500;padding:10px 22px;border-radius:8px;transition:background .2s;display:inline-flex;align-items:center;gap:7px}
.bs:hover{background:#e5e5e5}
.sp{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;
  animation:spin .7s linear infinite;display:inline-block;flex-shrink:0}
.spd{border-color:rgba(255,122,24,.2);border-top-color:#ff7a18}

/* Hero */
.hero{max-width:1200px;margin:0 auto;padding:60px 48px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.hero img{width:100%;height:460px;object-fit:cover;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.12)}
.icard{background:#fff;padding:34px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.07)}
.ch1{font-family:'Fraunces',serif;font-size:28px;font-weight:700;line-height:1.25;margin-bottom:6px}
.csub{color:#777;font-size:14px;margin-bottom:24px;line-height:1.6}
.flbl{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px;display:block;color:#2d2d2d}
.fld{margin-bottom:16px}
.ingrow{display:flex;gap:8px;margin-bottom:9px}
.ingi{flex:1;height:46px;border:1.5px solid #e5e5e5;border-radius:8px;padding:0 13px;font-family:'DM Sans',sans-serif;
  font-size:14px;color:#2d2d2d;outline:none;transition:border-color .2s,box-shadow .2s;background:#fff}
.ingi:focus{border-color:#ff7a18;box-shadow:0 0 0 3px rgba(255,122,24,.1)}
.ingi::placeholder{color:#bbb}
.addb{height:46px;padding:0 16px;background:#ff7a18;color:#fff;border:none;border-radius:8px;
  font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap;transition:background .2s}
.addb:hover{background:#e56d10}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.itag{display:inline-flex;align-items:center;gap:4px;background:#fff4ec;border:1.5px solid #ffd4b3;
  color:#c24f00;font-size:13px;font-weight:500;padding:4px 10px 4px 12px;border-radius:20px}
.itag button{background:none;border:none;cursor:pointer;color:#c24f00;font-size:16px;line-height:1;padding:0}
.sel{width:100%;height:46px;border:1.5px solid #e5e5e5;border-radius:8px;padding:0 13px;
  font-family:'DM Sans',sans-serif;font-size:14px;color:#2d2d2d;outline:none;background:#fff;
  cursor:pointer;appearance:none;transition:border-color .2s}
.sel:focus{border-color:#ff7a18;box-shadow:0 0 0 3px rgba(255,122,24,.1)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.srow{display:flex;justify-content:space-between;margin-bottom:7px}
.sval{color:#ff7a18;font-weight:700;font-size:14px}
input[type=range]{width:100%;accent-color:#ff7a18;cursor:pointer}
.genbtn{width:100%;height:50px;background:#ff7a18;color:#fff;border:none;border-radius:10px;
  font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;
  transition:all .2s;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px}
.genbtn:hover{background:#e56d10;transform:translateY(-1px);box-shadow:0 6px 24px rgba(255,122,24,.35)}
.genbtn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}

/* Status bar */
.statusbar{background:linear-gradient(90deg,#fff8f3,#fff4ec);border:1px solid #ffd4b3;
  border-radius:10px;padding:12px 18px;margin-top:12px;font-size:13px;color:#c24f00;display:flex;align-items:center;gap:8px}

/* Section */
.sect{max-width:1200px;margin:0 auto;padding:52px 48px}
.sect-t{font-family:'Fraunces',serif;font-size:26px;font-weight:700;margin-bottom:4px}
.sect-s{color:#777;font-size:14px;margin-bottom:22px}
.vtabs{display:flex;gap:8px;margin-bottom:26px}
.vtab{padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500;font-size:14px;transition:all .2s}
.vtab.on{background:#ff7a18;color:#fff;box-shadow:0 4px 14px rgba(255,122,24,.28)}
.vtab.off{background:#fff;color:#777;border:1.5px solid #eee}
.vtab.off:hover{border-color:#ddd;color:#2d2d2d}

/* Grid */
.rg{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:22px}
.rc{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);
  transition:transform .3s,box-shadow .3s;cursor:pointer;animation:fadeUp .4s ease both}
.rc:hover{transform:translateY(-5px);box-shadow:0 14px 36px rgba(0,0,0,.11)}
.rcimg{width:100%;height:180px;object-fit:cover;display:block;background:#f0ede8}
.rcph{width:100%;height:180px;display:flex;align-items:center;justify-content:center;font-size:56px;
  background:linear-gradient(135deg,#ffe8d6,#ffd4b3)}
.rcb{padding:16px}
.rcn{font-family:'Fraunces',serif;font-size:16px;font-weight:600;margin-bottom:5px;line-height:1.3}
.rcd{color:#777;font-size:12.5px;line-height:1.55;margin-bottom:12px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rcf{display:flex;justify-content:space-between;align-items:center}
.rct{font-size:11.5px;color:#777}.rccu{font-size:11px;background:#f3f3f3;color:#555;padding:3px 8px;border-radius:20px;font-weight:500}
.sico{background:none;border:none;cursor:pointer;font-size:21px;color:#ddd;transition:color .2s,transform .2s;padding:0;line-height:1}
.sico:hover,.sico.on{color:#ff7a18}.sico.on{transform:scale(1.15)}
.ytbadge{display:inline-flex;align-items:center;gap:4px;background:#ff0000;color:#fff;
  font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;margin-left:6px;vertical-align:middle}

/* Skeleton */
.sk{background:linear-gradient(90deg,#efefef 25%,#e5e5e5 50%,#efefef 75%);
  background-size:600px 100%;animation:shimmer 1.4s ease infinite;border-radius:6px}

/* More btn */
.morebtn{display:flex;align-items:center;justify-content:center;gap:8px;margin:28px auto 0;
  padding:12px 30px;border-radius:10px;background:#fff;border:1.5px solid #e5e5e5;
  font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#2d2d2d;
  cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.morebtn:hover{border-color:#ff7a18;color:#ff7a18;box-shadow:0 4px 16px rgba(255,122,24,.12)}
.morebtn:disabled{opacity:.5;cursor:not-allowed}

/* Modal */
.mbg{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.55);display:flex;
  align-items:flex-start;justify-content:center;padding:28px 20px;overflow-y:auto;
  animation:fadeIn .2s ease;backdrop-filter:blur(4px)}
.mbox{background:#fff;border-radius:20px;width:100%;max-width:800px;animation:scaleIn .3s ease;overflow:hidden;margin:auto}
.mhd{display:flex;justify-content:space-between;align-items:center;padding:18px 26px;border-bottom:1px solid #f0f0f0}
.mcl{background:none;border:1.5px solid #e5e5e5;border-radius:8px;cursor:pointer;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;font-size:18px;color:#777;transition:all .2s}
.mcl:hover{background:#f5f5f5;color:#2d2d2d}
.mbdy{padding:28px}
.mnm{font-family:'Fraunces',serif;font-size:26px;font-weight:700;margin-bottom:7px}
.mds{color:#777;font-size:14px;line-height:1.65;margin-bottom:20px}
.mmeta{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:20px}
.mpl{background:#f5f5f5;color:#444;font-size:11.5px;font-weight:600;padding:5px 13px;border-radius:20px;letter-spacing:.04em}
.mpl.o{background:#fff4ec;color:#ff7a18;border:1px solid #ffd4b3}
.ms{font-family:'Fraunces',serif;font-size:17px;font-weight:600;margin:20px 0 12px}
.ii{display:flex;justify-content:space-between;padding:9px 13px;background:#fafafa;border-radius:8px;font-size:13.5px;margin-bottom:6px}
.iq{color:#ff7a18;font-weight:600}
.stpw{display:flex;gap:13px;align-items:flex-start;margin-bottom:13px}
.stpn{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#f0d0b8;flex-shrink:0;line-height:1;min-width:28px}
.stpt{font-size:13.5px;color:#444;line-height:1.7;padding-top:2px}
.macts{display:flex;gap:10px;margin-top:24px}
.mtags{display:flex;gap:7px;flex-wrap:wrap;margin-top:16px}
.mta{background:#f0f0f0;color:#555;font-size:11.5px;padding:4px 11px;border-radius:20px}

/* YouTube embed in modal */
.ytsec{margin-top:24px;border-radius:12px;overflow:hidden;border:1.5px solid #f0f0f0}
.ythd{display:flex;align-items:center;gap:8px;padding:11px 15px;background:#fff8f8;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555}
.ytfr{width:100%;aspect-ratio:16/9;border:none;display:block}
.ytlnk{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;background:#ff0000;color:#fff;
  font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;transition:background .2s;font-family:'DM Sans',sans-serif}
.ytlnk:hover{background:#cc0000}

/* Error */
.errb{background:#fff0f0;border:1px solid #ffd0d0;color:#c00;font-size:13.5px;padding:13px 16px;
  border-radius:10px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center}
.errx{background:none;border:none;cursor:pointer;font-size:19px;color:#c00}

/* Toast */
.toast{position:fixed;bottom:26px;right:26px;background:#2d2d2d;color:#fff;padding:13px 20px;
  border-radius:10px;font-size:13.5px;z-index:400;box-shadow:0 8px 28px rgba(0,0,0,.2);animation:slideUp .3s ease;max-width:280px}

/* Empty */
.emp{text-align:center;padding:64px 20px}
.empi{font-size:48px;margin-bottom:14px;opacity:.35}
.empt{font-family:'Fraunces',serif;font-size:19px;margin-bottom:7px}
.emps{color:#777;font-size:13.5px}

/* Footer */
footer{background:#2d2d2d;color:#fff;padding:44px 48px;margin-top:36px}
.fi{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px}
.flo{font-family:'Fraunces',serif;font-size:19px;font-weight:700;margin-bottom:3px}
.fta{color:#888;font-size:12.5px}.fco{color:#666;font-size:12.5px}
footer a{color:#888;font-size:12.5px;text-decoration:none}footer a:hover{color:#fff}
hr.dv{border:none;border-top:1px solid #eee;margin:0}

@media(max-width:900px){
  .hero{grid-template-columns:1fr;padding:32px 22px;gap:28px}.hero img{height:240px}
  .nb{padding:0 22px}.sect{padding:36px 22px}.nlnk{display:none}footer{padding:32px 22px}
}
@media(max-width:600px){.rg{grid-template-columns:1fr}.row2{grid-template-columns:1fr}.mbdy{padding:20px}}
`;

// ─────────────────────────────────────────────
// Recipe Modal
// ─────────────────────────────────────────────
function RecipeModal({ r, onClose, onSave, isSaved }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="mbg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox si">
        <div className="mhd">
          <span style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:600,color:"#2d2d2d"}}>{r.cuisine} Recipe</span>
          <button className="mcl" onClick={onClose}>×</button>
        </div>

        <img src={r.image} alt={r.name}
          style={{width:"100%",height:230,objectFit:"cover",display:"block",background:"#f0ede8"}}
          onError={e => {
            e.target.onerror = null;
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}/>
        <div style={{width:"100%",height:160,background:"#f0ede8",display:"none",
          alignItems:"center",justifyContent:"center"}}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0c8bf" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>

        <div className="mbdy">
          <div className="mnm">{r.name}</div>
          <div className="mds">{r.desc}</div>
          <div className="mmeta">
            <span className="mpl o">⏱ {r.time}</span>
            <span className="mpl">🌍 {r.cuisine}</span>
            {r.difficulty && <span className="mpl">📊 {r.difficulty}</span>}
            {r.servings   && <span className="mpl">🍽 {r.servings} servings</span>}
          </div>

          {r.ingredients?.length > 0 && (<>
            <div className="ms">Ingredients</div>
            {r.ingredients.map((x, i) => (
              <div key={i} className="ii"><span>{x.item}</span><span className="iq">{x.qty}</span></div>
            ))}
          </>)}

          {r.steps?.length > 0 && (<>
            <div className="ms">Method</div>
            {r.steps.map((s, i) => (
              <div key={i} className="stpw">
                <div className="stpn">{String(i + 1).padStart(2, "0")}</div>
                <div className="stpt">{s}</div>
              </div>
            ))}
          </>)}

          {r.tags?.length > 0 && (
            <div className="mtags">{r.tags.map(t => <span key={t} className="mta">{t}</span>)}</div>
          )}

          {/* YouTube embed */}
          {r.yt?.videoId && (
            <div className="ytsec">
              <div className="ythd">
                <svg width="18" height="13" viewBox="0 0 20 14" fill="#ff0000"><path d="M19.6 2.2A2.5 2.5 0 0017.8.4C16.3 0 10 0 10 0S3.7 0 2.2.4A2.5 2.5 0 00.4 2.2 26 26 0 000 7a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8C3.7 14 10 14 10 14s6.3 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0020 7a26 26 0 00-.4-4.8zM8 10V4l5.2 3L8 10z"/></svg>
                <span style={{fontWeight:500}}>{r.yt.title}</span>
              </div>
              <iframe className="ytfr"
                src={`https://www.youtube.com/embed/${r.yt.videoId}?rel=0&modestbranding=1`}
                title={r.yt.title}
                allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                allowFullScreen/>
            </div>
          )}

          <div className="macts">
            <button className="bp" style={{flex:1}} onClick={() => onSave(r)}>
              {isSaved ? "♥ Saved" : "♡ Save Recipe"}
            </button>
            {r.yt?.videoId && (
              <a className="ytlnk" href={`https://www.youtube.com/watch?v=${r.yt.videoId}`} target="_blank" rel="noreferrer">
                ▶ YouTube
              </a>
            )}
            <button className="bs" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton card
function Skel({ i }) {
  return (
    <div className="rc" style={{animationDelay:`${i * .08}s`}}>
      <div className="sk" style={{height:180,borderRadius:0}}/>
      <div style={{padding:16}}>
        <div className="sk" style={{height:17,width:"65%",marginBottom:10}}/>
        <div className="sk" style={{height:12,marginBottom:6}}/>
        <div className="sk" style={{height:12,width:"50%",marginBottom:16}}/>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div className="sk" style={{height:12,width:"30%"}}/>
          <div className="sk" style={{height:20,width:20,borderRadius:"50%"}}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function Dashboard({ user }) {
  // Load saved from localStorage on mount
  const initSaved = loadSaved();

  const [recipes,   setRecipes]   = useState([]);
  const [savedIds,  setSavedIds]  = useState(initSaved.ids);
  const [savedRecs, setSavedRecs] = useState(initSaved.recs);
  const [modal,     setModal]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [moreLoad,  setMoreLoad]  = useState(false);
  const [error,     setError]     = useState("");
  const [toast,     setToast]     = useState("");
  const [view,      setView]      = useState("discover");
  const [status,    setStatus]    = useState("");

  // Form
  const [ingInput,  setIngInput]  = useState("");
  const [tags,      setTags]      = useState([]);
  const [mealType,  setMealType]  = useState("");
  const [cuisine,   setCuisine]   = useState("");
  const [cookTime,  setCookTime]  = useState(60);
  const [count,     setCount]     = useState(3);

  const usedNames  = useRef(new Set()); // prevent duplicates across More batches
  const lastSearch = useRef(null);
  const resultsRef = useRef(null);

  // Toast dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Persist saved to localStorage whenever it changes
  useEffect(() => {
    persistSaved(savedIds, savedRecs);
  }, [savedIds, savedRecs]);

  const addTag = () => {
    const v = ingInput.trim().replace(/,+$/, "");
    if (!v || tags.includes(v)) { setIngInput(""); return; }
    setTags(p => [...p, v]);
    setIngInput("");
  };

  // ── Toggle save ──────────────────────────────
  const toggleSave = useCallback((r) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(r.id)) {
        next.delete(r.id);
        setSavedRecs(p => p.filter(x => x.id !== r.id));
        setToast("Removed from saved.");
      } else {
        next.add(r.id);
        setSavedRecs(p => [...p.filter(x => x.id !== r.id), r]);
        setToast("Recipe saved ♥");
      }
      return next;
    });
  }, []);

  // ── Core generate ────────────────────────────
  const generate = useCallback(async (params, append = false) => {
    const { tags: t, mealType: mt, cuisine: c, cookTime: ct, count: n } = params;

    if (!append) { setLoading(true); usedNames.current.clear(); setStatus(""); }
    else           setMoreLoad(true);
    setError("");

    try {
      if (!GROQ_KEY) throw new Error("Groq API key missing. Add VITE_GROQ_API_KEY to your .env file.");

      setStatus(`🤖 Asking AI to create ${n} recipes using: ${t.join(", ")}…`);
      const raw = await groqGenerate(t.join(", "), n, { mealType: mt, cuisine: c, cookTime: ct });

      // Filter duplicates by name
      const unique = raw.filter(r => {
        const key = r.name?.toLowerCase().trim();
        if (!key || usedNames.current.has(key)) return false;
        usedNames.current.add(key);
        return true;
      }).slice(0, n);

      if (unique.length === 0) throw new Error("No new recipes generated. Try different ingredients.");

      setStatus(`🎥 Finding YouTube tutorials for ${unique.length} recipes…`);

      // Fetch YouTube videos in parallel
      const withYT = await Promise.all(
        unique.map(async (r, i) => ({
          id:          `gen-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,
          name:        r.name,
          desc:        r.description,
          time:        `${r.totalMinutes || ct} min`,
          cuisine:     r.cuisine || c || "International",
          difficulty:  r.difficulty || "Intermediate",
          servings:    r.servings || 4,
          image:       await fetchPexelsImage(r.name, r.cuisine),
          emoji:       ["🍗","🥘","🍝","🍜","🌮","🥗","🍲","🫕","🍛","🥙"][i % 10],
          ingredients: r.ingredients || [],
          steps:       r.steps || [],
          tags:        r.tags || [],
          yt:          await ytSearch(r.name),
        }))
      );

      setStatus("");

      if (append) {
        setRecipes(p => [...p, ...withYT]);
        setToast(`✓ ${withYT.length} more recipe${withYT.length > 1 ? "s" : ""} added!`);
      } else {
        // Replace with generated + keep seeds below
        setRecipes([...withYT]);
        setToast(`✓ ${withYT.length} recipe${withYT.length > 1 ? "s" : ""} generated!`);
        setView("discover");
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      }
    } catch (e) {
      setStatus("");
      setError(e.message || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
      setMoreLoad(false);
    }
  }, []);

  const handleGenerate = () => {
    if (tags.length === 0) { setError("Please add at least one ingredient."); return; }
    const params = { tags, mealType, cuisine, cookTime, count };
    lastSearch.current = params;
    generate(params, false);
  };

  const handleMore = () => {
    if (!lastSearch.current) return;
    generate(lastSearch.current, true);
  };

  const visible = view === "saved" ? savedRecs : recipes;

  return (
    <>
      <style>{CSS}</style>

      {/* NAVBAR */}
      <nav className="nb">
        <div className="nblogo">🍳 Culinary Logic</div>
        <div className="nblinks">
          <button className="nlnk" onClick={() => setView("discover")}>Home</button>
          <button className="nlnk" onClick={() => { setView("discover"); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}>Recipes</button>
          <button className="nlnk" onClick={() => setView("saved")}>
            Saved {savedIds.size > 0 && <span style={{background:"#ff7a18",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,marginLeft:4}}>{savedIds.size}</span>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:8}}>
            <span style={{fontSize:13.5,color:"#777"}}>Hi, {user.displayName || user.email?.split("@")[0]} 👋</span>
            <button className="bs" onClick={logOut}>Sign Out</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="icard fu">
          <div className="ch1">What's in your kitchen?</div>
          <div className="csub">Add your ingredients — get AI recipes with cooking videos, matched exactly to what you have.</div>

          {/* Ingredient Tags */}
          <div className="fld">
            <label className="flbl">Your Ingredients</label>
            <div className="ingrow">
              <input className="ingi" value={ingInput} onChange={e => setIngInput(e.target.value)}
                placeholder="e.g. chicken, garlic, tomatoes…"
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}/>
              <button className="addb" onClick={addTag}>+ Add</button>
            </div>
            {tags.length > 0 && (
              <div className="tags">
                {tags.map(t => (
                  <span key={t} className="itag">{t}
                    <button onClick={() => setTags(p => p.filter(x => x !== t))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="row2">
            <div className="fld">
              <label className="flbl">Meal Type</label>
              <select className="sel" value={mealType} onChange={e => setMealType(e.target.value)}>
                {MEAL_TYPES.map(o => <option key={o} value={o === "Any" ? "" : o}>{o}</option>)}
              </select>
            </div>
            <div className="fld">
              <label className="flbl">Cuisine</label>
              <select className="sel" value={cuisine} onChange={e => setCuisine(e.target.value)}>
                {CUISINES.map(o => <option key={o} value={o === "Any" ? "" : o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="fld">
            <div className="srow">
              <label className="flbl" style={{marginBottom:0}}>Max Cooking Time</label>
              <span className="sval">{cookTime} min</span>
            </div>
            <input type="range" min={10} max={180} step={5} value={cookTime} onChange={e => setCookTime(+e.target.value)}/>
          </div>

          <div className="fld">
            <div className="srow">
              <label className="flbl" style={{marginBottom:0}}>Number of Recipes</label>
              <span className="sval">{count}</span>
            </div>
            <input type="range" min={1} max={10} value={count} onChange={e => setCount(+e.target.value)}/>
          </div>

          {error && (
            <div className="errb">{error}
              <button className="errx" onClick={() => setError("")}>×</button>
            </div>
          )}

          {status && <div className="statusbar"><div className="sp spd"/>{status}</div>}

          <button className="genbtn" onClick={handleGenerate} disabled={loading || tags.length === 0}>
            {loading
              ? <><div className="sp"/>Generating {count} recipe{count > 1 ? "s" : ""}…</>
              : <>✨ Generate {count} Recipe{count > 1 ? "s" : ""}</>
            }
          </button>
        </div>

        <div className="fu1">
          <img src="https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=800&q=80" alt="Fresh ingredients"/>
        </div>
      </div>

      {/* RECIPE SECTION */}
      <hr className="dv"/>
      <div className="sect" ref={resultsRef}>
        <div className="sect-t">{view === "saved" ? "Saved Recipes" : "Recipe Collection"}</div>
        <div className="sect-s">
          {view === "saved"
            ? `${savedIds.size} saved recipe${savedIds.size !== 1 ? "s" : ""} · persisted across sessions`
            : `${visible.length} recipes · click any card for full details & video`
          }
        </div>

        <div className="vtabs">
          <button className={`vtab ${view === "discover" ? "on" : "off"}`} onClick={() => setView("discover")}>All Recipes</button>
          <button className={`vtab ${view === "saved"    ? "on" : "off"}`} onClick={() => setView("saved")}>
            Saved {savedIds.size > 0 ? `(${savedIds.size})` : ""}
          </button>
        </div>

        {loading && (
          <div className="rg">
            {Array.from({ length: count }).map((_, i) => <Skel key={i} i={i}/>)}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="emp">
            <div className="empi">{view === "saved" ? "🔖" : "🍽️"}</div>
            <div className="empt">{view === "saved" ? "No saved recipes yet" : "No recipes yet"}</div>
            <div className="emps">{view === "saved" ? "Click ♡ on any recipe to save it." : "Add ingredients above and click Generate."}</div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="rg">
            {visible.map((r, i) => (
              <div key={r.id} className="rc" style={{animationDelay:`${i * .06}s`}} onClick={() => setModal(r)}>
                <img className="rcimg" src={r.image} alt={r.name} loading="lazy"
                  onError={e => {
                    const fallbacks = foodImgFallbacks(r.name, r.cuisine);
                    const cur = e.target.dataset.attempt ? parseInt(e.target.dataset.attempt) : 0;
                    if (cur < fallbacks.length) {
                      e.target.dataset.attempt = cur + 1;
                      e.target.src = fallbacks[cur];
                    } else {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }
                  }}/>
                <div className="rcb">
                  <div className="rcn">
                    {r.name}
                    {r.yt?.videoId && (
                      <span className="ytbadge">
                        <svg width="10" height="8" viewBox="0 0 20 14" fill="white"><path d="M19.6 2.2A2.5 2.5 0 0017.8.4C16.3 0 10 0 10 0S3.7 0 2.2.4A2.5 2.5 0 00.4 2.2 26 26 0 000 7a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8C3.7 14 10 14 10 14s6.3 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0020 7a26 26 0 00-.4-4.8zM8 10V4l5.2 3L8 10z"/></svg>
                        Video
                      </span>
                    )}
                  </div>
                  <div className="rcd">{r.desc}</div>
                  <div className="rcf">
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <span className="rct">⏱ {r.time}</span>
                      <span className="rccu">{r.cuisine}</span>
                    </div>
                    <button className={`sico${savedIds.has(r.id) ? " on" : ""}`}
                      onClick={e => { e.stopPropagation(); toggleSave(r); }}>
                      {savedIds.has(r.id) ? "♥" : "♡"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* More Recipes — only in discover after a search */}
        {!loading && view === "discover" && lastSearch.current && (
          <button className="morebtn" onClick={handleMore} disabled={moreLoad}>
            {moreLoad
              ? <><div className="sp spd"/>Finding more recipes…</>
              : <>↻ More Recipes with {lastSearch.current.tags.join(", ")}</>
            }
          </button>
        )}
      </div>

      <footer>
        <div className="fi">
          <div><div className="flo">🍳 Culinary Logic</div><div className="fta">Your smart culinary assistant.</div></div>
          <div style={{display:"flex",gap:22}}><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div>
          <div className="fco">© 2026 Culinary Logic. All rights reserved.</div>
        </div>
      </footer>

      {modal && <RecipeModal r={modal} onClose={() => setModal(null)} onSave={toggleSave} isSaved={savedIds.has(modal.id)}/>}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}