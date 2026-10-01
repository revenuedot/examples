// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: app module: Compose, the RevenueCat Android SDK, and the RevenueDot URL and key as BuildConfig fields.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.revenuedot.paywall"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.revenuedot.paywall"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        // Read from gradle.properties so the URL and key stay out of the code.
        buildConfigField("String", "REVENUEDOT_SERVER_URL", "\"${project.property("revenuedot.serverUrl")}\"")
        buildConfigField("String", "REVENUEDOT_API_KEY", "\"${project.property("revenuedot.apiKey")}\"")
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

dependencies {
    implementation("com.revenuecat.purchases:purchases:10.24.0")
    implementation(platform("androidx.compose:compose-bom:2025.12.01"))
    // Material 3 is plumbing only (sheets, icons, text); the look comes from Theme.kt.
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.13.0")
}
