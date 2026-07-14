# Shared API Contracts

This package holds frontend-facing TypeScript clients generated from each
service's OpenAPI schema.

## Convention

Every Fruit Shop FastAPI service **must** expose its OpenAPI document at:

```
GET /openapi.json
```

Via Traefik in local development this is reachable at:

```
http://localhost/api/<service-name>/openapi.json
```

Examples:

- `http://localhost/api/auth-service/openapi.json`
- `http://localhost/api/catalog-service/openapi.json`
- `http://localhost/api/storefront-bff/openapi.json`

Do not customize or disable FastAPI's default OpenAPI route. Clients and
codegen scripts assume this path is stable.

## Generating typed clients

With all services running (`make dev`), from the repo root:

```bash
./packages/shared-contracts/generate.sh
```

This runs [`openapi-typescript`](https://openapi-ts.dev/) against each
service and writes:

```
packages/shared-contracts/generated/<service-name>.ts
```

Frontend apps (storefront, admin) should import from these generated files,
for example:

```ts
import type { paths } from "@fruitshop/contracts/generated/catalog-service";
```

Re-run `generate.sh` whenever a service's public API changes.
