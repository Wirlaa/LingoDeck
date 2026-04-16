import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const CardRewardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardRef = useRef();
  const containerRef = useRef();
  const textRef = useRef();
  const cardsRowRef = useRef();

  const cards = location.state?.cards || [];
  const challenge = location.state?.challenge;
  const roundSummary = Boolean(location.state?.roundSummary);
  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;

  useGSAP(() => {
    if (!cardRef.current || !currentCard) return;

    const tl = gsap.timeline();

    tl.fromTo(
      cardRef.current,
      {
        opacity: 0,
        scale: 0,
        rotationY: 180,
      },
      {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 0.8,
        ease: "back.out(1.7)",
      },
      0,
    );

    if (textRef.current) {
      tl.fromTo(
        textRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        0.4,
      );
    }

    tl.to(
      cardRef.current,
      {
        boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)",
        duration: 0.6,
      },
      0.3,
    );
  }, [currentCardIndex, currentCard]);

  useGSAP(() => {
    if (!roundSummary || !cardsRowRef.current) return;

    const items = cardsRowRef.current.querySelectorAll("[data-reward-card]");
    if (!items.length) return;

    gsap.fromTo(
      items,
      {
        opacity: 0,
        y: 60,
        scale: 0.8,
        rotateZ: -4,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateZ: 0,
        duration: 0.65,
        stagger: 0.1,
        ease: "back.out(1.4)",
      },
    );
  }, [roundSummary, cards]);

  const getRarityColor = (rarity) => {
    const rarityMap = {
      Common: "text-gray-400",
      Uncommon: "text-green-400",
      Rare: "text-blue-400",
      Epic: "text-purple-500",
      Legendary: "text-yellow-500",
    };
    return rarityMap[rarity] || "text-gray-400";
  };

  const getRarityBgColor = (rarity) => {
    const rarityMap = {
      Common: "bg-gray-700",
      Uncommon: "bg-green-700",
      Rare: "bg-blue-700",
      Epic: "bg-purple-700",
      Legendary: "bg-yellow-600",
    };
    return rarityMap[rarity] || "bg-gray-700";
  };

  const getRarityBorder = (rarity) => {
    const rarityMap = {
      Common: "border-gray-500",
      Uncommon: "border-green-500",
      Rare: "border-blue-500",
      Epic: "border-purple-500",
      Legendary: "border-yellow-400",
    };
    return rarityMap[rarity] || "border-gray-500";
  };

  const handleNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const handleContinue = () => {
    navigate("/quest");
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center mt-20 text-white h-screen flex flex-col items-center justify-center">
        <p>No cards to display</p>
        <button
          onClick={() => navigate("/quest")}
          className="mt-4 px-6 py-2 cursor-pointer bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Back to Quest
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  if (roundSummary) {
    return (
      <main
        style={{ backgroundImage: "url(/images/quest-finish.png)" }}
        className="bg-cover bg-center min-h-screen"
      >
        <div className="h-full min-h-screen px-4 py-12 flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#fff4df] mb-2">
              {challenge?.name || "Quest Reward Summary"}
            </h1>
            <p className="text-[#fff4df] text-lg opacity-85">
              You earned {totalCards} reward card{totalCards !== 1 ? "s" : ""}{" "}
              this run.
            </p>
          </div>

          <div
            ref={cardsRowRef}
            className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {cards.map((card, idx) => (
              <article
                key={`${card?.card_id || card?.word_fi || "card"}-${idx}`}
                data-reward-card
                className={`rounded-2xl border-4 ${getRarityBorder(card?.rarity)} ${getRarityBgColor(card?.rarity)} shadow-2xl p-4 text-center`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${getRarityColor(card?.rarity)}`}
                >
                  {card?.rarity || "Common"}
                </p>
                <p className="text-2xl font-bold text-white mt-4">
                  {card?.word_fi}
                </p>
                <p className="text-base text-gray-200 mt-1">{card?.word_en}</p>
                <p className="text-xs text-gray-300 mt-3">
                  Scenario:{" "}
                  <span className="capitalize">
                    {card?.scenario || "general"}
                  </span>
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Star: {Number(card?.star_level || 1)}
                </p>
                <p className="text-xs mt-2 text-[#fff4df]">
                  {card?.is_new
                    ? "New card"
                    : `Duplicate +${Number(card?.xp_gained || 0)} XP`}
                </p>
              </article>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 cursor-pointer bg-linear-to-r from-blue-600 to-blue-800 text-white font-bold rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Back Home
          </button>
        </div>
      </main>
    );
  }

  const isNew = currentCard?.is_new;

  return (
    <main
      style={{ backgroundImage: "url(/images/quest-finish.png)" }}
      className="bg-cover bg-center h-auto"
    >
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full px-4 gap-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#fff4df] mb-2">
            {challenge?.name || "🎉 Challenge Complete!"}
          </h1>
          <p className="text-[#fff4df] text-lg opacity-75">
            You earned {totalCards} reward card{totalCards !== 1 ? "s" : ""}!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div
            ref={cardRef}
            className={`w-64 h-96 rounded-2xl border-4 ${getRarityBorder(
              currentCard.rarity,
            )} ${getRarityBgColor(
              currentCard.rarity,
            )} shadow-2xl cursor-default transform-gpu`}
            style={{ perspective: "1000px" }}
          >
            <div className="h-full flex flex-col items-center justify-between p-6 text-center">
              <div
                className={`text-xs font-bold uppercase tracking-wide ${getRarityColor(
                  currentCard.rarity,
                )}`}
              >
                {currentCard.rarity}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl font-bold text-white">
                  {currentCard.word_fi}
                </div>
                <div className="text-xl text-gray-200">
                  {currentCard.word_en}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Star Level:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-xl ${
                        i < currentCard.star_level
                          ? "text-yellow-400"
                          : "text-gray-600"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={textRef}
            className="text-center text-[#fff4df] max-w-sm opacity-0 bg-black/80 rounded-md p-4"
          >
            <p className="text-sm mb-2">
              {isNew
                ? `Great! You've added "${currentCard.word_fi}" to your collection!`
                : `You already had this card. Gained ${currentCard.xp_gained} XP!`}
            </p>
            <p className="text-xs text-gray-400">
              Scenario:{" "}
              <span className="capitalize">{currentCard.scenario}</span>
            </p>
          </div>
        </div>

        {totalCards > 1 && (
          <div className="flex items-center gap-6">
            <button
              onClick={handlePrevCard}
              disabled={currentCardIndex === 0}
              className="px-4 py-2 cursor-progress bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <span className="text-[#fff4df] font-semibold">
              Card {currentCardIndex + 1} of {totalCards}
            </span>
            <button
              onClick={handleNextCard}
              disabled={currentCardIndex === totalCards - 1}
              className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="px-8 py-3 cursor-pointer bg-linear-to-r from-blue-600 to-blue-800 text-white font-bold rounded-lg hover:shadow-xl transition-all transform hover:scale-105 mb-10"
        >
          Continue to Quest →
        </button>
      </div>
    </main>
  );
};

export default CardRewardPage;
