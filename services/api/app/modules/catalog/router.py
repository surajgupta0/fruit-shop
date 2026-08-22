from fastapi import APIRouter

from app.core.schemas import ModuleHealthResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="catalog")
