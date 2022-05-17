FROM node:17 as base

WORKDIR /var/local

FROM base as modules

COPY package.json package-lock.json .

RUN npm install --omit=dev --ignore-scripts

FROM modules as build

RUN npm install --ignore-scripts

COPY src src
COPY public public
COPY jsconfig.json next.config.js next-env.d.ts .eslintrc.json .

RUN npm run build

FROM base

COPY --from=modules /var/local/node_modules node_modules

COPY --from=build /var/local/.next .next

COPY --from=build /var/local/package.json .

CMD npm start
