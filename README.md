## Getting Started

This project is a server for quick collaboration spaces for running scrums.

This is based on the https://github.com/vercel/next.js starter.

First, run redis:
```bash
docker-compose up -d # and administer redis with redis-commander hosted at http://localhost:8081
```
or setup a local redis server yourself.

Install dependencies with
```bash
npm i --legacy-peer-deps
```

Start the application
```bash
npm run dev # or npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000), create a space,
and have others connect so they can join.

## More

To create more types of collaboration spaces, please see `src/components/spaces/voter/...` as an example.
## Warning

This is a personal project under active/sporadic development, and uses unsupported combinations of packages.

While I try, there are no guarantees with this software.

**USE AT YOUR OWN RISK**
