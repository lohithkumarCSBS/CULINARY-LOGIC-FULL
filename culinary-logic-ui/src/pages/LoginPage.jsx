// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInGoogle, signInEmail, signUpEmail } from "../firebase";

const P = "#ff7a18";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#faf7f2;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fu{animation:fadeUp .5s ease both}
.spinner{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;
  border-radius:50%;animation:spin .7s linear infinite;display:inline-block;flex-shrink:0}
`;

export default function LoginPage() {
  const nav = useNavigate();
  const [mode,    setMode]    = useState("login");
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState("");

  const submit = async () => {
    if (!email.trim() || !pass.trim()) { setErr("Please enter email and password."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr(""); setOk("");
    try {
      if (mode === "login") await signInEmail(email, pass);
      else                  await signUpEmail(email, pass);
      // onAuthStateChanged in App.jsx handles redirect automatically
    } catch(e) {
      const msg = e.code === "auth/user-not-found"      ? "No account found with this email."
                : e.code === "auth/wrong-password"       ? "Incorrect password."
                : e.code === "auth/email-already-in-use" ? "Email already in use."
                : e.code === "auth/invalid-email"        ? "Invalid email address."
                : e.message || "Authentication failed.";
      setErr(msg);
    } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true); setErr("");
    try {
      await signInGoogle();
      // redirect handled by App.jsx
    } catch(e) {
      setErr(e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : "Google sign-in failed.");
    } finally { setLoading(false); }
  };

  const S = {
    page:    { minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr" },
    left:    { background:"#2d2d2d", display:"flex", flexDirection:"column", justifyContent:"center",
               padding:"64px", color:"#fff" },
    logo:    { fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:700, marginBottom:16,
               display:"flex", alignItems:"center", gap:12 },
    tagline: { fontSize:32, fontFamily:"'Fraunces',serif", fontWeight:700, lineHeight:1.3,
               marginBottom:16, color:"#fff" },
    sub:     { color:"rgba(255,255,255,.55)", fontSize:15, lineHeight:1.7, maxWidth:340 },
    features:{ marginTop:40, display:"flex", flexDirection:"column", gap:14 },
    feat:    { display:"flex", alignItems:"center", gap:12, color:"rgba(255,255,255,.7)", fontSize:14 },
    dot:     { width:8, height:8, borderRadius:"50%", background:P, flexShrink:0 },
    right:   { display:"flex", alignItems:"center", justifyContent:"center", padding:40 },
    card:    { width:"100%", maxWidth:420 },
    title:   { fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:700, color:"#2d2d2d", marginBottom:6 },
    sub2:    { color:"#777", fontSize:14, marginBottom:32 },
    inp:     { width:"100%", height:50, border:"1.5px solid #e5e5e5", borderRadius:8, padding:"0 14px",
               fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none",
               marginBottom:12, color:"#2d2d2d", transition:"border-color .2s" },
    btn:     { width:"100%", height:50, background:P, color:"#fff", border:"none", borderRadius:8,
               fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer",
               display:"flex", alignItems:"center", justifyContent:"center", gap:8,
               transition:"background .2s" },
    gBtn:    { width:"100%", height:50, background:"#fff", color:"#2d2d2d", border:"1.5px solid #e5e5e5",
               borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:15,
               cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
               gap:10, marginTop:12, transition:"all .2s" },
    or:      { textAlign:"center", color:"#ccc", fontSize:13, margin:"16px 0", position:"relative" },
    err:     { background:"#fff0f0", border:"1px solid #ffd0d0", color:"#c00", fontSize:13,
               padding:"10px 14px", borderRadius:8, marginBottom:12 },
    ok:      { background:"#f0fff4", border:"1px solid #bbf7d0", color:"#15803d", fontSize:13,
               padding:"10px 14px", borderRadius:8, marginBottom:12 },
    sw:      { textAlign:"center", marginTop:20, fontSize:13, color:"#777" },
    swBtn:   { background:"none", border:"none", color:P, cursor:"pointer", fontWeight:700,
               fontFamily:"'DM Sans',sans-serif", fontSize:13 },
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={S.page}>

        {/* Left panel */}
        <div style={S.left}>
          <div style={S.logo}>🍳 <span>Culinary Logic</span></div>
          <div style={S.tagline}>Your smart culinary assistant</div>
          <div style={S.sub}>
            Generate personalised recipes from your ingredients using AI. Save your favourites and cook with confidence.
          </div>
          <div style={S.features}>
            {["AI-powered recipe generation","Ingredient-based suggestions","Save & organise your recipes","Step-by-step cooking instructions"].map(f=>(
              <div key={f} style={S.feat}><div style={S.dot}/>{f}</div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={S.right}>
          <div style={S.card} className="fu">
            <div style={S.title}>{mode==="login"?"Welcome back 👋":"Create account"}</div>
            <div style={S.sub2}>{mode==="login"?"Sign in to your account to continue.":"Join thousands of home cooks."}</div>

            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}

            <input style={S.inp} type="email"    placeholder="Email address"
              value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()}
              onFocus={e=>e.target.style.borderColor=P}
              onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
            <input style={S.inp} type="password" placeholder="Password (min 6 characters)"
              value={pass}  onChange={e=>setPass(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()}
              onFocus={e=>e.target.style.borderColor=P}
              onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>

            <button style={S.btn} onClick={submit} disabled={loading}
              onMouseEnter={e=>e.target.style.background="#e56d10"}
              onMouseLeave={e=>e.target.style.background=P}>
              {loading
                ? <><div className="spinner"/>{mode==="login"?"Signing in…":"Creating account…"}</>
                : mode==="login" ? "Sign In" : "Create Account"
              }
            </button>

            <div style={S.or}>or</div>

            <button style={S.gBtn} onClick={google} disabled={loading}
              onMouseEnter={e=>e.currentTarget.style.background="#f9f9f9"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div style={S.sw}>
              {mode==="login"?"Don't have an account? ":"Already have an account? "}
              <button style={S.swBtn} onClick={()=>{setMode(m=>m==="login"?"signup":"login");setErr("");setOk("");}}>
                {mode==="login"?"Sign up":"Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}