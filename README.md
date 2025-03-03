# starknet-signatures

This repository gathers the code mentionned in the article [A guide on Starknet signatures](https://dev.to/bastienfaivre/a-guide-on-starknet-signatures-a3m).

## Running the code

- frontend:

```bash
cd frontend
npm install
npm run dev -- --host

# OR

docker run --rm \
  -v "$(pwd)/frontend:/app" \
  -p 3000:3000 \
  -w //app \
  node:latest \
  /bin/bash -c 'npm install && npm run dev -- --host'
```

- go:

```bash
cd go
go mod tidy
go run .

# OR

docker run --rm \
  -v "$(pwd)/go:/app" \
  -w //app \
  golang:latest \
  /bin/bash -c 'go mod tidy && go run .'
```

- typescript:

```bash
cd typescript
npm install
npm start

# OR

docker run --rm \
  -v "$(pwd)/typescript:/app" \
  -w //app \
  node:latest \
  /bin/bash -c 'npm install && npm start'
```
