# Guia de ativação do Google Ads (AdSense + AdMob) e publicação

A integração técnica já está **pronta no código**, com IDs placeholder.
Nenhum anúncio é exibido até você preencher os IDs reais (de contas aprovadas).

> Atualizado em ago/2026: o site virou **portal de notícias** e o app Android
> segue sendo o **TimeTracker**. O PWA (instalação pelo navegador) já está ativo
> como caminho alternativo à Play Store.

---

## 1) Site (AdSense)

**Conta:** https://adsense.google.com/start (aprovação exige site com conteúdo e
requisitos de política).

**1. Crie o código de anúncio (ad unit) no AdSense** e anote 2 valores:
- **Publisher ID** (cliente), formato `ca-pub-1234567890`
- **Slot ID** para cada anúncio, formato `1234567890`

**2. Preencha a variável de ambiente no Render:**
- Vá em Settings → Environment → adicione:
  - Key: `VITE_ADSENSE_PUBLISHER`
  - Value: `ca-pub-1234567890`
- Salve e o deploy automático roda de novo.

**3. (Opcional) Ajuste os slot IDs** no código em:
- `frontend/src/pages/news/NewsHomePage.tsx` → `<AdSlot slotId="YYYYYYYYYYYY" />` (sidebar + rodapé)
- `frontend/src/components/Layout.tsx` → `<AdSlot slotId="YYYYYYYYYYYY" />`
- `frontend/src/pages/DownloadPage.tsx` → `<AdSlot slotId="YYYYYYYYYYYY" />`

**Núcleo do código:** `frontend/src/components/ad/AdSlot.tsx` injeta o script do
AdSense dinamicamente e só renderiza o anúncio quando `VITE_ADSENSE_PUBLISHER`
estiver preenchido (verificado: o bundle **não** contém `adsbygoogle` sem a env).

---

## 2) App Android (AdMob)

**Conta:** https://admob.google.com (use a mesma conta Google). Crie um app e
obtenha:
- **App ID**, formato `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- **Ad unit IDs**, formato `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`

**1. Manifest (app ID):**
Abra `frontend/android/app/src/main/AndroidManifest.xml` e troque o valor:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" />
```

**2. MainActivity (banner + IDs):**
Abra `frontend/android/app/src/main/java/com/timetracker/app/MainActivity.java`:
- Defina `AD_MOB_ENABLED = true`
- Troque `AD_UNIT_ID_BANNER` e `AD_UNIT_ID_INTERSTITIAL` pelos seus IDs reais.

**3. Reconstrua o APK:**
```
cd frontend
npm run build:mobile
npx cap sync android
cd android
gradlew.bat assembleRelease bundleRelease
```

---

## 3) Publicação do app (Play Store)

A conta Play Console custa US$ 25 (única). Sem ela não há como publicar na
Play Store — mas o app já está **pronto para subir**:

**Arquivos prontos (pasta `entrega-mobile/`):**
- `TimeTracker-v1.0.aab` — pacote para a Play Store (6,16 MB)
- `timetracker-release.keystore` — assinatura (validado, expira em 2053)
- `playstore-assets/` — ícone 512px + feature graphic 1024x500
- `README.md` e `LOG-OPERACAO.txt` — documentação da entrega

**Passos no Play Console:**
1. Crie conta em https://play.google.com/console (pague US$ 25).
2. Criar app → selecione o `.aab` → preencha ficha (nome: TimeTracker,
   descrição, categorias).
3. Envie as imagens de `playstore-assets/` e a política de privacidade
   (já existe em `/privacidade`).
4. Assinatura do app: o Play aceita o keystore existente ou re-assina via
   "App Signing by Google Play" (recomendado).

---

## 4) Caminho alternativo: PWA (sem Play Store, sem custo)

O site agora é **instalável como app** no Android/desktop pelo navegador
(Chrome). Já implementado:

- `public/manifest.json` — nome, ícones, standalone
- `public/sw.js` — service worker com cache (funciona offline no app shell)
- Registro do SW em `src/main.tsx`
- Botão "Instalar como app" em `/download` (dispara `beforeinstallprompt`)

**Como instalar no Android:**
1. Abra `https://timetracker-7awm.onrender.com` no Chrome
2. Menu (⋮) → "Adicionar à tela inicial" / "Instalar app"
3. O ícone aparece como app normal na gaveta de apps.

Isso cobre o uso do TimeTracker no celular sem precisar do Play Store,
enquanto a conta Play Console não é criada.

---

## 5) Dicas para aprovar o AdSense

O portal de notícias sobre mercado de trabalho (`/`) já tem:
- Home pública com notícias agregadas por RSS (4 feeds com imagem e categorias)
- Busca, filtro por categoria (Concursos, Vagas, Salários, Carreira, Economia)
- Página de Política de Privacidade (`/privacidade`)
- Espaços de anúncio posicionados (sidebar, rodapé, download)
- SEO: meta tags, Open Graph, `robots.txt` e `sitemap.xml`

**Fontes RSS ativas** (`backend/app/api/news.py`):
- `Agência Brasil` → https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml
- `Exame - Carreira` → https://exame.com/feed/?post_type=post&s=carreira
- `Gazeta do Povo - Economia` → https://www.gazetadopovo.com.br/feed/rss/economia.xml
- `G1 - Concursos e Emprego` → https://g1.globo.com/rss/g1/concursos-e-emprego/

**Adicionar/remover fontes sem código:** defina a variável de ambiente
`NEWS_FEEDS` no Render no formato `Nome,url;Nome2,url2`. Se vazia, usa as padrão.

**Atenção:** o AdSense aprova melhor sites com **conteúdo próprio e tráfego**.
O portal ainda depende de RSS de terceiros. Considere:
- Publicar matérias próprias e guias (não só agregação) para aumentar chances.
- Coletar visitas antes de solicitar a avaliação.

---

## Resumo dos placeholders a preencher

| Onde | Chave | Formato |
|---|---|---|
| Render env var | `VITE_ADSENSE_PUBLISHER` | `ca-pub-...` |
| `NewsHomePage.tsx` / `Layout.tsx` / `DownloadPage.tsx` | `slotId` | `1234567890` |
| `AndroidManifest.xml` | `APPLICATION_ID` | `ca-app-pub-...~...` |
| `MainActivity.java` | `AD_UNIT_ID_BANNER` / `AD_UNIT_ID_INTERSTITIAL` | `ca-app-pub-.../...` |
| `MainActivity.java` | `AD_MOB_ENABLED` | `true` |
| Play Console | conta | US$ 25 (única) |
