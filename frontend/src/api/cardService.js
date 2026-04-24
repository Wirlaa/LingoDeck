import api from "./client";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function requireUserId() {
  const user = getCurrentUser();
  if (!user?.id) throw new Error("You need to be logged in to view your profile.");
  return String(user.id);
}

function unwrapPayload(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

export async function getMyCollection() {
  const userId = requireUserId();
  const res = await api.get(`/cards/collection/${userId}`);
  return unwrapPayload(res.data);
}

export async function getCollectionByScenario(scenario) {
  const userId = requireUserId();
  const res = await api.get(`/cards/collection/${userId}/scenario/${scenario}`);
  return unwrapPayload(res.data);
}

/**
 * Returns only the 2★+ cards eligible for battle in a given scenario.
 * Used by ChallengePage to display the real battle hand.
 */
export async function getBattleDeck(scenario) {
  const userId = requireUserId();
  const res = await api.get(`/cards/battle-ready/${userId}/${scenario}`);
  return unwrapPayload(res.data);
}

/**
 * Open a card pack.
 * Moved here from questService.js — card operations belong in cardService.
 */
export async function openPack({ scenarioBias = null } = {}) {
  const user = getCurrentUser();
  if (!user?.id) throw new Error("You need to be logged in to open a pack.");

  const payload = { user_id: String(user.id) };
  if (scenarioBias) payload.scenario_bias = scenarioBias;

  try {
    const res = await api.post("/cards/open-pack", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    console.error("Error opening pack:", err);
    throw err;
  }
}
