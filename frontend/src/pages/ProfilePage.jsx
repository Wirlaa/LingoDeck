import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyCollection } from "../api/cardService";

const SCENARIO_ORDER = [
  "cafe_order",
  "job_interview",
  "asking_directions",
  "kela_boss",
];

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user] = useState(readStoredUser());
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("all");

  useEffect(() => {
    if (!user?.id) {
      toast.error("Please login first.");
      navigate("/login");
      return;
    }

    const loadCollection = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyCollection();
        setCards(Array.isArray(data?.cards) ? data.cards : []);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.detail ||
          err.message ||
          "Failed to load collection.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [navigate, user?.id]);

  const scenarios = useMemo(() => {
    const unique = new Set(cards.map((card) => card.scenario).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [cards]);

  const visibleCards = useMemo(() => {
    if (scenarioFilter === "all") return cards;
    return cards.filter((card) => card.scenario === scenarioFilter);
  }, [cards, scenarioFilter]);

  const cardsByStars = useMemo(() => {
    return {
      oneStar: cards.filter((c) => c.star_level === 1).length,
      twoPlus: cards.filter((c) => c.star_level >= 2).length,
      threePlus: cards.filter((c) => c.star_level >= 3).length,
      fourStar: cards.filter((c) => c.star_level === 4).length,
    };
  }, [cards]);

  if (loading) {
    return <div className="text-center mt-28">Loading profile...</div>;
  }

  return (
    <main
      style={{ backgroundImage: "url(/images/profile.png)" }}
      className="bg-cover bg-center min-h-screen pt-22 pb-12"
    >
      <div className="max-w-6xl mx-auto px-4">
        <section className="bg-[#fff4df]/94 border-4 border-[#8b5a2b] rounded-2xl p-5 md:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-[#5a3b1a]">My Profile</h1>
              <p className="text-sm text-[#7a5a36]">
                {user?.username
                  ? `Welcome, ${user.username}`
                  : "Your card collection"}
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white rounded-lg"
            >
              Back Home
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-[#5a3b1a] font-semibold">
              Scenario:
            </span>
            {scenarios.map((scenario) => {
              const selected = scenarioFilter === scenario;
              return (
                <button
                  key={scenario}
                  onClick={() => setScenarioFilter(scenario)}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer border ${
                    selected
                      ? "bg-[#8b5a2b] text-[#fff4df] border-[#6c431e]"
                      : "bg-white text-[#5a3b1a] border-[#d7b88b]"
                  }`}
                >
                  {scenario === "all" ? "All" : scenario}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-[#7a5a36]">
            Total cards: {cards.length} | Showing: {visibleCards.length}
          </p>

          {error ? (
            <p className="mt-3 text-sm text-red-700 font-semibold">{error}</p>
          ) : null}

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="bg-[#f2e6d5] border-2 border-[#d7b88b] rounded-lg p-3">
              <p className="text-xs uppercase tracking-wide text-[#7a5a36] font-semibold">
                Challenge Readiness
              </p>
              <p className="mt-2 text-sm text-[#4b2d12]">
                <span className="font-bold text-[#5a8b41]">
                  {cardsByStars.twoPlus}
                </span>{" "}
                cards at 2★+
              </p>
              <p className="text-xs text-[#7a5a36] mt-1">
                1★: {cardsByStars.oneStar} | 3★+: {cardsByStars.threePlus} | 4★:{" "}
                {cardsByStars.fourStar}
              </p>
            </div>

            <div className="bg-[#f2e6d5] border-2 border-[#d7b88b] rounded-lg p-3">
              <p className="text-xs uppercase tracking-wide text-[#7a5a36] font-semibold">
                Collection Stats
              </p>
              <p className="mt-2 text-sm text-[#4b2d12]">
                Total cards: <span className="font-bold">{cards.length}</span>
              </p>
              <p className="text-xs text-[#7a5a36] mt-1">
                Keep playing quests and opening packs to level up cards!
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <article
              key={card.card_id}
              className="bg-[#fff7ea]/96 border-3 border-[#8b5a2b] rounded-2xl p-4"
            >
              <h2 className="text-xl font-bold text-[#4b2d12]">
                {card.word_fi}
              </h2>
              <p className="text-sm text-[#7a5a36] italic">{card.word_en}</p>

              <div className="mt-3 text-sm text-[#4b2d12] space-y-1">
                <p>Scenario: {card.scenario}</p>
                <p>Rarity: {card.rarity}</p>
                <p>Stars: {card.star_level}★</p>
                <p>XP: {card.xp}</p>
              </div>
            </article>
          ))}

          {!error && visibleCards.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 text-center bg-[#fff7ea]/96 border-3 border-[#8b5a2b] rounded-2xl p-8 text-[#5a3b1a]">
              No cards found for this filter yet.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
