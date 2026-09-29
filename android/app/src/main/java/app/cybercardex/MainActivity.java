package app.cybercardex;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin maison : mises à jour depuis GitHub (voir AppUpdaterPlugin).
        registerPlugin(AppUpdaterPlugin.class);
        // Plugin maison : « Enregistrer sous » pour les exports (voir FileSaverPlugin).
        registerPlugin(FileSaverPlugin.class);
        super.onCreate(savedInstanceState);
        // Téléphone : bloqué en portrait (en paysage, l'écran est trop bas pour la mise en page).
        // Tablette (côté le plus court ≥ 600 dp) : libre de tourner.
        if (getResources().getConfiguration().smallestScreenWidthDp < 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
        // Pas de barre de défilement à droite : ça fait « site web », pas application.
        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
    }
}
