import json
import os
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    """Resolve the monorepo root from this package's location.

    Layout: <repo>/packages/shared-lib-py/fruitshop_shared/mock.py
    """
    return Path(__file__).resolve().parents[3]


def load_fixture(service_name: str, filename: str) -> dict[str, Any] | list[Any]:
    """Load a JSON fixture from services/<service_name>/fixtures/<filename>.

    ``filename`` may be given with or without a ``.json`` suffix.

    Search order:
    1. ``$FRUITSHOP_ROOT/services/<service>/fixtures/``
    2. Monorepo-relative path from this package
    3. ``./fixtures/`` (Docker / local service cwd)
    4. ``/app/fixtures/`` (default container layout)
    """
    if not filename.endswith(".json"):
        filename = f"{filename}.json"

    candidates: list[Path] = []

    if root := os.getenv("FRUITSHOP_ROOT"):
        candidates.append(Path(root) / "services" / service_name / "fixtures" / filename)

    candidates.append(_repo_root() / "services" / service_name / "fixtures" / filename)
    candidates.append(Path("fixtures") / filename)
    candidates.append(Path("/app/fixtures") / filename)

    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        tried = ", ".join(str(p) for p in candidates)
        raise FileNotFoundError(f"Fixture not found: {filename} (tried: {tried})")

    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, (dict, list)):
        raise ValueError(
            f"Fixture {path} must be a JSON object or array, got {type(data).__name__}"
        )

    return data
