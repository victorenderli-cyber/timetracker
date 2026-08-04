# Guia de ativação do Google Ads (AdSense + AdMob)

A integração técnica já está **pronta no código**, com IDs placeholder.
Nenhum anúncio é exibido até você preencher os IDs reais (de contas aprovadas).

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
- `frontend/src/components/Layout.tsx` → `<AdSlot slotId="YYYYYYYYYYYY" />`
- `frontend/src/pages/DownloadPage.tsx` → `<AdSlot slotId="YYYYYYYYYYYY" />`

**Núcleo do código:** `frontend/src/components/ad/AdSlot.tsx` injeta o script do
AdSense dinamicamente e só renderiza o anúncio quando `VITE_ADSENSE_PUBLISHER`
estiver preenchido.

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

## Resumo dos placeholders a preencher

| Onde | Chave | Formato |
|---|---|---|
| Render env var | `VITE_ADSENSE_PUBLISHER` | `ca-pub-...` |
| `Layout.tsx` / `DownloadPage.tsx` | `slotId` | `1234567890` |
| `AndroidManifest.xml` | `APPLICATION_ID` | `ca-app-pub-...~...` |
| `MainActivity.java` | `AD_UNIT_ID_BANNER` / `AD_UNIT_ID_INTERSTITIAL` | `ca-app-pub-.../...` |
| `MainActivity.java` | `AD_MOB_ENABLED` | `true` |