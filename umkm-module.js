(() => {
  "use strict";
  const start=()=>{
    const cfg=window.BG_CONFIG||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey)return;
    const db=window.supabase.createClient(cfg.url,cfg.anonKey);
    const host=document.getElementById("bg-umkm-list");if(!host)return;
    const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;};
    db.from("umkm").select("id,kode_usaha,kategori,kelompok_lokasi,tahun,nama_usaha,deskripsi,alamat,telepon,whatsapp,produk_unggulan,foto_url,latitude,longitude").eq("status_verifikasi","verified").order("nama_usaha",{ascending:true}).then(({data,error})=>{
      host.replaceChildren();
      if(error){host.append(el("p","sub","Direktori UMKM belum dapat dimuat."));return;}
      if(!data?.length){host.append(el("div","placeholder","Profil UMKM akan tampil setelah data usaha diverifikasi oleh pengelola."));return;}
      data.forEach(x=>{
        const card=el("article","card");card.style.padding="0";card.style.overflow="hidden";
        if(x.foto_url){const img=el("img");img.src=x.foto_url;img.alt=x.nama_usaha||"Foto UMKM";img.loading="lazy";img.style.cssText="width:100%;height:170px;object-fit:cover";card.append(img);}
        const body=el("div","");body.style.padding="15px";
        body.append(el("span","status",x.kategori||"UMKM"),el("h3","",x.nama_usaha||"Usaha warga"),el("p","sub",x.deskripsi||x.produk_unggulan||"Informasi usaha belum tersedia."),el("p","sub",x.alamat||x.kelompok_lokasi||"Balai Gadang"));
        if(x.whatsapp){const a=el("a","btn","Hubungi melalui WhatsApp");a.href="https://wa.me/"+x.whatsapp.replace(/\\D/g,"");a.target="_blank";a.rel="noopener";body.append(a);}
        card.append(body);host.append(card);
      });
    });
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();