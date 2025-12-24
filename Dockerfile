FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
ENV VITE_ELEVENLABS_AGENT_ID=agent_5901kch85sfye06s56m7kshw9kf4
RUN rm -rf .output && bun run build

FROM base AS release
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=prerelease /app/.output /app/.output
COPY --from=prerelease /app/public /app/public

EXPOSE 3000

CMD ["bun", "--bun", ".output/server/index.mjs"]
