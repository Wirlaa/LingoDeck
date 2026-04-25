# --- Build Stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first 
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY app.js ./app.js
COPY src ./src

# Bundle your application into dist/app.js
RUN npm run build

# Generate SEA blob and create the binary
RUN echo '{"main": "dist/app.js", "output": "dist/sea-prep.blob"}' > sea-config.json
RUN node --experimental-sea-config sea-config.json
RUN cp $(command -v node) ./dist/app
RUN npx postject ./dist/app NODE_SEA_BLOB ./dist/sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# --- Run Stage (Minimized) ---
FROM alpine:3.20 AS runner
WORKDIR /app

RUN apk add --no-cache libstdc++ libgcc

COPY --from=builder /app/dist/app /app/bin/auth

RUN chmod +x /app/bin/auth

EXPOSE 3000
CMD ["./bin/auth"]
