// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Gradle settings for the Jetpack Compose paywall example.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "RevenueDotPaywall"
include(":app")
