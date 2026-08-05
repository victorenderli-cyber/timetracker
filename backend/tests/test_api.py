def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_demo_login_returns_token(client):
    resp = client.post("/api/v1/auth/demo")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("access_token")
    assert data.get("token_type") == "bearer"


def test_news_endpoint(client):
    resp = client.get("/api/v1/news?limit=20")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "feeds" in body
    assert body["stored"] >= 2
    assert body["count"] >= 1
    assert "last_sync" in body
    assert "sync_enabled" in body


def test_news_status(client):
    resp = client.get("/api/v1/news/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["stored"] >= 2
    assert "interval_seconds" in body
    assert "last_sync" in body


def test_news_item_detail(client):
    # pega o primeiro item da lista e busca por id
    listing = client.get("/api/v1/news?limit=20").json()
    assert listing["stored"] >= 1
    first = listing["items"][0]
    resp = client.get(f"/api/v1/news/{first['id']}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == first["title"]
    assert body["link"] == first["link"]


def test_news_item_not_found(client):
    resp = client.get("/api/v1/news/99999999")
    assert resp.status_code == 404


def test_rss_feed(client):
    resp = client.get("/api/v1/rss")
    assert resp.status_code == 200
    assert "application/rss+xml" in resp.headers["content-type"]
    assert "<?xml" in resp.text
    assert "<rss" in resp.text
    assert "<channel>" in resp.text
    assert "<title>Carreira" in resp.text
    assert "<item>" in resp.text


def test_security_headers(client):
    resp = client.get("/")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "SAMEORIGIN"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_news_persisted_from_db(client):
    resp = client.get("/api/v1/news?limit=20")
    items = resp.json()["items"]
    assert any(i["source"] == "Exame" for i in items)
    assert any(i["source"] == "Agência Brasil" for i in items)


def test_news_cache(client):
    resp1 = client.get("/api/v1/news?limit=20")
    resp2 = client.get("/api/v1/news?limit=20")
    assert resp1.json()["count"] == resp2.json()["count"]


def test_summary_requires_auth(client):
    resp = client.get("/api/v1/contacts/summary")
    assert resp.status_code == 401


def test_summary_with_admin(client, admin_headers):
    resp = client.get("/api/v1/contacts/summary", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total_leads" in body
    assert "total_quiz" in body


def test_create_lead_with_consent(client, admin_headers):
    resp = client.post("/api/v1/leads", json={
        "email": "teste@example.com",
        "full_name": "Teste",
        "newsletter_optin": True,
        "consent": True,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "teste@example.com"
    assert data["consent"] is not None  # data/hora do consentimento gravado


def test_lead_honeypot_not_saved(client, admin_headers):
    before = client.get("/api/v1/contacts/summary", headers=admin_headers).json()["total_leads"]
    resp = client.post("/api/v1/leads", json={
        "email": "bot@example.com",
        "website": "http://spam.example",
    })
    # responde 201 fake (id 0) mas não grava
    assert resp.status_code == 201
    assert resp.json()["id"] == 0
    after = client.get("/api/v1/contacts/summary", headers=admin_headers).json()["total_leads"]
    assert after == before


def test_list_leads_requires_auth(client):
    resp = client.get("/api/v1/contacts/leads")
    assert resp.status_code == 401


def test_list_leads_with_admin(client, admin_headers):
    resp = client.get("/api/v1/contacts/leads", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_export_csv_with_admin(client, admin_headers):
    resp = client.get("/api/v1/contacts/export.csv", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "email" in resp.text


def test_quiz_flow(client, admin_headers):
    resp = client.post("/api/v1/quiz", json={
        "email": "q@example.com",
        "question_key": "momento_profissional",
        "answer": "crescimento",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["question_key"] == "momento_profissional"

    listing = client.get("/api/v1/contacts/quiz", headers=admin_headers)
    assert listing.status_code == 200
    assert any(q["answer"] == "crescimento" for q in listing.json())


def test_rate_limit_quiz(client, admin_headers):
    # Rate limiter de quiz é 20/hora. Disparar 25 requisições deve retornar 429.
    statuses = []
    for _ in range(25):
        resp = client.post("/api/v1/quiz", json={"question_key": "momento_profissional", "answer": "transicao"})
        statuses.append(resp.status_code)
    assert 429 in statuses
