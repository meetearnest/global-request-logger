FROM node:6.10

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_ENV development
