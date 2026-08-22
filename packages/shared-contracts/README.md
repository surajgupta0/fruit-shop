# Shared API Contracts

Frontend TypeScript clients are generated from the monolith API OpenAPI schema.

## OpenAPI

```
GET http://localhost:8000/openapi.json
```

Interactive docs:

```
http://localhost:8000/docs
```

## Generate client

With the API running (`make dev`):

```bash
./packages/shared-contracts/generate.sh
```

Output:

```
packages/shared-contracts/generated/fruit-shop-api.ts
```
