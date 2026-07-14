FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY packages/shared-lib-py /packages/shared-lib-py
COPY services/auth-service/pyproject.toml /tmp/auth/pyproject.toml

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

COPY services/auth-service/app ./app
COPY services/auth-service/fixtures ./fixtures
COPY services/auth-service/alembic ./alembic
COPY services/auth-service/alembic.ini ./alembic.ini

ENV PYTHONPATH=/app
ENV FRUITSHOP_ROOT=/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
