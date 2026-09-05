FROM oven/bun:1 AS base
WORKDIR /app

# Dependencias primero para aprovechar la caché de capas.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV ENTORNO=produccion
EXPOSE 3001
CMD ["bun", "src/index.ts"]
