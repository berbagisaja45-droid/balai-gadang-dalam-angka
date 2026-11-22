(() => {
  "use strict";
  const start = () => {
    const cfg = window.BG_CONFIG || {};
    const agendaHost = document.getElementById("bg-agenda-list");
    const announcementHost = document.getElementById("bg-announcement-list");
    if (!agendaHost || !announcementHost) return;

    const el = (tag, cls, txt) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (txt != null) n.textContent = txt;
      return n;
    };
    const dateText = value => value
      ? new Date(value).toLocaleString("id-ID", {
          day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }) : "Waktu belum ditentukan";
    const empty = (host, message) => {
      host.replaceChildren(el("div", "placeholder", message));
    };
    if (!window.supabase || !cfg.url || !cfg.anonKey) {
      empty(agendaHost, "Agenda akan ditampilkan setelah database terhubung.");
      empty(announcementHost, "Pengumuman akan ditampilkan setelah database terhubung.");
      return;
    }

    const db = window.supabase.createClient(cfg.url, cfg.anonKey);
    Promise.all([
      db.from("agenda_kelurahan")
        .select("id,judul,deskripsi,kategori,lokasi,mulai_pada,selesai_pada")
        .eq("status", "published")
        .order("mulai_pada", { ascending: true })
        .limit(30),
      db.from("pengumuman_kelurahan")
        .select("id,judul,isi,kategori,prioritas,berlaku_mulai,berlaku_sampai")
        .eq("status", "published")
        .order("berlaku_mulai", { ascending: false })
        .limit(30)
    ]).then(([agendaResult, announcementResult]) => {
      const now = Date.now();
      if (agendaResult.error) {
        empty(agendaHost, "Agenda belum dapat dimuat. Silakan coba kembali nanti.");
      } else {
        const items = (agendaResult.data || []).filter(x =>
          !x.selesai_pada || new Date(x.selesai_pada).getTime() >= now
        );
        agendaHost.replaceChildren();
        if (!items.length) {
          empty(agendaHost, "Belum ada agenda kegiatan yang dipublikasikan.");
        } else items.forEach(x => {
          const card = el("article", "card");
          card.append(
            el("span", "status", x.kategori || "Kegiatan"),
            el("h3", "", x.judul),
            el("p", "sub", "🗓 " + dateText(x.mulai_pada)),
            el("p", "sub", "📍 " + (x.lokasi || "Lokasi akan diinformasikan")),
            el("p", "sub", x.deskripsi || "Informasi kegiatan belum tersedia.")
          );
          agendaHost.append(card);
        });
      }

      if (announcementResult.error) {
        empty(announcementHost, "Pengumuman belum dapat dimuat. Silakan coba kembali nanti.");
      } else {
        const items = (announcementResult.data || []).filter(x =>
          !x.berlaku_sampai || new Date(x.berlaku_sampai).getTime() >= now
        );
        announcementHost.replaceChildren();
        if (!items.length) {
          empty(announcementHost, "Belum ada pengumuman yang sedang berlaku.");
        } else items.forEach(x => {
          const card = el("article", "card");
          const priority = x.prioritas === "mendesak" ? "MENDESAK"
            : x.prioritas === "penting" ? "PENTING" : (x.kategori || "Informasi");
          card.append(
            el("span", "status", priority),
            el("h3", "", x.judul),
            el("p", "sub", x.isi),
            el("p", "metric-note", "Mulai berlaku: " + dateText(x.berlaku_mulai)),
            ...(x.berlaku_sampai
              ? [el("p", "metric-note", "Berlaku sampai: " + dateText(x.berlaku_sampai))]
              : [])
          );
          announcementHost.append(card);
        });
      }
    }).catch(() => {
      empty(agendaHost, "Terjadi kendala saat memuat agenda.");
      empty(announcementHost, "Terjadi kendala saat memuat pengumuman.");
    });
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();