import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const RARITY_CONFIG = {
  Common:    { border: "#9ca3af", bg: "linear-gradient(160deg,#374151,#1f2937)", badge: "#6b7280", text: "#d1d5db", glow: "none" },
  Uncommon:  { border: "#4ade80", bg: "linear-gradient(160deg,#14532d,#166534)", badge: "#16a34a", text: "#86efac", glow: "0 0 20px rgba(74,222,128,0.35)" },
  Rare:      { border: "#60a5fa", bg: "linear-gradient(160deg,#1e3a8a,#1d4ed8)", badge: "#2563eb", text: "#93c5fd", glow: "0 0 24px rgba(96,165,250,0.45)" },
  Epic:      { border: "#c084fc", bg: "linear-gradient(160deg,#4c1d95,#6d28d9)", badge: "#7c3aed", text: "#d8b4fe", glow: "0 0 28px rgba(192,132,252,0.45)" },
  Legendary: { border: "#fbbf24", bg: "linear-gradient(160deg,#78350f,#b45309)", badge: "#d97706", text: "#fde68a", glow: "0 0 32px rgba(251,191,36,0.6)" },
};

function getRarityConfig(rarity) {
  return RARITY_CONFIG[rarity] || RARITY_CONFIG.Common;
}

// ── Single card reveal ────────────────────────────────────────────────────────

function SingleCardReveal({ cards, navigate }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardRef = useRef();
  const textRef = useRef();

  const currentCard = cards[currentCardIndex];
  const totalCards  = cards.length;
  const cfg         = getRarityConfig(currentCard?.rarity);
  const stars       = Array.from({ length: 4 }, (_, i) => i < (currentCard?.star_level || 0) ? "★" : "☆").join("");

  useGSAP(() => {
    if (!cardRef.current || !currentCard) return;
    const tl = gsap.timeline();
    tl.fromTo(cardRef.current,
      { opacity: 0, scale: 0.4, rotationY: 180 },
      { opacity: 1, scale: 1, rotationY: 0, duration: 0.75, ease: "back.out(1.7)" },
    );
    if (textRef.current) {
      tl.fromTo(textRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        0.4,
      );
    }
  }, [currentCardIndex, currentCard]);

  if (!currentCard) return null;

  return (
    <div className="flex flex-col items-center gap-6 pt-24 pb-12 px-4">
      {/* Title — clear of navbar */}
      <div className="text-center">
        <h1
          className="text-4xl font-bold mb-2"
          style={{
            color: "#fff4df",
            textShadow: "2px 3px 8px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          🎉 Challenge Complete!
        </h1>
        <div
          className="inline-block px-4 py-1 rounded-full mt-1"
          style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#f5d7a1" }}>
            You earned {totalCards} reward card{totalCards !== 1 ? "s" : ""}!
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="relative flex flex-col items-center justify-between"
        style={{
          width: "260px", height: "380px", borderRadius: "18px",
          border: `3px solid ${cfg.border}`, background: cfg.bg,
          padding: "20px",
          boxShadow: cfg.glow !== "none" ? `${cfg.glow}, 0 16px 40px rgba(0,0,0,0.5)` : "0 16px 40px rgba(0,0,0,0.5)",
          perspective: "1000px",
        }}
      >
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 pointer-events-none`} style={{
            border: `1.5px solid ${cfg.border}`, borderRadius: "2px", opacity: 0.6,
            ...(i === 0 && { borderRight: "none", borderBottom: "none" }),
            ...(i === 1 && { borderLeft:  "none", borderBottom: "none" }),
            ...(i === 2 && { borderRight: "none", borderTop:    "none" }),
            ...(i === 3 && { borderLeft:  "none", borderTop:    "none" }),
          }} />
        ))}

        <div className="flex justify-between items-start w-full">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: cfg.badge }}>
            {currentCard.rarity}
          </span>
          <span style={{ color: cfg.text }}>{stars}</span>
        </div>

        <div className="text-center">
          <p className="text-4xl font-bold text-white">{currentCard.word_fi}</p>
          <p className="text-base mt-2" style={{ color: cfg.text }}>{currentCard.word_en}</p>
        </div>

        <div className="w-full">
          <div className="h-px w-full mb-3" style={{ background: `linear-gradient(90deg,transparent,${cfg.border},transparent)` }} />
          <div className="flex justify-between text-xs" style={{ color: cfg.text, opacity: 0.8 }}>
            <span className="capitalize">{currentCard.scenario?.replace(/_/g, " ")}</span>
            <span>{stars}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div ref={textRef} className="text-center max-w-xs opacity-0 rounded-xl p-4"
        style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${cfg.border}44` }}
      >
        <p className="text-sm" style={{ color: "#fff4df" }}>
          {currentCard.is_new
            ? `✨ New card! "${currentCard.word_fi}" added to your collection.`
            : `Duplicate — earned +${currentCard.xp_gained || 0} XP!`}
        </p>
      </div>

      {totalCards > 1 && (
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentCardIndex((p) => Math.max(0, p - 1))} disabled={currentCardIndex === 0}
            className="px-4 py-2 cursor-pointer rounded-lg font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(139,90,43,0.8)", color: "#fff4df", border: "1.5px solid rgba(243,226,199,0.4)" }}
          >← Prev</button>
          <span className="font-semibold text-sm" style={{ color: "#f5d7a1" }}>{currentCardIndex + 1} / {totalCards}</span>
          <button onClick={() => setCurrentCardIndex((p) => Math.min(totalCards - 1, p + 1))} disabled={currentCardIndex === totalCards - 1}
            className="px-4 py-2 cursor-pointer rounded-lg font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(139,90,43,0.8)", color: "#fff4df", border: "1.5px solid rgba(243,226,199,0.4)" }}
          >Next →</button>
        </div>
      )}

      <button onClick={() => navigate("/quest")}
        className="px-8 py-3 cursor-pointer text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 0 #1e3a8a" }}
      >
        Continue to Quest →
      </button>
    </div>
  );
}

