# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: minimal Django settings for the webhook receiver (no database, no templates).
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import os

# Django refuses to start without one; set a real value in production.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-not-secret")
DEBUG = os.environ.get("DJANGO_DEBUG") == "1"
# host.docker.internal is how a RevenueDot running in Docker reaches this server on your machine.
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,host.docker.internal").split(",")

INSTALLED_APPS = ["webhooks"]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    # Kept on for the rest of a real project; the webhook view opts out with @csrf_exempt.
    "django.middleware.csrf.CsrfViewMiddleware",
]
ROOT_URLCONF = "revenuedot_webhook.urls"
WSGI_APPLICATION = "revenuedot_webhook.wsgi.application"
DATABASES = {}
USE_TZ = True

REVENUEDOT_WEBHOOK_SECRET = os.environ.get("REVENUEDOT_WEBHOOK_SECRET", "")
REVENUEDOT_WEBHOOK_AUTHORIZATION = os.environ.get("REVENUEDOT_WEBHOOK_AUTHORIZATION") or None
