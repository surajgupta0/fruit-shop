.PHONY: dev down reset

dev:
	docker compose -f infra/docker-compose.dev.yml --env-file .env.dev up --build

down:
	docker compose -f infra/docker-compose.dev.yml --env-file .env.dev down

reset:
	docker compose -f infra/docker-compose.dev.yml --env-file .env.dev down -v
