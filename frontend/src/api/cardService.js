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

  if (!user?.id) {
    throw new Error("You need to be logged in to view your profile.");
  }

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
