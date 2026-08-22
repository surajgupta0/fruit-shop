from pydantic import BaseModel


class ModuleHealthResponse(BaseModel):
    status: str = "ok"
    module: str
