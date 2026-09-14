"""RBAC permission codes for Fruit Shop."""

# User management
USERS_READ_SELF = "users:read_self"
USERS_UPDATE_SELF = "users:update_self"
USERS_LIST = "users:list"
USERS_READ = "users:read"
USERS_CREATE = "users:create"
USERS_UPDATE = "users:update"
USERS_CHANGE_ROLE = "users:change_role"
USERS_DEACTIVATE = "users:deactivate"

# Role / permission management
ROLES_LIST = "roles:list"
ROLES_MANAGE = "roles:manage"

# Module permissions
CATALOG_MANAGE = "catalog:manage"
INVENTORY_MANAGE = "inventory:manage"
ORDERS_MANAGE = "orders:manage"
ORDERS_READ = "orders:read"
COUPONS_MANAGE = "coupons:manage"
NOTIFICATIONS_READ = "notifications:read"
REVIEWS_MANAGE = "reviews:manage"

ALL_PERMISSIONS: list[tuple[str, str]] = [
    (USERS_READ_SELF, "View own profile"),
    (USERS_UPDATE_SELF, "Update own profile"),
    (USERS_LIST, "List users"),
    (USERS_READ, "View any user"),
    (USERS_CREATE, "Create staff/admin users"),
    (USERS_UPDATE, "Update any user"),
    (USERS_CHANGE_ROLE, "Change user roles"),
    (USERS_DEACTIVATE, "Activate/deactivate users"),
    (ROLES_LIST, "List roles and permissions"),
    (ROLES_MANAGE, "Manage role permissions"),
    (CATALOG_MANAGE, "Manage catalog"),
    (INVENTORY_MANAGE, "Manage inventory"),
    (ORDERS_MANAGE, "Manage orders"),
    (ORDERS_READ, "Read orders"),
    (COUPONS_MANAGE, "Manage coupons"),
    (NOTIFICATIONS_READ, "Read notification logs"),
    (REVIEWS_MANAGE, "Moderate product reviews"),
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "customer": [
        USERS_READ_SELF,
        USERS_UPDATE_SELF,
        ORDERS_READ,
    ],
    "staff": [
        USERS_READ_SELF,
        USERS_UPDATE_SELF,
        USERS_LIST,
        USERS_READ,
        CATALOG_MANAGE,
        INVENTORY_MANAGE,
        ORDERS_MANAGE,
        ORDERS_READ,
        COUPONS_MANAGE,
        NOTIFICATIONS_READ,
        REVIEWS_MANAGE,
    ],
    "admin": [code for code, _ in ALL_PERMISSIONS],
}

ROLES: list[tuple[str, str]] = [
    ("customer", "Storefront customer (OTP login)"),
    ("staff", "Shop staff (email/password login)"),
    ("admin", "Full system administrator"),
]


def permissions_for_role(role: str) -> list[str]:
    return list(ROLE_PERMISSIONS.get(role, []))

