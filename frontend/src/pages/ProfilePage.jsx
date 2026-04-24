import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyCollection } from "../api/cardService";

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATARS = [
  "🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷",
  "🐸","🐺","🦝","🐹","🐱","🐶","🐰","🐧",
  "🦋","🐙","🦜","🐦","🦉","🐲","⭐","🌟",
];

function getAvatar() {
  return localStorage.getItem("lingodeck_avatar") || "🦊";
}

// Renders into document.body via portal — bypasses ALL parent transforms/overflow
function AvatarPicker({ current, onSelect, onClose }) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff4df",
          border: "3px solid #8b5a2b",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          width: "min(380px, 92vw)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: "#8b5a2b", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#fff4df", fontWeight: 900, fontSize: "16px" }}>Choose Your Avatar</span>
          <button onClick={onClose} style={{ color: "white", fontWeight: 900, fontSize: "20px", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
          {AVATARS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => onSelect(emoji)}
              style={{
                fontSize: "24px",
                padding: "8px",
                borderRadius: "12px",
                border: `2px solid ${current === emoji ? "#6a421f" : "transparent"}`,
                background: current === emoji ? "#8b5a2b" : "rgba(139,90,43,0.1)",
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: current === emoji ? "0 0 10px rgba(139,90,43,0.4)" : "none",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#7a5a36", paddingBottom: "12px" }}>
          Saved to your browser automatically.
        </p>
      </div>
    </div>,
    document.body
  );
}

// ── TCG Card ──────────────────────────────────────────────────────────────────

const TCG = {
  Common: {
    frame:   "linear-gradient(160deg, #e8e8e8 0%, #f5f5f5 40%, #e0e0e0 100%)",
    inner:   "linear-gradient(160deg, #f9f9f9, #efefef)",
    border:  "#c0c0c0",
    shine:   "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)",
    badge:   "#78716c",
    badgeTxt:"#fff",
    star:    "#a8a29e",
    starFill:"#78716c",
    wordClr: "#1c1917",
    transClr:"#57534e",
    corner:  "#c0c0c0",
  },
  Uncommon: {
    frame:   "linear-gradient(160deg, #bbf7d0 0%, #f0fdf4 40%, #86efac 100%)",
    inner:   "linear-gradient(160deg, #f0fdf4, #dcfce7)",
    border:  "#4ade80",
    shine:   "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 55%)",
    badge:   "#16a34a",
    badgeTxt:"#fff",
    star:    "#86efac",
    starFill:"#16a34a",
    wordClr: "#14532d",
    transClr:"#166534",
    corner:  "#4ade80",
  },
  Rare: {
    frame:   "linear-gradient(160deg, #93c5fd 0%, #eff6ff 40%, #60a5fa 100%)",
    inner:   "linear-gradient(160deg, #eff6ff, #dbeafe)",
    border:  "#3b82f6",
    shine:   "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%)",
    badge:   "#1d4ed8",
    badgeTxt:"#fff",
    star:    "#93c5fd",
    starFill:"#2563eb",
    wordClr: "#1e3a8a",
    transClr:"#1e40af",
    corner:  "#60a5fa",
    lines:   true,
  },
  Epic: {
    frame:   "linear-gradient(160deg, #d8b4fe 0%, #faf5ff 40%, #c084fc 100%)",
    inner:   "linear-gradient(160deg, #faf5ff, #ede9fe)",
    border:  "#a855f7",
    shine:   "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 50%)",
    badge:   "#7c3aed",
    badgeTxt:"#fff",
    star:    "#d8b4fe",
    starFill:"#7c3aed",
    wordClr: "#3b0764",
    transClr:"#581c87",
    corner:  "#c084fc",
  },
  Legendary: {
    frame:   "linear-gradient(160deg, #fcd34d 0%, #fffbeb 35%, #fbbf24 70%, #fef3c7 100%)",
    inner:   "linear-gradient(160deg, #fffbeb, #fef3c7)",
    border:  "#f59e0b",
    shine:   "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 45%)",
    badge:   "#b45309",
    badgeTxt:"#fff",
    star:    "#fcd34d",
    starFill:"#d97706",
    wordClr: "#451a03",
    transClr:"#78350f",
    corner:  "#fbbf24",
    glow:    "0 0 20px rgba(251,191,36,0.45)",
  },
};

function TCGCard({ card }) {
  const t     = TCG[card.rarity] || TCG.Common;
  const stars = Array.from({ length: 4 }, (_, i) => i < card.star_level);

  return (
    <article
      style={{
        position: "relative",
        borderRadius: "14px",
        padding: "3px",
        background: t.frame,
        border: `2px solid ${t.border}`,
        boxShadow: t.glow
          ? `${t.glow}, 0 4px 16px rgba(0,0,0,0.12)`
          : "0 4px 16px rgba(0,0,0,0.1)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
        e.currentTarget.style.boxShadow = t.glow
          ? `${t.glow.replace("0.45", "0.7")}, 0 12px 28px rgba(0,0,0,0.18)`
          : "0 12px 28px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = t.glow
          ? `${t.glow}, 0 4px 16px rgba(0,0,0,0.12)`
          : "0 4px 16px rgba(0,0,0,0.1)";
      }}
    >
      {/* Inner card surface */}
      <div style={{
        borderRadius: "11px",
        background: t.inner,
        padding: "10px 10px 8px",
        position: "relative",
        overflow: "hidden",
        minHeight: "160px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        {/* Shine overlay */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "11px",
          background: t.shine, pointerEvents: "none",
        }} />

        {/* Corner decoration top-left */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          width: 10, height: 10, borderTop: `2px solid ${t.corner}`,
          borderLeft: `2px solid ${t.corner}`, borderRadius: "2px 0 0 0",
          opacity: 0.7,
        }} />
        {/* Corner decoration top-right */}
        <div style={{
          position: "absolute", top: 6, right: 6,
          width: 10, height: 10, borderTop: `2px solid ${t.corner}`,
          borderRight: `2px solid ${t.corner}`, borderRadius: "0 2px 0 0",
          opacity: 0.7,
        }} />

        {/* Top row: rarity badge + stars */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <span style={{
            fontSize: "9px", fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.12em", padding: "2px 7px", borderRadius: "999px",
            background: t.badge, color: t.badgeTxt,
          }}>
            {card.rarity}
          </span>
          <div style={{ display: "flex", gap: "1px" }}>
            {stars.map((filled, i) => (
              <span key={i} style={{ fontSize: "11px", color: filled ? t.starFill : t.star, lineHeight: 1 }}>
                {filled ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>

        {/* Central word — big, prominent */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "8px 0" }}>
          <p style={{
            fontSize: "clamp(1.1rem,3vw,1.4rem)",
            fontWeight: 900,
            color: t.wordClr,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}>
            {card.word_fi}
          </p>
          <p style={{
            fontSize: "11px",
            color: t.transClr,
            marginTop: "3px",
            fontStyle: "italic",
            opacity: 0.8,
          }}>
            {card.word_en}
          </p>
        </div>

        {/* Bottom row: scenario + XP */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "relative", zIndex: 1,
          borderTop: `1px solid ${t.border}55`,
          paddingTop: "6px",
          marginTop: "2px",
        }}>
          <span style={{ fontSize: "9px", color: t.transClr, fontWeight: 600, textTransform: "capitalize" }}>
            {card.scenario?.replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, color: t.wordClr }}>
            XP {card.xp}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

function FilterPill({ label, isActive, onClick, color, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        border: `1.5px solid ${isActive ? (color || "#8b5a2b") : "#d7b88b"}`,
        background: isActive ? (color || "#8b5a2b") : "white",
        color: isActive ? "white" : "#5a3b1a",
        transition: "all 0.15s",
        textTransform: "capitalize",
      }}
    >
      {label}
    </button>
  );
}

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const navigate  = useNavigate();
  const [user]    = useState(readStoredUser());
  const [cards,           setCards]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [scenarioFilter,  setScenarioFilter]  = useState("all");
  const [rarityFilter,    setRarityFilter]    = useState("all");
  const [avatar,          setAvatar]          = useState(getAvatar());
  const [showPicker,      setShowPicker]      = useState(false);

  useEffect(() => {
    if (!user?.id) { toast.error("Please login first."); navigate("/login"); return; }
    (async () => {
      try {
        setLoading(true); setError("");
        const data = await getMyCollection();
        setCards(Array.isArray(data?.cards) ? data.cards : []);
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to load collection.");
      } finally { setLoading(false); }
    })();
  }, [navigate, user?.id]);

  const handleSelectAvatar = (emoji) => {
    localStorage.setItem("lingodeck_avatar", emoji);
    setAvatar(emoji);
    window.dispatchEvent(new Event("storage"));
    setShowPicker(false);
    toast.success("Avatar updated!");
  };

  const scenarios = useMemo(() => {
    const unique = new Set(cards.map((c) => c.scenario).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [cards]);

  const rarities = ["all", "Legendary", "Epic", "Rare", "Uncommon", "Common"];
  const RARITY_COLORS = {
    Legendary: "#b45309", Epic: "#7c3aed", Rare: "#1d4ed8", Uncommon: "#16a34a", Common: "#78716c",
  };

  const visibleCards = useMemo(() => cards.filter((c) => {
    return (scenarioFilter === "all" || c.scenario === scenarioFilter) &&
           (rarityFilter   === "all" || c.rarity   === rarityFilter);
  }), [cards, scenarioFilter, rarityFilter]);

  const stats = useMemo(() => ({
    total:     cards.length,
    twoPlus:   cards.filter((c) => c.star_level >= 2).length,
    legendary: cards.filter((c) => c.rarity === "Legendary").length,
    epic:      cards.filter((c) => c.rarity === "Epic").length,
    fourStar:  cards.filter((c) => c.star_level === 4).length,
  }), [cards]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#d7b88b] border-t-[#8b5a2b] mx-auto"
            style={{ animation: "spin 0.8s linear infinite" }} />
          <p className="mt-4 text-[#5a3b1a] font-semibold">Loading collection…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <main style={{ backgroundImage: "url(/images/profile.png)" }} className="bg-cover bg-center min-h-screen pt-22 pb-12">

      {/* Avatar picker — portal renders into body, bypasses ALL parent CSS */}
      {showPicker && (
        <AvatarPicker current={avatar} onSelect={handleSelectAvatar} onClose={() => setShowPicker(false)} />
      )}

      <div className="max-w-6xl mx-auto px-4">

        {/* ── Header card ── */}
        <section className="bg-[#fff4df]/96 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">

            {/* Avatar button */}
            <button onClick={() => setShowPicker(true)} className="relative shrink-0 cursor-pointer group self-start" title="Change avatar">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl transition-all group-hover:scale-105"
                style={{ background: "linear-gradient(135deg,#f3e2c7,#fff4df)", border: "3px solid #8b5a2b", boxShadow: "0 4px 12px rgba(139,90,43,0.3)" }}
              >
                {avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                style={{ background: "#8b5a2b", border: "2px solid #fff4df", fontSize: "14px" }}
              >✏️</div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-[#5a3b1a] truncate">{user?.username || "My Collection"}</h1>
                  <p className="text-sm text-[#7a5a36]">{stats.total} cards collected</p>
                  <button onClick={() => setShowPicker(true)}
                    className="text-xs text-[#8b5a2b] underline cursor-pointer mt-0.5 hover:text-[#5a3b1a]"
                  >Change avatar</button>
                </div>
                <button onClick={() => navigate("/")}
                  className="px-4 py-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-all self-start shrink-0"
                >← Back Home</button>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Battle Ready (2★+)", value: stats.twoPlus,   color: "#5a8b41", hl: true },
                  { label: "Legendary",           value: stats.legendary, color: "#d97706" },
                  { label: "Epic",                value: stats.epic,      color: "#7c3aed" },
                  { label: "Mastered (4★)",       value: stats.fourStar,  color: "#2563eb" },
                ].map(({ label, value, color, hl }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center"
                    style={{ background: hl ? `${color}12` : "#f2e6d5", border: `2px solid ${hl ? color : "#d7b88b"}` }}
                  >
                    <p className="text-xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-[9px] uppercase tracking-wider text-[#7a5a36] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-col sm:flex-row gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8a643f] font-semibold mb-1.5">Scenario</p>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((s) => (
                  <FilterPill key={s} label={s === "all" ? "All" : s.replace(/_/g, " ")}
                    isActive={scenarioFilter === s} onClick={() => setScenarioFilter(s)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8a643f] font-semibold mb-1.5">Rarity</p>
              <div className="flex flex-wrap gap-1.5">
                {rarities.map((r) => (
                  <FilterPill key={r} label={r} isActive={rarityFilter === r}
                    onClick={() => setRarityFilter(r)} color={RARITY_COLORS[r]}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-[#7a5a36]">
            Showing <strong>{visibleCards.length}</strong> of {stats.total} cards
          </p>
          {error && <p className="mt-2 text-sm text-red-700 font-semibold">{error}</p>}
        </section>

        {/* ── TCG Card grid ── */}
        <section className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visibleCards.map((card) => (
            <TCGCard key={card.card_id} card={card} />
          ))}

          {!error && visibleCards.length === 0 && (
            <div className="col-span-full text-center bg-[#fff7ea]/96 border-3 border-[#8b5a2b] rounded-2xl p-12 text-[#5a3b1a]">
              <p className="text-2xl mb-2">📭</p>
              <p className="font-semibold">No cards match this filter.</p>
              <p className="text-sm text-[#7a5a36] mt-1">Try a different scenario or rarity.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
