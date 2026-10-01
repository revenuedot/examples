// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: root build script. The versions match the server's Android contract harness, which builds on Gradle 8.11.1.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
