(() => {
  "use strict";
  const start=()=>{
    const cfg=window.BG_CONFIG||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey)return;
    const db=window.supabase.createClient(cfg.url,cfg.anonKey);
    const host=document.getElementById("bg-news-list"); if(!host)return;
    const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;};
    db.from("berita_kelurahan").select("id,title,slug,excerpt,content,category,cover_image_url,youtube_url,published_at,source_name,source_url").eq("status","published").order("published_at",{ascending:false}).limit(30).then(({data,error})=>{
      host.replaceChildren();
      if(error){host.append(el("p","sub","Berita belum dapat dimuat. Silakan coba beberapa saat lagi."));return;}
      if(!data?.length){host.append(el("div","placeholder","Belum ada berita yang dipublikasikan. Berita resmi akan ditampilkan setelah diverifikasi oleh pengelola."));return;}
      data.forEach(item=>{
        const card=el("article","card");card.style.padding="0";card.style.overflow="hidden";
        if(item.cover_image_url){const im=el("img");im.src=item.cover_image_url;im.alt=item.title;im.loading="lazy";im.style.cssText="width:100%;max-height:230px;object-fit:cover";card.append(im);}
        if(item.youtube_url){try{const u=new URL(item.youtube_url);let vid="";if(u.hostname==="youtu.be")vid=u.pathname.slice(1);else if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname))vid=u.searchParams.get("v")||((u.pathname.startsWith("/embed/"))?u.pathname.split("/")[2]:"");if(/^[A-Za-z0-9_-]{11}$/.test(vid)){const frame=el("iframe");frame.src="https://www.youtube-nocookie.com/embed/"+vid;frame.title=item.title;frame.loading="lazy";frame.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share";frame.allowFullscreen=true;frame.style.cssText="width:100%;aspect-ratio:16/9;border:0";card.append(frame);}}catch(_){}}
        const body=el("div","");body.style.padding="17px";
        body.append(el("span","status",item.category||"Berita"),el("h3","",item.title),el("p","sub",item.excerpt||item.content||""));
        if(item.published_at)body.append(el("p","metric-note",new Date(item.published_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})));
        if(item.youtube_url){const a=el("a","btn","Tonton video");a.href=item.youtube_url;a.target="_blank";a.rel="noopener";body.append(a);}
        if(item.source_url){const a=el("a","btn secondary","Sumber berita");a.href=item.source_url;a.target="_blank";a.rel="noopener";body.append(a);}
        card.append(body);host.append(card);
      });
    });
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();