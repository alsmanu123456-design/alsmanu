/**
 * bootstrap/index.mjs
 * ────────────────────────────────────────────────────────────────
 * المسؤولية الوحيدة: تسلسل خطوات تشغيل البوت بالترتيب الصحيح.
 *
 * لا يحتوي على أي منطق تشغيل (business logic).
 * كل خطوة مُفوَّضة بالكامل إلى الطبقة المسؤولة عنها.
 *
 * التسلسل:
 *   1. [core/health]          — التحقق من النظام
 *   2. [core/config]          — تحميل الإعدادات
 *   3. [infrastructure/patch] — تطبيق تعديلات dist/
 *   4. [infrastructure/pkg]   — ضمان الحزم
 *   5. [infrastructure/bin]   — ضمان الثنائيات
 *   6. [infrastructure/proc]  — إطلاق البوت (مع إعادة التشغيل التلقائية)
 *   7. [engine]               — تشغيل Session Engine (مراقبة + إصلاح)
 */

import { dirname }         from "path";
import { fileURLToPath }   from "url";

import { banner }          from "../core/logger.mjs";
import { runAllChecks }    from "../core/health.mjs";
import { loadConfig, applyDefaults } from "../core/config.mjs";
import { runAll as runPatches }      from "../infrastructure/patch-manager.mjs";
import { ensure as ensurePackages }  from "../infrastructure/package-manager.mjs";
import { ensureYtDlp, ensureFfmpegStatic } from "../infrastructure/binary-manager.mjs";
import { spawnBot }                  from "../infrastructure/process-manager.mjs";
import { startEngine }               from "../engine/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_DIR  = dirname(__dirname); // alsmanu6/

// ─── Entry ──────────────────────────────────────────────────────
banner("WhatsApp Bot Pro v8.0 — Session Engine v2.0");

// ─── 1. System Health ────────────────────────────────────────────
runAllChecks({ minNode: 18, minRAM: 150 });

// ─── 2. Configuration ────────────────────────────────────────────
loadConfig(BASE_DIR);
applyDefaults();

// ─── 3. dist/ Patches ────────────────────────────────────────────
runPatches(BASE_DIR);

// ─── 4. npm Packages ─────────────────────────────────────────────
await ensurePackages(BASE_DIR);

// ─── 5. External Binaries ────────────────────────────────────────
await ensureYtDlp(BASE_DIR);
await ensureFfmpegStatic(BASE_DIR); // ينزّل ثنائي ffmpeg إن تخطاه مدير الحزم

// ─── 6. Launch Bot ───────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "5000");

// let أولاً حتى تكون مُهيَّأة بـ null قبل استدعاء onSpawn
// (spawnBot تستدعي launch() مباشرةً → onSpawn تُستدعى قبل اكتمال const)
let runner = null;
runner = spawnBot(BASE_DIR, {
  autoRestart: true,
  onSpawn: (child) => {
    // أبلغ engine بالعملية الجديدة عند كل إعادة تشغيل
    // runner?._engine: آمن للاستدعاء الأول (runner=null أو engine=null)
    if (runner?._engine) runner._engine.setChildProcess(child);
  },
});

// ─── 7. Session Engine ───────────────────────────────────────────
// انتظر 8 ثوانٍ حتى يبدأ البوت ويُشغِّل Express على PORT
await new Promise(r => setTimeout(r, 8_000));

const engine = await startEngine({
  baseDir:       BASE_DIR,
  childProcess:  runner.getChild(),
  port,
}).catch(e => {
  // فشل Engine لا يوقف البوت
  console.error("⚠️  Session Engine لم يبدأ:", e.message);
  return null;
});

// احفظ مرجع engine في runner حتى يصل إليه onSpawn
runner._engine = engine;
