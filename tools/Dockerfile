FROM node:16-slim

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install -g mighty-batch && npm install

COPY . .