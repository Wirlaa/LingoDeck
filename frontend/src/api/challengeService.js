import api from "./client";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function unwrapPayload(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function ensureUserId() {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in to play challenges.");
  }

  return String(user.id);
}

export async function startChallenge({ scenario }) {
  const userId = ensureUserId();

  if (!scenario) {
    throw new Error("Missing scenario.");
  }

  const res = await api.post("/challenges/start", {
    user_id: userId,
    scenario,
  });

  return unwrapPayload(res.data);
}

export async function submitChallengeAction({
  sessionId,
  questionId,
  answerCardId,
  givenAnswer,
}) {
  if (!sessionId) {
    throw new Error("Missing challenge session id.");
  }

  if (!questionId || !answerCardId || !givenAnswer) {
    throw new Error("Missing answer payload.");
  }

  const res = await api.post(`/challenges/${sessionId}/action`, {
    question_id: questionId,
    answer_card_id: answerCardId,
    given_answer: givenAnswer,
  });

  return unwrapPayload(res.data);
}

export async function getChallengeState(sessionId) {
  if (!sessionId) {
    throw new Error("Missing challenge session id.");
  }

  const res = await api.get(`/challenges/${sessionId}`);
  return unwrapPayload(res.data);
}
