FROM node:22-alpine

WORKDIR /app

# Install deps first 
COPY package.json package-lock.json* ./
RUN npm install --only=production || npm install

# Copy source
COPY app.js ./app.js
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "app.js"]