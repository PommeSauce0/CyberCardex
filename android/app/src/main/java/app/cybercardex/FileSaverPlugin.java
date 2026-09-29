package app.cybercardex;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * « Enregistrer sous » d'Android (sauvegarde, export Excel, deck) : l'utilisateur choisit le
 * dossier et le nom du fichier dans l'écran système, puis on y écrit le contenu (texte UTF-8).
 */
@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || call.getString("data") == null) {
            call.reject("Nom de fichier ou contenu manquant");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        JSObject response = new JSObject();
        Intent data = result.getData();
        // Écran fermé sans choisir d'emplacement : rien n'est écrit.
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri uri = data.getData();
        // « wt » : remplace le contenu si l'utilisateur a choisi un fichier existant.
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) {
                throw new IOException("Fichier inaccessible");
            }
            out.write(call.getString("data", "").getBytes(StandardCharsets.UTF_8));
        } catch (Exception error) {
            call.reject("Écriture impossible : " + error.getMessage());
            return;
        }
        response.put("saved", true);
        response.put("name", displayName(uri, call.getString("filename")));
        call.resolve(response);
    }

    /** Nom réellement choisi (l'utilisateur a pu renommer le fichier). */
    private String displayName(Uri uri, String fallback) {
        try (Cursor cursor = getContext().getContentResolver()
                .query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                String name = cursor.getString(0);
                if (name != null) {
                    return name;
                }
            }
        } catch (Exception ignored) {
            // Nom indisponible : on garde celui proposé.
        }
        return fallback;
    }
}
