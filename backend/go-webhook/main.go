// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: net/http server with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package main

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// Event holds the fields this handler uses; the full list is at https://revenuedot.app/docs/api/webhook-events
type Event struct {
	ID               string   `json:"id"`
	Type             string   `json:"type"`
	AppUserID        string   `json:"app_user_id"`
	EntitlementIDs   []string `json:"entitlement_ids"`
	ExpirationAtMs   *int64   `json:"expiration_at_ms"`
	ExpirationReason string   `json:"expiration_reason"`
	Environment      string   `json:"environment"`
}

type Handler struct {
	Secret        string
	Authorization string // optional: the Authorization header value set on the webhook
	Now           func() time.Time
	mu            sync.Mutex
	seen          map[string]bool // at-least-once delivery; use a unique index in production
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// Read the raw bytes first: the signature covers them exactly.
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil || !VerifySignature(raw, r.Header.Get(SignatureHeader), h.Secret, h.Now(), 5*time.Minute) {
		http.Error(w, `{"error":"invalid signature"}`, http.StatusUnauthorized)
		return
	}
	if h.Authorization != "" && subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte(h.Authorization)) != 1 {
		http.Error(w, `{"error":"invalid authorization"}`, http.StatusUnauthorized)
		return
	}
	var payload struct {
		Event Event `json:"event"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		http.Error(w, `{"error":"bad json"}`, http.StatusBadRequest)
		return
	}
	ev := payload.Event
	w.Header().Set("Content-Type", "application/json")
	h.mu.Lock()
	if h.seen == nil {
		h.seen = map[string]bool{}
	}
	dup := h.seen[ev.ID]
	h.seen[ev.ID] = true
	h.mu.Unlock()
	if dup {
		w.Write([]byte(`{"received":true,"duplicate":true}`))
		return
	}
	// Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
	switch ev.Type {
	case "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE":
		log.Printf("grant %v to %s", ev.EntitlementIDs, ev.AppUserID)
	case "EXPIRATION":
		log.Printf("access ended for %s (%s)", ev.AppUserID, ev.ExpirationReason)
	default:
		log.Printf("%s for %s", ev.Type, ev.AppUserID)
	}
	w.Write([]byte(`{"received":true}`))
}

func main() {
	secret := os.Getenv("REVENUEDOT_WEBHOOK_SECRET")
	if secret == "" {
		log.Fatal("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	http.Handle("/webhooks/revenuedot", &Handler{Secret: secret, Authorization: os.Getenv("REVENUEDOT_WEBHOOK_AUTHORIZATION"), Now: time.Now})
	log.Printf("Listening on http://localhost:%s/webhooks/revenuedot", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
