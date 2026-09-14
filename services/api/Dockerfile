FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY packages/shared-lib-py /packages/shared-lib-py

RUN pip install --no-cache-dir /packages/shared-lib-py \
    && pip install --no-cache-dir \
        "fastapi>=0.115.0" \
        "uvicorn[standard]>=0.32.0" \
        "pydantic-settings>=2.6.0" \
        "pydantic[email]>=2.9.0" \
        "sqlalchemy[asyncio]>=2.0.36" \
        "asyncpg>=0.30.0" \
        "alembic>=1.14.0" \
        "bcrypt>=4.2.0" \
        "PyJWT>=2.9.0" \
        "httpx>=0.28.0"

COPY services/api/app ./app
COPY services/api/alembic ./alembic
COPY services/api/alembic.ini ./alembic.ini
COPY services/api/docker-entrypoint.sh /docker-entrypoint.sh

# Do NOT COPY certs from git. Provide CA at runtime:
#   Render Secret File → /etc/secrets/aiven-ca.pem (+ DB_SSL_CA)
#   or env DB_SSL_CA_PEM
#   or local volume mount → /app/certs/aiven-ca.pem
RUN mkdir -p ./certs && chmod +x /docker-entrypoint.sh

ENV PYTHONPATH=/app

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
