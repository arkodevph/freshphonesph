"""
Django settings for the Fresh Phones PH API (config project).

Env-driven (django-environ). See docs/09-tech-stack.md and docs/02-foundation-setup.md.
Secrets come from the environment only — never commit real values (§16).
"""
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
)
# Load apps/api/.env if present (local dev); Railway/Vercel inject real env in prod.
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# --- Applications ---------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
]
# One app per functional module (docs/05-modules.md, docs/09-tech-stack.md).
LOCAL_APPS = [
    "auth_app",
    "clients_app",
    "batches_app",
    "payments_app",
    "documents_app",
    "tasks_app",
    "kpi_app",
    "reports_app",
    "support_app",
    "recruitment_app",
    "agents_app",
    "notifications_app",
    "ai_app",
    "audit_app",
    "storage_app",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database -------------------------------------------------------------
# Local: Docker Postgres (docker-compose). Prod: Supabase Postgres via DATABASE_URL.
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://fresh:fresh@localhost:5435/fresh",
    )
}

# --- Auth -----------------------------------------------------------------
# Custom user (email login) is introduced in M2 (auth_app). Until that migration
# lands, Django's default user is used. Flip this on when auth_app.User exists:
# AUTH_USER_MODEL = "auth_app.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- DRF + JWT ------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Fresh Phones PH API",
    "DESCRIPTION": "Integrated Web System & Portal — internal API",
    "VERSION": "0.1.0",
}

# --- CORS -----------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

# --- Storage (Supabase Storage via S3 API; MinIO locally) -----------------
# Wired per-need in storage_app; kept optional so the project boots without it.
AWS_S3_ENDPOINT_URL = env("SUPABASE_S3_ENDPOINT", default="")
AWS_ACCESS_KEY_ID = env("SUPABASE_S3_ACCESS_KEY", default="")
AWS_SECRET_ACCESS_KEY = env("SUPABASE_S3_SECRET_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("SUPABASE_S3_BUCKET", default="")

# --- i18n / tz ------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

# --- Static ---------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
