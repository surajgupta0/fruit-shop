from fastapi import FastAPI

app = FastAPI(title="search-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "search-service"}
