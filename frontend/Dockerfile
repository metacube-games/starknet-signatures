FROM node:latest AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:alpine AS serve

RUN npm install -g serve

COPY --from=build /app/dist /app/dist

WORKDIR /app

ENTRYPOINT ["serve", "-s", "dist"]
