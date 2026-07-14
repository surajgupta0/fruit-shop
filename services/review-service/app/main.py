from fastapi import FastAPI

app = FastAPI(title="review-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "review-service"}
