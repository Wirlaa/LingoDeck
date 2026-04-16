import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QuestCard } from "../components/QuestCard";
import { generateQuest, submitQuest } from "../api/questService";
import { getMyCollection } from "../api/cardService";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const QuestPage = () => {
  const navigate = useNavigate();
  const ref = useRef();
  const containerRef = useRef();
  const boxRef = useRef();

  const [currentQuest, setCurrentQuest] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState(0);
  const [roundRewardCards, setRoundRewardCards] = useState([]);

  const mapDifficulty = (value) => {
    if (value < 0.34) return "beginner";
    if (value < 0.67) return "intermediate";
    return "difficult";
  };

  const loadQuest = useCallback(async ({ initial = false } = {}) => {
    try {
      if (initial) {
        setLoading(true);
      }

      setError("");

      const quest = await generateQuest();

      setCurrentQuest({
        ...quest,
        difficultyLabel: mapDifficulty(quest.difficulty),
      });
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error fetching quest";
      setError(message);
      console.error("Error fetching quest:", err);
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadQuest({ initial: true });
  }, [loadQuest]);

  const getCollectionCards = useCallback(async () => {
    const data = await getMyCollection();
    return Array.isArray(data?.cards) ? data.cards : [];
  }, []);

  const buildCardKey = (card) => `${card?.card_id || ""}`;

  const mergeRoundRewardCards = useCallback((existingCards, incomingCards) => {
    const toKey = (card) =>
      `${card?.card_id || ""}::${card?.word_fi || ""}::${card?.scenario || ""}`;

    const merged = new Map(existingCards.map((card) => [toKey(card), card]));

    for (const card of incomingCards) {
      const key = toKey(card);
      const current = merged.get(key);

      if (!current) {
        merged.set(key, {
          ...card,
          duplicate_hits: Number(card?.is_new ? 0 : 1),
        });
        continue;
      }

      merged.set(key, {
        ...current,
        ...card,
        is_new: Boolean(current?.is_new || card?.is_new),
        xp_gained:
          Number(current?.xp_gained || 0) + Number(card?.xp_gained || 0),
        duplicate_hits:
          Number(current?.duplicate_hits || 0) + Number(card?.is_new ? 0 : 1),
      });
    }

    return Array.from(merged.values());
  }, []);

  const deriveRewardCards = useCallback(
    (beforeCards, afterCards, maxCards = 3) => {
      const beforeMap = new Map(
        beforeCards.map((card) => [buildCardKey(card), card]),
      );

      const changedCards = afterCards
        .map((card) => {
          const previous = beforeMap.get(buildCardKey(card));

          if (!previous) {
            return {
              ...card,
              is_new: true,
              xp_gained: 0,
            };
          }

          const changed =
            Number(card?.star_level || 0) !==
              Number(previous?.star_level || 0) ||
            Number(card?.xp || 0) !== Number(previous?.xp || 0) ||
            Number(card?.duplicate_count || 0) !==
              Number(previous?.duplicate_count || 0);

          if (!changed) return null;

          return {
            ...card,
            is_new: false,
            xp_gained: Math.max(
              0,
              Number(card?.xp || 0) - Number(previous?.xp || 0),
            ),
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) => Number(Boolean(b?.is_new)) - Number(Boolean(a?.is_new)),
        );

      return changedCards.slice(0, maxCards);
    },
    [],
  );

  const waitForRewardCards = useCallback(
    async (beforeCards, attempts = 15, waitMs = 400) => {
      let latestChangedCards = [];

      for (let i = 0; i < attempts; i += 1) {
        if (i > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }

        const afterCards = await getCollectionCards();
        const changedCards = deriveRewardCards(beforeCards, afterCards, 3);

        if (changedCards.length > 0) {
          latestChangedCards = changedCards;
        }

        if (latestChangedCards.length >= 3) {
          return latestChangedCards.slice(0, 3);
        }
      }

      return latestChangedCards.slice(0, 3);
    },
    [deriveRewardCards, getCollectionCards],
  );

  const handleExitQuest = async () => {
    if (roundRewardCards.length > 0) {
      navigate("/reward", {
        state: {
          cards: roundRewardCards,
          roundSummary: true,
          challenge: { name: "Quest Reward Summary" },
        },
      });
      return;
    }

    navigate("/");
  };

  const handleAnswer = async (selectedOption) => {
    if (!currentQuest || submitting) return;

    setSubmitting(true);

    try {
      const beforeCollection = await getCollectionCards();

      const result = await submitQuest({
        questId: currentQuest.questId,
        givenAnswer: selectedOption,
        currentStreak: streak,
      });

      const isCorrect = Boolean(result?.is_correct);
      const nextStreak = isCorrect ? streak + 1 : 0;
      const answerLabel = result?.correct_answer || currentQuest.targetWordFi;

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setStreak(nextStreak);
        toast.success(
          `Correct. ${answerLabel ? `Answer: ${answerLabel}` : ""}`,
          { duration: 3000, position: "top-center" },
        );
      } else {
        setWrongCount((prev) => prev + 1);
        setStreak(nextStreak);
        toast.error(`Wrong. Correct answer: ${answerLabel || "unknown"}`, {
          duration: 3000,
          position: "top-center",
        });
      }

      gsap.to(ref.current, {
        x: "300%",
        duration: 0.5,
        onComplete: () => {
          if (ref.current) {
            gsap.set(ref.current, { x: "-300%" });
          }
        },
      });

      const completedChallenges = result?.completed_challenges || [];
      const shouldHandleReward = completedChallenges.length > 0 && isCorrect;

      if (shouldHandleReward) {
        const challengeNames = completedChallenges
          .map((challenge) => challenge?.name)
          .filter(Boolean)
          .join(", ");

        const rewardCards = await waitForRewardCards(beforeCollection);
        if (rewardCards.length > 0) {
          setRoundRewardCards((prev) =>
            mergeRoundRewardCards(prev, rewardCards),
          );
        }

        toast.success(
          challengeNames
            ? `Challenge completed: ${challengeNames}. Reward added to profile.`
            : "Challenge completed. Reward added to profile.",
          {
            duration: 3000,
            position: "top-center",
          },
        );

        window.setTimeout(() => {
          loadQuest().finally(() => setSubmitting(false));
        }, 900);
      } else {
        window.setTimeout(() => {
          loadQuest().finally(() => setSubmitting(false));
        }, 900);
      }
      return;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error submitting answer";
      toast.error(message, { position: "top-center" });
      setSubmitting(false);
    }
  };

  useGSAP(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline();

    tl.fromTo(
      containerRef.current,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(100% at 50% 50%)", duration: 1 },
    ).fromTo(
      boxRef.current,
      { clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" },
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 0.5,
      },
    );
  }, [currentQuest?.questId]);

  if (loading) {
    return <div className="text-center mt-20">Loading quest...</div>;
  }

  if (error && !currentQuest) {
    return <div className="text-center mt-20">{error}</div>;
  }

  if (!currentQuest) {
    return <div className="text-center mt-20">No quests available</div>;
  }

  return (
    <main
      style={{ backgroundImage: "url(/images/quest.png)" }}
      className="bg-cover bg-center h-screen pt-20"
    >
      <div className="flex flex-col items-center justify-center px-4 py-8 gap-4 h-full">
        <div className="w-full max-w-125 flex items-center justify-between text-black text-sm font-semibold px-2">
          <div className="flex gap-8">
            <span>Correct: {correctCount}</span>
            <span>Wrong: {wrongCount}</span>
            <span>Streak: {streak}</span>
          </div>
          <button
            onClick={handleExitQuest}
            className="px-4 py-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Exit Quest
          </button>
        </div>

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
      </div>
    </main>
  );
};

export default QuestPage;
