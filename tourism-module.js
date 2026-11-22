/* Smart Tourism module for Balai Gadang Dalam Angka.
   Add this file to the repository root and include it after the existing
   inline portal script, immediately before </body>.
   It reuses window.BG_CONFIG and Supabase JS v2. Does not edit config.js. */
(() => {
  "use strict";
  const start = () => {
    const cfg = window.BG_CONFIG || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) {
      console.warn("Smart Tourism: config.js / Supabase client not available.");
      return;
    }
    const db = window.supabase.createClient(cfg.url, cfg.anonKey);
    const nav = document.querySelector("nav .navin");
    const historySection = document.getElementById("sejarah-wisata");
    const demoSection = document.getElementById("demografi");
    if (!nav || !demoSection) {
      console.error("Smart Tourism: navigation or demografi anchor not found; no changes made.");
      return;
    }

    if (!document.querySelector('nav a[href="#wisata"]')) {
      const link = document.createElement("a");
      link.href = "#wisata";
      link.textContent = "Smart Tourism";
      const historyLink = nav.querySelector('a[href="#sejarah-wisata"]');
      if (historyLink) historyLink.after(link); else nav.append(link);
    }

    if (!document.getElementById("wisata")) {
      const section = document.createElement("section");
      section.id = "wisata";
      section.innerHTML = `
        <div class="section-head"><div>
          <h2>Smart Tourism Balai Gadang</h2>
          <div class="sub">Direktori wisata alam, religi, edukasi, sejarah, dan budaya yang bersumber dari Supabase.</div>
        </div></div>
        <div class="card">
          <div class="bg-tourism-toolbar">
            <input id="bg-tourism-search" type="search" placeholder="Cari destinasi atau nama alternatif..." aria-label="Cari destinasi">
            <span class="status" id="bg-tourism-count">Memuat…</span>
          </div>
          <div class="bg-tourism-filters" id="bg-tourism-filters"></div>
          <p class="map-status" id="bg-tourism-status" role="status">Menghubungkan ke database wisata…</p>
          <div class="bg-tourism-grid" id="bg-tourism-grid"></div>
          <div id="bg-tourism-detail" class="bg-tourism-detail" aria-live="polite"></div>
        </div>
        <div class="section-head"><div><h2>Peta Destinasi Wisata</h2>
          <div class="sub">Pin hanya muncul untuk destinasi published yang memiliki koordinat.</div>
        </div></div>
        <div class="card"><div id="bg-tourism-map"></div><p class="map-status" id="bg-tourism-map-status">Menunggu data koordinat.</p></div>
        <div class="note" style="margin-top:12px">Hanya destinasi berstatus published dan foto dengan izin approved yang ditampilkan kepada publik.</div>`;
      demoSection.before(section);
    }

    const style = document.createElement("style");
    style.textContent = `
      .bg-tourism-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0 16px}
      #bg-tourism-search{flex:1;min-width:210px;border:1px solid var(--line);border-radius:9px;padding:11px 12px;font:12px "DM Sans";background:#fff;color:var(--ink)}
      .bg-tourism-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
      .bg-tourism-filters button{border:1px solid var(--line);background:#fff;color:#52675e;border-radius:30px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer}
      .bg-tourism-filters button.active{background:var(--green);color:#fff;border-color:var(--green)}
      .bg-tourism-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:13px}
      .bg-tourism-card{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
      .bg-tourism-card>img,.bg-tourism-placeholder{height:165px;width:100%;object-fit:cover;background:#e8f0eb}
      .bg-tourism-placeholder{display:grid;place-items:center;color:#6d8879;font-size:36px}\n      #wisata{min-width:0;max-width:100%;overflow:hidden}\n      #wisata .card{min-width:0}\n      .bg-tourism-empty{border:1px dashed #cbd9d0;border-radius:12px;background:#f8fbf8;padding:22px 18px;text-align:center;color:#62756b;line-height:1.7;font-size:13px}\n      .bg-tourism-empty strong{display:block;color:#17352e;font:800 16px Manrope;margin-bottom:6px}\n      .bg-tourism-empty small{display:block;color:#71817a;font-size:11px;margin-top:7px}
      .bg-tourism-body{padding:14px;display:flex;flex-direction:column;gap:8px;flex:1}
      .bg-tourism-body h3{margin:0;font:800 16px Manrope}
      .bg-tourism-body p{margin:0;color:var(--muted);font-size:12px;line-height:1.7}
      .bg-tourism-tag{align-self:flex-start;background:var(--green2);color:var(--green);border-radius:30px;padding:5px 9px;font-size:10px;font-weight:700}
      .bg-tourism-body button{align-self:flex-start;margin-top:auto}
      .bg-tourism-detail{display:none;margin-top:14px}.bg-tourism-detail.open{display:block}
      .bg-tourism-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
      .bg-tourism-field{background:#f7faf7;border:1px solid var(--line);border-radius:10px;padding:12px}
      .bg-tourism-field b{display:block;font-size:11px;margin-bottom:5px}
      .bg-tourism-field span{font-size:12px;color:var(--muted);line-height:1.6}
      #bg-tourism-map{height:350px;width:100%;border-radius:12px}
      @media(max-width:560px){.bg-tourism-fields{grid-template-columns:1fr}#bg-tourism-map{height:290px}}
    `;
    document.head.append(style);

    const $ = id => document.getElementById(id);
    const search = $("bg-tourism-search"), grid = $("bg-tourism-grid");
    const filterBox = $("bg-tourism-filters"), count = $("bg-tourism-count");
    const status = $("bg-tourism-status"), detail = $("bg-tourism-detail");
    const mapStatus = $("bg-tourism-map-status");
    let rows = [], mediaMap = {}, category = "all", map, markerLayer;

    const publicUrl = path => db.storage.from("tourism-media").getPublicUrl(path).data?.publicUrl || "";
    const makePlaceholder = () => {
      const p = document.createElement("div"); p.className = "bg-tourism-placeholder"; p.textContent = "⌖"; return p;
    };
    const safeText = (node, text) => { node.textContent = text == null ? "" : String(text); };

    function showDetail(d) {
      detail.replaceChildren();
      const card = document.createElement("div"); card.className = "card";
      const h = document.createElement("h3"); safeText(h, d.name); card.append(h);
      if (d.alternate_names?.length) {
        const alt = document.createElement("p"); alt.className = "sub";
        safeText(alt, "Nama lain: " + d.alternate_names.join(", ")); card.append(alt);
      }
      const desc = document.createElement("p"); desc.style.lineHeight = "1.8";
      safeText(desc, d.description || d.short_description || "Deskripsi belum tersedia."); card.append(desc);
      const fields = [["Alamat", d.address], ["Akses", d.access_info], ["Fasilitas", d.facility_info],
        ["Keselamatan", d.safety_info], ["Informasi kunjungan", d.opening_info]];
      const fieldGrid = document.createElement("div"); fieldGrid.className = "bg-tourism-fields";
      fields.forEach(([label, value]) => {
        if (!value) return;
        const item = document.createElement("div"); item.className = "bg-tourism-field";
        const b = document.createElement("b"); safeText(b, label);
        const span = document.createElement("span"); safeText(span, value);
        item.append(b, span); fieldGrid.append(item);
      });
      card.append(fieldGrid);
      const photos = mediaMap[d.id] || [];
      if (photos.length) {
        const heading = document.createElement("h3"); heading.textContent = "Galeri dokumentasi"; card.append(heading);
        const gallery = document.createElement("div"); gallery.className = "bg-tourism-grid";
        photos.forEach(m => {
          const url = publicUrl(m.storage_path); if (!url) return;
          const img = document.createElement("img"); img.src = url; img.alt = m.caption || d.name;
          img.loading = "lazy"; img.style.cssText = "width:100%;height:150px;object-fit:cover;border-radius:10px";
          gallery.append(img);
        });
        card.append(gallery);
      }
      const actions = document.createElement("div"); actions.className = "actions";
      if (d.latitude != null && d.longitude != null) {
        const a = document.createElement("a"); a.className = "btn"; a.target = "_blank"; a.rel = "noopener";
        a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(d.latitude + "," + d.longitude);
        a.textContent = "Petunjuk arah"; actions.append(a);
      }
      const close = document.createElement("button"); close.className = "btn secondary"; close.textContent = "Tutup detail";
      close.onclick = () => { detail.classList.remove("open"); detail.replaceChildren(); };
      actions.append(close); card.append(actions); detail.append(card); detail.classList.add("open");
    }

    function render() {
      const term = (search.value || "").trim().toLocaleLowerCase("id-ID");
      const visible = rows.filter(d =>
        (category === "all" || d.tourism_categories?.slug === category) &&
        [d.name, d.short_description, d.description, d.address, ...(d.alternate_names || [])]
          .join(" ").toLocaleLowerCase("id-ID").includes(term)
      );
      grid.replaceChildren(); count.textContent = visible.length + " destinasi";
      if (!visible.length) {
        const empty = document.createElement("div"); empty.className = "placeholder"; empty.style.gridColumn = "1/-1";
        empty.textContent = rows.length ? "Tidak ada destinasi yang cocok." :
          "Belum ada destinasi berstatus published. Data draft tetap tersembunyi dari pengunjung.";
        grid.append(empty); return;
      }
      visible.forEach(d => {
        const card = document.createElement("article"); card.className = "bg-tourism-card";
        const first = (mediaMap[d.id] || []).find(m => m.media_type === "image");
        const url = first ? publicUrl(first.storage_path) : "";
        if (url) {
          const img = document.createElement("img"); img.src = url; img.alt = d.name; img.loading = "lazy";
          img.onerror = () => img.replaceWith(makePlaceholder()); card.append(img);
        } else card.append(makePlaceholder());
        const body = document.createElement("div"); body.className = "bg-tourism-body";
        const tag = document.createElement("span"); tag.className = "bg-tourism-tag";
        safeText(tag, d.tourism_categories?.name || "Destinasi");
        const h = document.createElement("h3"); safeText(h, d.name);
        const p = document.createElement("p"); safeText(p, d.short_description || "Buka detail untuk informasi destinasi.");
        const btn = document.createElement("button"); btn.className = "btn"; btn.textContent = "Lihat detail"; btn.onclick = () => showDetail(d);
        body.append(tag, h, p, btn); card.append(body); grid.append(card);
      });
    }

    function renderFilters() {
      filterBox.replaceChildren();
      const cats = [...new Map(rows.filter(d => d.tourism_categories)
        .map(d => [d.tourism_categories.slug, d.tourism_categories])).values()];
      [{name:"Semua",slug:"all"}, ...cats].forEach(c => {
        const b = document.createElement("button"); b.textContent = c.name;
        b.classList.toggle("active", category === c.slug);
        b.onclick = () => { category = c.slug; renderFilters(); render(); };
        filterBox.append(b);
      });
    }

    function renderMap() {
      const el = $("bg-tourism-map");
      const mapped = rows.filter(d => d.latitude !== null && d.longitude !== null &&
        Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude)));
      if (!window.L) { mapStatus.textContent = "Pustaka peta belum tersedia."; return; }
      if (!mapped.length) {
        el.style.display = "none";
        mapStatus.textContent = "Belum ada destinasi published dengan koordinat. Pin muncul setelah koordinat diverifikasi.";
        return;
      }
      el.style.display = "block";
      if (!map) {
        map = L.map(el).setView([-0.80, 100.35], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {maxZoom:19, attribution:"&copy; OpenStreetMap"}).addTo(map);
        markerLayer = L.featureGroup().addTo(map);
      }
      markerLayer.clearLayers();
      mapped.forEach(d => {
        const marker = L.marker([d.latitude, d.longitude]);
        const popup = document.createElement("strong"); safeText(popup, d.name);
        marker.bindPopup(popup).addTo(markerLayer);
      });
      map.fitBounds(markerLayer.getBounds(), {padding:[24,24]});
      setTimeout(() => map.invalidateSize(), 150);
      mapStatus.textContent = mapped.length + " titik destinasi ditampilkan.";
    }

    search.addEventListener("input", render);
    status.textContent = "Mengambil destinasi published dari Supabase…";
    db.from("tourism_destinations")
      .select("id,name,alternate_names,short_description,description,address,latitude,longitude,access_info,facility_info,safety_info,opening_info,tourism_categories(name,slug)")
      .eq("status", "published").order("name", {ascending:true})
      .then(async ({data, error}) => {
        if (error) throw error;
        rows = data || [];
        if (rows.length) {
          const ids = rows.map(d => d.id);
          const mediaResult = await db.from("tourism_media")
            .select("destination_id,storage_path,media_type,caption,permission_status,sort_order")
            .in("destination_id", ids).eq("permission_status", "approved").order("sort_order", {ascending:true});
          if (mediaResult.error) throw mediaResult.error;
          (mediaResult.data || []).forEach(m => (mediaMap[m.destination_id] ||= []).push(m));
        }
        renderFilters(); render(); renderMap();
        status.textContent = rows.length
          ? "Data dimuat dari Supabase. Hanya destinasi published yang ditampilkan."
          : "Koneksi Supabase berhasil. Belum ada destinasi published; data draft tetap tersembunyi.";
      })
      .catch(error => {
        console.error("Smart Tourism:", error);
        status.textContent = "Data wisata belum dapat dimuat: " + (error.message || "Periksa koneksi dan RLS.");
        count.textContent = "Belum tersambung";
        grid.textContent = "Direktori wisata belum dapat terhubung ke database.";
        mapStatus.textContent = "Peta menunggu koneksi database.";
      });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
