import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionConfigFile = path.join(__dirname, '../version-edit.json');
const tauriConfFile = path.join(__dirname, '../src-tauri/tauri.conf.json');
const buildGradleFile = path.join(__dirname, '../android/app/build.gradle');
const supabaseUpdateFile = path.join(__dirname, '../src/supabaseUpdate.ts');

function updateVersions() {
  if (!fs.existsSync(versionConfigFile)) {
    console.error(`Version config file not found: ${versionConfigFile}`);
    process.exit(1);
  }

  const versionConfig = JSON.parse(fs.readFileSync(versionConfigFile, 'utf-8'));
  console.log('Read versions from version-edit.json:', versionConfig);

  // Update Tauri version
  if (fs.existsSync(tauriConfFile) && versionConfig.tauri && versionConfig.tauri.version) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfFile, 'utf-8'));
    tauriConf.version = versionConfig.tauri.version;
    fs.writeFileSync(tauriConfFile, JSON.stringify(tauriConf, null, 2), 'utf-8');
    console.log(`✅ Updated Tauri version to ${versionConfig.tauri.version}`);
  } else {
    console.warn('⚠️ Could not update Tauri version: file not found or config missing.');
  }

  // Update Android version
  if (fs.existsSync(buildGradleFile) && versionConfig.android) {
    let buildGradleContent = fs.readFileSync(buildGradleFile, 'utf-8');

    if (versionConfig.android.versionCode) {
      buildGradleContent = buildGradleContent.replace(
        /versionCode\s+\d+/g,
        `versionCode ${versionConfig.android.versionCode}`
      );
    }

    if (versionConfig.android.versionName) {
      buildGradleContent = buildGradleContent.replace(
        /versionName\s+".*?"/g,
        `versionName "${versionConfig.android.versionName}"`
      );
    }

    fs.writeFileSync(buildGradleFile, buildGradleContent, 'utf-8');
    console.log(`✅ Updated Android versionCode to ${versionConfig.android.versionCode} and versionName to ${versionConfig.android.versionName}`);
  } else {
    console.warn('⚠️ Could not update Android versions: file not found or config missing.');
  }

  // Update Supabase table name
  if (fs.existsSync(supabaseUpdateFile) && versionConfig.supabase && versionConfig.supabase.tableName) {
    let supabaseContent = fs.readFileSync(supabaseUpdateFile, 'utf-8');

    // 테이블명 / 키 교체 (예: bright_2_4_19 -> 새로운 테이블명)
    supabaseContent = supabaseContent.replace(
      /from\(['"](bright_[a-zA-Z0-9_]+)['"]\)/g,
      `from('${versionConfig.supabase.tableName}')`
    );
    supabaseContent = supabaseContent.replace(
      /key:\s*['"](bright_[a-zA-Z0-9_]+)['"]/g,
      `key: '${versionConfig.supabase.tableName}'`
    );

    fs.writeFileSync(supabaseUpdateFile, supabaseContent, 'utf-8');
    console.log(`✅ Updated Supabase tableName to ${versionConfig.supabase.tableName}`);
  } else {
    console.warn('⚠️ Could not update Supabase config: file not found or config missing.');
  }
}

updateVersions();
