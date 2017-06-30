FROM node:6.10

VOLUME /root/.npm

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_ENV development

ONBUILD COPY .npmrc  /root/.npmrc
