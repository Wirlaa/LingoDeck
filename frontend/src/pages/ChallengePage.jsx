import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getChallengeState,
  startChallenge,
  submitChallengeAction,
} from "../api/challengeService";
import { getMyCollection } from "../api/cardService";

const SCENARIOS = [
  {
    value: "cafe_order",
    label: "Cafe Order",
    description: "Politeness + food vocabulary.",
  },
  {
    value: "job_interview",
    label: "Job Interview",
    description: "Formal workplace Finnish.",
  },
  {
    value: "asking_directions",
    label: "Asking Directions",
    description: "Navigation and location words.",
  },
  {
    value: "kela_boss",
    label: "KELA Boss",
    description: "High-difficulty bureaucracy showdown.",
  },
];

const STATUS_LABELS = {
  active: "In Progress",
  won: "Victory",
  lost: "Defeat",
  draw: "Draw",
};

function statusClass(status) {
  if (status === "won") return "text-emerald-700";
  if (status === "lost") return "text-red-700";
  if (status === "draw") return "text-amber-700";
  return "text-[#7a4f26]";
}

function getErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    fallback
  );
}

const ChallengePage = () => {
  const navigate = useNavigate();

  const [scenario, setScenario] = useState(SCENARIOS[0].value);
  const [session, setSession] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const question = session?.next_question || null;
  const hand = Array.isArray(session?.hand) ? session.hand : [];
  const isActive = session?.status === "active";

  const statusText = STATUS_LABELS[session?.status] || "Not Started";
  const meterPercent = useMemo(() => {
    const raw = Number(session?.meter_percent ?? 0.5);
    return Math.max(0, Math.min(1, raw));
  }, [session?.meter_percent]);

  const selectedScenarioMeta =
    SCENARIOS.find((item) => item.value === scenario) || SCENARIOS[0];

  const cardsByStars = useMemo(() => {
    return {
      twoPlus: cards.filter((c) => c.star_level >= 2).length,
    };
  }, [cards]);

  useEffect(() => {
    const loadCollection = async () => {
      try {
        const collection = await getMyCollection();
        setCards(Array.isArray(collection?.cards) ? collection.cards : []);
      } catch (err) {
        const message = getErrorMessage(err, "Could not load card collection.");
        setError(message);
      } finally {
        setCardsLoading(false);
      }
    };

    loadCollection();
  }, []);

  const resetAnswerInputs = () => {
    setSelectedAnswer("");
    setSelectedCardId("");
  };

  const handleStart = async () => {
    setStarting(true);
    setError("");

    try {
      const data = await startChallenge({ scenario });
      setSession(data);
      resetAnswerInputs();
      toast.success("Challenge started. Good luck!");
    } catch (err) {
      const message = getErrorMessage(err, "Failed to start challenge.");
      setError(message);
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleRefresh = async () => {
    if (!session?.session_id || refreshing) return;

    setRefreshing(true);
    setError("");

    try {
      const data = await getChallengeState(session.session_id);
      setSession(data);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to refresh challenge state.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmitAction = async () => {
    if (!session?.session_id || !question?.id || !isActive || submitting)
      return;

    if (!selectedAnswer) {
      toast.error("Pick an answer option first.");
      return;
    }

    if (!selectedCardId) {
      toast.error("Pick a hand card to play.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const nextState = await submitChallengeAction({
        sessionId: session.session_id,
        questionId: question.id,
        answerCardId: selectedCardId,
        givenAnswer: selectedAnswer,
      });

      const wasCorrect = Boolean(nextState?.last_action?.is_correct);
      if (wasCorrect) {
        toast.success(nextState?.last_action?.feedback || "Correct!");
      } else {
        toast.error(nextState?.last_action?.feedback || "Wrong answer.");
      }

      if (nextState?.status && nextState.status !== "active") {
        toast(
          nextState.status === "won" ? "Challenge won!" : "Challenge ended.",
        );
      }

      setSession(nextState);
      resetAnswerInputs();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to submit action.");
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{ backgroundImage: "url(/images/challenge.png)" }}
      className="bg-cover bg-center min-h-screen pt-22 pb-10"
    >
      <div className="max-w-6xl mx-auto px-4">
        <section className="bg-[#fff4df]/94 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#5a3b1a]">
                Challenge Battle
              </h1>
              <p className="text-sm text-[#7a5a36]">
                Build momentum on the battle meter by answering correctly with
                the right cards.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={!session?.session_id || refreshing}
                className="px-4 py-2 cursor-pointer bg-[#a9743a] text-[#fff4df] rounded-lg disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white rounded-lg"
              >
                Exit
              </button>
            </div>
          </div>

          {!session && (
            <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <label className="text-xs uppercase tracking-wide text-[#7a5a36]">
                  Scenario
                </label>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="mt-2 w-full bg-white border-2 border-[#d7b88b] rounded-lg px-3 py-2 text-[#40260f]"
                >
                  {SCENARIOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-[#7a5a36]">
                  {selectedScenarioMeta.description}
                </p>

                <div className="mt-3 bg-[#f2e6d5] border border-[#d7b88b] rounded px-2 py-2">
                  <p className="text-xs font-semibold text-[#7a5a36]">
                    Cards at 2★+:{" "}
                    <span className="text-[#5a8b41] font-bold">
                      {cardsByStars.twoPlus}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={starting || cardsLoading}
                className="h-11 px-5 rounded-lg cursor-pointer bg-[#5a8b41] hover:bg-[#4f7b39] text-[#f7ffe9] font-semibold disabled:opacity-60"
              >
                {starting ? "Starting..." : "Start Challenge"}
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>
          ) : null}
        </section>

        {session && (
          <section className="mt-5 bg-[#fff7ea]/96 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm text-[#4b2d12]">
              <div>
                <p className="uppercase text-xs text-[#8a643f]">Status</p>
                <p className={`font-bold ${statusClass(session.status)}`}>
                  {statusText}
                </p>
              </div>

              <div>
                <p className="uppercase text-xs text-[#8a643f]">Turn</p>
                <p className="font-bold">
                  {session.current_turn} / {session.max_turns}
                </p>
              </div>

              <div>
                <p className="uppercase text-xs text-[#8a643f]">Streak</p>
                <p className="font-bold">
                  {session.correct_streak} (max {session.max_streak})
                </p>
              </div>

              <div>
                <p className="uppercase text-xs text-[#8a643f]">XP</p>
                <p className="font-bold">{session.xp_earned}</p>
              </div>

              <div>
                <p className="uppercase text-xs text-[#8a643f]">Bonus Packs</p>
                <p className="font-bold">{session.bonus_packs}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-[#7a5a36] mb-1">
                <span>Battle meter</span>
                <span>
                  {session.battle_meter} (win {session.win_threshold} / lose{" "}
                  {session.lose_threshold})
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#d8c7ad] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#b5442c] via-[#e8b23f] to-[#3f8e43] transition-all duration-300"
                  style={{ width: `${meterPercent * 100}%` }}
                />
              </div>
            </div>

            {session.last_action ? (
              <p className="mt-4 text-sm text-[#5a3b1a]">
                Last action: {session.last_action.feedback}
              </p>
            ) : null}
          </section>
        )}

        {session && isActive && question && (
          <section className="mt-5 bg-[#fff4df]/95 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6 grid lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase text-[#8a643f]">Question (FI)</p>
              <h2 className="text-2xl font-bold text-[#44270f] mt-1">
                {question.question_fi}
              </h2>
              {question.question_en ? (
                <p className="mt-2 text-sm italic text-[#6e4d2c]">
                  {question.question_en}
                </p>
              ) : null}

              <div className="mt-4">
                <p className="text-xs uppercase text-[#8a643f] mb-2">
                  Choose answer
                </p>
                <div className="grid gap-2">
                  {question.options?.map((option) => {
                    const isSelected = selectedAnswer === option;

                    return (
                      <button
                        key={option}
                        onClick={() => setSelectedAnswer(option)}
                        className={`cursor-pointer text-left px-3 py-2 rounded-lg border-2 transition-colors ${
                          isSelected
                            ? "bg-[#8b5a2b] text-[#fff4df] border-[#6a421f]"
                            : "bg-white border-[#d7b88b] hover:bg-[#f7ead6] text-[#503014]"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-[#8a643f] mb-2">
                Play a hand card
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {hand.map((card) => {
                  const cardId = card.card_id;
                  const isSelected = selectedCardId === cardId;

                  return (
                    <button
                      key={cardId}
                      onClick={() => setSelectedCardId(cardId)}
                      className={`cursor-pointer rounded-xl p-3 border-2 text-left transition-colors ${
                        isSelected
                          ? "border-[#416f29] bg-[#def0cf]"
                          : "border-[#d7b88b] bg-white hover:bg-[#f8eddc]"
                      }`}
                    >
                      <p className="font-bold text-[#3e2410]">{card.word_fi}</p>
                      <p className="text-sm text-[#7a5a36]">{card.word_en}</p>
                      <p className="text-xs text-[#7a5a36] mt-1">
                        {card.scenario} | {card.rarity} | {card.star_level}★
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSubmitAction}
                disabled={submitting}
                className="mt-4 w-full h-11 rounded-lg cursor-pointer bg-[#5a8b41] hover:bg-[#4f7b39] text-[#f7ffe9] font-semibold disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Turn"}
              </button>
            </div>
          </section>
        )}

        {session && session.status !== "active" && (
          <section className="mt-5 bg-[#fff4df]/95 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6 text-center">
            <h3 className={`text-2xl font-bold ${statusClass(session.status)}`}>
              {statusText}
            </h3>
            <p className="mt-2 text-[#6e4d2c]">
              Final meter: {session.battle_meter} | XP earned:{" "}
              {session.xp_earned} | Packs: {session.bonus_packs}
            </p>

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSession(null);
                  setError("");
                  resetAnswerInputs();
                }}
                className="px-4 py-2 rounded-lg cursor-pointer bg-[#5a8b41] hover:bg-[#4f7b39] text-[#f7ffe9]"
              >
                Start New Challenge
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-lg cursor-pointer bg-[#a02128] hover:bg-[#7f1a20] text-white"
              >
                Back Home
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ChallengePage;
