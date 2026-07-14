from fastapi import FastAPI

app = FastAPI(title="inventory-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "inventory-service"}
