FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
ENV PORT=5173
# Run Vite dev server - good for local dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
