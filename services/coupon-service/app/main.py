from fastapi import FastAPI

app = FastAPI(title="coupon-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "coupon-service"}
