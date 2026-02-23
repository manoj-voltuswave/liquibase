FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js openapi.json ./

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "index.js"]
