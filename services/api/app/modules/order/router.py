from fastapi import APIRouter

from app.core.schemas import ModuleHealthResponse

router = APIRouter(prefix="/orders", tags=["order"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="order")
