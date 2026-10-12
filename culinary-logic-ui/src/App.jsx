// src/App.jsx
// ── Auth gate: Login page first, Dashboard after sign-in ─────────
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuth } from "./firebase";
import LoginPage   from "./pages/LoginPage";
import Dashboard   from "./pages/Dashboard";

export default function App() {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#faf7f2",fontFamily:"'DM Sans',sans-serif",color:"#777",fontSize:15}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>🍳</div>
        <div>Loading Culinary Logic…</div>
      </div>
    </div>
  );

  return (
    <Routes>
      {/* Public: login */}
      <Route path="/login" element={
        user ? <Navigate to="/" replace/> : <LoginPage/>
      }/>

      {/* Protected: dashboard */}
      <Route path="/" element={
        user ? <Dashboard user={user}/> : <Navigate to="/login" replace/>
      }/>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}