// ── Round summary ─────────────────────────────────────────────────────────────

function RoundSummary({ cards, challenge, navigate }) {
  const cardsRowRef = useRef();

  useGSAP(() => {
    if (!cardsRowRef.current) return;
    const items = cardsRowRef.current.querySelectorAll("[data-reward-card]");
    if (!items.length) return;
    gsap.fromTo(items,
      { opacity: 0, y: 60, scale: 0.8, rotateZ: -4 },
      { opacity: 1, y: 0, scale: 1, rotateZ: 0, duration: 0.65, stagger: 0.1, ease: "back.out(1.4)" },
    );
  }, [cards]);

  return (
    <div className="min-h-screen px-4 pt-24 pb-12 flex flex-col items-center gap-8">
      {/* Title — clear of navbar, with solid backdrop so it's always readable */}
      <div className="text-center">
        <h1
          className="text-4xl font-bold"
          style={{
            color: "#fff4df",
            textShadow: "2px 3px 8px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.6)",
          }}
        >
          {challenge?.name || "Quest Reward Summary"}
        </h1>
        <div
          className="inline-block px-5 py-1.5 rounded-full mt-3"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <p className="font-semibold text-sm" style={{ color: "#f5d7a1" }}>
            🎁 You earned {cards.length} reward card{cards.length !== 1 ? "s" : ""} this run!
          </p>
        </div>
      </div>

      <div ref={cardsRowRef} className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const cfg   = getRarityConfig(card?.rarity);
          const stars = Array.from({ length: 4 }, (_, i) => i < (card?.star_level || 0) ? "★" : "☆").join("");
          return (
            <article
              key={`${card?.card_id || card?.word_fi || "card"}-${idx}`}
              data-reward-card
              className="rounded-2xl p-4 flex flex-col gap-3 relative"
              style={{
                background: cfg.bg, border: `2px solid ${cfg.border}`,
                boxShadow: cfg.glow !== "none" ? `${cfg.glow}, 0 8px 24px rgba(0,0,0,0.4)` : "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {["top-2 left-2", "top-2 right-2"].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-3 h-3 pointer-events-none`} style={{
                  border: `1.5px solid ${cfg.border}`, borderRadius: "2px", opacity: 0.5,
                  ...(i === 0 && { borderRight: "none", borderBottom: "none" }),
                  ...(i === 1 && { borderLeft:  "none", borderBottom: "none" }),
                }} />
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: cfg.badge }}>
                  {card?.rarity || "Common"}
                </span>
                <span style={{ color: cfg.text }}>{stars}</span>
              </div>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-white">{card?.word_fi}</p>
                <p className="text-sm mt-1" style={{ color: cfg.text, opacity: 0.9 }}>{card?.word_en}</p>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${cfg.border}44`, color: cfg.text, opacity: 0.8 }}>
                <span className="capitalize">{card?.scenario?.replace(/_/g, " ") || "general"}</span>
                <span className="font-bold">{card?.is_new ? "✨ New!" : `+${Number(card?.xp_gained || 0)} XP`}</span>
              </div>
            </article>
          );
        })}
      </div>

      <button onClick={() => navigate("/")}
        className="px-8 py-3 cursor-pointer text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 0 #1e3a8a" }}
      >
        Back Home
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const CardRewardPage = () => {
  const navigate     = useNavigate();
  const location     = useLocation();
  const cards        = location.state?.cards || [];
  const challenge    = location.state?.challenge;
  const roundSummary = Boolean(location.state?.roundSummary);

  if (!cards || cards.length === 0) {
    return (
      <div style={{ backgroundImage: "url(/images/quest-finish.png)" }}
        className="bg-cover bg-center h-screen flex flex-col items-center justify-center gap-4"
      >
        <p className="text-xl font-semibold text-white" style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.6)" }}>
          No cards to display.
        </p>
        <button onClick={() => navigate("/quest")}
          className="px-6 py-2 cursor-pointer rounded-lg font-semibold transition-all"
          style={{ background: "rgba(139,90,43,0.85)", color: "#fff4df", border: "1.5px solid rgba(243,226,199,0.4)" }}
        >
          Back to Quest
        </button>
      </div>
    );
  }

  return (
    <main style={{ backgroundImage: "url(/images/quest-finish.png)" }} className="bg-cover bg-center min-h-screen">
      {roundSummary
        ? <RoundSummary cards={cards} challenge={challenge} navigate={navigate} />
        : <SingleCardReveal cards={cards} navigate={navigate} />
      }
    </main>
  );
};

export default CardRewardPage;
