import json
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
    """
    if not filename.endswith(".json"):
        filename = f"{filename}.json"

    path = _repo_root() / "services" / service_name / "fixtures" / filename

    if not path.is_file():
        raise FileNotFoundError(f"Fixture not found: {path}")

    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, (dict, list)):
        raise ValueError(
            f"Fixture {path} must be a JSON object or array, got {type(data).__name__}"
        )

    return data
