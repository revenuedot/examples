#!/usr/bin/env python3
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: Django's command-line entry point (runserver, test).
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revenuedot_webhook.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
