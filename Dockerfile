FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache libatomic

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

RUN mkdir -p data

CMD ["node", "index.js"]
