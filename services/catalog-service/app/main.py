from fastapi import FastAPI

app = FastAPI(title="catalog-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "catalog-service"}
