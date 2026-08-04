package com.timetracker.app;

import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import androidx.coordinatorlayout.widget.CoordinatorLayout;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

public class MainActivity extends BridgeActivity {

    private static final boolean AD_MOB_ENABLED = false; // Altere para true ao possuir contas AdMob reais
    private static final String AD_UNIT_ID_BANNER = "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX";
    private static final String AD_UNIT_ID_INTERSTITIAL = "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (AD_MOB_ENABLED) {
            setupAdMob();
        }
    }

    private void setupAdMob() {
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {
                runOnUiThread(MainActivity.this::showBanner);
            }
        });
    }

    private void showBanner() {
        AdView adView = new AdView(this);
        adView.setAdUnitId(AD_UNIT_ID_BANNER);
        adView.setAdSize(AdSize.SMART_BANNER);

        CoordinatorLayout layout = new CoordinatorLayout(this);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
        );
        layout.setLayoutParams(params);
        layout.addView(adView);

        addContentView(layout, params);

        adView.loadAd(new AdRequest.Builder().build());
    }

    private void loadInterstitial() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, AD_UNIT_ID_INTERSTITIAL, adRequest, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(InterstitialAd interstitialAd) {
                interstitialAd.show(MainActivity.this);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError loadAdError) {
                // não faz nada — apenas loga localmente
            }
        });
    }
}