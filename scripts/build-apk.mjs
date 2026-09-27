/*
 * Construit l'APK Android :
 *
 *   npm run apk          APK de test (debug, inspectable depuis le PC)
 *   npm run apk:release  APK à distribuer, signé avec keys/ (hors Git)
 *
 * 1. build Vite (dist/)  2. images allégées  3. copie dans android/ (cap sync)
 * 4. Gradle assembleDebug / assembleRelease
 * Résultat : tmp/CyberCardex-test.apk, ou tmp/CyberCardex-<version>.apk en release
 * (version lue dans package.json).
 *
 * Prérequis : JDK 21 et SDK Android (Android Studio). Le chemin du SDK est lu dans
 * android/local.properties (sdk.dir=...) ou dans la variable ANDROID_HOME.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const windows = process.platform === 'win32';
const env = { ...process.env };

// Sous Windows, Java utilise le magasin de certificats du système (utile derrière un
// antivirus ou un proxy qui inspecte le HTTPS), comme `--use-system-ca` pour Node.
if (windows) {
  env.JAVA_TOOL_OPTIONS = [
    env.JAVA_TOOL_OPTIONS,
    '-Djavax.net.ssl.trustStore=NONE',
    '-Djavax.net.ssl.trustStoreType=Windows-ROOT',
  ]
    .filter(Boolean)
    .join(' ');
}

const release = process.argv.includes('--release');
if (release && !existsSync('keys/keystore.properties')) {
  console.error('Clé de signature introuvable : keys/keystore.properties');
  process.exit(1);
}

// Version de l'app = version de package.json (1.2.3 → code 10203, toujours croissant).
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

const run = (command, cwd = '.') => execSync(command, { stdio: 'inherit', cwd, env });

run('npm run build');
// Images plus légères dans l'APK (le site garde les originaux).
run('node scripts/compress-apk-images.mjs');
run('npx cap sync android');

const apk = path.resolve(
  release
    ? 'android/app/build/outputs/apk/release/app-release.apk'
    : 'android/app/build/outputs/apk/debug/app-debug.apk',
);
// Gradle met l'APK à jour « sur place » et y laisse les anciennes images (≈ +40 Mo de
// vide). Sans ancien fichier, il repart d'un APK propre.
rmSync(apk, { force: true });
run(
  `${windows ? '.\\gradlew.bat' : './gradlew'} ${release ? 'assembleRelease' : 'assembleDebug'}` +
    ` -PappVersionName=${version} -PappVersionCode=${versionCode} --console=plain`,
  'android',
);

mkdirSync('tmp', { recursive: true });
const copy = path.resolve(release ? `tmp/CyberCardex-${version}.apk` : 'tmp/CyberCardex-test.apk');
copyFileSync(apk, copy);
console.log(`\n✓ APK : ${path.relative('.', copy)} (${Math.round(statSync(copy).size / 1e6)} Mo)`);
