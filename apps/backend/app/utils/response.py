"""
BaazarSetu — Response Helpers
Consistent JSON response formatting for all API endpoints.
"""
from typing import Any, Optional, List
from math import ceil


def success_response(
    data: Any = None,
    message: Optional[str] = None,
) -> dict:
    return {"success": True, "data": data, "message": message}


def error_response(
    code: str,
    message: str,
    field: Optional[str] = None,
) -> dict:
    error = {"code": code, "message": message}
    if field:
        error["field"] = field
    return {"success": False, "error": error}


def paginate(
    items: List[Any],
    page: int,
    page_size: int,
    total: int,
) -> dict:
    return {
        "success": True,
        "data": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size) if page_size > 0 else 0,
        },
    }
