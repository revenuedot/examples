// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Ktor server with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook

import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.log
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.request.receive
import io.ktor.server.response.respondText
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import java.security.MessageDigest
import java.time.Clock
import java.util.concurrent.ConcurrentHashMap
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * [authorization] is optional: the Authorization header value set on the webhook.
 * [clock] is injected so tests can freeze "now" at the fixture's signing time.
 */
fun Application.webhookModule(secret: String, authorization: String?, clock: Clock = Clock.systemUTC()) {
    // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
    val seen = ConcurrentHashMap.newKeySet<String>()

    routing {
        post("/webhooks/revenuedot") {
            // Receive the raw bytes: the signature covers them exactly, so parse JSON only after verifying.
            val raw = call.receive<ByteArray>()
            if (!verifySignature(raw, call.request.headers[SIGNATURE_HEADER], secret, clock.instant())) {
                return@post call.respondText("""{"error":"invalid signature"}""", ContentType.Application.Json, HttpStatusCode.Unauthorized)
            }
            if (!authorization.isNullOrEmpty() &&
                !MessageDigest.isEqual((call.request.headers["Authorization"] ?: "").toByteArray(), authorization.toByteArray())
            ) {
                return@post call.respondText("""{"error":"invalid authorization"}""", ContentType.Application.Json, HttpStatusCode.Unauthorized)
            }
            val event = runCatching { Json.parseToJsonElement(raw.decodeToString()).jsonObject["event"] as JsonObject }.getOrNull()
                ?: return@post call.respondText("""{"error":"bad json"}""", ContentType.Application.Json, HttpStatusCode.BadRequest)
            fun field(name: String) = event[name]?.jsonPrimitive?.contentOrNull

            if (!seen.add(field("id") ?: "")) {
                return@post call.respondText("""{"received":true,"duplicate":true}""", ContentType.Application.Json)
            }

            // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
            val user = field("app_user_id")
            when (val type = field("type")) {
                "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE" -> {
                    val entitlements = event["entitlement_ids"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
                    call.application.log.info("grant $entitlements to $user")
                }
                "EXPIRATION" -> call.application.log.info("access ended for $user (${field("expiration_reason")})")
                else -> call.application.log.info("$type for $user")
            }
            call.respondText("""{"received":true}""", ContentType.Application.Json)
        }
    }
}

fun main() {
    val secret = System.getenv("REVENUEDOT_WEBHOOK_SECRET")
    require(!secret.isNullOrEmpty()) { "Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)" }
    val port = System.getenv("PORT")?.toIntOrNull() ?: 3000
    embeddedServer(Netty, port = port) {
        webhookModule(secret, System.getenv("REVENUEDOT_WEBHOOK_AUTHORIZATION"))
        log.info("Listening on http://localhost:$port/webhooks/revenuedot")
    }.start(wait = true)
}
