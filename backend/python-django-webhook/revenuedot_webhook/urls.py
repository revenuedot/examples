# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: routes POST /webhooks/revenuedot to the webhook view.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
from django.urls import path

from webhooks.views import revenuedot_webhook

urlpatterns = [path("webhooks/revenuedot", revenuedot_webhook)]
