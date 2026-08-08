FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install
# Install Docker CLI so the app can talk to the host's Docker daemon

RUN apt-get update && apt-get install -y curl unzip && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

COPY . .

EXPOSE 3000

CMD ["npm", "start"]