// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the Ktor webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import java.io.File
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class WebhookTest {
    private val fixture = Json.parseToJsonElement(File("testdata/initial-purchase.json").readText()).jsonObject
    private val secret = fixture["secret"]!!.jsonPrimitive.content
    private val signature = fixture["signature_header"]!!.jsonPrimitive.content
    private val authorization = fixture["authorization_header"]!!.jsonPrimitive.content
    private val payload = fixture["body"]!!.jsonPrimitive.content
    // Freeze "now" at the signing time; otherwise the 5-minute window has long passed.
    private val signedAt = Instant.ofEpochSecond(Regex("""t=(\d+)""").find(signature)!!.groupValues[1].toLong())

    @Test
    fun `accepts the real delivery and rejects tampering, wrong secrets, old deliveries and missing headers`() {
        val raw = payload.toByteArray()
        assertTrue(verifySignature(raw, signature, secret, signedAt))
        assertFalse(verifySignature(payload.replaceFirst("9.99", "0.99").toByteArray(), signature, secret, signedAt), "changed body")
        assertFalse(verifySignature(raw, signature, "whsec_wrong", signedAt), "wrong secret")
        assertFalse(verifySignature(raw, signature, secret, signedAt.plusSeconds(301)), "old delivery")
        assertFalse(verifySignature(raw, null, secret, signedAt), "missing header")
    }

    @Test
    fun `POST webhooks-revenuedot answers 200, dedupes retries and refuses bad signatures`() = testApplication {
        application { webhookModule(secret, authorization, Clock.fixed(signedAt, ZoneOffset.UTC)) }

        suspend fun send(sig: String, auth: String): HttpResponse = client.post("/webhooks/revenuedot") {
            contentType(ContentType.Application.Json)
            header(SIGNATURE_HEADER, sig)
            header("Authorization", auth)
            // Not `body`: inside this builder that name is the request's own (empty) body.
            setBody(payload)
        }

        send(signature, authorization).let {
            assertEquals(HttpStatusCode.OK, it.status)
            assertEquals("""{"received":true}""", it.bodyAsText())
        }
        assertEquals("""{"received":true,"duplicate":true}""", send(signature, authorization).bodyAsText())
        assertEquals(HttpStatusCode.Unauthorized, send("t=1,v1=00", authorization).status)
        assertEquals(HttpStatusCode.Unauthorized, send(signature, "Bearer nope").status)
    }
}
