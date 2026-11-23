(() => {
  "use strict";
  const cfg=window.BG_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey);
  const root=document.getElementById("bg-admin-app");if(!root)return;
  const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;};
  const field=(label,name,type="text",required=false)=>{const wrap=el("label","bg-admin-field",label);const input=el("input");input.name=name;input.type=type;input.required=required;wrap.append(input);return wrap;};
  const area=(label,name)=>{const wrap=el("label","bg-admin-field",label);const input=el("textarea");input.name=name;input.rows=4;wrap.append(input);return wrap;};
  const select=(label,name,opts)=>{const wrap=el("label","bg-admin-field",label);const s=el("select");s.name=name;opts.forEach(([v,t])=>{const o=el("option");o.value=v;o.textContent=t;s.append(o);});wrap.append(s);return wrap;};
  const message=el("p","sub","");root.replaceChildren();
  const login=el("form","card");login.append(el("h2","","Admin Panel Balai Gadang"));
  login.append(el("p","sub","Masuk menggunakan akun staf yang sudah terdaftar di Supabase Auth dan memiliki peran admin, data_entry, atau verifikator."));
  login.append(field("Email staf","email","email",true),field("Password","password","password",true));
  const submit=el("button","btn","Masuk");submit.type="submit";login.append(submit,message);
  const forgot=el("button","btn secondary","Lupa Password?");forgot.type="button";forgot.style.marginTop="10px";login.append(forgot);root.append(login);
  forgot.addEventListener("click",async()=>{
    const email=login.elements.email.value.trim();
    if(!email){message.textContent="Masukkan email staf terlebih dahulu.";login.elements.email.focus();return;}
    forgot.disabled=true;message.textContent="Mengirim tautan pemulihan ke email…";
    try{
      const redirectTo=location.origin+location.pathname+"?reset=1";
      const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      message.textContent="Jika email terdaftar, tautan pemulihan telah dikirim. Periksa Kotak Masuk dan Spam Gmail.";
    }catch(err){message.textContent=err.message||"Gagal mengirim tautan pemulihan.";}
    finally{forgot.disabled=false;}
  });
  function showPasswordRecovery(){
    root.replaceChildren();
    const form=el("form","card");form.append(el("h2","","Buat Password Baru"));
    form.append(el("p","sub","Masukkan password baru untuk akun pengelola Balai Gadang."));
    const pw=field("Password baru (minimal 8 karakter)","new_password","password",true);pw.querySelector("input").minLength=8;
    const confirm=field("Ulangi password baru","confirm_password","password",true);confirm.querySelector("input").minLength=8;
    form.append(pw,confirm);
    const save=el("button","btn","Simpan Password Baru");save.type="submit";const status=el("p","sub","");form.append(save,status);root.append(form);
    form.addEventListener("submit",async e=>{
      e.preventDefault();const a=form.elements.new_password.value,b=form.elements.confirm_password.value;
      if(a.length<8){status.textContent="Password minimal 8 karakter.";return;}
      if(a!==b){status.textContent="Kedua password belum sama.";return;}
      save.disabled=true;status.textContent="Memperbarui password…";
      try{
        const {error}=await db.auth.updateUser({password:a});if(error)throw error;
        status.textContent="Password berhasil diperbarui. Silakan masuk menggunakan password baru.";
        await db.auth.signOut();
        setTimeout(()=>location.replace(location.pathname+"#admin"),1200);
      }catch(err){status.textContent=err.message||"Gagal memperbarui password.";}
      finally{save.disabled=false;}
    });
  }
  db.auth.onAuthStateChange((event)=>{
    if(event==="PASSWORD_RECOVERY")showPasswordRecovery();
  });
  if(new URLSearchParams(location.hash.slice(1)).get("type")==="recovery"){
    db.auth.getSession().then(({data})=>{if(data.session)showPasswordRecovery();});
  }
  login.addEventListener("submit",async e=>{
    e.preventDefault();submit.disabled=true;message.textContent="Memeriksa akun…";
    try{
      const fd=new FormData(login);const {data,error}=await db.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")});if(error)throw error;
      const {data:profile,error:pe}=await db.from("app_profiles").select("full_name,role").eq("id",data.user.id).single();if(pe)throw pe;
      if(!["admin","data_entry","verifikator"].includes(profile.role)){await db.auth.signOut();throw new Error("Akun tidak memiliki peran pengelola portal.");}
      renderWorkspace(profile);
    }catch(err){message.textContent=err.message||"Login gagal.";submit.disabled=false;}
  });
  async function renderWorkspace(profile){
    root.replaceChildren();
    const top=el("div","card");top.append(el("h2","","Panel Pengelola"),el("p","sub",(profile.full_name||"Petugas")+" · "+profile.role));
    const out=el("button","btn secondary","Keluar");out.onclick=async()=>{await db.auth.signOut();location.reload();};top.append(out);root.append(top);
    const tabs=el("div","actions");const newsTab=el("button","btn","Kelola Berita");const umkmTab=el("button","btn secondary","Kelola UMKM");const agendaTab=el("button","btn secondary","Agenda & Pengumuman");tabs.append(newsTab,umkmTab);if(["admin","verifikator"].includes(profile.role))tabs.append(agendaTab);root.append(tabs);
    const work=el("div","");root.append(work);
    function showNews(){
      work.replaceChildren();const form=el("form","card");form.append(el("h3","","Tambah Berita Kelurahan"));
      form.append(field("Judul berita","title","text",true),field("Slug (huruf kecil dan tanda hubung)","slug","text",true),field("Kategori","category"),area("Ringkasan","excerpt"),area("Isi berita","content"),field("URL foto sampul","cover_image_url","url"),field("URL video YouTube (opsional)","youtube_url","url"),field("Nama sumber","source_name"),field("URL sumber","source_url","url"));
      const st=profile.role==="admin"||profile.role==="verifikator"?[["draft","Draft"],["review","Perlu ditinjau"],["published","Publikasikan"]]:[["draft","Draft"],["review","Kirim untuk ditinjau"]];
      form.append(select("Status","status",st));const b=el("button","btn","Simpan berita");b.type="submit";form.append(b);const msg=el("p","sub","");form.append(msg);work.append(form);
      form.addEventListener("submit",async e=>{e.preventDefault();b.disabled=true;const d=Object.fromEntries(new FormData(form));d.created_by=(await db.auth.getUser()).data.user.id;if(d.status==="published")d.published_at=new Date().toISOString();else d.published_at=null;try{const {error}=await db.from("berita_kelurahan").insert(d);if(error)throw error;msg.textContent="Berita tersimpan.";form.reset();loadNews(list);}catch(err){msg.textContent=err.message;}finally{b.disabled=false;}});
      const list=el("div","card");list.append(el("h3","","Daftar berita"));work.append(list);loadNews(list);
    }
    async function loadNews(list){if(!list)return;const {data,error}=await db.from("berita_kelurahan").select("id,title,status,published_at").order("created_at",{ascending:false}).limit(50);if(error){list.append(el("p","sub",error.message));return;}data.forEach(row=>{const line=el("div","bg-admin-row");line.append(el("span","",row.title+" · "+row.status));if(profile.role==="admin"||profile.role==="verifikator"){const s=el("select");[["draft","Draft"],["review","Review"],["published","Published"],["archived","Arsip"]].forEach(([v,t])=>{const o=el("option");o.value=v;o.textContent=t;s.append(o);});s.value=row.status;s.onchange=async()=>{const patch={status:s.value,published_at:s.value==="published"?(row.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};const {error}=await db.from("berita_kelurahan").update(patch).eq("id",row.id);if(error){alert(error.message);s.value=row.status;}};line.append(s);}list.append(line);});}
    function showUmkm(){
      work.replaceChildren();const form=el("form","card");form.append(el("h3","","Tambah Profil UMKM"));
      form.append(field("Kode usaha unik","kode_usaha","text",true),field("Nama usaha","nama_usaha","text",true),field("Nama pemilik (opsional)","pemilik"),field("Kategori","kategori","text",true),field("Produk unggulan","produk_unggulan"),area("Deskripsi","deskripsi"),field("Alamat / lokasi","alamat"),field("Nomor telepon","telepon"),field("WhatsApp (format internasional tanpa +)","whatsapp"),field("URL foto usaha","foto_url","url"),field("Latitude","latitude","number"),field("Longitude","longitude","number"),field("Tahun pendataan","tahun","number",true),field("Kelompok lokasi / RW","kelompok_lokasi"));
      const statusOpts=profile.role==="admin"||profile.role==="verifikator"?[["draft","Draft"],["review","Review"],["verified","Terverifikasi"]]:[["draft","Draft"],["review","Review"]];
      form.append(select("Status verifikasi","status_verifikasi",statusOpts));const b=el("button","btn","Simpan UMKM");b.type="submit";form.append(b);const msg=el("p","sub","");form.append(msg);work.append(form);
      form.addEventListener("submit",async e=>{e.preventDefault();b.disabled=true;const d=Object.fromEntries(new FormData(form));d.tahun=Number(d.tahun);d.latitude=d.latitude?Number(d.latitude):null;d.longitude=d.longitude?Number(d.longitude):null;try{const {error}=await db.from("umkm").insert(d);if(error)throw error;msg.textContent="Data UMKM tersimpan.";form.reset();}catch(err){msg.textContent=err.message;}finally{b.disabled=false;}});
      const list=el("div","card");list.append(el("h3","","Daftar data UMKM"));work.append(list);
      async function loadUmkm(){
        const {data,error}=await db.from("umkm").select("id,nama_usaha,kode_usaha,status_verifikasi").order("created_at",{ascending:false}).limit(100);
        list.querySelectorAll(".bg-admin-row").forEach(n=>n.remove());
        if(error){list.append(el("p","sub",error.message));return;}
        data.forEach(x=>{
          const line=el("div","bg-admin-row");line.append(el("span","", (x.nama_usaha||x.kode_usaha)+" · "+x.status_verifikasi));
          if(profile.role==="admin"||profile.role==="verifikator"){
            const s=el("select");[["draft","Draft"],["review","Review"],["verified","Terverifikasi"],["rejected","Ditolak"]].forEach(([v,t])=>{const o=el("option");o.value=v;o.textContent=t;s.append(o);});
            s.value=x.status_verifikasi;s.onchange=async()=>{const {error}=await db.from("umkm").update({status_verifikasi:s.value,updated_at:new Date().toISOString()}).eq("id",x.id);if(error){alert(error.message);s.value=x.status_verifikasi;}else line.querySelector("span").textContent=(x.nama_usaha||x.kode_usaha)+" · "+s.value;};line.append(s);
          }
          list.append(line);
        });
      }
      loadUmkm();
    }
    function showAgenda(){
      work.replaceChildren();
      const panel=el("div","two");
      const agendaForm=el("form","card");
      agendaForm.append(el("h3","","Tambah Agenda Kegiatan"));
      agendaForm.append(field("Judul kegiatan","judul","text",true),field("Kategori","kategori"),area("Deskripsi kegiatan","deskripsi"),field("Lokasi","lokasi"),field("Mulai kegiatan","mulai_pada","datetime-local",true),field("Selesai kegiatan (opsional)","selesai_pada","datetime-local"));
      agendaForm.append(select("Status publikasi","status",[["draft","Draft"],["published","Publikasikan"],["archived","Arsip"]]));
      const ab=el("button","btn","Simpan agenda");ab.type="submit";const am=el("p","sub","");agendaForm.append(ab,am);
      agendaForm.addEventListener("submit",async e=>{
        e.preventDefault();ab.disabled=true;
        const d=Object.fromEntries(new FormData(agendaForm));
        d.mulai_pada=new Date(d.mulai_pada).toISOString();
        d.selesai_pada=d.selesai_pada?new Date(d.selesai_pada).toISOString():null;
        try{const {error}=await db.from("agenda_kelurahan").insert(d);if(error)throw error;am.textContent="Agenda berhasil disimpan.";agendaForm.reset();loadAgenda();}
        catch(err){am.textContent=err.message||"Gagal menyimpan agenda.";}
        finally{ab.disabled=false;}
      });
      const announcementForm=el("form","card");
      announcementForm.append(el("h3","","Tambah Pengumuman"));
      announcementForm.append(field("Judul pengumuman","judul","text",true),field("Kategori","kategori"),area("Isi pengumuman","isi"),select("Prioritas","prioritas",[["normal","Normal"],["penting","Penting"],["mendesak","Mendesak"]]),field("Mulai berlaku","berlaku_mulai","datetime-local"),field("Berlaku sampai (opsional)","berlaku_sampai","datetime-local"));
      announcementForm.append(select("Status publikasi","status",[["draft","Draft"],["published","Publikasikan"],["archived","Arsip"]]));
      const pb=el("button","btn","Simpan pengumuman");pb.type="submit";const pm=el("p","sub","");announcementForm.append(pb,pm);
      announcementForm.addEventListener("submit",async e=>{
        e.preventDefault();pb.disabled=true;
        const d=Object.fromEntries(new FormData(announcementForm));
        d.berlaku_mulai=d.berlaku_mulai?new Date(d.berlaku_mulai).toISOString():new Date().toISOString();
        d.berlaku_sampai=d.berlaku_sampai?new Date(d.berlaku_sampai).toISOString():null;
        try{const {error}=await db.from("pengumuman_kelurahan").insert(d);if(error)throw error;pm.textContent="Pengumuman berhasil disimpan.";announcementForm.reset();loadAnnouncements();}
        catch(err){pm.textContent=err.message||"Gagal menyimpan pengumuman.";}
        finally{pb.disabled=false;}
      });
      panel.append(agendaForm,announcementForm);work.append(panel);
      const lists=el("div","two");const agendaList=el("div","card");const annList=el("div","card");
      agendaList.append(el("h3","","Daftar Agenda"));annList.append(el("h3","","Daftar Pengumuman"));
      lists.append(agendaList,annList);work.append(lists);
      async function loadAgenda(){
        agendaList.querySelectorAll(".bg-admin-row").forEach(n=>n.remove());
        const {data,error}=await db.from("agenda_kelurahan").select("id,judul,status,mulai_pada").order("mulai_pada",{ascending:false}).limit(100);
        if(error){agendaList.append(el("p","sub",error.message));return;}
        (data||[]).forEach(x=>{
          const line=el("div","bg-admin-row");line.append(el("span","",x.judul+" · "+new Date(x.mulai_pada).toLocaleString("id-ID")+" · "+x.status));
          const s=el("select");[["draft","Draft"],["published","Terbit"],["archived","Arsip"]].forEach(([v,t])=>{const o=el("option");o.value=v;o.textContent=t;s.append(o);});s.value=x.status;
          s.onchange=async()=>{const {error}=await db.from("agenda_kelurahan").update({status:s.value,updated_at:new Date().toISOString()}).eq("id",x.id);if(error){alert(error.message);s.value=x.status;}else loadAgenda();};
          line.append(s);agendaList.append(line);
        });
      }
      async function loadAnnouncements(){
        annList.querySelectorAll(".bg-admin-row").forEach(n=>n.remove());
        const {data,error}=await db.from("pengumuman_kelurahan").select("id,judul,status,prioritas,berlaku_mulai").order("berlaku_mulai",{ascending:false}).limit(100);
        if(error){annList.append(el("p","sub",error.message));return;}
        (data||[]).forEach(x=>{
          const line=el("div","bg-admin-row");line.append(el("span","",x.judul+" · "+x.prioritas+" · "+x.status));
          const s=el("select");[["draft","Draft"],["published","Terbit"],["archived","Arsip"]].forEach(([v,t])=>{const o=el("option");o.value=v;o.textContent=t;s.append(o);});s.value=x.status;
          s.onchange=async()=>{const {error}=await db.from("pengumuman_kelurahan").update({status:s.value,updated_at:new Date().toISOString()}).eq("id",x.id);if(error){alert(error.message);s.value=x.status;}else loadAnnouncements();};
          line.append(s);annList.append(line);
        });
      }
      loadAgenda();loadAnnouncements();
    }
    function activateTab(active){
      [newsTab,umkmTab,agendaTab].filter(Boolean).forEach(t=>t.className=t===active?"btn":"btn secondary");
    }
    newsTab.onclick=()=>{activateTab(newsTab);showNews();};
    umkmTab.onclick=()=>{activateTab(umkmTab);showUmkm();};
    if(agendaTab)agendaTab.onclick=()=>{activateTab(agendaTab);showAgenda();};
    showNews();
  }
  db.auth.getSession().then(async({data})=>{if(!data.session)return;const {data:p}=await db.from("app_profiles").select("full_name,role").eq("id",data.session.user.id).single();if(p&&["admin","data_entry","verifikator"].includes(p.role))renderWorkspace(p);});
})();