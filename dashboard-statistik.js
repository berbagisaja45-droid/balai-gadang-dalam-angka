(() => {
  "use strict";
  const start = () => {
    const root = document.getElementById("dashboard-statistik");
    const cfg = window.BG_CONFIG || {};
    if (!root || !window.supabase || !cfg.url || !cfg.anonKey) return;
    const db = window.supabase.createClient(cfg.url, cfg.anonKey);
    const $ = id => document.getElementById(id);
    const fmt = n => n == null ? "—" : Number(n).toLocaleString("id-ID", {maximumFractionDigits:2});
    const status = $("dash-status");
    const selectedYear = () => Number($("year")?.value || new Date().getFullYear());
    function empty(id, text) {
      const node = $(id); if (!node) return;
      node.className = "placeholder"; node.textContent = text;
    }
    function bars(id, entries, suffix = "") {
      const node = $(id); if (!node) return;
      const valid = entries.filter(x => x.value != null && Number(x.value) >= 0);
      if (!valid.length) { empty(id, "Belum ada data terverifikasi untuk indikator ini."); return; }
      node.className = ""; node.replaceChildren();
      const max = Math.max(...valid.map(x => Number(x.value)), 1);
      valid.forEach(x => {
        const wrap = document.createElement("div"); wrap.style.margin = "12px 0";
        const line = document.createElement("div"); line.style.cssText = "display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:5px";
        const label = document.createElement("span"); label.textContent = x.label;
        const value = document.createElement("b"); value.textContent = fmt(x.value) + suffix;
        line.append(label, value);
        const track = document.createElement("div"); track.style.cssText = "height:10px;background:#edf3ef;border-radius:20px;overflow:hidden";
        const fill = document.createElement("div"); fill.style.cssText = "height:100%;background:#23815f;border-radius:20px;width:" + Math.max(0, Math.min(100, Number(x.value) / max * 100)) + "%";
        track.append(fill); wrap.append(line, track); node.append(wrap);
      });
    }
    async function query(view) {
      const {data,error} = await db.from(view).select("*").order("tahun", {ascending:true});
      if (error) throw new Error(view + ": " + error.message);
      return data || [];
    }
    async function load() {
      status.textContent = "Memuat data publik terverifikasi…";
      ["dash-population","dash-households","dash-umkm","dash-facilities"].forEach(id => $(id).textContent = "—");
      try {
        const [demo,biz,fac,env] = await Promise.all([
          query("v_demografi_publik"), query("v_ekonomi_publik"),
          query("v_fasilitas_publik"), query("v_lingkungan_publik")
        ]);
        const year = selectedYear();
        const d = demo.find(x => Number(x.tahun) === year) || demo.slice().sort((a,b)=>b.tahun-a.tahun)[0];
        const b = biz.find(x => Number(x.tahun) === year) || biz.slice().sort((a,b)=>b.tahun-a.tahun)[0];
        const f = fac.find(x => Number(x.tahun) === year) || fac.slice().sort((a,b)=>b.tahun-a.tahun)[0];
        const e = env.find(x => Number(x.tahun) === year) || env.slice().sort((a,b)=>b.tahun-a.tahun)[0];
        $("dash-population").textContent = fmt(d?.jumlah_penduduk);
        $("dash-households").textContent = fmt(d?.jumlah_kk);
        $("dash-umkm").textContent = fmt(b?.jumlah_umkm);
        $("dash-facilities").textContent = fmt(f?.jumlah_fasilitas);
        bars("dash-gender",[
          {label:"Laki-laki",value:d?.laki_laki},
          {label:"Perempuan",value:d?.perempuan}
        ]," orang");
        bars("dash-age",[
          {label:"Usia 0–14 tahun",value:d?.usia_0_14},
          {label:"Usia 15–64 tahun",value:d?.usia_15_64},
          {label:"Usia 65 tahun ke atas",value:d?.usia_65_plus}
        ]," orang");
        bars("dash-economy",[
          {label:"UMKM",value:b?.jumlah_umkm},
          {label:"Kategori usaha",value:b?.jumlah_kategori},
          {label:"Penduduk bekerja",value:b?.penduduk_bekerja}
        ]);
        bars("dash-environment",[
          {label:"Tutupan pohon",value:e?.tutupan_pohon_ha},
          {label:"Agroforestri",value:e?.agroforestri_ha},
          {label:"Stok karbon",value:e?.stok_karbon_tco2e},
          {label:"Petak pemantauan",value:e?.jumlah_petak}
        ]);
        const trend = $("dash-trend");
        const years = [...new Set([...demo.map(x=>x.tahun),...biz.map(x=>x.tahun)])].sort((a,b)=>a-b);
        if (!years.length) empty("dash-trend","Belum ada deret waktu yang terverifikasi untuk ditampilkan.");
        else {
          trend.className = ""; trend.replaceChildren();
          years.forEach(y => {
            const dr=demo.find(x=>Number(x.tahun)===Number(y));
            const br=biz.find(x=>Number(x.tahun)===Number(y));
            const row=document.createElement("div");row.style.cssText="display:grid;grid-template-columns:55px 1fr 1fr;gap:10px;align-items:center;margin:10px 0;font-size:11px";
            const yearLabel=document.createElement("b");yearLabel.textContent=y;
            const p=document.createElement("span");p.textContent="Penduduk: "+fmt(dr?.jumlah_penduduk);
            const u=document.createElement("span");u.textContent="UMKM: "+fmt(br?.jumlah_umkm);
            row.append(yearLabel,p,u);trend.append(row);
          });
        }
        status.textContent = "Data publik berhasil dimuat. Tahun indikator mengikuti pilihan tahun bila tersedia; jika tidak, sistem menampilkan tahun terbaru yang tersedia. Data kosong ditampilkan sebagai tanda pisah, bukan angka nol.";
      } catch (err) {
        status.textContent = "Dashboard belum dapat memuat sebagian data: " + err.message + ". Periksa kebijakan akses publik pada view statistik.";
      }
    }
    $("refresh-statistik")?.addEventListener("click",load);
    $("year")?.addEventListener("change",load);
    load();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true}); else start();
})();