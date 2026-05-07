FROM node:20-bookworm-slim

WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=4173
ENV RECIPE_PREFERENCES_DATA_DIR=/data/recipes

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production

RUN mkdir -p /data/recipes && chown -R node:node /data/recipes

USER node

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
