// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the Axum webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use http_body_util::BodyExt;
use rust_axum_webhook::{app, verify::verify_signature};
use serde::Deserialize;
use serde_json::{json, Value};
use tower::ServiceExt;

#[derive(Deserialize)]
struct Fixture {
    secret: String,
    signature_header: String,
    authorization_header: String,
    body: String,
}

fn load() -> (Fixture, i64) {
    let raw = std::fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/initial-purchase.json"
    ))
    .unwrap();
    let f: Fixture = serde_json::from_str(&raw).unwrap();
    let t = f
        .signature_header
        .split(',')
        .next()
        .unwrap()
        .trim_start_matches("t=")
        .parse()
        .unwrap();
    (f, t)
}

#[test]
fn verifies_the_real_delivery_and_rejects_tampering() {
    let (f, t) = load();
    let body = f.body.as_bytes();
    let sig = Some(f.signature_header.as_str());
    assert!(
        verify_signature(body, sig, &f.secret, t, 300),
        "real delivery should verify"
    );
    assert!(
        !verify_signature(
            f.body.replacen("9.99", "0.99", 1).as_bytes(),
            sig,
            &f.secret,
            t,
            300
        ),
        "changed body must fail"
    );
    assert!(
        !verify_signature(body, sig, "whsec_wrong", t, 300),
        "wrong secret must fail"
    );
    assert!(
        !verify_signature(body, sig, &f.secret, t + 301, 300),
        "old delivery must fail"
    );
    assert!(
        !verify_signature(body, None, &f.secret, t, 300),
        "missing header must fail"
    );
}

async fn send(
    router: &Router,
    f: &Fixture,
    signature: &str,
    authorization: &str,
) -> (StatusCode, Value) {
    let req = Request::post("/webhooks/revenuedot")
        .header("content-type", "application/json")
        .header("x-revenuecat-webhook-signature", signature)
        .header("authorization", authorization)
        .body(Body::from(f.body.clone()))
        .unwrap();
    let res = router.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[tokio::test]
async fn handler_answers_200_dedupes_and_refuses_bad_requests() {
    let (f, t) = load();
    let router = app(
        f.secret.clone(),
        Some(f.authorization_header.clone()),
        move || t,
    );
    assert_eq!(
        send(&router, &f, &f.signature_header, &f.authorization_header).await,
        (StatusCode::OK, json!({ "received": true }))
    );
    assert_eq!(
        send(&router, &f, &f.signature_header, &f.authorization_header).await,
        (
            StatusCode::OK,
            json!({ "received": true, "duplicate": true })
        )
    );
    assert_eq!(
        send(&router, &f, "t=1,v1=00", &f.authorization_header).await,
        (
            StatusCode::UNAUTHORIZED,
            json!({ "error": "invalid signature" })
        )
    );
    assert_eq!(
        send(&router, &f, &f.signature_header, "Bearer nope").await,
        (
            StatusCode::UNAUTHORIZED,
            json!({ "error": "invalid authorization" })
        )
    );
}
