FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install

# Install Docker CLI so the app can talk to the host's Docker daemon
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 3000

CMD ["npm", "start"]