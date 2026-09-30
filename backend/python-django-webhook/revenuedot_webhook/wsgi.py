# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: WSGI entry point for production servers such as gunicorn.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revenuedot_webhook.settings")
application = get_wsgi_application()
