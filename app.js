/**
 * Pendaftaran Yoga - GitHub Pages (frontend) + Google Sheets (backend via Apps Script + JSONP)
 * -------------------------------------------------------------------------
 * 1) Buat Google Sheet
 * 2) Pasang Apps Script (lihat apps-script/Code.gs) dan deploy sebagai Web App
 * 3) Isi CONFIG.SCRIPT_URL dan CONFIG.API_KEY di bawah
 */

const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxhF4qD4s0_tNSZtmeHBfIDHPJE6tq5ltoWQ3FOacJiUiaqKlmbpa_aFFD0CXuK-FIi/exec", // contoh: https://script.google.com/macros/s/XXXX/exec
  API_KEY: "yoga-2026-yatta",
};

const fmtIDR = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const els = {
  form: document.getElementById("regForm"),
  msg: document.getElementById("statusMsg"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnExport: document.getElementById("btnExport"),
  sTotal: document.getElementById("sTotal"),
  sPaid: document.getElementById("sPaid"),
  sUnpaid: document.getElementById("sUnpaid"),
  sRevenue: document.getElementById("sRevenue"),
  dailyBody: document.querySelector("#dailyTable tbody"),
  monthlyBody: document.querySelector("#monthlyTable tbody"),
  dataBody: document.querySelector("#dataTable tbody"),
  qSearch: document.getElementById("qSearch"),
  qStatus: document.getElementById("qStatus"),
  qDate: document.getElementById("qDate"),
  btnClear: document.getElementById("btnClear"),
};

let ALL_ROWS = [];

function assertConfigured() {
  if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.includes("PASTE_URL")) {
    setMsg("Isi dulu CONFIG.SCRIPT_URL di app.js (URL Web App Apps Script).", true);
    return false;
  }
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes("GANTI")) {
    setMsg("Isi dulu CONFIG.API_KEY di app.js (samakan dengan API_KEY di Code.gs).", true);
    return false;
  }
  return true;
}

function setMsg(text, isError = false) {
  els.msg.textContent = text;
  els.msg.style.color = isError ? "#ff6b6b" : "";
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const cleanup = () => {
      try { delete window[cb]; } catch {}
      script.remove();
    };

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    const sep = url.includes("?") ? "&" : "?";
    script.src = url + sep + "callback=" + cb;
    document.body.appendChild(script);
  });
}

function buildUrl(params) {
  const q = new URLSearchParams(params);
  return `${CONFIG.SCRIPT_URL}?${q.toString()}`;
}

async function apiList() {
  const url = buildUrl({ action: "list", key: CONFIG.API_KEY });
  const res = await jsonp(url);
  if (!res || !res.ok) throw new Error(res?.error || "Gagal memuat data");
  return res.data || [];
}

async function apiAdd({ nama, status, hari, biaya, lokasi }) {
  const url = buildUrl({
    action: "add",
    key: CONFIG.API_KEY,
    nama,
    status,
    hari,
    biaya: String(biaya ?? 0),
    lokasi,
  });
  const res = await jsonp(url);
  if (!res || !res.ok) throw new Error(res?.error || "Gagal menyimpan");
  return true;
}

