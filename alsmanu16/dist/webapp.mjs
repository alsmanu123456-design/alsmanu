// ═══════════════════════════════════════════════════════════════════
// webapp.mjs — واجهة ويب داخلية لإدارة التحويلات
// تعمل داخل نفس خادم البوت — لا تحتاج أي شيء خارجي
// كل مستخدم يرى بياناته فقط عبر token خاص به
// ═══════════════════════════════════════════════════════════════════
import { userForToken } from "./webapp-auth.mjs";
import {
  webGetOverview,
  webPreviewChannel,
  webAddChannel,
  webDeleteChannel,
  webRefreshGroups,
  webCreateRule,
  webUpdateRule,
  webDeleteRule,
  webChatPicture,
} from "./forward.mjs";

// ─── مصادقة ────────────────────────────────────────────────────────
function authUid(req) {
  const token =
    req.query?.token ||
    req.headers["x-webapp-token"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return userForToken(token);
}

function guard(handler) {
  return async (req, res) => {
    const uid = authUid(req);
    if (!uid) return res.status(401).json({ error: "غير مصرح — افتح الرابط من البوت" });
    try {
      const out = await handler(uid, req, res);
      if (out !== undefined) res.json(out);
    } catch (e) {
      res.status(400).json({ error: e?.message || "خطأ غير متوقع" });
    }
  };
}

// ─── التسجيل في تطبيق Express ──────────────────────────────────────
export function registerWebApp(app) {
  // JSON body parsing خاص بمسارات الويب آب فقط (لا يؤثر على بقية البوت)
  const parseJson = (req, res, next) => {
    if (req.headers["content-type"]?.includes("application/json") && !req.body) {
      let raw = "";
      req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
      req.on("end", () => {
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
        next();
      });
    } else next();
  };

  app.get("/webapp", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(HTML_PAGE);
  });

  app.get("/api/fw/overview", guard(async (uid) => webGetOverview(uid)));

  app.post("/api/fw/channel/preview", parseJson, guard(async (uid, req) => {
    return await webPreviewChannel(uid, req.body?.input);
  }));

  app.post("/api/fw/channel/add", parseJson, guard(async (uid, req) => {
    return webAddChannel(uid, req.body || {});
  }));

  app.post("/api/fw/channel/delete", parseJson, guard(async (uid, req) => {
    return webDeleteChannel(uid, req.body?.id);
  }));

  app.post("/api/fw/groups/refresh", parseJson, guard(async (uid, req) => {
    return await webRefreshGroups(uid, req.body?.number);
  }));

  app.post("/api/fw/rule/create", parseJson, guard(async (uid, req) => {
    return webCreateRule(uid, req.body || {});
  }));

  app.post("/api/fw/rule/update", parseJson, guard(async (uid, req) => {
    return webUpdateRule(uid, req.body?.id, req.body?.patch || {});
  }));

  app.post("/api/fw/rule/delete", parseJson, guard(async (uid, req) => {
    return webDeleteRule(uid, req.body?.id);
  }));

  app.get("/api/fw/pic", guard(async (uid, req, res) => {
    const url = await webChatPicture(uid, String(req.query.jid || ""));
    res.json({ url: url || null });
  }));

  console.log("[WEBAPP] ✅ واجهة إدارة التحويلات جاهزة على /webapp");
}

