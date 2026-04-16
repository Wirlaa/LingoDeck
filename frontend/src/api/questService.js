import api from "./client";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function normalizeQuest(questData) {
  const quest = questData?.data ?? questData ?? {};
  const difficultyValue = Number(quest.difficulty);

  return {
    questId: String(quest.quest_id || quest.id || quest.questId || ""),
    questionFi: quest.question_fi || quest.questionFi || quest.question || "",
    questionEn: quest.question_en || quest.questionEn || "",
    options: Array.isArray(quest.options) ? quest.options : [],
    difficulty: Number.isFinite(difficultyValue) ? difficultyValue : 0,
    scenario: quest.scenario || "general",
    targetWordFi: quest.target_word_fi || quest.targetWordFi || "",
    correctAnswer: quest.correct_answer || quest.correctAnswer || null,
  };
}

export async function generateQuest({ scenarioTag, difficultyTarget } = {}) {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in to play quests.");
  }

  const payload = {
    user_id: String(user.id),
  };

  if (scenarioTag) {
    payload.scenario_tag = scenarioTag;
  }

  if (typeof difficultyTarget === "number") {
    payload.difficulty_target = difficultyTarget;
  }

  try {
    const res = await api.post("/quests/generate", payload);

    return normalizeQuest(res.data?.data);
  } catch (err) {
    console.log("❌ FULL ERROR:", err.response?.data);
    console.log("❌ REAL MESSAGE:", err.response?.data?.message?.[0]); // 👈 THIS
    throw err;
  }
}

export async function submitQuest({ questId, givenAnswer, currentStreak = 0 }) {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in to submit quests.");
  }

  if (!questId) {
    throw new Error("Missing quest id.");
  }

  const res = await api.post("/quests/submit", {
    user_id: String(user.id),
    quest_id: String(questId),
    given_answer: givenAnswer,
    current_streak: currentStreak,
  });

  return res.data?.data ?? res.data;
}

export async function openPack({ scenarioBias = null } = {}) {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in to open a pack.");
  }

  const payload = {
    user_id: String(user.id),
  };

  if (scenarioBias) {
    payload.scenario_bias = scenarioBias;
  }

  try {
    const res = await api.post("/cards/open-pack", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.error("Error opening pack:", err);
    throw err;
  }
}

export async function getQuestChallenges() {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in to view quest challenges.");
  }

  const res = await api.get(`/quests/challenges/${String(user.id)}`);
  return res.data?.data ?? res.data;
}