function toISODate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(isoDate) {
  if (!isoDate) return "";
  return isoDate.slice(0, 7); // yyyy-mm
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function summarize(rows) {
  const daily = new Map();
  const monthly = new Map();

  let total = 0, paid = 0, unpaid = 0, revenue = 0;

  for (const r of rows) {
    total++;
    const biaya = safeNumber(r.biaya);
    const status = (r.status_pembayaran || "").trim();
    const dayKey = toISODate(r.hari_kegiatan);
    const monthKey = toMonthKey(dayKey);

    const isPaid = status.toLowerCase() === "lunas".toLowerCase();
    if (isPaid) { paid++; revenue += biaya; } else { unpaid++; }

    const addAgg = (map, key) => {
      if (!key) key = "(tanpa tanggal)";
      const cur = map.get(key) || { peserta: 0, lunas: 0, belum: 0, total_biaya: 0, masuk: 0 };
      cur.peserta++;
      cur.total_biaya += biaya;
      if (isPaid) { cur.lunas++; cur.masuk += biaya; } else { cur.belum++; }
      map.set(key, cur);
    };

    addAgg(daily, dayKey);
    addAgg(monthly, monthKey);
  }

  const toSorted = (map) => {
    const arr = [...map.entries()].map(([k, v]) => ({ key: k, ...v }));
    arr.sort((a, b) => {
      const ak = a.key.startsWith("(") ? "" : a.key;
      const bk = b.key.startsWith("(") ? "" : b.key;
      return (bk).localeCompare(ak);
    });
    return arr;
  };

  return {
    totals: { total, paid, unpaid, revenue },
    daily: toSorted(daily),
    monthly: toSorted(monthly),
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStats(t) {
  els.sTotal.textContent = String(t.total);
  els.sPaid.textContent = String(t.paid);
  els.sUnpaid.textContent = String(t.unpaid);
  els.sRevenue.textContent = fmtIDR.format(t.revenue);
}

function renderRecap(tbody, items, labelKey, opts = {}) {
  const showShare30 = !!opts.share30;
  tbody.innerHTML = items.map(it => `
    <tr>
      <td>${escapeHtml(it.key || labelKey)}</td>
      <td class="num">${it.peserta}</td>
      <td class="num">${it.lunas}</td>
      <td class="num">${it.belum}</td>
      <td class="num">${fmtIDR.format(it.total_biaya)}</td>
      <td class="num">${fmtIDR.format(it.masuk)}</td>
      ${showShare30 ? `<td class="num">${fmtIDR.format(it.masuk * 0.3)}</td>` : ""}
    </tr>
  `).join("");
}

function normalizeRow(r) {
  return {
    timestamp: r.timestamp ? String(r.timestamp) : "",
    nama: r.nama ? String(r.nama) : "",
    status_pembayaran: r.status_pembayaran ? String(r.status_pembayaran) : "",
    hari_kegiatan: r.hari_kegiatan ? String(r.hari_kegiatan).slice(0,10) : "",
    biaya: safeNumber(r.biaya),
    lokasi: r.lokasi ? String(r.lokasi) : "",
  };
}

function applyFilters(rows) {
  const q = (els.qSearch.value || "").trim().toLowerCase();
  const st = (els.qStatus.value || "").trim();
  const dt = (els.qDate.value || "").trim();

  return rows.filter(r => {
    if (q) {
      const hay = `${r.nama} ${r.lokasi}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (st && r.status_pembayaran !== st) return false;
    if (dt && toISODate(r.hari_kegiatan) !== dt) return false;
    return true;
  });
}

function renderRows(rows) {
  const filtered = applyFilters(rows);
  filtered.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  els.dataBody.innerHTML = filtered.map(r => `
    <tr>
      <td>${escapeHtml(r.timestamp)}</td>
      <td>${escapeHtml(r.nama)}</td>
      <td>${escapeHtml(r.status_pembayaran)}</td>
      <td>${escapeHtml(toISODate(r.hari_kegiatan))}</td>
      <td class="num">${fmtIDR.format(r.biaya)}</td>
      <td>${escapeHtml(r.lokasi)}</td>
    </tr>
  `).join("");
}

function exportCsv(rows) {
  const headers = ["timestamp","nama","status_pembayaran","hari_kegiatan","biaya","lokasi"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.timestamp,
      r.nama,
      r.status_pembayaran,
      toISODate(r.hari_kegiatan),
      String(r.biaya),
      r.lokasi
    ].map(v => `"${String(v ?? "").replaceAll('"','""')}"`);
    lines.push(vals.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const stamp = now.toISOString().slice(0,10);
  a.href = url;
  a.download = `pendaftaran-yoga-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadAndRender() {
  if (!assertConfigured()) return;
  setMsg("Memuat data...");
  try {
    const data = (await apiList()).map(normalizeRow);
    ALL_ROWS = data;

    const s = summarize(ALL_ROWS);
    renderStats(s.totals);
    renderRecap(els.dailyBody, s.daily, "Tanggal");
    renderRecap(els.monthlyBody, s.monthly, "Bulan", { share30: true });
    renderRows(ALL_ROWS);

    setMsg(`Terakhir update: ${new Date().toLocaleString("id-ID")}`);
  } catch (e) {
    console.error(e);
    setMsg("Gagal memuat data. Cek SCRIPT_URL / API_KEY atau status deploy Apps Script.", true);
  }
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

els.form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!assertConfigured()) return;

  const fd = new FormData(els.form);
  const payload = {
    nama: (fd.get("nama") || "").toString().trim(),
    status: (fd.get("status") || "").toString().trim(),
    hari: (fd.get("hari") || "").toString().trim(),
    biaya: safeNumber(fd.get("biaya")),
    lokasi: (fd.get("lokasi") || "").toString().trim(),
  };

  if (!payload.nama || !payload.status || !payload.hari || !payload.lokasi) {
    setMsg("Mohon lengkapi semua field.", true);
    return;
  }

  setMsg("Menyimpan...");
  try {
    await apiAdd(payload);
    setMsg("Tersimpan ✅");
    els.form.reset();
    els.form.querySelector('input[name="hari"]').value = todayISO();
    await loadAndRender();
  } catch (e) {
    console.error(e);
    setMsg("Gagal menyimpan. Pastikan Web App Apps Script bisa diakses.", true);
  }
});

els.btnRefresh.addEventListener("click", loadAndRender);
els.btnExport.addEventListener("click", () => exportCsv(applyFilters(ALL_ROWS)));

[els.qSearch, els.qStatus, els.qDate].forEach(el => el.addEventListener("input", () => renderRows(ALL_ROWS)));
els.btnClear.addEventListener("click", () => {
  els.qSearch.value = "";
  els.qStatus.value = "";
  els.qDate.value = "";
  renderRows(ALL_ROWS);
});

(function init(){
  els.form.querySelector('input[name="hari"]').value = todayISO();
  setMsg("Siap. Isi form lalu klik Simpan.");
})();
