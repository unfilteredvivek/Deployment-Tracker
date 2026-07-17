FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://get.docker.com | sh && \
    rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
