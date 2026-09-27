package app.cybercardex;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin maison : mises à jour depuis GitHub (voir AppUpdaterPlugin).
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        // Pas de barre de défilement à droite : ça fait « site web », pas application.
        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
    }
}
