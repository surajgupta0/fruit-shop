.PHONY: dev down

dev:
	docker compose -f infra/docker-compose.dev.yml --env-file .env.dev up --build

down:
	docker compose -f infra/docker-compose.dev.yml --env-file .env.dev down
