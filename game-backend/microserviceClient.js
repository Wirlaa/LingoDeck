const axios = require("axios");
const config = require("./src/config/config");

const questClient = axios.create({ baseURL: config.services.quest });
const cardClient = axios.create({ baseURL: config.services.card });
const challengeClient = axios.create({ baseURL: config.services.challenge });
const authClient = axios.create({ baseURL: config.services.auth });

function withSecretHeaders(extra = {}) {
  return {
    ...extra,
    headers: {
      ...(extra.headers || {}),
      "x-service-secret": config.services.sharedSecret,
    },
  };
}

module.exports = { questClient, 
  cardClient, 
  challengeClient, 
  authClient,
  withSecretHeaders };