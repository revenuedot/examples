// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: app module: Compose, the stock RevenueCat Android SDK, the API key as a BuildConfig field, and upload signing.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Upload signing comes only from Gradle properties, so the keystore and passphrase never live in the repo. Set them as
// environment variables: ORG_GRADLE_PROJECT_uploadStoreFile, ORG_GRADLE_PROJECT_uploadStorePassword,
// ORG_GRADLE_PROJECT_uploadKeyAlias, ORG_GRADLE_PROJECT_uploadKeyPassword. Without them the release build is unsigned.
val uploadStoreFile = providers.gradleProperty("uploadStoreFile").orNull

android {
    namespace = "app.revenuedot.sandbox"
    compileSdk = 36
    buildToolsVersion = "35.0.0"

    defaultConfig {
        applicationId = "app.revenuedot.sandbox"
        minSdk = 23 // what purchases 10.24.0 declares
        targetSdk = 36
        versionCode = 2
        versionName = "1.1"
        buildConfigField("String", "REVENUEDOT_API_KEY", "\"${providers.gradleProperty("revenuedotApiKey").get()}\"")
    }
    signingConfigs {
        if (uploadStoreFile != null) {
            create("upload") {
                storeFile = file(uploadStoreFile)
                storeType = "pkcs12"
                storePassword = providers.gradleProperty("uploadStorePassword").get()
                keyAlias = providers.gradleProperty("uploadKeyAlias").getOrElse("revenuedot-upload")
                keyPassword = providers.gradleProperty("uploadKeyPassword").orElse(providers.gradleProperty("uploadStorePassword")).get()
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (uploadStoreFile != null) signingConfig = signingConfigs.getByName("upload")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    // The unmodified RevenueCat Android SDK from Maven Central. It brings Play Billing and its BILLING permission.
    implementation("com.revenuecat.purchases:purchases:10.24.0")
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
}
