// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Axum router with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
pub mod verify;

use axum::{
    body::Bytes,
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    routing::post,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use subtle::ConstantTimeEq;
use verify::{verify_signature, SIGNATURE_HEADER};

/// The fields this handler uses; the full list is at https://revenuedot.app/docs/api/webhook-events
#[derive(Deserialize)]
struct Event {
    id: String,
    #[serde(rename = "type")]
    kind: String,
    app_user_id: Option<String>,
    entitlement_ids: Option<Vec<String>>,
    expiration_reason: Option<String>,
}

#[derive(Deserialize)]
struct Payload {
    event: Event,
}

struct AppState {
    secret: String,
    authorization: Option<String>, // optional: the Authorization header value set on the webhook
    now: Box<dyn Fn() -> i64 + Send + Sync>,
    seen: Mutex<HashSet<String>>, // at-least-once delivery; use a unique index in production
}

pub fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Builds the router. `now` returns unix seconds; tests pass a frozen clock.
pub fn app(
    secret: String,
    authorization: Option<String>,
    now: impl Fn() -> i64 + Send + Sync + 'static,
) -> Router {
    let state = Arc::new(AppState {
        secret,
        authorization,
        now: Box::new(now),
        seen: Mutex::new(HashSet::new()),
    });
    Router::new()
        .route("/webhooks/revenuedot", post(handle))
        .with_state(state)
}

// `Bytes` is the raw body: the signature covers the exact bytes, so parse JSON only after verifying.
async fn handle(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, Json<Value>) {
    let signature = headers.get(SIGNATURE_HEADER).and_then(|v| v.to_str().ok());
    if !verify_signature(&body, signature, &state.secret, (state.now)(), 300) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "invalid signature" })),
        );
    }
    if let Some(want) = &state.authorization {
        let got = headers
            .get(AUTHORIZATION)
            .map(|v| v.as_bytes())
            .unwrap_or_default();
        if !bool::from(got.ct_eq(want.as_bytes())) {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "invalid authorization" })),
            );
        }
    }
    let Ok(Payload { event }) = serde_json::from_slice::<Payload>(&body) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "bad json" })),
        );
    };
    if !state.seen.lock().unwrap().insert(event.id.clone()) {
        return (
            StatusCode::OK,
            Json(json!({ "received": true, "duplicate": true })),
        );
    }

    // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    let user = event.app_user_id.as_deref().unwrap_or("-");
    match event.kind.as_str() {
        "INITIAL_PURCHASE"
        | "RENEWAL"
        | "UNCANCELLATION"
        | "NON_RENEWING_PURCHASE"
        | "PRODUCT_CHANGE" => {
            println!(
                "grant {} to {user}",
                event.entitlement_ids.unwrap_or_default().join(",")
            )
        }
        "EXPIRATION" => println!(
            "access ended for {user} ({})",
            event.expiration_reason.as_deref().unwrap_or("-")
        ),
        other => println!("{other} for {user}"),
    }
    (StatusCode::OK, Json(json!({ "received": true })))
}
