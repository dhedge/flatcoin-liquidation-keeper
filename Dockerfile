FROM node:16-alpine

ARG NODE_ENV=dev
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY ["package.json", "yarn.lock*", "./"]

RUN yarn install

COPY . .

RUN yarn run build

CMD [ "yarn", "run", "start:dev" ]