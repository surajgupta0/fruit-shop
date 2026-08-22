from fastapi import APIRouter

from app.core.schemas import ModuleHealthResponse

router = APIRouter(prefix="/payments", tags=["payment"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="payment")
