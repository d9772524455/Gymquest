FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY client/ ./client/
COPY dashboard/ ./dashboard/
COPY shared/ ./shared/
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1
CMD ["node", "server/index.js"]
