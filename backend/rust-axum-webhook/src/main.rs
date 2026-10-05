// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: starts the Axum webhook receiver on PORT (default 3000).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
use rust_axum_webhook::{app, unix_now};
use std::env;

#[tokio::main]
async fn main() {
    let secret = env::var("REVENUEDOT_WEBHOOK_SECRET")
        .ok()
        .filter(|s| !s.is_empty())
        .expect("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
    let authorization = env::var("REVENUEDOT_WEBHOOK_AUTHORIZATION")
        .ok()
        .filter(|s| !s.is_empty());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".into());
    // 0.0.0.0 so RevenueDot in Docker can reach it through host.docker.internal.
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("bind PORT");
    println!("Listening on http://localhost:{port}/webhooks/revenuedot");
    axum::serve(listener, app(secret, authorization, unix_now))
        .await
        .expect("server error");
}
