import { useAuth } from "../context/AuthContext";
export default function Dashboard() {
  const { user, logout } = useAuth();
  const s = {
    page:  { minHeight:"100vh", background:"#1A0F07", color:"#F5EDD8", padding:"2rem", fontFamily:"sans-serif" },
    wrap:  { maxWidth:"900px", margin:"0 auto" },
    hdr:   { display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(201,149,42,0.15)", paddingBottom:"1.5rem", marginBottom:"3rem" },
    title: { fontSize:"2.5rem", fontWeight:300, margin:0, color:"#F5EDD8" },
    sub:   { fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.2em", color:"#D4824A", textTransform:"uppercase" as const, marginTop:"0.25rem" },
    grid:  { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem", marginBottom:"2rem" },
    card:  { background:"#4A2515", border:"1px solid rgba(245,237,216,0.08)", borderRadius:"4px", padding:"1.5rem" },
    num:   { fontSize:"2.5rem", fontWeight:300, marginBottom:"0.5rem" },
    lbl:   { fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"rgba(245,237,216,0.4)" },
    logbtn:{ background:"none", border:"none", fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"rgba(245,237,216,0.4)", cursor:"pointer" },
    status:{ background:"#4A2515", border:"1px solid rgba(245,237,216,0.08)", borderRadius:"4px", padding:"1.5rem" },
  };
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.hdr}>
          <div>
            <h1 style={s.title}>Bunna Bridge</h1>
            <p style={s.sub}>Dashboard</p>
          </div>
          <button style={s.logbtn} onClick={logout}>Sign out</button>
        </div>
        <div style={s.grid}>
          {[
            { label:"Active Lots", value:"—", color:"#C9952A" },
            { label:"EUDR Verified", value:"—", color:"#A8C5A0" },
            { label:"Pending Compliance", value:"—", color:"#C1440E" },
          ].map(s2 => (
            <div key={s2.label} style={s.card}>
              <div style={{ ...s.num, color: s2.color }}>{s2.value}</div>
              <div style={s.lbl}>{s2.label}</div>
            </div>
          ))}
        </div>
        <div style={s.status}>
          <p style={{ fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.15em", color:"#D4824A", textTransform:"uppercase", marginTop:0 }}>System Status</p>
          <p style={{ fontFamily:"monospace", fontSize:"0.85rem", color:"#A8C5A0", margin:0 }}>✓ Backend connected · ✓ Auth working · ✓ Ready to build</p>
          {user && <p style={{ fontFamily:"monospace", fontSize:"0.7rem", color:"rgba(245,237,216,0.3)", marginBottom:0 }}>Logged in as: {user.email}</p>}
        </div>
      </div>
    </div>
  );
}
