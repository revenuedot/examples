// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: root build script. AGP 8.13 on Gradle 8.14.5 builds against compileSdk 36, which Google Play requires.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
