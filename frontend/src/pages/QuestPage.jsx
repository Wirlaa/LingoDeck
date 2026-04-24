import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { QuestCard } from "../components/QuestCard";
import { generateQuest, submitQuest, getQuestChallenges } from "../api/questService";
import { getMyCollection } from "../api/cardService";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// ── SVG icons ─────────────────────────────────────────────────────────────────

const ScrollIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ── Training scenarios ────────────────────────────────────────────────────────

const TRAINING_SCENARIOS = [
  { value: null,                label: "All",        color: "#8b5a2b" },
  { value: "cafe_order",        label: "Cafe",       color: "#d97706" },
  { value: "asking_directions", label: "Directions", color: "#16a34a" },
  { value: "job_interview",     label: "Interview",  color: "#2563eb" },
  { value: "kela_boss",         label: "KELA",       color: "#7c3aed" },
];

// ── Normalize quest challenge data regardless of API shape ────────────────────

function normalizeChallenges(raw) {
  if (!raw) return [];

  // Handle array directly
  if (Array.isArray(raw)) return raw;

  // Handle { active, completed } shape
  if (Array.isArray(raw.active) || Array.isArray(raw.completed)) {
    return [...(raw.active || []), ...(raw.completed || [])];
  }

  // Handle { challenges: [...] }
  if (Array.isArray(raw.challenges)) return raw.challenges;

  // Handle { data: [...] }
  if (Array.isArray(raw.data)) return raw.data;

  // Handle single object wrapped in data key
  if (typeof raw === "object") {
    const vals = Object.values(raw);
    if (vals.length === 1 && Array.isArray(vals[0])) return vals[0];
  }

  return [];
}

// ── Quest Log Panel ───────────────────────────────────────────────────────────

