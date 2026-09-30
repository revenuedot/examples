// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the Go webhook handler with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

type fixture struct {
	Secret              string `json:"secret"`
	SignatureHeader     string `json:"signature_header"`
	AuthorizationHeader string `json:"authorization_header"`
	Body                string `json:"body"`
}

func load(t *testing.T) (fixture, time.Time) {
	raw, err := os.ReadFile("testdata/initial-purchase.json")
	if err != nil {
		t.Fatal(err)
	}
	var f fixture
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatal(err)
	}
	ts, _ := strconv.ParseInt(regexp.MustCompile(`t=(\d+)`).FindStringSubmatch(f.SignatureHeader)[1], 10, 64)
	return f, time.Unix(ts, 0)
}

func TestVerifySignature(t *testing.T) {
	f, at := load(t)
	body := []byte(f.Body)
	if !VerifySignature(body, f.SignatureHeader, f.Secret, at, 5*time.Minute) {
		t.Fatal("real delivery should verify")
	}
	if VerifySignature([]byte(strings.Replace(f.Body, "9.99", "0.99", 1)), f.SignatureHeader, f.Secret, at, 5*time.Minute) {
		t.Fatal("changed body must fail")
	}
	if VerifySignature(body, f.SignatureHeader, "whsec_wrong", at, 5*time.Minute) {
		t.Fatal("wrong secret must fail")
	}
	if VerifySignature(body, f.SignatureHeader, f.Secret, at.Add(301*time.Second), 5*time.Minute) {
		t.Fatal("old delivery must fail")
	}
}

func TestHandler(t *testing.T) {
	f, at := load(t)
	h := &Handler{Secret: f.Secret, Authorization: f.AuthorizationHeader, Now: func() time.Time { return at }}
	send := func(sig, auth string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/webhooks/revenuedot", strings.NewReader(f.Body))
		req.Header.Set(SignatureHeader, sig)
		req.Header.Set("Authorization", auth)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}
	if rec := send(f.SignatureHeader, f.AuthorizationHeader); rec.Code != 200 || rec.Body.String() != `{"received":true}` {
		t.Fatalf("first delivery: %d %s", rec.Code, rec.Body)
	}
	if rec := send(f.SignatureHeader, f.AuthorizationHeader); !strings.Contains(rec.Body.String(), "duplicate") {
		t.Fatalf("retry should be a duplicate: %s", rec.Body)
	}
	if rec := send("t=1,v1=00", f.AuthorizationHeader); rec.Code != 401 {
		t.Fatalf("bad signature: %d", rec.Code)
	}
	if rec := send(f.SignatureHeader, "Bearer nope"); rec.Code != 401 {
		t.Fatalf("bad authorization: %d", rec.Code)
	}
}
