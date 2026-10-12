import { useState, useRef, useEffect } from "react";

// ================================================================
//  CULINARY LOGIC — Complete Redesign
//  ✅ Fix 1: Login with loading state + modal
//  ✅ Fix 2: Tag-based ingredient input
//  ✅ Fix 3: No API branding in UI
//  ✅ Fix 4: No "AI-" prefix in recipe names
//  ✅ Fix 5: Exact recipe count respected
// ================================================================

const PRIMARY = "#ff7a18";
const BG      = "#faf7f2";
const DARK    = "#2d2d2d";
const MUTED   = "#777";
const WHITE   = "#ffffff";
const ACCENT  = "#2e7d32";

// ── API helper ───────────────────────────────────────────────────
async function callAPI(path, body) {
  const token = window.__firebaseToken__ || "";
  const base  = window.__apiBaseUrl__    || "http://localhost:8080";
  const res   = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(e.message || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── Seed recipes (no "AI-" prefix, real names) ───────────────────
const SEED_RECIPES = [
  { id:"r1", name:"Saffron Risotto", desc:"Creamy arborio rice with saffron and aged parmesan.", time:"50 min", cuisine:"Italian", image:"https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80" },
  { id:"r2", name:"Miso Black Cod",  desc:"Silky cod in sweet white miso glaze, broiled to perfection.", time:"35 min", cuisine:"Japanese", image:"https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80" },
  { id:"r3", name:"Coq au Vin",      desc:"Tender chicken braised in Burgundy wine with mushrooms.", time:"2 hr",   cuisine:"French",   image:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" },
  { id:"r4", name:"Lamb Rogan Josh", desc:"Kashmiri lamb slow-cooked in aromatic bark spices.", time:"90 min", cuisine:"Indian",   image:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80" },
  { id:"r5", name:"Garlic Butter Shrimp Pasta", desc:"Linguine tossed with juicy shrimp in garlic butter white wine sauce.", time:"25 min", cuisine:"Italian", image:"https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80" },
  { id:"r6", name:"Spicy Thai Basil Chicken", desc:"Stir-fried minced chicken with fresh Thai basil and chilies.", time:"20 min", cuisine:"Thai", image:"https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&q=80" },
];

const MEAL_TYPES = ["Any","Breakfast","Lunch","Dinner","Snack","Dessert","Appetizer"];
const TASTE_OPTS = ["Any","Spicy","Sweet","Savory","Sour","Mild","Umami"];

// ================================================================
//  GLOBAL STYLES
// ================================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: ${BG}; color: ${DARK}; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes spin     { to { transform: rotate(360deg); } }
@keyframes scaleIn  { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
@keyframes slideDown{ from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }

.fu  { animation: fadeUp  .5s ease both; }
.fu1 { animation: fadeUp  .5s .1s ease both; }
.fu2 { animation: fadeUp  .5s .2s ease both; }
.si  { animation: scaleIn .35s ease both; }
.fi  { animation: fadeIn  .3s ease both; }

.spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
.spinner-dark { border-color:rgba(0,0,0,.15); border-top-color:${PRIMARY}; }

/* Navbar */
.navbar { position:sticky; top:0; z-index:100; height:70px; background:${WHITE}; border-bottom:1px solid #eee;
  display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
.nav-logo { display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-size:22px; font-weight:700; color:${DARK}; }
.nav-links { display:flex; align-items:center; gap:8px; }
.nav-link { background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif;
  color:${MUTED}; font-size:14px; padding:8px 16px; border-radius:8px; transition:color .2s,background .2s; }
.nav-link:hover { color:${DARK}; background:#f5f5f5; }
.nav-btn { background:${PRIMARY}; color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif;
  font-size:14px; font-weight:600; padding:10px 20px; border-radius:8px; transition:background .2s,transform .2s,box-shadow .2s;
  display:flex; align-items:center; gap:8px; }
.nav-btn:hover { background:#e56b10; transform:translateY(-1px); box-shadow:0 4px 16px rgba(255,122,24,.3); }
.nav-btn:disabled { opacity:.7; cursor:not-allowed; transform:none; }

/* Hero */
.hero { max-width:1200px; margin:0 auto; padding:70px 40px; display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
.hero-img { width:100%; height:480px; object-fit:cover; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.12); }

/* Input card */
.input-card { background:${WHITE}; padding:36px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.06); }
.card-title { font-family:'Fraunces',serif; font-size:32px; font-weight:700; color:${DARK}; margin-bottom:6px; line-height:1.2; }
.card-sub   { color:${MUTED}; font-size:15px; margin-bottom:28px; }
.field-label { font-size:12px; font-weight:600; color:${DARK}; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; }

/* Ingredient tag input */
.ing-row { display:flex; gap:8px; margin-bottom:10px; }
.ing-input { flex:1; height:48px; border:1px solid #ddd; border-radius:8px; padding:0 14px; font-family:'DM Sans',sans-serif; font-size:14px; color:${DARK}; outline:none; transition:border-color .2s,box-shadow .2s; background:#fff; }
.ing-input:focus { border-color:${PRIMARY}; box-shadow:0 0 0 3px rgba(255,122,24,.1); }
.ing-add { height:48px; padding:0 18px; background:${PRIMARY}; color:#fff; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:14px; cursor:pointer; transition:background .2s; white-space:nowrap; }
.ing-add:hover { background:#e56b10; }
.tags-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:4px; min-height:0; }
.tag { display:flex; align-items:center; gap:6px; background:#fff4ec; border:1px solid #ffd4b3; color:#cc5500; font-size:13px; font-weight:500; padding:5px 12px; border-radius:20px; }
.tag-x { background:none; border:none; cursor:pointer; color:#cc5500; font-size:16px; line-height:1; padding:0; display:flex; align-items:center; }
.tag-x:hover { color:#aa3300; }

/* Selects & slider */
.select { width:100%; height:48px; border:1px solid #ddd; border-radius:8px; padding:0 14px; font-family:'DM Sans',sans-serif; font-size:14px; color:${DARK}; outline:none; background:#fff; cursor:pointer; transition:border-color .2s; appearance:none; }
.select:focus { border-color:${PRIMARY}; box-shadow:0 0 0 3px rgba(255,122,24,.1); }
.slider { width:100%; accent-color:${PRIMARY}; cursor:pointer; }
.row2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.field { margin-bottom:20px; }

/* Generate button */
.gen-btn { width:100%; height:52px; background:${PRIMARY}; color:#fff; border:none; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:16px; font-weight:700; cursor:pointer; transition:background .2s,transform .2s,box-shadow .2s; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:4px; }
.gen-btn:hover { background:#e56b10; transform:translateY(-1px); box-shadow:0 6px 20px rgba(255,122,24,.35); }
.gen-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; box-shadow:none; }

/* Sections */
.section { max-width:1200px; margin:0 auto; padding:60px 40px; }
.section-title { font-family:'Fraunces',serif; font-size:28px; font-weight:700; color:${DARK}; margin-bottom:6px; }
.section-sub   { color:${MUTED}; font-size:15px; margin-bottom:32px; }

/* Recipe grid */
.recipe-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:24px; }

/* Recipe card */
.recipe-card { background:${WHITE}; border-radius:14px; overflow:hidden; box-shadow:0 5px 15px rgba(0,0,0,.06); transition:transform .3s,box-shadow .3s; cursor:pointer; }
.recipe-card:hover { transform:translateY(-5px); box-shadow:0 12px 30px rgba(0,0,0,.1); }
.recipe-card-img { width:100%; height:180px; object-fit:cover; display:block; }
.recipe-card-img-placeholder { width:100%; height:180px; background:linear-gradient(135deg,#ffe8d6,#ffd4b3); display:flex; align-items:center; justify-content:center; font-size:48px; }
.recipe-card-body { padding:18px; }
.recipe-card-name { font-family:'Fraunces',serif; font-size:17px; font-weight:600; color:${DARK}; margin-bottom:6px; line-height:1.3; }
.recipe-card-desc { color:${MUTED}; font-size:13px; line-height:1.5; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.recipe-card-foot { display:flex; justify-content:space-between; align-items:center; }
.recipe-time { font-size:12px; color:${MUTED}; display:flex; align-items:center; gap:4px; }
.recipe-cuisine { font-size:11px; background:#f0f0f0; color:#555; padding:3px 9px; border-radius:20px; }
.save-btn { background:none; border:none; cursor:pointer; font-size:20px; color:#ddd; transition:color .2s,transform .2s; padding:0; }
.save-btn.saved { color:#ff7a18; transform:scale(1.15); }
.save-btn:hover { color:#ff7a18; }

/* Skeleton */
.skel { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:400px 100%; animation:shimmer 1.4s ease infinite; border-radius:8px; }
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

/* Divider */
.divider { height:1px; background:#eee; max-width:1200px; margin:0 auto 0; }

/* Modal overlay */
.modal-bg { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .2s ease; }
.modal-box { background:${WHITE}; border-radius:20px; padding:40px; max-width:420px; width:100%; animation:scaleIn .3s ease; box-shadow:0 24px 64px rgba(0,0,0,.15); }
.modal-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:${DARK}; margin-bottom:8px; }
.modal-sub   { color:${MUTED}; font-size:14px; margin-bottom:28px; }
.modal-close { float:right; background:none; border:none; font-size:24px; cursor:pointer; color:${MUTED}; margin-top:-8px; }

/* Auth input */
.auth-input { width:100%; height:48px; border:1px solid #ddd; border-radius:8px; padding:0 14px; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; margin-bottom:14px; transition:border-color .2s; }
.auth-input:focus { border-color:${PRIMARY}; box-shadow:0 0 0 3px rgba(255,122,24,.1); }
.auth-btn { width:100%; height:48px; background:${PRIMARY}; color:#fff; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:15px; cursor:pointer; transition:background .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
.auth-btn:hover { background:#e56b10; }
.auth-btn:disabled { opacity:.6; cursor:not-allowed; }
.auth-divider { text-align:center; color:${MUTED}; font-size:13px; margin:16px 0; position:relative; }
.auth-divider::before,.auth-divider::after { content:''; position:absolute; top:50%; width:42%; height:1px; background:#eee; }
.auth-divider::before { left:0; } .auth-divider::after { right:0; }
.google-btn { width:100%; height:48px; background:#fff; color:${DARK}; border:1px solid #ddd; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:500; font-size:15px; cursor:pointer; transition:background .2s,box-shadow .2s; display:flex; align-items:center; justify-content:center; gap:10px; }
.google-btn:hover { background:#f9f9f9; box-shadow:0 2px 8px rgba(0,0,0,.08); }
.auth-error { background:#fff0f0; border:1px solid #ffd0d0; color:#cc0000; font-size:13px; padding:10px 14px; border-radius:8px; margin-bottom:14px; }
.auth-success { background:#f0fff4; border:1px solid #bbf7d0; color:#15803d; font-size:13px; padding:10px 14px; border-radius:8px; margin-bottom:14px; }

/* Footer */
.footer { background:${DARK}; color:#fff; padding:50px 40px; margin-top:40px; }
.footer-inner { max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; }
.footer-logo { font-family:'Fraunces',serif; font-size:20px; font-weight:700; }
.footer-tagline { color:#999; font-size:13px; margin-top:4px; }
.footer-copy { color:#666; font-size:13px; }

/* Empty state */
.empty { text-align:center; padding:60px 20px; color:${MUTED}; }
.empty-icon { font-size:48px; margin-bottom:16px; opacity:.4; }

/* Error banner */
.error-banner { background:#fff0f0; border:1px solid #ffd0d0; color:#cc0000; font-size:14px; padding:14px 18px; border-radius:10px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; }

/* Success toast */
.toast { position:fixed; bottom:28px; right:28px; background:${DARK}; color:#fff; padding:14px 20px; border-radius:10px; font-size:14px; z-index:300; animation:slideDown .3s ease; box-shadow:0 8px 24px rgba(0,0,0,.2); }

@media(max-width:900px) {
  .hero { grid-template-columns:1fr; padding:40px 20px; gap:32px; }
  .hero-img { height:280px; }
  .navbar { padding:0 20px; }
  .nav-links .nav-link { display:none; }
  .section { padding:40px 20px; }
  .row2 { grid-template-columns:1fr; }
  .footer { padding:36px 20px; }
  .footer-inner { flex-direction:column; align-items:flex-start; gap:16px; }
}
@media(max-width:600px) {
  .recipe-grid { grid-template-columns:1fr; }
  .card-title { font-size:26px; }
}
`;

// ================================================================
//  LOGIN MODAL
// ================================================================
const LoginModal = ({ onClose, onLogin }) => {
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      // ── PRODUCTION: replace with Firebase signInWithEmailAndPassword ──
      // import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
      // const auth = getAuth();
      // const fn = mode === "login" ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
      // const result = await fn(auth, email, password);
      // window.__firebaseToken__ = await result.user.getIdToken();
      // onLogin({ uid: result.user.uid, email: result.user.email, displayName: result.user.displayName || email.split("@")[0] });

      // Demo simulation
      await new Promise(r => setTimeout(r, 1500));
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setSuccess(mode === "login" ? "Welcome back!" : "Account created!");
      setTimeout(() => {
        onLogin({ uid: "u1", email, displayName: email.split("@")[0] });
        onClose();
      }, 800);
    } catch(e) {
      setError(e.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      // ── PRODUCTION: replace with Firebase Google sign-in ──
      // import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
      // const result = await signInWithPopup(getAuth(), new GoogleAuthProvider());
      // window.__firebaseToken__ = await result.user.getIdToken();
      // onLogin({ uid: result.user.uid, email: result.user.email, displayName: result.user.displayName });

      await new Promise(r => setTimeout(r, 1200));
      onLogin({ uid: "g1", email: "user@gmail.com", displayName: "Google User" });
      onClose();
    } catch(e) {
      setError("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-box si">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">{mode==="login" ? "Welcome back" : "Create account"}</div>
        <div className="modal-sub">{mode==="login" ? "Sign in to save and manage your recipes." : "Join to start generating recipes."}</div>

        {error   && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <input className="auth-input" type="email"    placeholder="Email address" value={email}    onChange={e=>setEmail(e.target.value)}    onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        <input className="auth-input" type="password" placeholder="Password"      value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>

        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? <><div className="spinner"/>{mode==="login"?"Signing in…":"Creating account…"}</> : (mode==="login" ? "Sign In" : "Create Account")}
        </button>

        <div className="auth-divider">or</div>

        <button className="google-btn" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{textAlign:"center",marginTop:20,fontSize:13,color:MUTED}}>
          {mode==="login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={()=>{setMode(m=>m==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:PRIMARY,cursor:"pointer",fontWeight:600,fontFamily:"'DM Sans',sans-serif",fontSize:13}}>
            {mode==="login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ================================================================
//  RECIPE CARD
// ================================================================
const RecipeCard = ({ r, saved, onSave, delay=0 }) => {
  const isSaved = saved.has(r.id);
  return (
    <div className="recipe-card fu" style={{animationDelay:`${delay}s`}}>
      {r.image
        ? <img className="recipe-card-img" src={r.image} alt={r.name} loading="lazy"/>
        : <div className="recipe-card-img-placeholder">{r.emoji||"🍽️"}</div>
      }
      <div className="recipe-card-body">
        <div className="recipe-card-name">{r.name}</div>
        <div className="recipe-card-desc">{r.desc}</div>
        <div className="recipe-card-foot">
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span className="recipe-time">⏱ {r.time}</span>
            <span className="recipe-cuisine">{r.cuisine}</span>
          </div>
          <button className={`save-btn${isSaved?" saved":""}`} onClick={()=>onSave(r)} title={isSaved?"Unsave":"Save"}>
            {isSaved ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
//  SKELETON CARD
// ================================================================
const SkeletonCard = ({i}) => (
  <div className="recipe-card" style={{animationDelay:`${i*.1}s`}}>
    <div className="skel" style={{height:180,borderRadius:0}}/>
    <div style={{padding:18}}>
      <div className="skel" style={{height:18,width:"70%",marginBottom:10}}/>
      <div className="skel" style={{height:13,marginBottom:6}}/>
      <div className="skel" style={{height:13,width:"60%",marginBottom:18}}/>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div className="skel" style={{height:13,width:"30%"}}/>
        <div className="skel" style={{height:20,width:20,borderRadius:"50%"}}/>
      </div>
    </div>
  </div>
);

// ================================================================
//  MAIN DASHBOARD
// ================================================================
export default function Dashboard() {
  const [user,       setUser]       = useState(null);
  const [showLogin,  setShowLogin]  = useState(false);
  const [recipes,    setRecipes]    = useState(SEED_RECIPES);
  const [saved,      setSaved]      = useState(new Set());
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState("");
  const [view,       setView]       = useState("discover"); // "discover" | "saved"

  // Ingredient tags
  const [ingInput,   setIngInput]   = useState("");
  const [tags,       setTags]       = useState([]);

  // Form filters
  const [mealType,   setMealType]   = useState("");
  const [taste,      setTaste]      = useState("");
  const [cookTime,   setCookTime]   = useState(60);
  const [count,      setCount]      = useState(3);

  const resultsRef = useRef(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Add ingredient tag ───────────────────────────────────────
  const addTag = () => {
    const val = ingInput.trim();
    if (!val) return;
    if (tags.includes(val)) { setIngInput(""); return; }
    setTags(p => [...p, val]);
    setIngInput("");
  };

  const removeTag = (t) => setTags(p => p.filter(x => x !== t));

  // ── Toggle save ──────────────────────────────────────────────
  const toggleSave = (r) => {
    setSaved(p => {
      const n = new Set(p);
      if (n.has(r.id)) { n.delete(r.id); setToast("Recipe removed from saved."); }
      else             { n.add(r.id);    setToast("Recipe saved! ♥"); }
      return n;
    });
  };

  // ── Generate recipes ─────────────────────────────────────────
  const handleGenerate = async () => {
    if (tags.length === 0) { setError("Please add at least one ingredient."); return; }
    setLoading(true); setError("");

    try {
      // ── PRODUCTION: uncomment below ──────────────────────────
      // const data = await callAPI("/api/v1/recipes/generate", {
      //   ingredients: tags.join(", "),
      //   count,
      //   ...(mealType && { dietary: mealType }),
      //   ...(taste    && { cuisine: taste }),
      //   maxTotalMinutes: cookTime,
      // });
      // const results = (Array.isArray(data) ? data : [data])
      //   .slice(0, count)
      //   .map(r => ({
      //     id:      r.id || `${Date.now()}-${Math.random()}`,
      //     name:    r.title,
      //     desc:    r.description,
      //     time:    r.prepTime || r.cookTime || "30 min",
      //     cuisine: r.cuisine  || "International",
      //     image:   null,
      //     emoji:   "🍽️",
      //   }));
      // setRecipes(p => [...results, ...p]);

      // ── Demo simulation ──────────────────────────────────────
      await new Promise(r => setTimeout(r, 2000));

      const NAMES = [
        [`${tags[0]} Butter Chicken`,          "Tender chicken simmered in a rich, spiced tomato-cream sauce.",      "45 min", "Indian"],
        [`Garlic ${tags[0]} Stir Fry`,          "Quick and vibrant stir fry with fresh vegetables and aromatic garlic.", "20 min", "Asian"],
        [`Roasted ${tags[0]} with Herbs`,       "Simply roasted with rosemary, thyme and a drizzle of olive oil.",   "40 min", "Mediterranean"],
        [`Creamy ${tags[0]} Pasta`,             "Al dente pasta in a velvety cream sauce with fresh parmesan.",       "25 min", "Italian"],
        [`Spiced ${tags[0]} Soup`,              "Warming soup with cumin, coriander and a squeeze of lemon.",         "35 min", "Middle Eastern"],
        [`${tags[0]} and Rice Bowl`,            "Fluffy jasmine rice topped with seasoned protein and pickled veg.",  "30 min", "Japanese"],
        [`Pan-Seared ${tags[0]}`,               "Golden crust, tender inside — finished with a brown butter sauce.",  "22 min", "French"],
        [`${tags[0]} Coconut Curry`,            "Fragrant coconut milk curry with kaffir lime and fresh basil.",      "40 min", "Thai"],
        [`Crispy ${tags[0]} Tacos`,             "Crunchy shell filled with seasoned filling, slaw and lime crema.",   "25 min", "Mexican"],
        [`${tags[0]} Mediterranean Salad`,      "Fresh greens, olives, feta and a bright lemon-herb dressing.",       "15 min", "Greek"],
      ];

      const EMOJIS = ["🍗","🥘","🍝","🍜","🥗","🍲","🌮","🥙","🫕","🍛"];

      // Exact count — no more, no less
      const generated = Array.from({ length: count }, (_, i) => {
        const [name, desc, time, cuisine] = NAMES[i % NAMES.length];
        return {
          id:      `gen-${Date.now()}-${i}`,
          name,
          desc:    mealType ? `${mealType} option. ${desc}` : desc,
          time:    `${Math.min(cookTime, parseInt(time)||30)} min`,
          cuisine,
          image:   null,
          emoji:   EMOJIS[i % EMOJIS.length],
        };
      });

      // Exactly `count` recipes rendered
      setRecipes(p => [...generated, ...p]);
      setToast(`✓ ${count} recipe${count>1?"s":""} generated!`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 200);

    } catch(e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Visible recipes ──────────────────────────────────────────
  const visible = view === "saved"
    ? recipes.filter(r => saved.has(r.id))
    : recipes;

  return (
    <>
      <style>{CSS}</style>

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-logo">
          <span>🍳</span>
          <span>Culinary Logic</span>
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={()=>setView("discover")}>Home</button>
          <button className="nav-link" onClick={()=>{setView("discover");resultsRef.current?.scrollIntoView({behavior:"smooth"})}}>Recipes</button>
          <button className="nav-link" onClick={()=>setView("saved")}>
            Saved {saved.size > 0 && <span style={{background:PRIMARY,color:"#fff",borderRadius:"10px",padding:"1px 7px",fontSize:11,marginLeft:4}}>{saved.size}</span>}
          </button>
          {!user
            ? <button className="nav-btn" onClick={()=>setShowLogin(true)}>
                Sign In
              </button>
            : <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14,color:MUTED}}>Hi, {user.displayName}</span>
                <button className="nav-btn" style={{background:"#f0f0f0",color:DARK}} onClick={()=>{setUser(null);window.__firebaseToken__=null;setToast("Signed out.")}}>
                  Sign Out
                </button>
              </div>
          }
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        {/* Left: Input Card */}
        <div className="input-card fu">
          <div className="card-title">What's in your kitchen?</div>
          <div className="card-sub">Add your ingredients and get personalized recipes instantly.</div>

          {/* Ingredient Tag Input */}
          <div className="field">
            <div className="field-label">Ingredients</div>
            <div className="ing-row">
              <input className="ing-input" value={ingInput} onChange={e=>setIngInput(e.target.value)}
                placeholder="e.g. chicken, garlic…"
                onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){e.preventDefault();addTag();} }}/>
              <button className="ing-add" onClick={addTag}>+ Add</button>
            </div>
            {tags.length > 0 && (
              <div className="tags-wrap">
                {tags.map(t => (
                  <span key={t} className="tag">
                    {t}
                    <button className="tag-x" onClick={()=>removeTag(t)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="row2">
            <div className="field">
              <div className="field-label">Meal Type</div>
              <select className="select" value={mealType} onChange={e=>setMealType(e.target.value)}>
                {MEAL_TYPES.map(o=><option key={o} value={o==="Any"?"":o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <div className="field-label">Taste</div>
              <select className="select" value={taste} onChange={e=>setTaste(e.target.value)}>
                {TASTE_OPTS.map(o=><option key={o} value={o==="Any"?"":o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <div className="field-label" style={{display:"flex",justifyContent:"space-between"}}>
              <span>Cooking Time</span>
              <span style={{color:PRIMARY,fontWeight:600}}>Up to {cookTime} min</span>
            </div>
            <input type="range" className="slider" min={10} max={180} step={5} value={cookTime} onChange={e=>setCookTime(+e.target.value)}/>
          </div>

          <div className="field">
            <div className="field-label" style={{display:"flex",justifyContent:"space-between"}}>
              <span>Number of Recipes</span>
              <span style={{color:PRIMARY,fontWeight:600}}>{count}</span>
            </div>
            <input type="range" className="slider" min={1} max={10} value={count} onChange={e=>setCount(+e.target.value)}/>
          </div>

          {error && <div className="error-banner">{error}<button onClick={()=>setError("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#cc0000"}}>×</button></div>}

          <button className="gen-btn" onClick={handleGenerate} disabled={loading||tags.length===0}>
            {loading
              ? <><div className="spinner"/> Generating {count} recipe{count>1?"s":""}…</>
              : <>✨ Generate {count} Recipe{count>1?"s":""}</>
            }
          </button>
        </div>

        {/* Right: Hero Image */}
        <div className="fu1">
          <img className="hero-img"
            src="https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=800&q=80"
            alt="Fresh ingredients on a wooden table"/>
        </div>
      </div>

      {/* ── RECIPE GRID ── */}
      <div className="divider"/>
      <div className="section" ref={resultsRef}>
        <div className="section-title">
          {view==="saved" ? "Saved Recipes" : "Recipe Collection"}
        </div>
        <div className="section-sub">
          {view==="saved"
            ? `${saved.size} saved recipe${saved.size!==1?"s":""}`
            : `${visible.length} recipes · click ♡ to save any recipe`
          }
        </div>

        {/* View toggle */}
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {["discover","saved"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:"8px 20px", borderRadius:8, border:"none", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:14,
              background: view===v ? PRIMARY : "#fff",
              color:      view===v ? "#fff"  : MUTED,
              boxShadow:  view===v ? "0 4px 12px rgba(255,122,24,.25)" : "none",
              transition: "all .2s",
            }}>
              {v==="discover" ? "All Recipes" : `Saved (${saved.size})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="recipe-grid">
            {Array.from({length:count}).map((_,i)=><SkeletonCard key={i} i={i}/>)}
          </div>
        )}

        {!loading && visible.length===0 && (
          <div className="empty">
            <div className="empty-icon">{view==="saved"?"🔖":"🍽️"}</div>
            <p style={{fontSize:18,fontWeight:600,color:DARK,marginBottom:8}}>
              {view==="saved" ? "No saved recipes yet" : "No recipes yet"}
            </p>
            <p style={{fontSize:14}}>
              {view==="saved" ? "Click ♡ on any recipe to save it here." : "Add ingredients above and hit Generate."}
            </p>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="recipe-grid">
            {visible.map((r,i)=>(
              <RecipeCard key={r.id} r={r} saved={saved} onSave={toggleSave} delay={i*.06}/>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo">🍳 Culinary Logic</div>
            <div className="footer-tagline">Your smart culinary assistant.</div>
          </div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            <a href="#" style={{color:"#999",fontSize:13,textDecoration:"none"}}>Privacy</a>
            <a href="#" style={{color:"#999",fontSize:13,textDecoration:"none"}}>Terms</a>
            <a href="#" style={{color:"#999",fontSize:13,textDecoration:"none"}}>Contact</a>
          </div>
          <div className="footer-copy">© 2026 Culinary Logic. All rights reserved.</div>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onLogin={u=>{setUser(u);setToast(`Welcome, ${u.displayName}! 👋`);}}/>}

      {/* ── TOAST ── */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
