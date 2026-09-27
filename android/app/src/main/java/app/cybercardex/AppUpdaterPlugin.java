package app.cybercardex;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

/**
 * Mise à jour de l'app sans store : télécharge le nouvel APK (publié sur GitHub) dans le
 * cache de l'app, puis ouvre l'installeur d'Android. L'APK étant signé avec la même clé,
 * Android l'installe par-dessus l'ancienne version et les données sont conservées.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    /** Android 8+ : l'utilisateur doit autoriser CyberCardex à installer des applis. */
    private boolean canInstall() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", canInstall());
        call.resolve(result);
    }

    /** Ouvre le réglage « Installer des applis inconnues » de CyberCardex. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    /** Télécharge l'APK (événements « progress ») puis lance son installation. */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Adresse de téléchargement invalide");
            return;
        }
        new Thread(() -> {
            try {
                File apk = download(url);
                install(apk);
                call.resolve();
            } catch (Exception error) {
                call.reject(error.getMessage() != null ? error.getMessage() : error.toString());
            }
        }).start();
    }

    private File download(String address) throws Exception {
        File folder = new File(getContext().getCacheDir(), "updates");
        folder.mkdirs();
        File target = new File(folder, "CyberCardex-update.apk");

        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(20000);
        connection.setReadTimeout(30000);
        int status = connection.getResponseCode();
        if (status != HttpURLConnection.HTTP_OK) {
            throw new Exception("HTTP " + status);
        }
        long total = connection.getContentLengthLong();

        try (InputStream input = connection.getInputStream();
             OutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[64 * 1024];
            long done = 0;
            int lastPercent = -1;
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                done += read;
                int percent = total > 0 ? (int) (done * 100 / total) : -1;
                if (percent != lastPercent) {
                    lastPercent = percent;
                    JSObject progress = new JSObject();
                    progress.put("percent", percent);
                    progress.put("bytes", done);
                    notifyListeners("progress", progress);
                }
            }
            // Connexion coupée en route : ne pas proposer un APK incomplet à l'installeur.
            if (total > 0 && done != total) {
                throw new Exception("Téléchargement incomplet (" + done + " / " + total + " octets)");
            }
        } finally {
            connection.disconnect();
        }
        return target;
    }

    private void install(File apk) {
        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        // Directement l'installeur d'Android, sans « Ouvrir avec » (explorateurs de fichiers…).
        List<ResolveInfo> installers = getContext()
            .getPackageManager()
            .queryIntentActivities(intent, PackageManager.MATCH_SYSTEM_ONLY);
        if (!installers.isEmpty()) {
            intent.setPackage(installers.get(0).activityInfo.packageName);
        }
        getContext().startActivity(intent);
    }
}
