import api from "./client";

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

function unwrapPayload(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function ensureUserId() {
  const user = getCurrentUser();
  if (!user?.id) throw new Error("You need to be logged in to play challenges.");
  return String(user.id);
}

export async function startChallenge({ scenario, deck = null }) {
  const userId = ensureUserId();
  if (!scenario) throw new Error("Missing scenario.");

  const payload = { user_id: userId, scenario };
  if (deck && deck.length > 0) payload.deck = deck;

  const res = await api.post("/challenges/start", payload);
  return unwrapPayload(res.data);
}

export async function submitChallengeAction({ sessionId, questionId, answerCardId, givenAnswer }) {
  if (!sessionId) throw new Error("Missing challenge session id.");
  if (!questionId || !answerCardId || !givenAnswer) throw new Error("Missing answer payload.");

  const res = await api.post(`/challenges/${sessionId}/action`, {
    question_id:    questionId,
    answer_card_id: answerCardId,
    given_answer:   givenAnswer,
  });
  return unwrapPayload(res.data);
}

export async function getChallengeState(sessionId) {
  if (!sessionId) throw new Error("Missing challenge session id.");
  const res = await api.get(`/challenges/${sessionId}`);
  return unwrapPayload(res.data);
}

export async function getHand(sessionId) {
  if (!sessionId) throw new Error("Missing challenge session id.");
  const res = await api.get(`/challenges/${sessionId}/hand`);
  return unwrapPayload(res.data);
}

/**
 * Call when player selects a 4★ card.
 * Returns { modified_options, removed_option } — frontend strikes through removed_option.
 */
export async function preTurn(sessionId, supportCardId) {
  if (!sessionId || !supportCardId) throw new Error("Missing session or card id.");
  const res = await api.post(
    `/challenges/${sessionId}/pre-turn`,
    null,
    { params: { support_card_id: supportCardId } }
  );
  return unwrapPayload(res.data);
}

/**
 * Fetch which scenarios the user has unlocked.
 * Returns array of unlocked scenario strings e.g. ["cafe_order", "asking_directions"]
 */
export async function getScenarioUnlocks() {
  const userId = ensureUserId();
  try {
    const res = await api.get(`/scenarios/unlocks/${userId}`);
    const data = unwrapPayload(res.data);
    // Handle various response shapes
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.unlocked_scenarios)) return data.unlocked_scenarios;
    if (Array.isArray(data?.unlocked)) return data.unlocked;
    return ["cafe_order"]; // fallback: cafe always available
  } catch {
    return ["cafe_order"];
  }
}
