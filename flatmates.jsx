import { useState, useEffect } from "react";

// ── Data helpers ──────────────────────────────────────────────────────────────
const DB_KEY   = "flatmates_db_v1";
const SESS_KEY = "flatmates_session";
const EMPTY    = { users: [], loans: [], meals: [], expenses: [] };

const uid   = () => Math.random().toString(36).slice(2, 11);
const today = () => new Date().toISOString().split("T")[0];
const nowISO = () => new Date().toISOString();
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-EG", { month: "short", day: "numeric" });
const fmtMoney = (n) => Number(n).toLocaleString("en-EG") + " EGP";
const thisMonth = () => new Date().toISOString().slice(0, 7);

async function dbLoad() {
  try {
    const r = await window.storage.get(DB_KEY, true);
    return r ? JSON.parse(r.value) : EMPTY;
  } catch { return EMPTY; }
}
async function dbSave(d) {
  try { await window.storage.set(DB_KEY, JSON.stringify(d), true); } catch {}
}

// ── Styling constants ─────────────────────────────────────────────────────────
const S = {
  bg:      "#07080f",
  surface: "#0e1018",
  card:    "#121520",
  border:  "#1c2038",
  accent:  "#ff6b35",
  teal:    "#00d4aa",
  text:    "#e8edf5",
  muted:   "#5a6175",
  red:     "#ff4757",
  green:   "#2ed573",
  yellow:  "#ffd32a",
};

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  body { background: ${S.bg}; color: ${S.text}; font-family: 'Outfit', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  input, select, textarea, button { font-family: 'Outfit', sans-serif; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${S.border}; border-radius: 2px; }
  @keyframes up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .up { animation: up 0.22s ease-out; }
  @keyframes popIn { from { opacity:0; transform:scale(0.97) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .pop { animation: popIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
`;

const CATS = [
  { icon: "🍔", label: "Food" },
  { icon: "🚌", label: "Transport" },
  { icon: "📚", label: "Study" },
  { icon: "🏠", label: "Housing" },
  { icon: "💊", label: "Health" },
  { icon: "🎮", label: "Fun" },
  { icon: "🛍️", label: "Shopping" },
  { icon: "💼", label: "Other" },
];

const USER_COLORS = ["#ff6b35","#00d4aa","#7c3aed","#ec4899","#3b82f6","#f59e0b","#10b981","#ef4444"];
const userColor = (name = "") => USER_COLORS[(name.charCodeAt(0) || 65) % USER_COLORS.length];
const initials  = (name = "") => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

// ── Atomic components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }) {
  const c = userColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c + "25", border: `2px solid ${c}50`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: c, fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
      letterSpacing: "-0.5px",
    }}>
      {initials(name)}
    </div>
  );
}

function Card({ children, style, onClick, glow }) {
  return (
    <div onClick={onClick} style={{
      background: S.card,
      border: `1px solid ${glow ? glow + "50" : S.border}`,
      borderRadius: 16, padding: 18,
      boxShadow: glow ? `0 0 20px ${glow}15` : "none",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.15s",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, style, sm, disabled }) {
  const vs = {
    primary:  { background: S.accent,   color: "#fff" },
    teal:     { background: S.teal,     color: "#000" },
    ghost:    { background: "transparent", color: S.muted, border: `1px solid ${S.border}` },
    danger:   { background: "#ff475720", color: S.red,   border: `1px solid #ff475740` },
    success:  { background: "#2ed57320", color: S.green, border: `1px solid #2ed57340` },
    secondary:{ background: S.surface,  color: S.text,  border: `1px solid ${S.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? "7px 14px" : "12px 22px",
      borderRadius: 11, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 600, fontSize: sm ? 12 : 15, opacity: disabled ? 0.45 : 1,
      transition: "opacity 0.15s, transform 0.1s",
      ...vs[variant], ...style,
    }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: S.muted, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</label>}
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, autoFocus }) {
  const shared = {
    background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10,
    padding: "11px 14px", color: S.text, fontSize: 15, width: "100%", outline: "none",
  };
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus} style={shared} />
    </Field>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10,
        padding: "11px 14px", color: value ? S.text : S.muted, fontSize: 15, width: "100%", outline: "none",
        cursor: "pointer",
      }}>
        {children}
      </select>
    </Field>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(7,8,15,0.82)", backdropFilter: "blur(5px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div className="pop" onClick={e => e.stopPropagation()} style={{
        background: S.card, border: `1px solid ${S.border}`,
        borderRadius: "22px 22px 0 0", padding: "22px 18px 34px",
        width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`,
            background: S.surface, color: S.muted, cursor: "pointer", fontSize: 18,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tag({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 20, border: `1px solid ${active ? (color || S.accent) + "70" : S.border}`,
      background: active ? (color || S.accent) + "22" : S.surface,
      color: active ? (color || S.accent) : S.muted,
      cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
      transition: "all 0.12s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

// ── Auth screen ───────────────────────────────────────────────────────────────
function Auth({ data, onUpdate, onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", budget: "" });
  const [err, setErr]   = useState("");
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    setErr("");
    if (mode === "login") {
      const user = data.users.find(u =>
        u.email === form.email.trim().toLowerCase() && u.password === form.password
      );
      if (!user) { setErr("Wrong email or password"); return; }
      onLogin(user.id);
    } else {
      if (!form.name || !form.email || !form.password) { setErr("Please fill all fields"); return; }
      if (data.users.find(u => u.email === form.email.trim().toLowerCase())) {
        setErr("Email already registered"); return;
      }
      const user = {
        id: uid(), name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        budget: Number(form.budget) || 0,
        createdAt: nowISO(),
      };
      const nd = { ...data, users: [...data.users, user] };
      onUpdate(nd);
      onLogin(user.id);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <style>{FONT}</style>
      <div className="up" style={{ width: "100%", maxWidth: 360 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>⚡</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>
            flat<span style={{ color: S.accent }}>mates</span>
          </div>
          <div style={{ color: S.muted, fontSize: 14, marginTop: 3 }}>Student money, shared smart</div>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: S.surface, borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${S.border}` }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
              background: mode === m ? S.accent : "transparent",
              color: mode === m ? "#fff" : S.muted,
              fontWeight: 600, fontSize: 14, transition: "all 0.15s",
            }}>
              {m === "login" ? "👋 Sign in" : "✨ Register"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <Input label="Your name" value={form.name} onChange={f("name")} placeholder="Ahmed Khaled" autoFocus />
          )}
          <Input label="Email" type="email" value={form.email} onChange={f("email")} placeholder="you@email.com" />
          <Input label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" />
          {mode === "register" && (
            <Input label="Monthly budget (EGP)" type="number" value={form.budget} onChange={f("budget")} placeholder="e.g. 3000" />
          )}
        </div>

        {err && (
          <div style={{ color: S.red, fontSize: 13, marginTop: 10, textAlign: "center", padding: "8px", background: "#ff475712", borderRadius: 8 }}>
            {err}
          </div>
        )}

        <Btn onClick={submit} style={{ width: "100%", marginTop: 18, padding: "14px", fontSize: 16 }}>
          {mode === "login" ? "Sign In →" : "Create Account →"}
        </Btn>

        <div style={{ textAlign: "center", color: S.muted, fontSize: 12, marginTop: 22, lineHeight: 1.7 }}>
          All data is stored locally and shared<br />within your group 🔒
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb]       = useState(null);
  const [uid_, setUid]    = useState(null);
  const [tab, setTab]     = useState("home");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await dbLoad();
      setDb(d);
      try {
        const s = await window.storage.get(SESS_KEY, false);
        if (s) setUid(s.value);
      } catch {}
    })();
  }, []);

  const save = async (nd) => { setDb({ ...nd }); await dbSave(nd); };
  const login = async (id) => {
    setUid(id);
    try { await window.storage.set(SESS_KEY, id, false); } catch {}
  };
  const logout = async () => {
    setUid(null); setTab("home");
    try { await window.storage.delete(SESS_KEY, false); } catch {}
  };

  if (!db) return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{FONT}</style>
      <div style={{ fontSize: 32, animation: "up 0.3s ease" }}>⚡</div>
    </div>
  );

  const me = db.users.find(u => u.id === uid_);
  if (!me) return <Auth data={db} onUpdate={save} onLogin={login} />;

  // ── Computed stats ──────────────────────────────────────────────────────────
  const myExpenses   = db.expenses.filter(e => e.userId === me.id && e.date.startsWith(thisMonth()));
  const totalSpent   = myExpenses.reduce((s, e) => s + e.amount, 0);
  const budgetLeft   = me.budget - totalSpent;

  const activeLoans  = db.loans.filter(l => l.status === "active");
  const iOweLoans    = activeLoans.filter(l => l.borrowerId === me.id).reduce((s, l) => s + l.amount, 0);
  const owedMeLoans  = activeLoans.filter(l => l.lenderId  === me.id).reduce((s, l) => s + l.amount, 0);

  const unsettledMeals = db.meals.filter(m =>
    m.participants.includes(me.id) && m.payerId !== me.id && !m.settledBy.includes(me.id)
  );
  const mealDebt = unsettledMeals.reduce((s, m) => s + (m.splits[me.id] || 0), 0);

  const totalIOwe  = iOweLoans + mealDebt;
  const totalOwed  = owedMeLoans;
  const netBalance = totalOwed - totalIOwe;

  // ── Tabs config ─────────────────────────────────────────────────────────────
  const TABS = [
    { id: "home",    icon: "🏠", label: "Home" },
    { id: "wallet",  icon: "💳", label: "Wallet" },
    { id: "debts",   icon: "🤝", label: "Debts" },
    { id: "meals",   icon: "🍽️", label: "Meals" },
    { id: "friends", icon: "👥", label: "Friends" },
  ];

  const FAB_MODAL = { home: "expense", wallet: "expense", debts: "loan", meals: "meal" };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 82 }}>
      <style>{FONT}</style>

      {/* ── Header ── */}
      <div style={{ padding: "18px 18px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: S.muted }}>
            {new Date().toLocaleDateString("en-EG", { weekday: "long", month: "long", year: "numeric" })}
          </div>
          <div style={{ fontWeight: 800, fontSize: 21, marginTop: 2 }}>
            Hey, {me.name.split(" ")[0]} 👋
          </div>
        </div>
        <button onClick={() => setModal("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <Avatar name={me.name} size={44} />
        </button>
      </div>

      {/* ── Page content ── */}
      <div style={{ padding: "6px 14px" }}>
        {tab === "home"    && <HomeTab    db={db} me={me} totalSpent={totalSpent} budgetLeft={budgetLeft} totalIOwe={totalIOwe} totalOwed={totalOwed} netBalance={netBalance} setTab={setTab} />}
        {tab === "wallet"  && <WalletTab  db={db} me={me} totalSpent={totalSpent} myExpenses={myExpenses} onSave={save} />}
        {tab === "debts"   && <DebtsTab   db={db} me={me} onSave={save} />}
        {tab === "meals"   && <MealsTab   db={db} me={me} onSave={save} />}
        {tab === "friends" && <FriendsTab db={db} me={me} />}
      </div>

      {/* ── FAB ── */}
      {tab !== "friends" && (
        <button onClick={() => setModal(FAB_MODAL[tab] || "expense")} style={{
          position: "fixed", bottom: 90, right: 20, width: 52, height: 52,
          borderRadius: "50%", background: S.accent, border: "none",
          cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center",
          justifyContent: "center", boxShadow: `0 6px 24px ${S.accent}60`,
          zIndex: 50, color: "#fff", fontWeight: 300,
        }}>+</button>
      )}

      {/* ── Bottom nav ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: S.card, borderTop: `1px solid ${S.border}`,
        display: "flex", zIndex: 60,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent",
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.id ? S.accent : S.muted, transition: "color 0.15s",
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Modals ── */}
      {modal === "expense"  && <ExpenseModal  db={db} me={me} onSave={save} onClose={() => setModal(null)} />}
      {modal === "loan"     && <LoanModal     db={db} me={me} onSave={save} onClose={() => setModal(null)} />}
      {modal === "meal"     && <MealModal     db={db} me={me} onSave={save} onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal db={db} me={me} onSave={save} onClose={() => setModal(null)} onLogout={logout} />}
    </div>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────────────────────
function HomeTab({ db, me, totalSpent, budgetLeft, totalIOwe, totalOwed, netBalance, setTab }) {
  const pct   = me.budget > 0 ? Math.min(100, (totalSpent / me.budget) * 100) : 0;
  const bar   = pct > 80 ? S.red : pct > 55 ? S.yellow : S.teal;

  // Recent activity
  const recentExp = db.expenses.filter(e => e.userId === me.id)
    .map(e => ({ ...e, _type: "exp", _sort: e.date }));
  const recentLoan = db.loans.filter(l => l.lenderId === me.id || l.borrowerId === me.id)
    .map(l => ({ ...l, _type: "loan", _sort: l.date }));
  const recentMeal = db.meals.filter(m => m.participants.includes(me.id) || m.payerId === me.id)
    .map(m => ({ ...m, _type: "meal", _sort: m.date }));
  const recent = [...recentExp, ...recentLoan, ...recentMeal]
    .sort((a, b) => b._sort.localeCompare(a._sort)).slice(0, 7);

  const usr = id => db.users.find(u => u.id === id);

  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Budget card */}
      <Card glow={S.teal} style={{ background: "linear-gradient(140deg, #121520, #151c2e)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: "0.6px", marginBottom: 4 }}>MONTHLY BUDGET</div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.5, color: budgetLeft < 0 ? S.red : S.text }}>
              {fmtMoney(Math.abs(budgetLeft))}
            </div>
            <div style={{ fontSize: 13, color: S.muted, marginTop: 2 }}>
              {budgetLeft < 0 ? "over budget" : `left of ${fmtMoney(me.budget)}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 4 }}>SPENT</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: pct > 80 ? S.red : S.text }}>{fmtMoney(totalSpent)}</div>
          </div>
        </div>
        <div style={{ background: S.surface, borderRadius: 6, height: 7, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: bar, borderRadius: 6, transition: "width 0.7s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: S.muted }}>{pct.toFixed(0)}% used</span>
          {me.budget === 0 && <span style={{ fontSize: 11, color: S.accent }}>Set budget in settings ↗</span>}
        </div>
      </Card>

      {/* Owe / Owed row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Card onClick={() => setTab("debts")} glow={totalIOwe > 0 ? S.red : undefined} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 8 }}>YOU OWE</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: totalIOwe > 0 ? S.red : S.green }}>
            {fmtMoney(totalIOwe)}
          </div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>tap to settle →</div>
        </Card>
        <Card onClick={() => setTab("debts")} glow={totalOwed > 0 ? S.teal : undefined} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 8 }}>OWED TO YOU</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: totalOwed > 0 ? S.teal : S.text }}>
            {fmtMoney(totalOwed)}
          </div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>tap to collect →</div>
        </Card>
      </div>

      {/* Net balance pill */}
      {(totalIOwe > 0 || totalOwed > 0) && (
        <div style={{
          padding: "10px 16px", borderRadius: 12,
          background: netBalance >= 0 ? S.green + "12" : S.red + "12",
          border: `1px solid ${netBalance >= 0 ? S.green : S.red}30`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: S.muted }}>Net balance</span>
          <span className="mono" style={{ fontWeight: 700, color: netBalance >= 0 ? S.green : S.red }}>
            {netBalance >= 0 ? "+" : ""}{fmtMoney(netBalance)}
          </span>
        </div>
      )}

      {/* Recent activity */}
      <div style={{ fontSize: 12, fontWeight: 600, color: S.muted, letterSpacing: "0.6px", paddingLeft: 2, marginTop: 4 }}>
        RECENT ACTIVITY
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: S.muted }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🚀</div>
          <div style={{ fontWeight: 600 }}>Nothing yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Tap + to add your first entry</div>
        </div>
      ) : recent.map(item => {
        if (item._type === "exp") return (
          <Card key={item.id} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: S.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
              {CATS.find(c => c.label === item.category)?.icon || "💼"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description || item.category}</div>
              <div style={{ color: S.muted, fontSize: 12 }}>{item.category} · {fmtDate(item.date)}</div>
            </div>
            <div className="mono" style={{ fontWeight: 700, color: S.red, whiteSpace: "nowrap" }}>-{fmtMoney(item.amount)}</div>
          </Card>
        );
        if (item._type === "loan") {
          const isLender = item.lenderId === me.id;
          const other = usr(isLender ? item.borrowerId : item.lenderId);
          return (
            <Card key={item.id} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={other?.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {isLender ? `Lent to ${other?.name?.split(" ")[0]}` : `Borrowed from ${other?.name?.split(" ")[0]}`}
                </div>
                <div style={{ color: S.muted, fontSize: 12 }}>{item.description} · {fmtDate(item.date)}</div>
              </div>
              <div className="mono" style={{ fontWeight: 700, color: isLender ? S.teal : S.red, whiteSpace: "nowrap" }}>
                {isLender ? "+" : "-"}{fmtMoney(item.amount)}
              </div>
            </Card>
          );
        }
        if (item._type === "meal") {
          const iPaid  = item.payerId === me.id;
          const share  = item.splits?.[me.id] || 0;
          return (
            <Card key={item.id} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: S.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>🍽️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                <div style={{ color: S.muted, fontSize: 12 }}>{iPaid ? "You paid" : "Your share"} · {fmtDate(item.date)}</div>
              </div>
              <div className="mono" style={{ fontWeight: 700, color: iPaid ? S.teal : S.red, whiteSpace: "nowrap" }}>
                {iPaid ? "+" : "-"}{fmtMoney(iPaid ? item.totalAmount - share : share)}
              </div>
            </Card>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── WALLET TAB ────────────────────────────────────────────────────────────────
function WalletTab({ db, me, totalSpent, myExpenses, onSave }) {
  const [confirm, setConfirm] = useState(null);

  const byCat = CATS.map(c => ({
    ...c,
    total: myExpenses.filter(e => e.category === c.label).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const sorted = [...myExpenses].sort((a, b) => b.date.localeCompare(a.date));

  const del = id => {
    onSave({ ...db, expenses: db.expenses.filter(e => e.id !== id) });
    setConfirm(null);
  };

  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: "linear-gradient(140deg, #121520, #151c2e)" }} glow={S.accent}>
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: "0.6px", marginBottom: 4 }}>SPENT THIS MONTH</div>
        <div className="mono" style={{ fontSize: 38, fontWeight: 800, color: S.accent, letterSpacing: -2 }}>{fmtMoney(totalSpent)}</div>
        <div style={{ color: S.muted, fontSize: 13, marginTop: 3 }}>{myExpenses.length} transactions</div>
      </Card>

      {byCat.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: S.muted, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 14 }}>CATEGORY BREAKDOWN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {byCat.map(c => {
              const p = totalSpent > 0 ? (c.total / totalSpent) * 100 : 0;
              return (
                <div key={c.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>{c.icon} {c.label}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(c.total)}</span>
                  </div>
                  <div style={{ background: S.surface, borderRadius: 4, height: 4 }}>
                    <div style={{ height: "100%", borderRadius: 4, background: S.accent, width: `${p}%`, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ fontSize: 12, fontWeight: 600, color: S.muted, letterSpacing: "0.6px", paddingLeft: 2 }}>TRANSACTIONS</div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: S.muted }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>💸</div>
          <div>No expenses this month</div>
        </div>
      ) : sorted.map(e => (
        <Card key={e.id} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: S.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
            {CATS.find(c => c.label === e.category)?.icon || "💼"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.description || e.category}
            </div>
            <div style={{ color: S.muted, fontSize: 12 }}>{e.category} · {fmtDate(e.date)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span className="mono" style={{ fontWeight: 700, color: S.red }}>-{fmtMoney(e.amount)}</span>
            <button onClick={() => setConfirm(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
        </Card>
      ))}

      {confirm && (
        <Sheet title="Delete expense?" onClose={() => setConfirm(null)}>
          <p style={{ color: S.muted, marginBottom: 20, fontSize: 14 }}>This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" onClick={() => setConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={() => del(confirm)} style={{ flex: 1 }}>Delete</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── DEBTS TAB ─────────────────────────────────────────────────────────────────
function DebtsTab({ db, me, onSave }) {
  const [sub,      setSub]      = useState("owe");
  const [settling, setSettling] = useState(null);

  const usr = id => db.users.find(u => u.id === id);

  // Loans
  const loanIOwe    = db.loans.filter(l => l.borrowerId === me.id && l.status === "active");
  const loanOwedMe  = db.loans.filter(l => l.lenderId   === me.id && l.status === "active");

  // Meal debts
  const mealIOwe = db.meals
    .filter(m => m.participants.includes(me.id) && m.payerId !== me.id && !m.settledBy.includes(me.id))
    .map(m => ({
      id: m.id + "__mealdebt",
      mealId: m.id, type: "meal",
      lenderId: m.payerId,
      borrowerId: me.id,
      amount: m.splits[me.id] || 0,
      description: `Meal: ${m.description}`,
      date: m.date,
    }));

  const mealOwedMe = db.meals
    .filter(m => m.payerId === me.id)
    .flatMap(m =>
      m.participants
        .filter(pid => pid !== me.id && !m.settledBy.includes(pid))
        .map(pid => ({
          id: `${m.id}__${pid}__mealowed`,
          mealId: m.id, participantId: pid, type: "meal",
          lenderId: me.id,
          borrowerId: pid,
          amount: m.splits[pid] || 0,
          description: `Meal: ${m.description}`,
          date: m.date,
        }))
    );

  const iOweAll  = [...loanIOwe,   ...mealIOwe  ];
  const owedAll  = [...loanOwedMe, ...mealOwedMe];
  const totalIOwe = iOweAll.reduce((s, l) => s + l.amount, 0);
  const totalOwed = owedAll.reduce((s, l) => s + l.amount, 0);

  const settle = item => {
    if (item.type === "meal") {
      const pid = item.participantId || me.id;
      const nd = {
        ...db,
        meals: db.meals.map(m => m.id === item.mealId
          ? { ...m, settledBy: [...m.settledBy, pid] }
          : m
        ),
      };
      onSave(nd);
    } else {
      onSave({ ...db, loans: db.loans.map(l => l.id === item.id ? { ...l, status: "settled" } : l) });
    }
    setSettling(null);
  };

  const list = sub === "owe" ? iOweAll : owedAll;

  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Subtabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setSub("owe")} style={{
          flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${sub === "owe" ? S.red + "60" : S.border}`,
          background: sub === "owe" ? S.red + "15" : S.surface,
          color: sub === "owe" ? S.red : S.muted,
          cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
        }}>
          📤 I Owe · <span className="mono">{fmtMoney(totalIOwe)}</span>
        </button>
        <button onClick={() => setSub("owed")} style={{
          flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${sub === "owed" ? S.teal + "60" : S.border}`,
          background: sub === "owed" ? S.teal + "15" : S.surface,
          color: sub === "owed" ? S.teal : S.muted,
          cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
        }}>
          📥 Owed · <span className="mono">{fmtMoney(totalOwed)}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: S.muted }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{sub === "owe" ? "🎉" : "💤"}</div>
          <div style={{ fontWeight: 600 }}>{sub === "owe" ? "You're all clear!" : "Nobody owes you right now"}</div>
        </div>
      ) : list.map(item => {
        const otherId = sub === "owe" ? item.lenderId : item.borrowerId;
        const other   = usr(otherId);
        return (
          <Card key={item.id} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={other?.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {sub === "owe" ? `Owe ${other?.name?.split(" ")[0]}` : `${other?.name?.split(" ")[0]} owes you`}
                </div>
                <div style={{ color: S.muted, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.description} · {fmtDate(item.date)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: sub === "owe" ? S.red : S.teal }}>
                  {fmtMoney(item.amount)}
                </div>
                <Btn variant={sub === "owe" ? "success" : "teal"} sm onClick={() => setSettling(item)} style={{ marginTop: 6 }}>
                  {sub === "owe" ? "✓ Paid" : "✓ Got It"}
                </Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {settling && (
        <Sheet title="Mark as settled?" onClose={() => setSettling(null)}>
          <div style={{ background: S.surface, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <div style={{ fontWeight: 600 }}>{settling.description}</div>
            <div style={{ color: S.teal, fontWeight: 700, fontSize: 18, marginTop: 4 }} className="mono">{fmtMoney(settling.amount)}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" onClick={() => setSettling(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="success" onClick={() => settle(settling)} style={{ flex: 1 }}>✓ Confirm</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── MEALS TAB ─────────────────────────────────────────────────────────────────
function MealsTab({ db, me, onSave }) {
  const usr   = id => db.users.find(u => u.id === id);
  const meals = [...db.meals]
    .filter(m => m.participants.includes(me.id) || m.payerId === me.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const settleMyShare = meal => {
    onSave({ ...db, meals: db.meals.map(m => m.id === meal.id ? { ...m, settledBy: [...m.settledBy, me.id] } : m) });
  };

  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {meals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: S.muted }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontWeight: 600 }}>No shared meals yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Tap + to log a group meal</div>
        </div>
      ) : meals.map(meal => {
        const iPaid    = meal.payerId === me.id;
        const settled  = iPaid || meal.settledBy.includes(me.id);
        const myShare  = meal.splits?.[me.id] || 0;
        const payer    = usr(meal.payerId);
        const paidBack = meal.participants.filter(p => meal.settledBy.includes(p));
        const allDone  = paidBack.length >= meal.participants.filter(p => p !== meal.payerId).length + 1;

        return (
          <Card key={meal.id} style={{ padding: "15px 16px", borderLeft: `3px solid ${iPaid ? S.teal : settled ? S.border : S.red}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{meal.description}</div>
                <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>
                  {fmtDate(meal.date)} · {meal.participants.length} people · paid by {iPaid ? "you" : payer?.name?.split(" ")[0]}
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{fmtMoney(meal.totalAmount)}</div>
            </div>

            {/* Per-person chips */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
              {meal.participants.map(pid => {
                const u     = usr(pid);
                const paid_ = meal.settledBy.includes(pid);
                return (
                  <div key={pid} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20, fontSize: 12,
                    background: paid_ ? S.teal + "18" : S.surface,
                    border: `1px solid ${paid_ ? S.teal + "50" : S.border}`,
                  }}>
                    <Avatar name={u?.name} size={18} />
                    <span style={{ color: paid_ ? S.teal : S.muted }}>{u?.name?.split(" ")[0]}</span>
                    <span className="mono" style={{ fontSize: 11, color: paid_ ? S.teal : S.muted }}>
                      {fmtMoney(meal.splits?.[pid] || 0)}
                    </span>
                    {paid_ && <span style={{ fontSize: 10 }}>✓</span>}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: S.muted }}>
                {iPaid
                  ? <span>You're owed <span style={{ color: S.teal }} className="mono">{fmtMoney(meal.totalAmount - myShare)}</span></span>
                  : <span>Your share: <span className="mono" style={{ color: settled ? S.muted : S.red }}>{fmtMoney(myShare)}</span></span>
                }
              </div>
              {!iPaid && !settled && (
                <Btn variant="success" sm onClick={() => settleMyShare(meal)}>✓ I Paid My Share</Btn>
              )}
              {settled && !iPaid && <span style={{ fontSize: 12, color: S.green }}>✓ Settled</span>}
              {iPaid && allDone && <span style={{ fontSize: 12, color: S.teal }}>✓ All paid back</span>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── FRIENDS TAB ───────────────────────────────────────────────────────────────
function FriendsTab({ db, me }) {
  const friends = db.users.filter(u => u.id !== me.id);

  const netWith = fid => {
    const lent = db.loans.filter(l => l.lenderId === me.id && l.borrowerId === fid && l.status === "active")
      .reduce((s, l) => s + l.amount, 0);
    const borrowed = db.loans.filter(l => l.borrowerId === me.id && l.lenderId === fid && l.status === "active")
      .reduce((s, l) => s + l.amount, 0);
    const mealLent = db.meals.filter(m => m.payerId === me.id && m.participants.includes(fid) && !m.settledBy.includes(fid))
      .reduce((s, m) => s + (m.splits?.[fid] || 0), 0);
    const mealOwed = db.meals.filter(m => m.payerId === fid && m.participants.includes(me.id) && !m.settledBy.includes(me.id))
      .reduce((s, m) => s + (m.splits?.[me.id] || 0), 0);
    return (lent + mealLent) - (borrowed + mealOwed);
  };

  return (
    <div className="up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: S.muted, letterSpacing: "0.6px", paddingLeft: 2 }}>
        {friends.length} FLATMATE{friends.length !== 1 ? "S" : ""} IN YOUR GROUP
      </div>

      {friends.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: S.muted }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 600 }}>No friends yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Share the app so your flatmates can register</div>
        </div>
      ) : friends.map(f => {
        const bal = netWith(f.id);
        return (
          <Card key={f.id} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={f.name} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{f.name}</div>
              <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>{f.email}</div>
              {f.budget > 0 && (
                <div style={{ color: S.muted, fontSize: 11, marginTop: 2 }}>
                  Budget: <span style={{ color: S.text }} className="mono">{fmtMoney(f.budget)}/mo</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {bal === 0 ? (
                <div style={{ fontSize: 12, color: S.muted }}>All even ✓</div>
              ) : (
                <>
                  <div className="mono" style={{ fontWeight: 700, color: bal > 0 ? S.teal : S.red, fontSize: 14 }}>
                    {bal > 0 ? "+" : ""}{fmtMoney(bal)}
                  </div>
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
                    {bal > 0 ? "they owe you" : "you owe them"}
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────────────────────

function ExpenseModal({ db, me, onSave, onClose }) {
  const [form, setForm] = useState({ amount: "", category: "Food", description: "", date: today() });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    const exp = { id: uid(), userId: me.id, amount: Number(form.amount), category: form.category, description: form.description, date: form.date || today() };
    onSave({ ...db, expenses: [...db.expenses, exp] });
    onClose();
  };

  return (
    <Sheet title="Add Expense" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Amount (EGP)" type="number" value={form.amount} onChange={f("amount")} placeholder="0" autoFocus />
        <Field label="Category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {CATS.map(c => (
              <Tag key={c.label} label={`${c.icon} ${c.label}`} active={form.category === c.label}
                onClick={() => f("category")(c.label)} />
            ))}
          </div>
        </Field>
        <Input label="Description (optional)" value={form.description} onChange={f("description")} placeholder="What was this for?" />
        <Input label="Date" type="date" value={form.date} onChange={f("date")} />
        <Btn onClick={submit} style={{ marginTop: 4 }}>Add Expense</Btn>
      </div>
    </Sheet>
  );
}

function LoanModal({ db, me, onSave, onClose }) {
  const [form, setForm] = useState({ type: "borrow", friendId: "", amount: "", description: "" });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const friends = db.users.filter(u => u.id !== me.id);

  const submit = () => {
    if (!form.friendId || !form.amount || Number(form.amount) <= 0) return;
    const loan = {
      id: uid(),
      lenderId:  form.type === "borrow" ? form.friendId : me.id,
      borrowerId: form.type === "borrow" ? me.id : form.friendId,
      amount: Number(form.amount),
      description: form.description || (form.type === "borrow" ? "Borrowed" : "Lent"),
      date: today(),
      status: "active",
    };
    onSave({ ...db, loans: [...db.loans, loan] });
    onClose();
  };

  return (
    <Sheet title="Record Debt" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "borrow", label: "📥 I Borrowed", color: S.red },
            { id: "lend",   label: "📤 I Lent",     color: S.teal },
          ].map(t => (
            <button key={t.id} onClick={() => f("type")(t.id)} style={{
              flex: 1, padding: 11, borderRadius: 10,
              border: `1px solid ${form.type === t.id ? t.color + "60" : S.border}`,
              background: form.type === t.id ? t.color + "18" : S.surface,
              color: form.type === t.id ? t.color : S.muted,
              cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        <Select label={form.type === "borrow" ? "Borrowed from" : "Lent to"} value={form.friendId} onChange={f("friendId")}>
          <option value="">Select friend…</option>
          {friends.map(fr => <option key={fr.id} value={fr.id}>{fr.name}</option>)}
        </Select>

        <Input label="Amount (EGP)" type="number" value={form.amount} onChange={f("amount")} placeholder="0" />
        <Input label="What for?" value={form.description} onChange={f("description")} placeholder="Lunch, taxi, groceries…" />
        <Btn onClick={submit} style={{ marginTop: 4 }}>Record Debt</Btn>
      </div>
    </Sheet>
  );
}

function MealModal({ db, me, onSave, onClose }) {
  const [form, setForm] = useState({
    description: "", total: "", payerId: me.id,
    participants: db.users.map(u => u.id), // all in by default
  });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const toggle = uid_ => {
    if (uid_ === form.payerId) return;
    setForm(p => ({
      ...p,
      participants: p.participants.includes(uid_)
        ? p.participants.filter(id => id !== uid_)
        : [...p.participants, uid_],
    }));
  };

  const setPayer = pid => {
    setForm(p => ({
      ...p, payerId: pid,
      participants: p.participants.includes(pid) ? p.participants : [...p.participants, pid],
    }));
  };

  const perPerson = form.total && form.participants.length > 0
    ? (Number(form.total) / form.participants.length).toFixed(0)
    : 0;

  const submit = () => {
    if (!form.total || Number(form.total) <= 0 || form.participants.length === 0) return;
    const total  = Number(form.total);
    const splits = {};
    form.participants.forEach(pid => { splits[pid] = total / form.participants.length; });
    const meal = {
      id: uid(), payerId: form.payerId, participants: form.participants,
      totalAmount: total, description: form.description || "Shared meal",
      date: today(), splits,
      settledBy: [form.payerId],
    };
    onSave({ ...db, meals: [...db.meals, meal] });
    onClose();
  };

  return (
    <Sheet title="Add Shared Meal" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="What did you eat?" value={form.description} onChange={f("description")} placeholder="Koshary, shawarma, pizza…" autoFocus />
        <Input label="Total bill (EGP)" type="number" value={form.total} onChange={f("total")} placeholder="0" />

        <Select label="Who paid?" value={form.payerId} onChange={setPayer}>
          {db.users.map(u => (
            <option key={u.id} value={u.id}>{u.id === me.id ? `You (${u.name})` : u.name}</option>
          ))}
        </Select>

        <Field label="Who ate? (tap to toggle)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {db.users.map(u => {
              const on     = form.participants.includes(u.id);
              const isPayer = u.id === form.payerId;
              return (
                <div key={u.id} onClick={() => toggle(u.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderRadius: 10, cursor: isPayer ? "default" : "pointer",
                  background: on ? S.teal + "12" : S.surface,
                  border: `1px solid ${on ? S.teal + "50" : S.border}`,
                  transition: "all 0.12s",
                }}>
                  <Avatar name={u.name} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.id === me.id ? "You" : u.name}</div>
                    {isPayer && <div style={{ fontSize: 11, color: S.teal }}>Paid the bill</div>}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: on ? S.teal : "transparent",
                    border: `2px solid ${on ? S.teal : S.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#000", fontSize: 12, fontWeight: 700,
                  }}>
                    {on && "✓"}
                  </div>
                </div>
              );
            })}
          </div>
        </Field>

        {perPerson > 0 && (
          <div style={{
            padding: "11px 15px", borderRadius: 10,
            background: S.teal + "12", border: `1px solid ${S.teal}40`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ color: S.muted, fontSize: 13 }}>Per person ({form.participants.length})</span>
            <span className="mono" style={{ fontWeight: 700, color: S.teal }}>{Number(perPerson).toLocaleString()} EGP</span>
          </div>
        )}

        <Btn onClick={submit} style={{ marginTop: 4 }}>Split the Bill 🍽️</Btn>
      </div>
    </Sheet>
  );
}

function SettingsModal({ db, me, onSave, onClose, onLogout }) {
  const [form, setForm] = useState({ name: me.name, budget: String(me.budget) });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    const updated = { ...me, name: form.name.trim() || me.name, budget: Number(form.budget) || 0 };
    onSave({ ...db, users: db.users.map(u => u.id === me.id ? updated : u) });
    onClose();
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 18px", gap: 8 }}>
          <Avatar name={me.name} size={68} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>{me.name}</div>
          <div style={{ color: S.muted, fontSize: 13 }}>{me.email}</div>
        </div>
        <Input label="Display name" value={form.name} onChange={f("name")} />
        <Input label="Monthly budget (EGP)" type="number" value={form.budget} onChange={f("budget")} placeholder="e.g. 3000" />
        <Btn onClick={save}>Save Changes</Btn>
        <Btn variant="danger" onClick={onLogout} style={{ marginTop: 4 }}>Sign Out</Btn>
      </div>
    </Sheet>
  );
}