function QuestLog({ challenges, loading, onClose }) {
  return createPortal(
    <>
      <div
        style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(3px)" }}
        onClick={onClose}
      />
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:9991,
        width:"min(380px,90vw)",
        background:"linear-gradient(180deg,#fffbf2 0%,#fff4df 100%)",
        borderLeft:"3px solid #8b5a2b",
        boxShadow:"-8px 0 40px rgba(0,0,0,0.25)",
        display:"flex", flexDirection:"column",
        animation:"slideIn 0.28s cubic-bezier(0.34,1.1,0.64,1) both",
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding:"14px 18px", background:"#8b5a2b", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <ScrollIcon size={17} color="#fff4df" />
            <span style={{ color:"#fff4df", fontWeight:900, fontSize:"15px" }}>Quest Log</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,244,223,0.8)", fontSize:"20px", fontWeight:900, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
          <p style={{ fontSize:"12px", color:"#7a5a36", marginBottom:"12px", lineHeight:1.5 }}>
            Complete quest challenges to earn card packs. More correct answers = faster progress!
          </p>

          {loading && (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ width:"28px", height:"28px", border:"3px solid #d7b88b", borderTopColor:"#8b5a2b", borderRadius:"50%", margin:"0 auto 10px", animation:"spin 0.8s linear infinite" }} />
              <p style={{ fontSize:"12px", color:"#8b5a2b" }}>Loading…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {!loading && challenges.length === 0 && (
            <div style={{ textAlign:"center", padding:"28px 12px" }}>
              <ScrollIcon size={36} color="#d7b88b" />
              <p style={{ marginTop:"10px", fontSize:"13px", color:"#8b5a2b", fontWeight:600 }}>No active quests right now.</p>
              <p style={{ fontSize:"12px", marginTop:"4px", color:"#7a5a36", lineHeight:1.4 }}>
                Play quests to earn packs and unlock challenges. The more you play, the more challenges appear!
              </p>
            </div>
          )}

          {!loading && challenges.map((ch, i) => {
            // Defensive: handle various progress field names
            const progress  = ch.current_value ?? ch.progress ?? ch.current_progress ?? 0;
            const target    = ch.target_value ?? ch.target ?? 1;
            const pct       = Math.min(1, progress / Math.max(1, target));
            const completed = pct >= 1 || ch.completed === true || ch.status === "completed";
            const bias      = ch.pack_scenario_bias ?? ch.scenario_filter ?? ch.scenario ?? null;

            return (
              <div key={ch.id || ch.slug || i} style={{
                background: completed ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "white",
                border: `2px solid ${completed ? "#4ade80" : "#e5d5c0"}`,
                borderRadius:"12px",
                padding:"12px",
                marginBottom:"8px",
                boxShadow: completed ? "0 2px 8px rgba(74,222,128,0.2)" : "0 2px 6px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
                  <p style={{ fontWeight:800, fontSize:"13px", color:completed?"#14532d":"#4a2c0a", flex:1, marginRight:"8px" }}>
                    {ch.name}
                  </p>
                  {completed && (
                    <span style={{ fontSize:"9px", fontWeight:800, background:"#16a34a", color:"#fff", padding:"2px 7px", borderRadius:"999px", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Done</span>
                  )}
                </div>

                <p style={{ fontSize:"11px", color:"#7a5a36", lineHeight:1.4, marginBottom:"8px" }}>
                  {ch.description}
                </p>

                {/* Progress bar */}
                <div>
                  <div style={{ height:"5px", borderRadius:"999px", background:"#f3e2c7", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct*100}%`, background:completed?"#16a34a":"linear-gradient(90deg,#d97706,#8b5a2b)", borderRadius:"999px", transition:"width 0.4s ease" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:"3px" }}>
                    <span style={{ fontSize:"10px", color:"#8b5a2b", fontWeight:600 }}>{progress} / {target}</span>
                    {bias && <span style={{ fontSize:"10px", color:"#7a5a36", fontStyle:"italic", textTransform:"capitalize" }}>Reward: {bias.replace(/_/g," ")} pack</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"10px 16px", borderTop:"2px solid #f3e2c7", background:"#fdf6e8", flexShrink:0 }}>
          <p style={{ fontSize:"11px", color:"#8b5a2b", textAlign:"center", opacity:0.7 }}>
            Completing quests earns card packs biased toward that scenario.
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const QuestPage = () => {
  const navigate = useNavigate();
  const ref          = useRef();
  const containerRef = useRef();

  const [currentQuest,      setCurrentQuest]      = useState(null);
  const [correctCount,      setCorrectCount]      = useState(0);
  const [wrongCount,        setWrongCount]         = useState(0);
  const [loading,           setLoading]           = useState(true);
  const [submitting,        setSubmitting]        = useState(false);
  const [error,             setError]             = useState("");
  const [streak,            setStreak]            = useState(0);
  const [roundRewardCards,  setRoundRewardCards]  = useState([]);
  const [trainingScenario,  setTrainingScenario]  = useState(null);
  const [showQuestLog,      setShowQuestLog]      = useState(false);
  const [challenges,        setChallenges]        = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  const mapDifficulty = (v) => v < 0.34 ? "beginner" : v < 0.67 ? "intermediate" : "difficult";

  const loadQuest = useCallback(async ({ initial = false, scenario = trainingScenario } = {}) => {
    try {
      if (initial) setLoading(true);
      setError("");
      const quest = await generateQuest(scenario ? { scenarioTag: scenario } : {});
      setCurrentQuest({ ...quest, difficultyLabel: mapDifficulty(quest.difficulty) });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Error fetching quest");
    } finally {
      if (initial) setLoading(false);
    }
  }, [trainingScenario]);

  useEffect(() => { loadQuest({ initial: true }); }, [loadQuest]);

  const getCollectionCards = useCallback(async () => {
    const data = await getMyCollection();
    return Array.isArray(data?.cards) ? data.cards : [];
  }, []);

  const handleOpenQuestLog = async () => {
    setShowQuestLog(true);
    setChallengesLoading(true);
    try {
      const raw  = await getQuestChallenges();
      setChallenges(normalizeChallenges(raw));
    } catch (e) {
      console.warn("Quest challenges fetch error:", e);
      setChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  };

  const handleChangeScenario = (value) => {
    setTrainingScenario(value);
    loadQuest({ initial: false, scenario: value });
  };

  // ── Reward helpers ────────────────────────────────────────────────────────

  const buildCardKey = (card) => `${card?.card_id || ""}`;

  const deriveRewardCards = useCallback((beforeCards, afterCards, maxCards = 3) => {
    const beforeMap = new Map(beforeCards.map((c) => [buildCardKey(c), c]));
    return afterCards.map((card) => {
      const previous = beforeMap.get(buildCardKey(card));
      if (!previous) return { ...card, is_new: true, xp_gained: 0 };
      const changed =
        Number(card?.star_level || 0) !== Number(previous?.star_level || 0) ||
        Number(card?.xp || 0) !== Number(previous?.xp || 0) ||
        Number(card?.duplicate_count || 0) !== Number(previous?.duplicate_count || 0);
      if (!changed) return null;
      return { ...card, is_new: false, xp_gained: Math.max(0, Number(card?.xp || 0) - Number(previous?.xp || 0)) };
    }).filter(Boolean).sort((a, b) => Number(Boolean(b?.is_new)) - Number(Boolean(a?.is_new))).slice(0, maxCards);
  }, []);

  const mergeRoundRewardCards = useCallback((existingCards, incomingCards) => {
    const toKey = (card) => `${card?.card_id || ""}::${card?.word_fi || ""}`;
    const merged = new Map(existingCards.map((c) => [toKey(c), c]));
    for (const card of incomingCards) {
      const key = toKey(card);
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { ...card, duplicate_hits: Number(card?.is_new ? 0 : 1) });
        continue;
      }
      merged.set(key, {
        ...current, ...card,
        is_new: Boolean(current?.is_new || card?.is_new),
        xp_gained: Number(current?.xp_gained || 0) + Number(card?.xp_gained || 0),
        duplicate_hits: Number(current?.duplicate_hits || 0) + Number(card?.is_new ? 0 : 1),
      });
    }
    return Array.from(merged.values());
  }, []);

  const waitForRewardCards = useCallback(async (beforeCards, attempts = 15, waitMs = 400) => {
    let latestChangedCards = [];
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise((r) => window.setTimeout(r, waitMs));
      try {
        const afterCards = await getCollectionCards();
        const changedCards = deriveRewardCards(beforeCards, afterCards, 3);
        if (changedCards.length > 0) latestChangedCards = changedCards;
        if (latestChangedCards.length >= 3) return latestChangedCards.slice(0, 3);
      } catch { /* non-fatal */ }
    }
    return latestChangedCards.slice(0, 3);
  }, [deriveRewardCards, getCollectionCards]);

  // ── Answer handler ────────────────────────────────────────────────────────

  const handleAnswer = async (selectedOption) => {
    if (!currentQuest || submitting) return;
    setSubmitting(true);
    try {
      const beforeCollection = await getCollectionCards();
      const result = await submitQuest({ questId: currentQuest.questId, givenAnswer: selectedOption, currentStreak: streak });
      const isCorrect   = Boolean(result?.is_correct);
      const nextStreak  = isCorrect ? streak + 1 : 0;
      const answerLabel = result?.correct_answer || currentQuest.targetWordFi;

      if (isCorrect) {
        setCorrectCount((p) => p + 1);
        setStreak(nextStreak);
        toast.success(`Correct! ${answerLabel ? `Answer: ${answerLabel}` : ""}`, { duration: 2500, position: "top-center" });
      } else {
        setWrongCount((p) => p + 1);
        setStreak(nextStreak);
        toast.error(`Wrong. Correct: ${answerLabel || "unknown"}`, { duration: 2500, position: "top-center" });
      }

      gsap.to(ref.current, {
        x: "300%", duration: 0.4, ease: "power2.in",
        onComplete: () => { if (ref.current) gsap.set(ref.current, { x: "-300%" }); },
      });

      const completedChallenges = result?.completed_challenges || [];
      if (completedChallenges.length > 0 && isCorrect) {
        const names = completedChallenges.map((c) => c?.name).filter(Boolean).join(", ");
        // Wait for cards to appear in collection then show reward screen
        const rewardCards = await waitForRewardCards(beforeCollection);
        if (rewardCards.length > 0) {
          setRoundRewardCards((prev) => mergeRoundRewardCards(prev, rewardCards));
        }
        toast.success(names ? `Challenge done: ${names}!` : "Challenge complete! Check your rewards.", { duration: 3000, position: "top-center" });
        // Refresh quest log if open
        if (showQuestLog) {
          try { const raw = await getQuestChallenges(); setChallenges(normalizeChallenges(raw)); }
          catch { /* non-fatal */ }
        }
      }

      window.setTimeout(() => {
        loadQuest({ scenario: trainingScenario }).finally(() => setSubmitting(false));
      }, 850);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Error", { position: "top-center" });
      setSubmitting(false);
    }
  };

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(100% at 50% 50%)", duration: 0.8 }
    );
  }, [currentQuest?.questId]);

  const handleExit = async () => {
    if (roundRewardCards.length > 0) {
      navigate("/reward", {
        state: { cards: roundRewardCards, roundSummary: true, challenge: { name: "Quest Reward Summary" } },
      });
      return;
    }
    navigate("/");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center mt-20 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#d7b88b] border-t-[#8b5a2b]" style={{ animation:"spin 0.8s linear infinite" }} />
        <p className="text-[#5a3b1a] font-semibold">Loading quest…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const total    = correctCount + wrongCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const activeMeta = TRAINING_SCENARIOS.find((s) => s.value === trainingScenario) || TRAINING_SCENARIOS[0];

  return (
    <main style={{ backgroundImage:"url(/images/quest.png)" }} className="bg-cover bg-center min-h-screen pt-20">
      {showQuestLog && <QuestLog challenges={challenges} loading={challengesLoading} onClose={() => setShowQuestLog(false)} />}

      <div ref={containerRef} className="flex flex-col items-center px-4 py-4 gap-3 min-h-[calc(100vh-80px)]">

        {/* Training focus */}
        <div className="w-full max-w-lg rounded-2xl px-4 py-3"
          style={{ background:"rgba(255,244,223,0.93)", border:"3px solid #8b5a2b", boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}
        >
          <p className="text-[10px] uppercase tracking-widest text-[#8a643f] font-semibold mb-2">
            Training Focus
            {trainingScenario && <span className="ml-2 font-normal normal-case" style={{ color:activeMeta.color }}> — biased toward {activeMeta.label} cards</span>}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {TRAINING_SCENARIOS.map(({ value, label, color }) => (
              <button key={label} onClick={() => handleChangeScenario(value)}
                className="px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all"
                style={{
                  background: trainingScenario === value ? color : "white",
                  color:      trainingScenario === value ? "white" : "#5a3b1a",
                  border:     `1.5px solid ${trainingScenario === value ? color : "#d7b88b"}`,
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Stats + quest log button */}
        <div className="w-full max-w-lg rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background:"rgba(255,244,223,0.93)", border:"3px solid #8b5a2b", boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}
        >
          <div className="flex gap-4">
            {[
              { label:"Correct",  value:correctCount,                          color:"#5a8b41" },
              { label:"Wrong",    value:wrongCount,                            color:"#dc2626" },
              { label:"Streak",   value:streak > 0 ? `${streak} streak` : 0,  color:"#5a3b1a" },
              ...(total > 0 ? [{ label:"Accuracy", value:`${accuracy}%`,      color:"#5a3b1a" }] : []),
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#8a643f] font-semibold">{label}</p>
                <p className="font-bold text-base" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Quest log — SVG scroll icon */}
            <button onClick={handleOpenQuestLog} title="Quest Log"
              style={{
                width:"36px", height:"36px", borderRadius:"10px",
                background:"linear-gradient(135deg,#8b5a2b,#6a421f)",
                border:"2px solid #f3e2c7",
                boxShadow:"0 2px 0 #4a2c10",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", transition:"transform 0.1s,box-shadow 0.1s",
              }}
              onMouseDown={(e)=>{ e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="none"; }}
              onMouseUp={(e)=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 0 #4a2c10"; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 0 #4a2c10"; }}
            >
              <ScrollIcon size={16} color="#fff4df" />
            </button>

            {roundRewardCards.length > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ background:"#5a8b41" }}>
                +{roundRewardCards.length}
              </span>
            )}
            <button onClick={handleExit}
              style={{
                padding:"6px 14px", background:"#dc2626", color:"white", fontWeight:700,
                fontSize:"12px", borderRadius:"8px", border:"none", cursor:"pointer",
                boxShadow:"0 2px 0 #991b1b", transition:"transform 0.1s,box-shadow 0.1s",
              }}
              onMouseDown={(e)=>{ e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="none"; }}
              onMouseUp={(e)=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 0 #991b1b"; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 0 #991b1b"; }}
            >
              {roundRewardCards.length > 0 ? "See Rewards" : "Exit"}
            </button>
          </div>
        </div>

        {/* Quest card */}
        {currentQuest ? (
          <QuestCard
            key={currentQuest.questId}
            ref={ref}
            question={currentQuest.questionFi}
            subtitle={currentQuest.questionEn}
            options={currentQuest.options}
            difficulty={currentQuest.difficultyLabel}
            disabled={submitting}
            onAnswer={handleAnswer}
          />
        ) : error ? (
          <div className="text-center mt-8 px-4">
            <p className="text-red-600 font-semibold">{error}</p>
            <button onClick={() => loadQuest({ initial: true })}
              className="mt-4 px-6 py-2 bg-[#8b5a2b] text-[#fff4df] rounded-lg cursor-pointer"
            >Try Again</button>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default QuestPage;
