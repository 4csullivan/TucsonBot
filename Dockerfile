FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache libatomic
RUN apk add --no-cache fontconfig \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    && fc-cache -f -v

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

RUN mkdir -p data

CMD ["node", "index.js"]
