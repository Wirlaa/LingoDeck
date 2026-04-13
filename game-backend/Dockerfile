FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --only=production || npm install

# Copy source
COPY app.js ./app.js
COPY microserviceClient.js ./microserviceClient.js
COPY src ./src

# Env
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "app.js"]