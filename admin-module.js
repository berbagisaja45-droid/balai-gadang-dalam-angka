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
  const submit=el("button","btn","Masuk");submit.type="submit";login.append(submit,message);root.append(login);
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
    const tabs=el("div","actions");const newsTab=el("button","btn","Kelola Berita");const umkmTab=el("button","btn secondary","Kelola UMKM");tabs.append(newsTab,umkmTab);root.append(tabs);
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
      db.from("umkm").select("id,nama_usaha,kode_usaha,status_verifikasi").order("created_at",{ascending:false}).limit(100).then(({data,error})=>{if(error){list.append(el("p","sub",error.message));return;}data.forEach(x=>list.append(el("p","sub",(x.nama_usaha||x.kode_usaha)+" · "+x.status_verifikasi)));});
    }
    newsTab.onclick=()=>{newsTab.className="btn";umkmTab.className="btn secondary";showNews();};umkmTab.onclick=()=>{umkmTab.className="btn";newsTab.className="btn secondary";showUmkm();};showNews();
  }
  db.auth.getSession().then(async({data})=>{if(!data.session)return;const {data:p}=await db.from("app_profiles").select("full_name,role").eq("id",data.session.user.id).single();if(p&&["admin","data_entry","verifikator"].includes(p.role))renderWorkspace(p);});
})();