// ═══════════════════════════════════════════════════════════════════
// صفحة الويب — واجهة عربية RTL احترافية مناسبة للهاتف
// ═══════════════════════════════════════════════════════════════════
const HTML_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0b1220">
<title>إدارة التحويلات</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
:root{
  --bg:#0b1220;--card:#121b2e;--card2:#182440;--line:#22304f;
  --txt:#e8eefb;--mut:#8fa3c8;--acc:#2dd4bf;--acc2:#0ea5e9;
  --ok:#22c55e;--warn:#f59e0b;--del:#ef4444;--r:14px;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:var(--txt);font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;min-height:100%}
body{padding-bottom:84px}
.hdr{position:sticky;top:0;z-index:20;background:linear-gradient(180deg,var(--bg) 75%,transparent);padding:14px 16px 8px}
.hdr h1{font-size:19px;display:flex;align-items:center;gap:8px}
.hdr .sub{color:var(--mut);font-size:12px;margin-top:2px}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.dot.on{background:var(--ok);box-shadow:0 0 8px var(--ok)}
.dot.off{background:var(--del)}
.srch{margin:10px 16px;position:relative}
.srch input{width:100%;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:13px 42px 13px 14px;color:var(--txt);font-size:15px;outline:none;transition:border .2s}
.srch input:focus{border-color:var(--acc)}
.srch .ic{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:16px}
.container{padding:0 16px}
.tabs{display:flex;gap:6px;margin:4px 16px 12px;background:var(--card);border-radius:var(--r);padding:5px;border:1px solid var(--line)}
.tab{flex:1;text-align:center;padding:10px 4px;border-radius:10px;color:var(--mut);font-size:13.5px;font-weight:600;cursor:pointer;transition:.2s;border:none;background:none}
.tab.act{background:var(--acc);color:#04211c}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px;margin-bottom:10px}
.row{display:flex;align-items:center;gap:12px}
.avatar{width:46px;height:46px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;overflow:hidden;border:1px solid var(--line)}
.avatar img{width:100%;height:100%;object-fit:cover}
.grow{flex:1;min-width:0}
.nm{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta{color:var(--mut);font-size:12px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btn{border:none;border-radius:12px;padding:11px 16px;font-size:14px;font-weight:700;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn:active{transform:scale(.96)}
.btn-p{background:var(--acc);color:#04211c}
.btn-s{background:var(--card2);color:var(--txt);border:1px solid var(--line)}
.btn-d{background:rgba(239,68,68,.14);color:var(--del)}
.btn-sm{padding:8px 12px;font-size:13px;border-radius:10px}
.btn-ic{width:40px;height:40px;padding:0;border-radius:12px;font-size:18px;flex-shrink:0}
.btn:disabled{opacity:.5;pointer-events:none}
.fab{position:fixed;bottom:20px;left:16px;right:16px;z-index:25}
.fab .btn{width:100%;padding:15px;font-size:16px;box-shadow:0 8px 24px rgba(45,212,191,.25)}
.empty{text-align:center;color:var(--mut);padding:44px 20px;font-size:14px;line-height:1.9}
.empty .big{font-size:40px;margin-bottom:8px}
.sw{position:relative;width:46px;height:26px;flex-shrink:0}
.sw input{opacity:0;width:0;height:0}
.sw .sl{position:absolute;inset:0;background:var(--card2);border:1px solid var(--line);border-radius:26px;cursor:pointer;transition:.2s}
.sw .sl:before{content:"";position:absolute;width:18px;height:18px;right:3px;top:3px;background:var(--mut);border-radius:50%;transition:.2s}
.sw input:checked+.sl{background:rgba(34,197,94,.25);border-color:var(--ok)}
.sw input:checked+.sl:before{background:var(--ok);transform:translateX(-19px)}
.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:40;opacity:0;pointer-events:none;transition:.25s}
.sheet-bg.open{opacity:1;pointer-events:auto}
.sheet{position:fixed;bottom:0;left:0;right:0;z-index:50;background:var(--card);border-radius:22px 22px 0 0;max-height:88vh;overflow-y:auto;transform:translateY(105%);transition:.3s cubic-bezier(.3,1,.4,1);padding:10px 16px 26px;border-top:1px solid var(--line)}
.sheet.open{transform:translateY(0)}
.sheet .grip{width:44px;height:4px;background:var(--line);border-radius:4px;margin:6px auto 14px}
.sheet h2{font-size:17px;margin-bottom:14px}
.fld{margin-bottom:14px}
.fld label{display:block;color:var(--mut);font-size:12.5px;margin-bottom:6px;font-weight:600}
.fld input[type=text]{width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px 13px;color:var(--txt);font-size:14.5px;outline:none}
.fld input[type=text]:focus{border-color:var(--acc)}
.pick{max-height:220px;overflow-y:auto;background:var(--card2);border:1px solid var(--line);border-radius:12px}
.pick .it{display:flex;align-items:center;gap:10px;padding:11px 13px;border-bottom:1px solid var(--line);cursor:pointer;font-size:14px}
.pick .it:last-child{border-bottom:none}
.pick .it .chk{width:20px;height:20px;border-radius:6px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;color:transparent}
.pick .it.sel .chk{background:var(--acc);border-color:var(--acc);color:#04211c}
.pick .it.sel{color:var(--acc)}
.flags{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.flag{display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px;cursor:pointer}
.flag.on{border-color:var(--acc);color:var(--acc)}
.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(20px);background:#1e293b;border:1px solid var(--line);color:var(--txt);padding:12px 20px;border-radius:14px;font-size:14px;z-index:99;opacity:0;transition:.25s;max-width:88vw;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.badge{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700}
.badge.on{background:rgba(34,197,94,.15);color:var(--ok)}
.badge.off{background:rgba(239,68,68,.12);color:var(--del)}
.prev{border:1px dashed var(--acc);background:rgba(45,212,191,.05)}
.spin{display:inline-block;width:16px;height:16px;border:2px solid var(--mut);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle}
@keyframes sp{to{transform:rotate(360deg)}}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{background:var(--card2);border:1px solid var(--line);border-radius:20px;padding:5px 12px;font-size:12px;color:var(--mut)}
.hide{display:none!important}
.sechead{display:flex;align-items:center;justify-content:space-between;margin:4px 0 10px}
.sechead .t{font-size:14px;font-weight:700;color:var(--mut)}
</style>
</head>
<body>
<div class="hdr">
  <h1>📡 إدارة التحويلات <span class="dot off" id="waDot"></span></h1>
  <div class="sub" id="subTitle">جارٍ التحميل…</div>
</div>

<div class="srch">
  <input id="srchIn" type="text" placeholder="ابحث بالاسم… أو الصق رابط قناة واتساب" autocomplete="off">
  <span class="ic">🔍</span>
</div>

<div class="tabs">
  <button class="tab act" data-tab="rules">📋 القواعد</button>
  <button class="tab" data-tab="channels">📺 القنوات</button>
  <button class="tab" data-tab="groups">👥 المجموعات</button>
</div>

<div class="container">
  <div id="chPreview" class="hide"></div>
  <div id="view"></div>
</div>

<div class="fab" id="fab">
  <button class="btn btn-p" onclick="openRuleSheet()">➕ قاعدة تحويل جديدة</button>
</div>

<div class="sheet-bg" id="sheetBg" onclick="closeSheet()"></div>
<div class="sheet" id="sheet"></div>
<div class="toast" id="toast"></div>

<script>
const TG = window.Telegram?.WebApp;
if (TG) { try { TG.ready(); TG.expand(); } catch(e){} }

const qs = new URLSearchParams(location.search);
const TOKEN = qs.get("token") || localStorage.getItem("fw_token") || "";
if (qs.get("token")) localStorage.setItem("fw_token", qs.get("token"));

let ST = { numbers:[], channels:[], groups:[], rules:[], waConnected:false };
let TAB = "rules";
let Q = "";
const picCache = {};

function api(path, body){
  const opt = body
    ? { method:"POST", headers:{ "Content-Type":"application/json", "x-webapp-token":TOKEN }, body: JSON.stringify(body) }
    : { headers:{ "x-webapp-token":TOKEN } };
  return fetch(path, opt).then(async r => {
    const j = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(j.error || "خطأ في الاتصال");
    return j;
  });
}
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 2600);
}
function esc(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function nameOf(id){
  const all = [...ST.channels, ...ST.groups];
  const f = all.find(x=>x.id===id);
  if (f) return f.name;
  if (String(id).endsWith("@s.whatsapp.net")) return "👤 +" + String(id).split("@")[0];
  return String(id).split("@")[0].slice(-8) + "…";
}
function isChannelJid(id){ return String(id).endsWith("@newsletter"); }

async function load(){
  try {
    ST = await api("/api/fw/overview");
    document.getElementById("waDot").className = "dot " + (ST.waConnected ? "on" : "off");
    document.getElementById("subTitle").textContent =
      (ST.waConnected ? "واتساب متصل" : "واتساب غير متصل") +
      " · " + ST.rules.length + " قاعدة · " + ST.channels.length + " قناة · " + ST.groups.length + " مجموعة";
    render();
  } catch(e){
    document.getElementById("subTitle").textContent = "⚠️ " + e.message;
    document.getElementById("view").innerHTML = '<div class="empty"><div class="big">🔒</div>' + esc(e.message) + '<br>افتح الرابط من داخل البوت مجدداً.</div>';
  }
}

// ─── بحث موحّد: أسماء محلية + روابط قنوات واتساب ─────────────────
let srchTimer = null;
document.getElementById("srchIn").addEventListener("input", (e)=>{
  Q = e.target.value.trim();
  clearTimeout(srchTimer);
  const looksLikeChannel = Q.includes("whatsapp.com/channel/") || Q.endsWith("@newsletter");
  if (looksLikeChannel) {
    srchTimer = setTimeout(()=>previewChannel(Q), 450);
  } else {
    document.getElementById("chPreview").classList.add("hide");
    render();
  }
});

async function previewChannel(input){
  const box = document.getElementById("chPreview");
  box.classList.remove("hide");
  box.innerHTML = '<div class="card prev"><div class="row"><span class="spin"></span><span style="color:var(--mut);font-size:14px">جارٍ جلب معلومات القناة من واتساب…</span></div></div>';
  try {
    const p = await api("/api/fw/channel/preview", { input });
    const subs = p.subscribers ? Number(p.subscribers).toLocaleString("ar") + " مشترك" : "";
    box.innerHTML =
      '<div class="card prev"><div class="row">' +
      '<div class="avatar">' + (p.picture ? '<img src="'+esc(p.picture)+'" onerror="this.parentNode.textContent=\\'📺\\'">' : "📺") + '</div>' +
      '<div class="grow"><div class="nm">' + esc(p.name) + (p.verified ? " ✅" : "") + '</div>' +
      '<div class="meta">' + esc(subs) + (p.description ? " · " + esc(p.description.slice(0,60)) : "") + '</div></div>' +
      (p.alreadySaved
        ? '<span class="badge on">محفوظة ✓</span>'
        : '<button class="btn btn-p btn-ic" onclick=\\'addChannel(' + JSON.stringify(JSON.stringify({id:p.id,name:p.name})) + ')\\'>+</button>') +
      '</div></div>';
  } catch(e){
    box.innerHTML = '<div class="card prev"><div class="meta">❌ ' + esc(e.message) + '</div></div>';
  }
}

async function addChannel(jsonStr){
  try {
    const ch = JSON.parse(jsonStr);
    await api("/api/fw/channel/add", ch);
    toast("✅ تمت إضافة القناة: " + ch.name);
    document.getElementById("srchIn").value = ""; Q = "";
    document.getElementById("chPreview").classList.add("hide");
    await load();
  } catch(e){ toast("❌ " + e.message); }
}

// ─── التبويبات ──────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("act"));
    t.classList.add("act");
    TAB = t.dataset.tab;
    document.getElementById("fab").style.display = TAB==="rules" ? "" : "none";
    render();
  });
});

function filt(arr){
  if (!Q || Q.includes("whatsapp.com/") || Q.endsWith("@newsletter")) return arr;
  const q = Q.toLowerCase();
  return arr.filter(x => (x.name||"").toLowerCase().includes(q) || (x.id||"").toLowerCase().includes(q));
}

function render(){
  const v = document.getElementById("view");
  if (TAB === "rules") return renderRules(v);
  if (TAB === "channels") return renderChannels(v);
  renderGroups(v);
}

// ─── القواعد ────────────────────────────────────────────────────
function renderRules(v){
  const rules = !Q ? ST.rules : ST.rules.filter(r => (r.name||"").toLowerCase().includes(Q.toLowerCase()));
  if (!rules.length) {
    v.innerHTML = '<div class="empty"><div class="big">📋</div>لا توجد قواعد تحويل بعد<br>اضغط "قاعدة تحويل جديدة" للبدء</div>';
    return;
  }
  v.innerHTML = rules.map(r =>
    '<div class="card"><div class="row">' +
    '<div class="grow" onclick="openRuleSheet(\\''+r.id+'\\')" style="cursor:pointer">' +
    '<div class="nm">' + esc(r.name) + '</div>' +
    '<div class="meta">📥 ' + r.sources.length + ' مصدر ← 📤 ' + esc(nameOf(r.destination)) +
    (r.sourceNumber ? ' · 📱 ' + esc(r.sourceNumber) : "") + '</div>' +
    '<div class="chips">' +
    (r.blockLinks?'<span class="chip">🚫 روابط</span>':"") +
    (r.blockImages?'<span class="chip">🚫 صور</span>':"") +
    (r.blockVideos?'<span class="chip">🚫 فيديو</span>':"") +
    (r.blockAudios?'<span class="chip">🚫 صوت</span>':"") +
    (r.noForward?'<span class="chip">↩️ بدون علامة</span>':"") +
    '</div></div>' +
    '<label class="sw"><input type="checkbox" '+(r.enabled?"checked":"")+' onchange="toggleRule(\\''+r.id+'\\',this.checked)"><span class="sl"></span></label>' +
    '</div></div>'
  ).join("");
}

async function toggleRule(id, on){
  try { await api("/api/fw/rule/update", { id, patch:{ enabled:on } }); toast(on?"✅ تم تفعيل القاعدة":"⏸️ تم إيقاف القاعدة"); await load(); }
  catch(e){ toast("❌ "+e.message); load(); }
}

// ─── القنوات ────────────────────────────────────────────────────
function renderChannels(v){
  const items = filt(ST.channels);
  let html = '<div class="sechead"><span class="t">القنوات المحفوظة (' + ST.channels.length + ')</span></div>';
  if (!items.length) {
    html += '<div class="empty"><div class="big">📺</div>لا توجد قنوات' + (Q?' مطابقة للبحث':'') + '<br>الصق رابط قناة واتساب في البحث بالأعلى لإضافتها</div>';
  } else {
    html += items.map(c =>
      '<div class="card"><div class="row">' +
      '<div class="avatar" data-jid="'+esc(c.id)+'">📺</div>' +
      '<div class="grow"><div class="nm">' + esc(c.name) + '</div>' +
      '<div class="meta">' + esc(c.id) + '</div></div>' +
      '<button class="btn btn-d btn-ic" onclick="delChannel(\\''+esc(c.id)+'\\')">🗑</button>' +
      '</div></div>'
    ).join("");
  }
  v.innerHTML = html;
  lazyPics();
}

async function delChannel(id){
  if (!confirm("حذف هذه القناة من قائمتك؟")) return;
  try { await api("/api/fw/channel/delete", { id }); toast("🗑 تم حذف القناة"); await load(); }
  catch(e){ toast("❌ "+e.message); }
}

// ─── المجموعات ──────────────────────────────────────────────────
function renderGroups(v){
  const items = filt(ST.groups);
  let html = '<div class="sechead"><span class="t">المجموعات (' + ST.groups.length + ')</span>' +
    '<button class="btn btn-s btn-sm" onclick="refreshGroups(this)">🔄 تحديث من واتساب</button></div>';
  if (!items.length) {
    html += '<div class="empty"><div class="big">👥</div>لا توجد مجموعات' + (Q?' مطابقة للبحث':'') + '<br>اضغط "تحديث من واتساب" لجلب مجموعاتك</div>';
  } else {
    html += items.map(g =>
      '<div class="card"><div class="row">' +
      '<div class="avatar" data-jid="'+esc(g.id)+'">👥</div>' +
      '<div class="grow"><div class="nm">' + esc(g.name) + '</div>' +
      '<div class="meta">' + esc(g.id) + '</div></div>' +
      '</div></div>'
    ).join("");
  }
  v.innerHTML = html;
  lazyPics();
}

async function refreshGroups(btn){
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> جارٍ الجلب…';
  try { await api("/api/fw/groups/refresh", {}); toast("✅ تم تحديث المجموعات"); await load(); }
  catch(e){ toast("❌ "+e.message); }
  btn.disabled = false; btn.innerHTML = "🔄 تحديث من واتساب";
}

// صور الدردشات — كسولة ومخزّنة
function lazyPics(){
  document.querySelectorAll(".avatar[data-jid]").forEach(async el=>{
    const jid = el.dataset.jid;
    if (picCache[jid] === null) return;
    if (picCache[jid]) { el.innerHTML = '<img src="'+picCache[jid]+'">'; return; }
    try {
      const r = await api("/api/fw/pic?jid=" + encodeURIComponent(jid) + "&token=" + TOKEN);
      picCache[jid] = r.url || null;
      if (r.url) el.innerHTML = '<img src="'+r.url+'" onerror="this.remove()">';
    } catch(e){ picCache[jid] = null; }
  });
}

// ─── شاشة إنشاء/تعديل قاعدة ─────────────────────────────────────
let SHEET = { srcSel:[], dst:null, flags:{}, editing:null, num:null };

function openRuleSheet(ruleId){
  const r = ruleId ? ST.rules.find(x=>x.id===ruleId) : null;
  SHEET = {
    editing: r ? r.id : null,
    srcSel: r ? [...r.sources] : [],
    dst: r ? r.destination : null,
    num: r ? r.sourceNumber : (ST.numbers[0] || null),
    flags: {
      blockLinks: !!r?.blockLinks, blockImages: !!r?.blockImages,
      blockVideos: !!r?.blockVideos, blockAudios: !!r?.blockAudios, noForward: !!r?.noForward,
    },
    name: r?.name || "",
  };
  drawSheet();
  document.getElementById("sheetBg").classList.add("open");
  document.getElementById("sheet").classList.add("open");
}
function closeSheet(){
  document.getElementById("sheetBg").classList.remove("open");
  document.getElementById("sheet").classList.remove("open");
}

function drawSheet(){
  const sh = document.getElementById("sheet");
  const all = [...ST.channels.map(c=>({...c,_t:"ch"})), ...ST.groups.map(g=>({...g,_t:"gr"}))];
  const dstAll = [...ST.groups.map(g=>({...g,_t:"gr"})), ...ST.channels.map(c=>({...c,_t:"ch"}))];
  const f = SHEET.flags;
  sh.innerHTML =
    '<div class="grip"></div>' +
    '<h2>' + (SHEET.editing ? "✏️ تعديل القاعدة" : "➕ قاعدة تحويل جديدة") + '</h2>' +

    (ST.numbers.length > 1 ?
      '<div class="fld"><label>📱 رقم الواتساب</label><div class="pick" style="max-height:130px">' +
      ST.numbers.map(n =>
        '<div class="it '+(SHEET.num===n?"sel":"")+'" onclick="SHEET.num=\\''+n+'\\';drawSheet()"><span class="chk">✓</span>'+esc(n)+'</div>'
      ).join("") + '</div></div>'
    : "") +

    '<div class="fld"><label>📥 المصادر — اختر واحداً أو أكثر (' + SHEET.srcSel.length + ' محدد)</label>' +
    '<input type="text" id="srcFilter" placeholder="🔍 فلترة سريعة…" oninput="filterPick(this,\\'srcPick\\')" style="margin-bottom:8px">' +
    '<div class="pick" id="srcPick">' +
    (all.length ? all.map(x =>
      '<div class="it '+(SHEET.srcSel.includes(x.id)?"sel":"")+'" data-nm="'+esc((x.name||"").toLowerCase())+'" onclick="togSrc(\\''+esc(x.id)+'\\')">' +
      '<span class="chk">✓</span>' + (x._t==="ch"?"📺 ":"👥 ") + esc(x.name) + '</div>'
    ).join("") : '<div class="it" style="color:var(--mut)">لا توجد عناصر — أضف قنوات أو حدّث المجموعات أولاً</div>') +
    '</div></div>' +

    '<div class="fld"><label>📤 الوجهة — اختر واحدة</label>' +
    '<input type="text" placeholder="🔍 فلترة سريعة…" oninput="filterPick(this,\\'dstPick\\')" style="margin-bottom:8px">' +
    '<div class="pick" id="dstPick">' +
    (dstAll.length ? dstAll.map(x =>
      '<div class="it '+(SHEET.dst===x.id?"sel":"")+'" data-nm="'+esc((x.name||"").toLowerCase())+'" onclick="SHEET.dst=\\''+esc(x.id)+'\\';drawSheet()">' +
      '<span class="chk">✓</span>' + (x._t==="ch"?"📺 ":"👥 ") + esc(x.name) + '</div>'
    ).join("") : '<div class="it" style="color:var(--mut)">لا توجد عناصر</div>') +
    '</div>' +
    '<div style="margin-top:8px"><input type="text" id="dstPhone" placeholder="👤 أو رقم شخص مباشرة: 9665XXXXXXXX" value="' +
    (SHEET.dst && SHEET.dst.endsWith("@s.whatsapp.net") ? esc(SHEET.dst.split("@")[0]) : "") + '" oninput="dstFromPhone(this.value)"></div></div>' +

    '<div class="fld"><label>⚙️ خيارات التحويل</label><div class="flags">' +
    flagBtn("blockLinks","🚫 حذف الروابط") + flagBtn("noForward","↩️ بدون علامة توجيه") +
    flagBtn("blockImages","🚫 حذف الصور") + flagBtn("blockVideos","🚫 حذف الفيديو") +
    flagBtn("blockAudios","🚫 حذف الصوت") +
    '</div></div>' +

    '<div class="fld"><label>🏷️ اسم القاعدة (اختياري)</label>' +
    '<input type="text" id="ruleName" placeholder="يُولَّد تلقائياً إن تُرك فارغاً" value="'+esc(SHEET.name||"")+'"></div>' +

    '<div style="display:flex;gap:8px;margin-top:6px">' +
    '<button class="btn btn-p" style="flex:1" onclick="saveRule()">💾 ' + (SHEET.editing?"حفظ التعديلات":"إنشاء القاعدة") + '</button>' +
    (SHEET.editing ? '<button class="btn btn-d" onclick="delRule()">🗑 حذف</button>' : "") +
    '</div>';
}
function flagBtn(k, label){
  return '<div class="flag '+(SHEET.flags[k]?"on":"")+'" onclick="SHEET.flags.'+k+'=!SHEET.flags.'+k+';drawSheet()">' +
    '<span>'+(SHEET.flags[k]?"✅":"⬜")+'</span> '+label+'</div>';
}
function togSrc(id){
  const i = SHEET.srcSel.indexOf(id);
  if (i>=0) SHEET.srcSel.splice(i,1); else SHEET.srcSel.push(id);
  drawSheet();
}
function dstFromPhone(v){
  const d = v.replace(/\\D/g,"");
  if (d.length >= 7) SHEET.dst = d + "@s.whatsapp.net";
}
function filterPick(inp, pickId){
  const q = inp.value.trim().toLowerCase();
  document.querySelectorAll("#"+pickId+" .it").forEach(el=>{
    el.style.display = (!q || (el.dataset.nm||"").includes(q)) ? "" : "none";
  });
}

async function saveRule(){
  const name = document.getElementById("ruleName")?.value?.trim() || "";
  if (!SHEET.srcSel.length) return toast("⚠️ اختر مصدراً واحداً على الأقل");
  if (!SHEET.dst) return toast("⚠️ اختر وجهة");
  try {
    if (SHEET.editing) {
      await api("/api/fw/rule/update", { id: SHEET.editing, patch: {
        sources: SHEET.srcSel, destination: SHEET.dst, sourceNumber: SHEET.num,
        ...SHEET.flags, ...(name ? {name} : {}),
      }});
      toast("✅ تم حفظ التعديلات");
    } else {
      await api("/api/fw/rule/create", {
        sources: SHEET.srcSel, destination: SHEET.dst, sourceNumber: SHEET.num,
        ...SHEET.flags, ...(name ? {name} : {}),
      });
      toast("✅ تم إنشاء القاعدة");
    }
    closeSheet(); await load();
  } catch(e){ toast("❌ " + e.message); }
}

async function delRule(){
  if (!confirm("حذف هذه القاعدة نهائياً؟")) return;
  try { await api("/api/fw/rule/delete", { id: SHEET.editing }); toast("🗑 تم حذف القاعدة"); closeSheet(); await load(); }
  catch(e){ toast("❌ " + e.message); }
}

load();
setInterval(load, 30000);
</script>
</body>
</html>`;
