from fastapi import APIRouter

from app.core.schemas import ModuleHealthResponse

router = APIRouter(prefix="/notifications", tags=["notification"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="notification")
