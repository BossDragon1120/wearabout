// WearAbout — standalone web app (GitHub Pages + Supabase + Photoroom + Claude).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const CONFIGURED = !/YOUR-PROJECT|YOUR-ANON-KEY/.test(SUPABASE_URL + SUPABASE_ANON_KEY);
const sb = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

/* ---------- constants ---------- */
const CATS = ["Casual/Hangout","Errands","Office","WFH","Active/Workout","Night Out","Work Event","Get Fancy","Travel Day","Festival","Beach/Resort"];
const DIMS = [["occasion_fit","Occasion fit",.30],["cohesion","Cohesion",.20],["proportion","Proportion & fit",.20],["color","Color",.20],["details","Finishing details",.10]];
const DIMS_GOAL = [["occasion_fit","Occasion fit",.25],["cohesion","Cohesion",.20],["proportion","Proportion & fit",.20],["color","Color",.15],["details","Finishing details",.10],["goal","Your goal",.10]];
const dimsFor = goal => goal ? DIMS_GOAL : DIMS;
const BADGES = [["Nailed the occasion","🎯"],["Color play","🎨"],["Great proportions","📐"],["Texture mix","🧶"],["Statement piece","✨"],["Polished details","💎"],["Tonal dressing","🤍"],["Pattern mixing","🌀"],["On goal","🏆"]];
const badgeIcon = n => (BADGES.find(b=>b[0]===n)||[,"🏅"])[1];
const ITEM_TYPES = ["top","bottom","dress","jacket","outerwear","shoes","bag","belt","hat","scarf","eyewear","other"];
const BEST = 8;
const TYPE_LABEL = {top:"Tops",bottom:"Bottoms",dress:"Dresses",jacket:"Jackets",outerwear:"Outerwear",shoes:"Shoes",bag:"Bags",belt:"Belts",hat:"Hats",scarf:"Scarves",eyewear:"Eyewear",other:"Other"};
const CAT_EMOJI = {"Beach/Resort":"🏖️","Travel Day":"✈️","Active/Workout":"🏃","Casual/Hangout":"☕","Errands":"🛍️","WFH":"🏠","Office":"💼","Work Event":"🎤","Get Fancy":"🥂","Night Out":"🌙","Festival":"🎪"};
const TAG_SVG = '<svg viewBox="0 0 24 14" width="24" height="14" aria-hidden="true"><path d="M8.4 1H20.6A2.4 2.4 0 0 1 23 3.4v7.2a2.4 2.4 0 0 1-2.4 2.4H8.4C5 13 1.6 9.6 1.6 7S5 1 8.4 1Z" fill="#F2C690"/><circle cx="6.6" cy="7" r="1.3" fill="#FFF7EC"/></svg>';
const ICON = {
  hanger:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 6.4A2.4 2.4 0 1 1 12 8.8v1.6"/><path d="M12 10.4 2.8 17.2a.9.9 0 0 0 .5 1.6h17.4a.9.9 0 0 0 .5-1.6Z"/></svg>',
  closet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="1.5"/><path d="M12 3v16M6 19v2M18 19v2"/><path d="M10 10v2M14 10v2" stroke-linecap="round"/></svg>',
  chev:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  bulb:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z"/></svg>',
  feed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="12" rx="2"/><path d="M4 19h16M4 22h10" stroke-linecap="round"/></svg>',
  people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.7"/><path d="M17 14.5c2.4 0 4.1 1.5 4.5 4.5"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/></svg>',
  heartFill:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5 8 12l7 7"/></svg>',
};

/* ---------- state ---------- */
const S = {
  uid:null, email:"", loaded:false,
  profile:null, fits:[], recs:[], out:new Set(), inc:new Set(), people:{}, posts:[], hearts:{},
  urls:{},
  view:"home", filter:{cat:null,best:false},
  flow:null, fitId:null, share:null, confirmDel:false, friendMsg:"", codeIn:"", handleIn:null, goal:"", goalEdit:false, goalIn:null, buyRecs:true, ideasFilter:"all",
  closet:[], closetReady:false, closetSort:"most", itemId:null, itemEdit:null, mergeTo:"", confirmRemove:false, fitBack:"home",
  auth:{step:"email", email:"", code:"", busy:false, msg:""},
};

/* ---------- invites ---------- */
// A friend's invite link looks like .../wearabout/?invite=ABC123. Keep the code until they're signed in.
const APP_URL = location.origin + location.pathname;
(function captureInvite(){
  const code=new URLSearchParams(location.search).get("invite");
  if(code && /^[A-Za-z0-9]{4,8}$/.test(code)){ try{ localStorage.setItem("wa_invite", code.toUpperCase()); }catch{} }
  if(code){ const u=new URL(location.href); u.searchParams.delete("invite"); history.replaceState(null,"",u.pathname+u.search+u.hash); }
})();
const pendingInvite = () => { try{ return localStorage.getItem("wa_invite")||""; }catch{ return ""; } };
const clearInvite = () => { try{ localStorage.removeItem("wa_invite"); }catch{} };

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => /^https?:\/\/[^\s"'<>]+$/i.test(String(u||"").trim()) ? String(u).trim() : "";
const google = q => "https://www.google.com/search?q=" + encodeURIComponent(q);
const fmtScore = n => (Math.round(n*10)%10===0) ? String(Math.round(n)) : Number(n).toFixed(1);
function localDate(d=new Date()){ const p=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
function addDays(ds,n){ const [y,m,d]=ds.split("-").map(Number); return localDate(new Date(y,m-1,d+n)); }
const longDate = ts => new Date(ts).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
function ago(ts){ const s=(Date.now()-new Date(ts))/1000; if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; if(s<604800) return Math.floor(s/86400)+"d ago"; return longDate(ts); }
let toastT;
function toast(msg, undo){
  const t=$("#toast"); t.textContent=msg;
  if(undo){ const b=document.createElement("button"); b.className="toast-undo"; b.textContent="Undo";
    b.onclick=()=>{ t.hidden=true; Promise.resolve(undo()).catch(()=>toast("Couldn't undo. Try again.")); }; t.append(b); }
  t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, undo?5000:2800);
}
const url = (bucket,path) => S.urls[bucket+":"+path] || "";
const me = () => S.uid;
const mutual = () => [...S.out].filter(id=>S.inc.has(id));
function displayName(id){ if(id===S.uid) return "You"; return (S.people[id] && S.people[id].handle) || "A friend"; }
function avatarColor(id){ let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return `hsl(${h%360} 42% 46%)`; }

/* ---------- images ---------- */
function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error("image")); i.src=src; }); }
function toBlob(c,type="image/jpeg",q=.88){ return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("blob")),type,q)); }
function scaled(img,maxEdge){
  const w=img.naturalWidth||img.width, h=img.naturalHeight||img.height, s=Math.min(1,maxEdge/Math.max(w,h));
  const c=document.createElement("canvas"); c.width=Math.round(w*s); c.height=Math.round(h*s);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height); return c;
}
// Decode a blob into an image, then release the temporary link so memory doesn't pile up.
async function blobImage(blob){ const u=URL.createObjectURL(blob); try { return await loadImage(u); } finally { URL.revokeObjectURL(u); } }
async function jpeg(blobOrImg, maxEdge, q=.88){
  const img = blobOrImg instanceof Blob ? await blobImage(blobOrImg) : blobOrImg;
  return toBlob(scaled(img,maxEdge),"image/jpeg",q);
}
function base64(blob){ return new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); }); }

/* ---------- Supabase calls ---------- */
async function signUrls(bucket, paths){
  const need=[...new Set(paths.filter(p=>p && !S.urls[bucket+":"+p]))];
  for(let i=0;i<need.length;i+=200){
    const { data } = await sb.storage.from(bucket).createSignedUrls(need.slice(i,i+200), 60*60*6);
    (data||[]).forEach(d=>{ if(d.signedUrl) S.urls[bucket+":"+d.path]=d.signedUrl; });
  }
}
async function callFn(name, payload, asBlob=false){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session) throw new Error("Sign in again.");
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session.access_token}`, apikey:SUPABASE_ANON_KEY },
      body: JSON.stringify(payload) });
  } catch { throw new Error("No connection. Check your signal and try again."); }
  if(!res.ok){ let msg=""; try{ const j=await res.json(); msg=j.error||j.message||j.msg||""; }catch{}
    throw new Error((msg||"Something went wrong. Try again.")+` (code ${res.status})`); }
  return asBlob ? res.blob() : res.json();
}
async function loadMine(){
  // Photo links are signed for 6 hours; start fresh after 5 so a long-open app never shows broken images.
  if(!S.urlsAt || Date.now()-S.urlsAt > 5*3600e3){ S.urls={}; S.urlsAt=Date.now(); }
  const [f,r,p,g,c] = await Promise.all([
    sb.from("fits").select("*").order("created_at",{ascending:false}).limit(1000),
    sb.from("saved_recs").select("*").order("created_at",{ascending:false}),
    sb.from("profiles").select("*").eq("id",S.uid).maybeSingle(),
    sb.from("user_settings").select("*").eq("user_id",S.uid).maybeSingle(),
    sb.from("closet_items").select("*").order("created_at",{ascending:true}),
  ]);
  S.fits=f.data||[]; S.recs=r.data||[]; S.profile=p.data||null; S.goal=(g.data&&g.data.style_goal)||"";
  S.buyRecs=!(g.data && g.data.buy_recs===false);
  S.closetReady=!c.error; S.closet=c.data||[];
  await signUrls("fits", [...S.fits.map(x=>x.thumb_path), ...S.closet.map(c=>c.crop_path).filter(Boolean)]);
  S.mineAt=Date.now();
}
async function loadSocial(){
  // Friendships and posts don't depend on each other, so fetch them together, then names, hearts and photos together.
  const [{ data:fr }, { data:posts }] = await Promise.all([
    sb.from("friendships").select("user_id,friend_id"),
    sb.from("posts").select("*").order("created_at",{ascending:false}).limit(60),
  ]);
  S.out=new Set((fr||[]).filter(x=>x.user_id===S.uid).map(x=>x.friend_id));
  S.inc=new Set((fr||[]).filter(x=>x.friend_id===S.uid).map(x=>x.user_id));
  const ids=[...new Set([...S.out,...S.inc])].filter(id=>!S.people[id]);
  const list=posts||[];
  const [pr, h] = await Promise.all([
    ids.length ? sb.from("profiles").select("id,handle").in("id",ids) : {data:[]},
    list.length ? sb.from("hearts").select("post_id,user_id").in("post_id",list.map(p=>p.id)) : {data:[]},
    signUrls("posts", list.map(p=>p.image_path)),
  ]);
  (pr.data||[]).forEach(p=>S.people[p.id]=p);
  const hearts={};
  (h.data||[]).forEach(x=>{ const e=hearts[x.post_id]||(hearts[x.post_id]={count:0,mine:false}); e.count++; if(x.user_id===S.uid) e.mine=true; });
  S.posts=list; S.hearts=hearts; S.socialAt=Date.now();
}

/* ---------- streak ---------- */
function streakInfo(){
  const days=new Set(S.fits.map(f=>f.local_date)), today=localDate();
  let d=days.has(today)?today:addDays(today,-1), n=0;
  while(days.has(d)){ n++; d=addDays(d,-1); }
  return {n, loggedToday:days.has(today)};
}

/* ---------- render ---------- */
function render(){
  const m=$("#main"), signedIn=!!S.uid;
  $("#appbar").hidden=!signedIn;
  if(!CONFIGURED){ m.innerHTML=`<div class="auth"><div class="mark">Wear<span>About</span></div><div class="note">Almost there. Add your Supabase address and key to <b>config.js</b> (see the README), then reload.</div></div>`; return; }
  if(!signedIn){ m.innerHTML=viewAuth(); return; }
  renderTabs();
  const v=S.view;
  m.innerHTML = v==="flow"?(S.flow&&S.flow.step==="result"?viewResult():viewFlow()) : v==="fit"?viewFit() : v==="share"?viewShare() : v==="feed"?viewFeed() : v==="saved"?viewSaved() : v==="friends"?viewFriends() : v==="closet"?viewCloset() : v==="item"?viewItem() : viewHome();
  if(v==="share") drawShare();
}
function softRender(views){
  const a=document.activeElement, typing=a && a.closest && a.closest("#main") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(views.includes(S.view) && !typing) render();
}
function renderTabs(){
  const homeish=["home","fit","flow","share"].includes(S.view);
  const on=id=>id==="home"?homeish:id==="closet"?["closet","item"].includes(S.view):S.view===id;
  const t=(id,label,icon)=>`<button class="tab ${on(id)?"on":""}" data-act="nav" data-view="${id}" aria-current="${on(id)?"page":"false"}">${icon}<span>${label}</span></button>`;
  $("#tabs").innerHTML=t("home","Fits",ICON.hanger)+t("feed","Feed",ICON.feed)+t("saved","Ideas",ICON.bulb)+t("friends","Friends",ICON.people)+t("closet","Closet",ICON.closet);
}

/* --- sign in --- */
function viewAuth(){
  const a=S.auth;
  return `<form class="auth" id="authForm" novalidate>
    <div class="mark">Wear<span>About</span></div>
    <p class="lead">Snap your outfit, get one sharp styling note, and keep your streak going.</p>
    ${pendingInvite()?`<div class="note">You've been invited by a friend. Sign in and you'll be connected automatically.</div>`:""}
    ${a.step==="email" ? `
      <div class="field"><label for="authEmail">Email</label>
        <input class="input" id="authEmail" type="email" autocomplete="email" inputmode="email" value="${esc(a.email)}" placeholder="you@example.com" required></div>
      <button class="btn primary block" type="submit" ${a.busy?"disabled":""}>${a.busy?"Sending…":"Email me a sign-in code"}</button>`
    : `
      <p>We sent a code to <b>${esc(a.email)}</b>. Enter it here. If the email has a sign-in link instead, tapping it signs you in too.</p>
      <div class="field"><label for="authCode">Sign-in code</label>
        <input class="input codeinput" id="authCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" value="${esc(a.code)}" required></div>
      <button class="btn primary block" type="submit" ${a.busy?"disabled":""}>${a.busy?"Checking…":"Sign in"}</button>
      <button class="link" type="button" data-act="authBack">Use a different email</button>`}
    ${a.msg?`<p class="small">${esc(a.msg)}</p>`:""}
  </form>`;
}
async function submitAuth(){
  const a=S.auth; if(a.busy) return;
  a.msg=""; a.busy=true; render();
  try{
    if(a.step==="email"){
      const email=a.email.trim(); if(!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
      // If the email arrives as a link instead of a code, send it back to this exact app address.
      const { error } = await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser:true, emailRedirectTo: location.origin + location.pathname } });
      if(error) throw error;
      a.email=email; a.step="code";
    } else {
      const token=a.code.replace(/\D/g,""); if(token.length<6) throw new Error("Enter the code from the email.");
      const { error } = await sb.auth.verifyOtp({ email:a.email, token, type:"email" });
      if(error) throw new Error("That code didn't work. Check it or request a new one.");
    }
  }catch(e){ a.msg=e.message||"Something went wrong. Try again."; }
  a.busy=false; render();
  if(a.step==="code") setTimeout(()=>$("#authCode")?.focus(),0);
}

/* --- home --- */
const badgeChips = list => (list&&list.length) ? `<div class="badges">${list.map(n=>`<span class="bdg">${badgeIcon(n)} ${esc(n)}</span>`).join("")}</div>` : "";
const GOAL_IDEAS = ["Executive","Polished","Minimalist","Classic","Sporty","Streetwear","Artsy","Edgy","Feminine","Romantic","Bohemian","Preppy","More color"];
function goalRow(){
  if(S.goalEdit) return `<div class="goalrow editing"><label for="goalIn" class="small" style="font-weight:600">Your style goal</label>
    <div class="row" style="flex-wrap:nowrap"><input class="input" id="goalIn" maxlength="40" value="${esc(S.goalIn ?? S.goal)}" placeholder="e.g. more executive, sportier, more color"><button class="btn sm primary" data-act="saveGoal">Save</button></div>
    <div class="chipgrid goalideas">${GOAL_IDEAS.map(g=>`<button class="chip ${String(S.goalIn ?? S.goal).toLowerCase()===g.toLowerCase()?"on":""}" data-act="pickGoal" data-goal="${esc(g)}">${esc(g)}</button>`).join("")}</div>
    <p class="small muted">Counts for 10% of each new fit's score.${S.goal?` <button class="link small" data-act="clearGoal">Remove goal</button>`:""}</p></div>`;
  return `<div class="goalrow">🧭 <span>${S.goal?`Style goal: <b>${esc(S.goal)}</b>`:"Add a style goal to your score"}</span><button class="link small" data-act="editGoal">${S.goal?"Edit":"Set one"}</button></div>`;
}
function viewHome(){
  const st=streakInfo(), f=S.filter;
  const title = st.n ? `🔥 ${st.n}-day streak` : "Log today's fit";
  const sub = st.loggedToday ? "Today's fit is in. Add another anytime." : st.n ? "Keep your streak alive — what are you wearing?" : "Start your streak — what are you wearing?";
  let out=`<button class="logbanner" data-act="log" aria-label="Log a fit"><span class="lb-ic">📸</span><span><b>${title}</b><span class="lb-sub">${sub}</span></span><span class="lb-plus">+</span></button>
    <div class="countrow"><span class="count">${S.fits.length}</span><span class="countlbl">Outfit${S.fits.length===1?"":"s"} logged</span></div>
    ${goalRow()}
    <div class="chips" role="toolbar" aria-label="Filters" style="margin-top:12px">
      <button class="chip best ${f.best?"on":""}" data-act="filterBest" aria-pressed="${f.best}">⭐ Best</button>
      ${CATS.map(c=>`<button class="chip ${f.cat===c?"on":""}" data-act="filterCat" data-cat="${esc(c)}" aria-pressed="${f.cat===c}">${TAG_SVG}${esc(c)}</button>`).join("")}
    </div>`;
  const list=S.fits.filter(x=>(!f.cat||x.category===f.cat)&&(!f.best||(x.score??0)>=BEST));
  if(!S.loaded) out+=`<div class="note plain" style="margin-top:22px">Loading your fits…</div>`;
  else if(!S.fits.length) out+=`<div class="empty" style="margin-top:22px"><b>No fits yet</b><p class="small muted">Snap what you're wearing. WearAbout guesses the occasion, puts you on a fresh backdrop, scores it, and suggests one tweak and maybe one buy.</p></div>`;
  else if(!list.length) out+=`<div class="empty" style="margin-top:22px"><p class="small muted">No fits match ${f.best?"Best":""}${f.best&&f.cat?" + ":""}${esc(f.cat||"")} yet.</p></div>`;
  else out+=`<div class="grid" style="margin-top:16px">${list.map(x=>{ const d=longDate(x.created_at); return `<button class="card" data-act="openFit" data-id="${esc(x.id)}">
      <img src="${esc(url("fits",x.thumb_path))}" alt="${esc(x.category)} fit, ${esc(d)}" loading="lazy">
      <span class="cbody"><span class="cdate">${esc(d)}</span><span class="pills">${x.score!=null?`<span class="spill">⭐ ${fmtScore(x.score)}/10</span>`:""}<span class="cpill">${CAT_EMOJI[x.category]||""} ${esc(x.category)}</span>${(x.analysis?.badges||[]).length?`<span class="bpill" title="${esc(x.analysis.badges.join(", "))}">${x.analysis.badges.map(badgeIcon).join("")}</span>`:""}</span></span></button>`; }).join("")}</div>`;
  return out;
}

/* --- logging flow --- */
function viewFlow(){
  const f=S.flow; if(!f) return "";
  let out=`<button class="back" data-act="cancelFlow">${ICON.back} Cancel</button>`;
  if(f.step==="occasion"){
    out+=`<div class="stack">
      <img class="photo" src="${f.origUrl}" alt="Your outfit photo">
      <div class="stack" style="gap:8px"><h2>What's it for?</h2>
        <p class="small muted">${f.guessing?"Reading your outfit…":f.guess?`Best guess: <b>${esc(f.guess)}</b>${f.guessConf==="low"?" (not sure)":""}. Tap another if it's wrong.`:f.guessErr?esc(f.guessErr)+" Pick one below.":"Pick the occasion."}</p></div>
      <div class="chipgrid">${CATS.map(c=>`<button class="chip ${f.cat===c?"on":""} ${f.guess===c&&f.cat!==c?"guess":""}" data-act="pickCat" data-cat="${esc(c)}">${CAT_EMOJI[c]} ${esc(c)}</button>`).join("")}</div>
      <div class="field"><label for="detail">Details (optional)</label>
        <input class="input" id="detail" maxlength="60" placeholder="e.g. Fleet Week, dinner date, coffee with Sam" value="${esc(f.detail)}"></div>
      <label class="keepbg"><input type="checkbox" id="keepBg" ${f.keepBg?"checked":""}> Keep my own background</label>
      <button class="btn primary block" data-act="runStyle" ${f.cat?"":"disabled"}>${f.keepBg?"Reveal my score":"Choose a backdrop"}</button></div>`;
  } else {
    const a=f.analysis;
    const tiles=f.keepBg?[["original","Original"]]:[["original","Original"],["studio","Studio"],["themed","Themed"]];
    const modes=["studio","themed"], ready=modes.filter(m=>f.compState[m]==="ok").length, failed=modes.filter(m=>f.compState[m]==="failed"), pending=modes.length-ready-failed.length;
    const errText=[...new Set(failed.map(m=>(f.errs||{})[m]).filter(Boolean))].join(" ");
    const bgStatus = f.keepBg ? "" : `<div class="status"><span class="dot ${pending?"live":failed.length?"":"ok"}"></span><span>${
      pending ? `Building your backdrops… ${ready} of 2 ready` :
      failed.length===2 ? `Backdrops didn't work this time. You can save the original.` :
      failed.length ? `${failed[0]==="studio"?"Studio":"Themed"} backdrop didn't work. The others are ready.` : "Backdrops ready."}${errText?`<br><small class="muted">${esc(errText)}</small>`:""}</span></div>`;
    out+=`<div class="stack">
      <div><h2>${f.keepBg?"Your fit":"Pick a backdrop"}</h2><p class="small muted">${CAT_EMOJI[f.cat]||""} ${esc(f.cat)}${f.detail?" · "+esc(f.detail):""}</p></div>
      <div class="bgpick" style="grid-template-columns:repeat(${tiles.length},minmax(0,1fr))${f.keepBg?";max-width:300px":""}">${tiles.map(([k,l])=>bgTile(k,l)).join("")}</div>
      ${bgStatus}
      <button class="btn primary block" data-act="reveal" ${f.bg&&f.comps[f.bg]?"":"disabled"}>Reveal my score</button>
    </div>`;
  }
  return out;
}
function viewResult(){
  const f=S.flow, a=f.analysis, ok=f.bg&&f.comps[f.bg]&&a!=="loading"&&!f.saving;
  let out=`<button class="back" data-act="backToBackdrop">${ICON.back} ${f.keepBg?"Change occasion":"Change backdrop"}</button><div class="stack" style="gap:18px">
    <img class="fitimg" src="${f.comps[f.bg].url}" alt="Your fit">
    <span class="cpill" style="align-self:flex-start">${CAT_EMOJI[f.cat]||""} ${esc(f.cat)}${f.detail?" · "+esc(f.detail):""}</span>`;
  if(a==="loading") out+=`<div class="status"><span class="dot live"></span><span>Scoring your fit and picking recs…</span></div>`;
  else if(!a||a.score==null) out+=`<div class="note plain">Couldn't score this fit: ${esc(f.analysisErr||"")} <button class="link" data-act="retryAnalysis">Try again</button><br><span class="small">You can still save it. It counts for your streak.</span></div>`;
  else out+=scoreBlock(a, a.score, f.cat, f.recFb||{}, "flowRecFb");
  out+=`<div class="savebar"><button class="btn primary" data-act="saveFit" ${ok?"":"disabled"}>${f.saving&&!f.shareAfter?"Saving…":"Save"}</button><button class="btn" data-act="saveShare" ${ok?"":"disabled"}>${f.saving&&f.shareAfter?"Saving…":"Save & share"}</button></div></div>`;
  return out;
}
// Score, badges, review, a one-line breakdown that expands, and the two recs.
function scoreBlock(an, score, cat, fb, recAct){
  const dims=dimsFor(an.goal).filter(([k])=>an.dims[k]);
  const name=k=>k==="goal"?"Your goal":(dims.find(d=>d[0]===k)||[,k])[1];
  const best=dims.reduce((m,d)=>!m||an.dims[d[0]].score>an.dims[m].score?d[0]:m,null);
  const low=an.low&&an.dims[an.low]?an.low:null;
  const short=l=>({"Proportion & fit":"Proportion","Finishing details":"Details","Occasion fit":"Occasion"})[l]||l;
  return `<div class="scoreRow"><div class="score">${fmtScore(score)}<small>/10</small></div><div class="small muted" style="padding-bottom:6px">${score>=BEST?"⭐ In your Best fits":"Style score for "+esc(cat)}<br>Only you see this.</div></div>
    ${badgeChips(an.badges)}
    ${an.review?`<p class="review">${esc(an.review)}</p>`:""}
    <details class="dimswrap"><summary>
      <div class="minibars">${dims.map(([k,label])=>{ const d=an.dims[k]; return `<div class="mb ${k===low?"low":""}"><span class="ml">${esc(k==="goal"?"Your goal":short(label))}</span><span class="mbar"><i style="width:${d.score*10}%"></i></span><span class="mv">${Number(d.score).toFixed(1)}</span></div>`; }).join("")}</div>
      <div class="mfoot"><span class="small muted">${low?`Room to grow: <b>${esc(name(low))}</b>`:best?`Strongest: <b>${esc(name(best))}</b>`:""}</span><span class="link small showwhen-closed">See notes</span><span class="link small showwhen-open">Hide notes</span></div></summary>
      <div class="mnotes">${dims.map(([k,label,w])=>{ const d=an.dims[k]; return `<div><b>${esc(k==="goal"?"Your goal: "+an.goal:label)}</b> <span class="muted small">${Math.round(w*100)}% of score</span>${d.note?`<p class="small muted">${esc(d.note)}</p>`:""}</div>`; }).join("")}</div></details>
    <div class="stack" style="gap:12px"><h3>Level it up</h3>
      ${an.tweak?recCard("tweak","Tweak",an.tweak.title,an.tweak.detail,fb.tweak,recAct):""}
      ${an.buy?recCard("buy","Buy",an.buy.item,an.buy.why,fb.buy,recAct):an.buyOff?"":`<div class="rec"><span class="kind">Buy</span><b>No need to buy anything for this look!</b></div>`}
    </div>`;
}
function bgTile(key,label){
  const f=S.flow, c=f.comps[key], st=f.compState[key];
  const inner = c ? `<img src="${c.url}" alt="${label} option">` :
    st==="failed" ? `<div class="ph">Couldn't make this one</div>` : `<div class="ph loading" aria-label="${label} backdrop loading"></div>`;
  return `<button class="bgopt ${f.bg===key?"on":""}" data-act="pickBg" data-bg="${key}" ${c?"":"disabled"} aria-pressed="${f.bg===key}">${inner}<span>${label}</span></button>`;
}
async function startFlow(file){
  if(!file) return;
  let img; try { img=await blobImage(file); } catch { toast("That file isn't a photo WearAbout can read."); return; }
  const origBlob=await toBlob(scaled(img,1600),"image/jpeg",.88), origUrl=URL.createObjectURL(origBlob), b64=await base64(origBlob);
  // Claude shrinks anything bigger than about 1.2 megapixels anyway, so send it a lighter copy.
  const aiB64=await base64(await toBlob(scaled(img,1280),"image/jpeg",.85));
  if(S.flow && S.flow.origUrl) URL.revokeObjectURL(S.flow.origUrl);
  const f={step:"occasion", origBlob, origUrl, b64, aiB64, guess:null, guessConf:null, guessing:true, guessErr:null, cat:null, detail:"",
    analysis:null, analysisErr:"", comps:{}, compState:{}, bg:null, bgErr:"", saving:false};
  S.flow=f; S.view="flow"; render(); scrollTo(0,0);
  try {
    const r=await callFn("wear-about",{action:"guess", image:await base64(await toBlob(scaled(img,800),"image/jpeg",.8))});
    if(r.category){ f.guess=r.category; f.guessConf=r.confidence; if(!f.cat) f.cat=r.category; } else f.guessErr="Couldn't tell the occasion.";
  } catch(e){ f.guessErr=e.message; }
  f.guessing=false; if(S.flow===f && f.step==="occasion") render();
}
function runStyle(){
  const f=S.flow; f.step=f.keepBg?"result":"style";
  f.comps.original={blob:f.origBlob,url:f.origUrl}; f.compState.original="ok";
  if(f.keepBg) f.bg="original";
  render(); scrollTo(0,0);
  if(!f.keepBg) for(const mode of ["studio","themed"]){
    // Studio doesn't depend on the occasion; themed does. Only rebuild what actually changed (each one costs a Photoroom credit).
    const key=mode==="studio"?"studio":`${f.cat}|${f.detail}`;
    if((f.compKey||{})[mode]===key && f.compState[mode]!=="failed") continue;
    (f.compKey||(f.compKey={}))[mode]=key;
    if(f.comps[mode]){ URL.revokeObjectURL(f.comps[mode].url); delete f.comps[mode]; if(f.bg===mode) f.bg="original"; }
    f.compState[mode]="loading"; if(f.errs) delete f.errs[mode];
    callFn("wear-about",{action:"backdrop", mode, image:f.b64, category:f.cat, detail:f.detail},true)
      .then(blob=>jpeg(blob,1440,.9))
      .then(blob=>{ if(f.compKey[mode]!==key) return; f.comps[mode]={blob,url:URL.createObjectURL(blob)}; f.compState[mode]="ok"; if(!f.bg||(f.bg==="original"&&!f.pickedBg)) f.bg=mode; })
      .catch(e=>{ if(f.compKey[mode]!==key) return; f.compState[mode]="failed"; f.bgErr=e.message; (f.errs||(f.errs={}))[mode]=e.message; console.error("backdrop",mode,e.message); if(!f.bg && f.compState.studio==="failed" && f.compState.themed==="failed") f.bg="original"; })
      .finally(()=>{ if(S.flow===f && S.view==="flow") render(); });
  }
  // Same occasion, details, goal and buy setting as last time: keep the score instead of paying for a new one.
  const key=[f.cat,f.detail,S.goal||"",S.buyRecs].join("|");
  if(f.analysisKey===key && f.analysis && (f.analysis==="loading" || f.analysis.score!=null)) return;
  runAnalysis(f);
}
async function runAnalysis(f){
  const key=[f.cat,f.detail,S.goal||"",S.buyRecs].join("|"); f.analysisKey=key;
  f.analysis="loading"; f.recFb={}; if(S.flow===f) render();
  let out, err="";
  try { out=await callFn("wear-about",{action:"analyze", image:f.aiB64||f.b64, category:f.cat, detail:f.detail, goal:S.goal||"", closet:closetForAI(), buy:S.buyRecs}); }
  catch(e){ out={score:null}; err=e.message; }
  if(f.analysisKey!==key) return;   // a newer request replaced this one
  f.analysis=out; f.analysisErr=err;
  if(S.flow===f && S.view==="flow") render();
}
async function saveFit(share=false){
  const f=S.flow; f.saving=true; f.shareAfter=share; render();
  try {
    const id=crypto.randomUUID(), base=`${S.uid}/${id}`, a=f.analysis&&f.analysis.score!=null?f.analysis:null;
    const main=f.comps[f.bg].blob, thumb=await jpeg(main,420,.8);
    const up=(path,blob)=>sb.storage.from("fits").upload(path,blob,{contentType:"image/jpeg",upsert:false}).then(r=>{ if(r.error) throw r.error; });
    const sameAsOrig = f.bg==="original";
    await Promise.all([up(base+".jpg",main), up(base+"-thumb.jpg",thumb), sameAsOrig?null:up(base+"-orig.jpg",f.origBlob)]);
    const row={id, local_date:localDate(), category:f.cat, detail:f.detail||"", bg_choice:f.bg,
      image_path:base+".jpg", thumb_path:base+"-thumb.jpg", orig_path:sameAsOrig?base+".jpg":base+"-orig.jpg",
      score:a?a.score:null, analysis:a?{dims:a.dims,low:a.low,review:a.review,tweak:a.tweak,buy:a.buy,buyOff:!!a.buyOff,badges:a.badges||[],goal:a.goal||""}:null, items:a?a.items:[],
      rec_fb:a?(f.recFb||{}):{}};
    row.items = await linkItems(row.items);
    const { data, error } = await sb.from("fits").insert(row).select().single();
    if(error) throw error;
    makeCrops(data, f.origBlob).catch(e=>console.error("crops",e));
    S.urls["fits:"+row.image_path]=f.comps[f.bg].url; S.urls["fits:"+row.thumb_path]=URL.createObjectURL(thumb);
    Promise.all(["tweak","buy"].filter(kind=>a && (f.recFb||{})[kind]==="up").map(kind=>saveIdea(data, kind).catch(console.error)))
      .then(()=>softRender(["saved"]));
    S.fits=[data,...S.fits]; S.flow=null; S.fitId=id; S.fitBack="home"; S.view="fit"; S.confirmDel=false; render(); scrollTo(0,0);
    const n=streakInfo().n; toast(n>1?`Saved to your Fits · ${n}-day streak`:"Saved to your Fits · streak started");
    if(share) await openShare();
  } catch(e){ console.error(e); f.saving=false; render(); toast("Couldn't save. Check your connection and try again."); }
}

/* --- fit detail --- */
const curFit=()=>S.fits.find(x=>x.id===S.fitId);
function viewFit(){
  const backTo=S.fitBack==="item"&&S.itemId?"item":"home", backLbl=backTo==="item"?"Closet item":"Fits";
  const x=curFit(); if(!x) return `<button class="back" data-act="nav" data-view="${backTo}">${ICON.back} ${backLbl}</button><p class="muted">This fit isn't available.</p>`;
  const an=x.analysis, fb=x.rec_fb||{};
  let out=`<button class="back" data-act="nav" data-view="${backTo}">${ICON.back} ${backLbl}</button><div class="stack" style="gap:20px">
    <img class="fitimg" src="${esc(url("fits",x.image_path)||url("fits",x.thumb_path))}" alt="${esc(x.category)} fit">
    <div class="row"><span class="cpill">${CAT_EMOJI[x.category]||""} ${esc(x.category)}${x.detail?" · "+esc(x.detail):""}</span><span class="spacer"></span><span class="small muted">${new Date(x.created_at).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</span></div>`;
  if(x.score!=null && an){
    out+=scoreBlock(an, x.score, x.category, fb, "recFb");
  } else out+=`<div class="note plain">This fit was saved without a score.</div>`;
  out+=`<div class="stack" style="gap:10px"><div class="row"><h3>In this outfit</h3><span class="spacer"></span><span class="small muted">Jewelry not listed</span></div>
    <div class="items">${(x.items||[]).map((it,i)=>`<div class="item">
      <input class="input" data-item-i="${i}" aria-label="Item ${i+1} label" value="${esc(it.label)}">
      <select data-item-type="${i}" aria-label="Item ${i+1} type">${ITEM_TYPES.map(t=>`<option ${t===it.type?"selected":""}>${t}</option>`).join("")}</select>
      <button class="iconbtn" data-act="removeItem" data-i="${i}" aria-label="Remove item">${ICON.x}</button>
      ${S.closetReady&&it.item_id===null&&it.label?`<span class="notcloset small muted">Not in closet${it.clear===false?" (not fully visible)":""} · <button class="link small" data-act="addToCloset" data-i="${i}">Add to closet</button></span>`:""}</div>`).join("")||`<p class="small muted">No items listed.</p>`}</div>
    <div class="row"><button class="btn sm" data-act="addItem">Add item</button><button class="btn sm primary" data-act="saveItems" id="saveItemsBtn" hidden>Save changes</button></div></div>
    <div class="row" style="gap:10px"><button class="btn" data-act="share">Share with friends</button><span class="spacer"></span><button class="btn ghost sm" data-act="deleteFit">Delete fit</button></div>
    ${S.confirmDel?`<div class="confirm"><span class="small" style="flex:1;min-width:160px">Delete this fit for good? It also leaves your streak history.</span><button class="btn sm" data-act="cancelDelete">Keep</button><button class="btn sm primary" data-act="confirmDelete">Delete</button></div>`:""}
  </div>`;
  return out;
}
function recCard(kind,label,title,detail,state,act="recFb"){
  return `<div class="rec"><span class="kind">${label}</span><b>${esc(title)}</b>${detail?`<p class="small muted">${esc(detail)}</p>`:""}
    <div class="acts"><button class="iconbtn ${state==="up"?"on":""}" data-act="${act}" data-kind="${kind}" data-val="up" aria-label="Save this rec" aria-pressed="${state==="up"}">${state==="up"?ICON.heartFill:ICON.heart}</button>
    <button class="iconbtn ${state==="down"?"off":""}" data-act="${act}" data-kind="${kind}" data-val="down" aria-label="Not for me" aria-pressed="${state==="down"}">${ICON.x}</button>
    ${state==="up"?`<span class="small muted" style="align-self:center">${act==="flowRecFb"?"Goes to Ideas when you save":"Added to Ideas"}</span>`:""}</div></div>`;
}
async function openFit(id, from="home"){
  S.fitBack=from; S.fitId=id; S.view="fit"; S.confirmDel=false; render(); scrollTo(0,0);
  const x=curFit(); if(x && !url("fits",x.image_path)){ await signUrls("fits",[x.image_path]); if(S.fitId===id && S.view==="fit") render(); }
}
function ideaFor(x,kind){
  const an=x.analysis;
  return kind==="buy" ? {title:an.buy.item, detail:an.buy.why, query:an.buy.search} : {title:an.tweak.title, detail:an.tweak.detail, query:an.tweak.title+" outfit styling"};
}
async function saveIdea(x,kind){
  const { data, error } = await sb.from("saved_recs").upsert({fit_id:x.id, kind, category:x.category, ...ideaFor(x,kind)},{onConflict:"fit_id,kind"}).select().single();
  if(error) throw error; S.recs=[data,...S.recs.filter(z=>z.id!==data.id)];
}
async function recFeedback(kind,val){
  const x=curFit(); if(!x||!x.analysis) return;
  const next=(x.rec_fb||{})[kind]===val?null:val; x.rec_fb={...(x.rec_fb||{}),[kind]:next}; render();
  try {
    const r1=await sb.from("fits").update({rec_fb:x.rec_fb}).eq("id",x.id); if(r1.error) throw r1.error;
    if(next==="up"){
      await saveIdea(x,kind); toast("Added to Ideas");
    } else {
      await sb.from("saved_recs").delete().eq("fit_id",x.id).eq("kind",kind);
      S.recs=S.recs.filter(z=>!(z.fit_id===x.id&&z.kind===kind));
    }
  } catch { toast("Couldn't update that rec."); }
}

/* --- share --- */
function viewShare(){
  const sh=S.share, x=curFit(); if(!sh||!x) return "";
  return `<button class="back" data-act="cancelShare">${ICON.back} Back</button><div class="stack">
    <h2>Share your fit</h2>
    <canvas class="shareCanvas" id="shareCanvas" width="720" height="960" aria-label="Post preview"></canvas>
    <div class="panel">
      <label class="row" style="font-weight:600"><input type="checkbox" id="blurOn" ${sh.blur.on?"checked":""} style="width:18px;height:18px;accent-color:var(--accent)"> Blur my face</label>
      ${sh.blur.on?`<p class="small muted">Tap the photo where your face is.</p><label class="small" for="blurSize">Blur size</label><input type="range" id="blurSize" min="4" max="30" value="${Math.round(sh.blur.r*100)}">`:""}
    </div>
    <div class="field"><label for="caption">Caption (optional)</label><input class="input" id="caption" maxlength="140" value="${esc(sh.caption)}" placeholder="Where you're headed, how you feel"></div>
    <div class="stack" style="gap:8px"><h3>Plug something you love</h3>
      ${(x.items||[]).length?x.items.map((it,i)=>{ const p=sh.plugs[i]; return `<div class="plug">
        <label class="ck"><input type="checkbox" data-plug-on="${i}" ${p?"checked":""}> ${esc(it.label)}</label>
        ${p?`<input class="input" data-plug-i="${i}" data-field="brand" maxlength="40" placeholder="Brand (optional)" value="${esc(p.brand)}" autocapitalize="words">
        <textarea class="input" data-plug-i="${i}" data-field="review" maxlength="160" placeholder="Why you love it (optional)">${esc(p.review)}</textarea>
        <p class="small muted">Friends get a Shop it button that searches for ${esc([p.brand, it.label].filter(Boolean).join(" "))}.</p>`:""}</div>`; }).join(""):`<p class="small muted">No items were listed for this fit.</p>`}
    </div>
    <p class="small muted">Friends see the photo, occasion and caption. Your score stays private. Friends can only react with hearts.</p>
    <button class="btn primary block" data-act="postShare" ${sh.posting?"disabled":""}>${sh.posting?"Posting…":"Post to friends"}</button>
  </div>`;
}
async function openShare(){
  const x=curFit(); if(!x) return;
  const { data, error } = await sb.storage.from("fits").download(x.image_path);
  if(error){ toast("Couldn't load this photo."); return; }
  const img=await loadImage(URL.createObjectURL(data));
  S.share={img, blur:{on:false,x:.5,y:.2,r:.1}, caption:"", plugs:{}, posting:false};
  S.view="share"; render(); scrollTo(0,0);
}
function drawShare(){
  const c=$("#shareCanvas"); if(!c||!S.share) return; const ctx=c.getContext("2d"), {img,blur}=S.share, W=c.width, H=c.height;
  const s=Math.max(W/img.width,H/img.height), w=img.width*s, h=img.height*s; ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);
  if(blur.on){
    const cx=blur.x*W, cy=blur.y*H, r=blur.r*W, px=Math.max(6,r/5);
    const t=document.createElement("canvas"); t.width=t.height=Math.max(1,Math.round(2*r/px));
    t.getContext("2d").drawImage(c,cx-r,cy-r,2*r,2*r,0,0,t.width,t.height);
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip(); ctx.imageSmoothingEnabled=false; ctx.drawImage(t,0,0,t.width,t.height,cx-r,cy-r,2*r,2*r); ctx.restore();
  }
}
async function postShare(){
  const sh=S.share, x=curFit(); if(!sh||!x) return;
  const plugs=[];
  for(const [i,p] of Object.entries(sh.plugs)){ const it=x.items[i]; if(!it) continue;
    plugs.push({label:it.label, brand:String(p.brand||"").trim().slice(0,40), review:String(p.review||"").trim().slice(0,160)}); }
  sh.posting=true; render();
  try {
    drawShare(); const blob=await toBlob($("#shareCanvas"),"image/jpeg",.85);
    const id=crypto.randomUUID(), path=`${S.uid}/${id}.jpg`;
    const u=await sb.storage.from("posts").upload(path,blob,{contentType:"image/jpeg"}); if(u.error) throw u.error;
    const { error } = await sb.from("posts").insert({id, fit_id:x.id, category:x.category, detail:x.detail||"", caption:sh.caption.slice(0,140), plugs, badges:(x.analysis&&x.analysis.badges)||[], image_path:path});
    if(error) throw error;
    S.urls["posts:"+path]=URL.createObjectURL(blob);
    S.share=null; S.view="feed"; await loadSocial(); render(); scrollTo(0,0); toast("Posted to friends");
  } catch(e){ console.error(e); sh.posting=false; render(); toast("Couldn't post. Try again."); }
}

/* --- feed --- */
function viewFeed(){
  const n=mutual().length;
  let out=`<div class="stack"><div class="row"><h2>Feed</h2><span class="spacer"></span><span class="small muted">${n} friend${n===1?"":"s"}</span></div>`;
  if(!S.posts.length) out+=`<div class="empty"><b>Nothing here yet</b><p class="small muted">Share a fit from its page, or add friends with your friend code. Mutual friends' posts show up here.</p><button class="btn sm" data-act="nav" data-view="friends">Add friends</button></div>`;
  for(const p of S.posts){
    const h=S.hearts[p.id]||{count:0,mine:false}, name=displayName(p.user_id);
    out+=`<article class="post"><div class="head"><span class="avatar" style="background:${avatarColor(p.user_id)}">${esc(name.slice(0,1).toUpperCase())}</span>
      <div style="min-width:0"><b>${esc(name)}</b><div class="small muted">${CAT_EMOJI[p.category]||""} ${esc(p.category)}${p.detail?" · "+esc(p.detail):""} · ${esc(ago(p.created_at))}</div></div></div>
      <img class="main" src="${esc(url("posts",p.image_path))}" alt="${esc(name)}'s ${esc(p.category)} fit" loading="lazy">
      <div class="body">${p.caption?`<p>${esc(p.caption)}</p>`:""}
      ${badgeChips(p.badges)}
      ${(p.plugs||[]).map(g=>{ const shop=safeUrl(g.link)||google([g.brand,g.label].filter(Boolean).join(" ")); return `<div class="plugcard"><b class="small">${esc(g.label)}${g.brand?` <span class="muted">· ${esc(g.brand)}</span>`:""}</b>${g.review?`<span class="small">${esc(g.review)}</span>`:""}<a href="${esc(shop)}" target="_blank" rel="noopener noreferrer">Shop it</a></div>`; }).join("")}
      <div class="row"><button class="heart ${h.mine?"on":""}" data-act="heart" data-id="${esc(p.id)}" aria-pressed="${h.mine}">${h.mine?ICON.heartFill:ICON.heart}${h.count||""}</button><span class="spacer"></span>
      ${p.user_id===S.uid?`<button class="link small" data-act="removePost" data-id="${esc(p.id)}">Remove post</button>`:""}</div></div></article>`;
  }
  return out+"</div>";
}
async function toggleHeart(id){
  const h=S.hearts[id]||(S.hearts[id]={count:0,mine:false}); const was=h.mine;
  h.mine=!was; h.count+=was?-1:1; render();
  const r = was ? await sb.from("hearts").delete().eq("post_id",id).eq("user_id",S.uid) : await sb.from("hearts").insert({post_id:id});
  if(r.error){ h.mine=was; h.count+=was?1:-1; render(); toast("Couldn't save that heart."); }
}

/* --- ideas (hearted recs) --- */
function viewSaved(){
  const list=S.recs.filter(r=>S.ideasFilter==="all"||r.kind===S.ideasFilter);
  let out=`<div class="stack"><h2>Ideas</h2>
    <label class="switchrow" for="buyRecs"><span><b>Buy recommendations</b><span class="small muted">${S.buyRecs?"Each new fit gets one thing to buy, plus a tweak.":"Off. New fits only get a styling tweak."}</span></span>
      <input type="checkbox" id="buyRecs" class="switch" role="switch" ${S.buyRecs?"checked":""}></label>
    <div class="chips" role="toolbar" aria-label="Filter ideas">${[["all","All"],["tweak","Tweaks"],["buy","Buys"]].map(([k,l])=>`<button class="chip ${S.ideasFilter===k?"on":""}" data-act="ideasFilter" data-f="${k}" aria-pressed="${S.ideasFilter===k}">${l} · ${k==="all"?S.recs.length:S.recs.filter(r=>r.kind===k).length}</button>`).join("")}</div>`;
  if(!S.recs.length) out+=`<div class="empty"><b>No ideas yet</b><p class="small muted">Heart a tweak or buy rec on any fit and it lands here, ready to look up.</p></div>`;
  else if(!list.length) out+=`<div class="empty"><p class="small muted">No ${S.ideasFilter==="buy"?"buy":"tweak"} ideas saved yet.</p></div>`;
  for(const r of list){ const f=S.fits.find(x=>x.id===r.fit_id);
    out+=`<div class="saved">${f?`<img src="${esc(url("fits",f.thumb_path))}" alt="">`:`<span></span>`}<div class="stack" style="gap:6px;min-width:0">
      <span class="tag" style="color:var(--accent)">${r.kind==="buy"?"Buy":"Tweak"} · ${esc(r.category||"")}</span><b>${esc(r.title)}</b>
      ${r.detail?`<p class="small muted">${esc(r.detail)}</p>`:""}
      <div class="row"><a class="btn sm" href="${esc(google(r.query||r.title))}" target="_blank" rel="noopener noreferrer">${r.kind==="buy"?"Find it on Google":"See it on Google"}</a>
      <button class="link small" data-act="removeRec" data-id="${esc(r.id)}">Remove</button></div></div></div>`; }
  return out+"</div>";
}

async function setBuyRecs(on){
  const prev=S.buyRecs; S.buyRecs=on; render();
  const { error } = await sb.from("user_settings").upsert({user_id:S.uid, buy_recs:on, updated_at:new Date().toISOString()});
  if(error){ S.buyRecs=prev; render(); toast(/buy_recs/.test(error.message||"")?"This needs a quick database update (003_buy_recs.sql).":"Couldn't save that. Try again."); return; }
  toast(on?"Buy recommendations on":"Buy recommendations off");
}

/* --- friends --- */
function viewFriends(){
  const m=mutual(), pending=[...S.out].filter(id=>!S.inc.has(id)), incoming=[...S.inc].filter(id=>!S.out.has(id)), p=S.profile;
  const person=(id,extra,action="")=>`<div class="person"><span class="avatar" style="background:${avatarColor(id)}">${esc(displayName(id).slice(0,1).toUpperCase())}</span><div style="flex:1;min-width:0"><b>${esc(displayName(id))}</b>${extra}</div>${action}</div>`;
  return `<div class="stack"><h2>Friends</h2>
    <div class="panel"><h3>Invite friends</h3>
      <p class="small muted">Send the app link with your code built in. When they sign up, you'll see them under "Added you" — one tap to add back.</p>
      <button class="btn primary" data-act="invite" ${p?"":"disabled"}>Invite friends</button></div>
    <div class="panel"><h3>Your friend code</h3>
      ${p?`<div class="row"><span class="code">${esc(p.friend_code)}</span><span class="spacer"></span><button class="btn sm" data-act="copyCode">Copy</button></div>`:`<p class="small muted">Loading…</p>`}
      <div class="field"><label for="handleIn">Name friends see</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="handleIn" maxlength="30" value="${esc(S.handleIn ?? (p&&p.handle) ?? "")}" placeholder="e.g. Dana"><button class="btn sm" data-act="saveHandle">Save</button></div></div>
    </div>
    <div class="panel"><h3>Add a friend</h3>
      <div class="row" style="flex-wrap:nowrap"><input class="input" id="codeIn" maxlength="8" value="${esc(S.codeIn)}" placeholder="Their code" autocapitalize="characters" style="text-transform:uppercase"><button class="btn sm primary" data-act="addFriend">Add</button></div>
      ${S.friendMsg?`<p class="small">${esc(S.friendMsg)}</p>`:""}
      <p class="small muted">Friendship is mutual: you each add the other's code. Send friends this app's link so they can sign up first.</p>
    </div>
    ${incoming.length?`<div class="panel"><h3>Added you</h3>${incoming.map(id=>person(id,`<div class="small muted">Add them back to see each other's fits</div>`,`<button class="btn sm primary" data-act="addBack" data-uid="${esc(id)}">Add back</button>`)).join("")}</div>`:""}
    <div class="panel"><h3>Friends · ${m.length}</h3>${m.length?m.map(id=>person(id,"")).join(""):`<p class="small muted">No mutual friends yet.</p>`}</div>
    ${pending.length?`<div class="panel"><h3>Waiting on them</h3>${pending.map(id=>person(id,`<div class="small muted">They haven't added you back yet</div>`)).join("")}</div>`:""}
    <p class="small muted" style="text-align:center">Signed in as ${esc(S.email)}</p>
    <button class="btn ghost sm signout" data-act="signOut">Sign out</button>
  </div>`;
}
async function addFriend(id){
  const { error } = await sb.from("friendships").insert({friend_id:id});
  if(error && error.code!=="23505") throw error;
  S.out.add(id); await loadSocial();
}

/* --- closet (built from logged fits) --- */
const normLabel = s => String(s||"").toLowerCase().replace(/\s+/g," ").trim();
function closetStats(){
  // For each closet piece: how many fits it appears in, the latest date, and that fit's photo.
  const st={};
  for(const f of S.fits){ // newest first
    const seen=new Set();
    for(const it of (f.items||[])){
      if(!it.item_id || seen.has(it.item_id)) continue; seen.add(it.item_id);
      const e=st[it.item_id]||(st[it.item_id]={count:0,last:null,thumb:null,fits:[]});
      e.count++; e.fits.push(f.id); if(!e.last){ e.last=f.local_date; e.thumb=f.thumb_path; }
    }
  }
  return st;
}
function closetForAI(){
  if(!S.closetReady) return [];
  const st=closetStats();
  return [...S.closet].sort((a,b)=>String((st[b.id]||{}).last||"").localeCompare(String((st[a.id]||{}).last||"")))
    .slice(0,250).map(c=>({id:c.id,label:c.label,type:c.type}));
}
// Give every item in a fit a closet piece: the one Claude matched, or a new one.
async function linkItems(items){
  if(!S.closetReady || !items || !items.length) return items||[];
  const ids=new Set(S.closet.map(c=>c.id)), fresh=[];
  const out=items.map(it=>{
    if(it.item_id===null) return it;                       // user removed it from the closet on purpose
    if(it.item_id && ids.has(it.item_id)) return it;
    const match = it.match && ids.has(it.match) ? it.match : null;
    if(match){ const {match:_, ...rest}=it; return {...rest, item_id:match}; }
    // Only clearly visible pieces become new closet entries; the rest stay on the fit only.
    if(it.clear!==true){ const {match:_, ...rest}=it; return {...rest, item_id:null}; }
    const id=crypto.randomUUID(); fresh.push({id, label:String(it.label).slice(0,80)||"Item", type:ITEM_TYPES.includes(it.type)?it.type:"other", brand:it.brand||null});
    const {match:_, ...rest}=it; return {...rest, item_id:id};
  });
  if(fresh.length){
    const { error } = await sb.from("closet_items").insert(fresh);
    if(error){ console.error(error); return items.map(({match, ...rest})=>rest); }
    S.closet=[...S.closet, ...fresh];
  }
  return out;
}
// Fits logged before the Closet existed: group their items by name and type, once.
async function backfillCloset(){
  if(!S.closetReady) return;
  const byKey=new Map(S.closet.map(c=>[normLabel(c.label)+"|"+c.type, c.id])), fresh=[], changed=[];
  for(const f of S.fits){
    let dirty=false;
    const items=(f.items||[]).map(it=>{
      if(it.item_id!==undefined || !it.label) return it;
      const key=normLabel(it.label)+"|"+(it.type||"other");
      let id=byKey.get(key);
      if(!id){ id=crypto.randomUUID(); byKey.set(key,id); fresh.push({id, label:String(it.label).slice(0,80), type:ITEM_TYPES.includes(it.type)?it.type:"other", brand:it.brand||null}); }
      dirty=true; return {...it, item_id:id};
    });
    if(dirty){ f.items=items; changed.push(f); }
  }
  if(!changed.length) return;
  for(let i=0;i<fresh.length;i+=200){ const { error } = await sb.from("closet_items").insert(fresh.slice(i,i+200)); if(error) throw error; }
  S.closet=[...S.closet, ...fresh];
  for(let i=0;i<changed.length;i+=8) await Promise.all(changed.slice(i,i+8).map(f=>sb.from("fits").update({items:f.items}).eq("id",f.id)));
}
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v||""));
function pieceThumb(c,e){
  const crop=c.crop_path&&url("fits",c.crop_path);
  return `<span class="pthumb ${crop?"crop":""}"><img src="${esc(crop||url("fits",e.thumb))}" alt="" loading="lazy">${isHex(c.swatch)?`<span class="swatch" style="background:${c.swatch}"></span>`:""}</span>`;
}
// Cut a close-up of each clearly visible piece from the real photo, and measure its main color from the pixels.
async function makeCrops(fit, photoBlob){
  if(!S.closetReady || !photoBlob) return;
  const todo=(fit.items||[]).filter(it=>it.item_id && Array.isArray(it.box) && it.clear===true)
    .map(it=>({it, piece:S.closet.find(c=>c.id===it.item_id)})).filter(x=>x.piece && !x.piece.crop_path);
  if(!todo.length) return;
  const img=await blobImage(photoBlob), W=img.naturalWidth, H=img.naturalHeight;
  for(const {it,piece} of todo){
    const [l,t,r,b]=it.box, pad=.06;
    const x0=Math.max(0,(l-pad*(r-l))*W), y0=Math.max(0,(t-pad*(b-t))*H), x1=Math.min(W,(r+pad*(r-l))*W), y1=Math.min(H,(b+pad*(b-t))*H);
    const cw=x1-x0, ch=y1-y0; if(cw<24||ch<24) continue;
    // square-ish thumbnail, piece centered
    const side=Math.max(cw,ch), sx=Math.max(0,Math.min(W-side,x0+cw/2-side/2)), sy=Math.max(0,Math.min(H-side,y0+ch/2-side/2)), s2=Math.min(side,W,H);
    const c=document.createElement("canvas"); c.width=c.height=320;
    const ctx=c.getContext("2d"); ctx.fillStyle="#F2F1EE"; ctx.fillRect(0,0,320,320); ctx.drawImage(img,sx,sy,s2,s2,0,0,320,320);
    const swatch=dominantColor(img,x0,y0,cw,ch);
    const blob=await toBlob(c,"image/jpeg",.85), path=`${S.uid}/items/${piece.id}.jpg`;
    const up=await sb.storage.from("fits").upload(path,blob,{contentType:"image/jpeg",upsert:true}); if(up.error){ console.error(up.error); continue; }
    const { error } = await sb.from("closet_items").update({crop_path:path, swatch}).eq("id",piece.id);
    if(error){ console.error(error); if(/crop_path|swatch/.test(error.message||"")) return; continue; }
    piece.crop_path=path; piece.swatch=swatch; S.urls["fits:"+path]=URL.createObjectURL(blob);
  }
  softRender(["closet","item"]);
}
// Most common color in the middle of the piece, ignoring the edges where background creeps in.
function dominantColor(img,x,y,w,h){
  const c=document.createElement("canvas"); c.width=c.height=32; const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,x+w*.25,y+h*.25,w*.5,h*.5,0,0,32,32);
  const d=ctx.getImageData(0,0,32,32).data, bins=new Map();
  for(let i=0;i<d.length;i+=4){ const k=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4); const e=bins.get(k)||{n:0,r:0,g:0,b:0}; e.n++; e.r+=d[i]; e.g+=d[i+1]; e.b+=d[i+2]; bins.set(k,e); }
  let top=null; for(const e of bins.values()) if(!top||e.n>top.n) top=e;
  const hx=v=>Math.round(v/top.n).toString(16).padStart(2,"0");
  return "#"+hx(top.r)+hx(top.g)+hx(top.b);
}
function shortDay(ds){ if(!ds) return ""; const [y,m,d]=ds.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }
function viewCloset(){
  if(!S.closetReady) return `<div class="stack"><h2>Closet</h2><div class="note">The Closet needs one quick database update. Run <b>002_closet.sql</b> in Supabase's SQL Editor, then reopen the app.</div></div>`;
  const st=closetStats(), live=S.closet.filter(c=>st[c.id]);
  const sorters={
    most:(a,b)=>(st[b.id].count-st[a.id].count)||String(st[b.id].last).localeCompare(String(st[a.id].last)),
    recent:(a,b)=>String(st[b.id].last).localeCompare(String(st[a.id].last)),
    least:(a,b)=>(st[a.id].count-st[b.id].count)||String(st[a.id].last).localeCompare(String(st[b.id].last)),
  };
  const sorted=[...live].sort(sorters[S.closetSort]||sorters.most);
  let out=`<div class="stack"><div class="countrow" style="margin-top:0"><span class="count">${live.length}</span><span class="countlbl">Piece${live.length===1?"":"s"} in your closet</span></div>
    <p class="small muted" style="margin-top:-6px">Built from your logged fits. Each new fit adds or matches pieces automatically.</p>
    <div class="chips" role="toolbar" aria-label="Sort">${[["most","Most worn"],["recent","Recently worn"],["least","Least worn"]].map(([k,l])=>`<button class="chip ${S.closetSort===k?"on":""}" data-act="closetSort" data-sort="${k}" aria-pressed="${S.closetSort===k}">${l}</button>`).join("")}</div>`;
  if(!S.loaded) out+=`<div class="note plain">Loading your closet…</div>`;
  else if(live.length) out+=`<p class="small muted">Swipe a piece left to remove it.</p>`;
  if(S.loaded && !live.length) out+=`<div class="empty"><b>Your closet fills itself</b><p class="small muted">Log a fit and every piece WearAbout spots (except jewelry) shows up here, with how often you wear it.</p></div>`;
  else for(const type of ITEM_TYPES){
    const group=sorted.filter(c=>(c.type||"other")===type); if(!group.length) continue;
    out+=`<section class="cgroup"><h3>${TYPE_LABEL[type]} · ${group.length}</h3>${group.map(c=>{ const e=st[c.id]; return `<div class="swipe"><button class="swipe-del" data-act="swipeRemove" data-id="${esc(c.id)}" tabindex="-1">Remove</button><button class="citem" data-act="openItem" data-id="${esc(c.id)}">
      ${pieceThumb(c,e)}<span class="ctext"><b>${esc(c.label)}</b><span class="small muted">Worn ${e.count}× · last ${esc(shortDay(e.last))}</span></span>${ICON.chev}</button></div>`; }).join("")}</section>`;
  }
  return out+"</div>";
}
const curItem=()=>S.closet.find(c=>c.id===S.itemId);
function viewItem(){
  const c=curItem(); if(!c) return `<button class="back" data-act="nav" data-view="closet">${ICON.back} Closet</button><p class="muted">This piece isn't in your closet anymore.</p>`;
  const stAll=closetStats(), e=stAll[c.id]||{count:0,fits:[]}, ed=S.itemEdit||{};
  const fits=e.fits.map(id=>S.fits.find(f=>f.id===id)).filter(Boolean);
  const others=S.closet.filter(o=>o.id!==c.id && stAll[o.id]).sort((a,b)=>((a.type===c.type)?0:1)-((b.type===c.type)?0:1)||a.label.localeCompare(b.label));
  return `<button class="back" data-act="nav" data-view="closet">${ICON.back} Closet</button><div class="stack" style="gap:18px">
    ${c.crop_path&&url("fits",c.crop_path)?`<div class="crophero"><img src="${esc(url("fits",c.crop_path))}" alt="${esc(c.label)}">${c.swatch?`<span class="swatch lg" style="background:${esc(c.swatch)}" title="Main color"></span>`:""}</div>`:""}
    <div><span class="tag">${esc(TYPE_LABEL[c.type]||"Other")}</span><h2 style="margin-top:4px">${esc(c.label)}</h2>
      <p class="small muted">Worn ${e.count}× · last ${esc(shortDay(e.last))}</p></div>
    <div class="grid g3">${fits.map(x=>`<button class="card" data-act="openFit" data-id="${esc(x.id)}" data-from="item"><img src="${esc(url("fits",x.thumb_path))}" alt="${esc(x.category)} fit" loading="lazy"><span class="cbody"><span class="cdate">${esc(longDate(x.created_at))}</span><span class="pills"><span class="cpill">${CAT_EMOJI[x.category]||""} ${esc(x.category)}</span></span></span></button>`).join("")}</div>
    <div class="panel"><h3>Edit</h3>
      <div class="field"><label for="itemLabel">Name</label><input class="input" id="itemLabel" maxlength="80" value="${esc(ed.label ?? c.label)}"></div>
      <div class="field"><label for="itemType">Type</label><select class="input" id="itemType">${ITEM_TYPES.map(t=>`<option value="${t}" ${t===(ed.type??c.type)?"selected":""}>${TYPE_LABEL[t]}</option>`).join("")}</select></div>
      <button class="btn sm primary" data-act="saveItem">Save</button></div>
    ${others.length?`<div class="panel"><h3>Duplicate?</h3><p class="small muted">If this is the same piece as another one, merge them. Its fits move over and this entry goes away.</p>
      <select class="input" id="mergeTo" aria-label="Merge into"><option value="">Same piece as…</option>${others.map(o=>`<option value="${esc(o.id)}" ${S.mergeTo===o.id?"selected":""}>${esc(o.label)}${o.type!==c.type?` (${esc(TYPE_LABEL[o.type]||o.type)})`:""}</option>`).join("")}</select>
      <button class="btn sm" data-act="mergeItem" ${S.mergeTo?"":"disabled"}>Merge</button></div>`:""}
    <div class="row"><span class="spacer"></span><button class="btn ghost sm" data-act="removeItemAsk">Remove from closet</button></div>
    ${S.confirmRemove?`<div class="confirm"><span class="small" style="flex:1;min-width:160px">Remove this piece? Your fits stay as they are; it just won't be tracked in your closet.</span><button class="btn sm" data-act="removeItemCancel">Keep</button><button class="btn sm primary" data-act="removeItemConfirm">Remove</button></div>`:""}
  </div>`;
}
async function updateFitsItems(fn){
  const changed=[];
  for(const f of S.fits){ const before=JSON.stringify(f.items||[]); const items=fn(f.items||[]); if(JSON.stringify(items)!==before){ f.items=items; changed.push(f); } }
  for(let i=0;i<changed.length;i+=8){
    const res=await Promise.all(changed.slice(i,i+8).map(f=>sb.from("fits").update({items:f.items}).eq("id",f.id)));
    const bad=res.find(r=>r.error); if(bad) throw bad.error;
  }
}
async function saveClosetItem(){
  const c=curItem(); if(!c) return; const ed=S.itemEdit||{};
  const label=String(ed.label ?? c.label).trim().slice(0,80), type=ed.type ?? c.type;
  if(!label){ toast("Give it a name first."); return; }
  const { error } = await sb.from("closet_items").update({label,type}).eq("id",c.id);
  if(error){ toast("Couldn't save. Try again."); return; }
  c.label=label; c.type=type; S.itemEdit=null; render(); toast("Saved");
}
async function mergeClosetItem(){
  const c=curItem(), to=S.mergeTo; if(!c||!to) return;
  try {
    await updateFitsItems(items=>{
      const hasTo=items.some(i=>i.item_id===to);
      return items.flatMap(i=> i.item_id!==c.id ? [i] : hasTo ? [] : [{...i,item_id:to}]);
    });
    const { error } = await sb.from("closet_items").delete().eq("id",c.id); if(error) throw error;
    S.closet=S.closet.filter(x=>x.id!==c.id); S.itemId=to; S.mergeTo=""; S.itemEdit=null; render(); scrollTo(0,0); toast("Merged");
  } catch(e){ console.error(e); toast("Couldn't merge. Try again."); }
}
async function removeClosetItem(id=S.itemId){
  const c=S.closet.find(x=>x.id===id); if(!c) return;
  const before=S.fits.filter(f=>(f.items||[]).some(i=>i.item_id===id)).map(f=>({f, items:JSON.parse(JSON.stringify(f.items))}));
  try {
    await updateFitsItems(items=>items.map(i=>i.item_id===c.id?{...i,item_id:null}:i));
    const { error } = await sb.from("closet_items").delete().eq("id",c.id); if(error) throw error;
    S.closet=S.closet.filter(x=>x.id!==c.id); S.view="closet"; S.confirmRemove=false; render();
    toast("Removed from closet", async()=>{
      const r=await sb.from("closet_items").insert({id:c.id,label:c.label,type:c.type,brand:c.brand||null,crop_path:c.crop_path||null,swatch:c.swatch||null}); if(r.error) throw r.error;
      for(const b of before){ b.f.items=b.items; await sb.from("fits").update({items:b.items}).eq("id",b.f.id); }
      S.closet=[...S.closet,c]; render(); toast("Restored");
    });
  } catch(e){ console.error(e); toast("Couldn't remove. Try again."); }
}
// Swipe left on a closet row to reveal Remove.
let sw=null;
const hideDel=row=>setTimeout(()=>{ if(!row.classList.contains("open")) row.parentElement.classList.remove("show"); },220);
const closeSwipes=keep=>document.querySelectorAll(".swipe .citem.open").forEach(r=>{ if(r!==keep){ r.classList.remove("open"); hideDel(r); } });
document.addEventListener("touchstart",e=>{
  const row=e.target.closest(".swipe .citem");
  if(!row){ if(!e.target.closest(".swipe-del")) closeSwipes(null); return; }
  closeSwipes(row);
  const t=e.touches[0]; sw={row, x:t.clientX, y:t.clientY, dx:0, base:row.classList.contains("open")?-96:0, dir:null};
  row.style.transition="none";
},{passive:true});
document.addEventListener("touchmove",e=>{
  if(!sw) return; const t=e.touches[0], dx=t.clientX-sw.x, dy=t.clientY-sw.y;
  if(!sw.dir){ if(Math.abs(dx)<8&&Math.abs(dy)<8) return; sw.dir=Math.abs(dx)>Math.abs(dy)?"h":"v"; }
  if(sw.dir!=="h") return;
  e.preventDefault(); sw.row.parentElement.classList.add("show"); sw.dx=Math.min(0,Math.max(-120,sw.base+dx)); sw.row.style.transform=`translateX(${sw.dx}px)`;
},{passive:false});
document.addEventListener("touchend",()=>{
  if(!sw) return; const {row,dir}=sw; row.style.transition="";
  if(dir==="h"){ row.classList.toggle("open", sw.dx<-48); row.style.transform=""; hideDel(row); row.dataset.swiped="1"; setTimeout(()=>{ delete row.dataset.swiped; },350); }
  sw=null;
});

/* ---------- actions ---------- */
const ACT = {
  nav:t=>{ S.view=t.dataset.view; S.share=null; S.flow=null; S.confirmDel=false; render(); scrollTo(0,0);
    if((S.view==="feed"||S.view==="friends") && Date.now()-(S.socialAt||0)>30e3) loadSocial().then(()=>softRender(["feed","friends"])).catch(()=>{}); },
  log:()=>{ const i=$("#photoIn"); i.value=""; i.click(); },
  filterBest:()=>{ S.filter.best=!S.filter.best; render(); },
  filterCat:t=>{ const c=t.dataset.cat||null; S.filter.cat=S.filter.cat===c?null:c; render(); },
  openFit:t=>openFit(t.dataset.id, t.dataset.from||"home"),
  addToCloset:async t=>{ const x=curFit(); const it=x&&x.items[t.dataset.i]; if(!it) return;
    try { const [linked]=await linkItems([{...it, item_id:undefined, clear:true}]); x.items[t.dataset.i]=linked;
      const { error } = await sb.from("fits").update({items:x.items}).eq("id",x.id); if(error) throw error; render(); toast("Added to closet"); }
    catch(e){ console.error(e); toast("Couldn't add it. Try again."); } },
  closetSort:t=>{ S.closetSort=t.dataset.sort; render(); },
  openItem:t=>{ S.itemId=t.dataset.id; S.itemEdit=null; S.mergeTo=""; S.confirmRemove=false; S.view="item"; render(); scrollTo(0,0); },
  saveItem:()=>saveClosetItem(),
  mergeItem:()=>mergeClosetItem(),
  removeItemAsk:()=>{ S.confirmRemove=true; render(); },
  removeItemCancel:()=>{ S.confirmRemove=false; render(); },
  removeItemConfirm:()=>removeClosetItem(S.itemId),
  swipeRemove:t=>removeClosetItem(t.dataset.id),
  cancelFlow:()=>{ const f=S.flow; if(f){ URL.revokeObjectURL(f.origUrl); Object.values(f.comps||{}).forEach(c=>c.url!==f.origUrl&&URL.revokeObjectURL(c.url)); } S.flow=null; S.view="home"; render(); },
  pickCat:t=>{ S.flow.cat=t.dataset.cat; render(); },
  runStyle:()=>runStyle(),
  retryAnalysis:()=>runAnalysis(S.flow),
  pickBg:t=>{ S.flow.bg=t.dataset.bg; S.flow.pickedBg=true; render(); },
  saveFit:()=>saveFit(false),
  saveShare:()=>saveFit(true),
  recFb:t=>recFeedback(t.dataset.kind,t.dataset.val),
  flowRecFb:t=>{ const f=S.flow; if(!f) return; const k=t.dataset.kind, v=t.dataset.val; f.recFb={...(f.recFb||{}),[k]:(f.recFb||{})[k]===v?null:v}; render(); },
  reveal:()=>{ const f=S.flow; if(!f) return; f.step="result"; render(); scrollTo(0,0); },
  backToBackdrop:()=>{ const f=S.flow; if(!f) return; f.step=f.keepBg?"occasion":"style"; render(); scrollTo(0,0); },
  addItem:()=>{ const x=curFit(); x.items=[...(x.items||[]),{label:"",type:"other",brand:null,clear:true}]; render(); $("#saveItemsBtn").hidden=false; const ins=document.querySelectorAll("[data-item-i]"); ins[ins.length-1]?.focus(); },
  removeItem:t=>{ const x=curFit(); x.items=x.items.filter((_,i)=>i!=t.dataset.i); render(); $("#saveItemsBtn").hidden=false; },
  saveItems:async()=>{ const x=curFit(); x.items=(x.items||[]).filter(i=>i.label.trim()).map(i=>({...i,label:i.label.trim()}));
    try { x.items=await linkItems(x.items); } catch(e){ console.error(e); }
    const { error } = await sb.from("fits").update({items:x.items}).eq("id",x.id); toast(error?"Couldn't save labels.":"Labels saved"); render(); },
  share:()=>openShare(),
  cancelShare:()=>{ S.share=null; S.view="fit"; render(); },
  postShare:()=>postShare(),
  deleteFit:()=>{ S.confirmDel=true; render(); },
  cancelDelete:()=>{ S.confirmDel=false; render(); },
  confirmDelete:async()=>{ const x=curFit(); if(!x) return;
    const { error } = await sb.from("fits").delete().eq("id",x.id);
    if(error){ toast("Couldn't delete. Try again."); return; }
    sb.storage.from("fits").remove([x.image_path,x.thumb_path,x.orig_path].filter(Boolean));
    S.fits=S.fits.filter(f=>f.id!==x.id); S.recs=S.recs.filter(r=>r.fit_id!==x.id); S.view="home"; S.confirmDel=false; render(); toast("Fit deleted"); },
  heart:t=>toggleHeart(t.dataset.id),
  removePost:async t=>{ const p=S.posts.find(z=>z.id===t.dataset.id); const { error } = await sb.from("posts").delete().eq("id",t.dataset.id);
    if(error){ toast("Couldn't remove the post."); return; } if(p) sb.storage.from("posts").remove([p.image_path]);
    S.posts=S.posts.filter(z=>z.id!==t.dataset.id); render(); toast("Post removed"); },
  removeRec:async t=>{ const r=S.recs.find(z=>z.id===t.dataset.id); if(!r) return;
    const { error } = await sb.from("saved_recs").delete().eq("id",r.id); if(error){ toast("Couldn't remove it."); return; }
    S.recs=S.recs.filter(z=>z.id!==r.id);
    const f=S.fits.find(x=>x.id===r.fit_id); if(f&&(f.rec_fb||{})[r.kind]==="up"){ f.rec_fb={...f.rec_fb,[r.kind]:null}; sb.from("fits").update({rec_fb:f.rec_fb}).eq("id",f.id); }
    render(); },
  invite:async()=>{
    const code=S.profile&&S.profile.friend_code; if(!code) return;
    const name=(S.profile.handle||"").trim(), link=`${APP_URL}?invite=${code}`;
    const text=`${name?name+" invited you":"Join me"} on WearAbout: log your outfits, get a style score, and share fits with friends. Sign up here: ${link} (my friend code is ${code})`;
    try { if(navigator.share){ await navigator.share({title:"WearAbout", text}); return; } } catch(e){ if(e && e.name==="AbortError") return; }
    try { await navigator.clipboard.writeText(text); toast("Invite copied. Paste it into a message."); } catch { toast("Your link: "+link); }
  },
  copyCode:async()=>{ const c=S.profile&&S.profile.friend_code; try{ await navigator.clipboard.writeText(c); toast("Code copied"); }catch{ toast("Your code is "+c); } },
  saveHandle:async()=>{ const handle=String(S.handleIn ?? S.profile?.handle ?? "").trim().slice(0,30);
    const { error } = await sb.from("profiles").update({handle}).eq("id",S.uid);
    if(error){ toast("Couldn't save your name."); return; } S.profile={...S.profile,handle}; S.handleIn=null; render(); toast("Name saved"); },
  addFriend:async()=>{ const code=S.codeIn.trim().toUpperCase(); if(!code) return;
    try { const { data, error } = await sb.rpc("find_by_code",{code}); if(error) throw error; const hit=(data||[])[0];
      if(!hit) S.friendMsg="No one has that code. Check it with your friend; they need to sign up first.";
      else if(hit.id===S.uid) S.friendMsg="That's your own code.";
      else { S.people[hit.id]={id:hit.id,handle:hit.handle}; await addFriend(hit.id); S.codeIn="";
        S.friendMsg = S.inc.has(hit.id) ? "You're now friends." : "Added. Once they add your code too, you'll see each other's fits."; }
    } catch { S.friendMsg="Couldn't add that friend. Try again."; }
    render(); },
  addBack:async t=>{ try{ await addFriend(t.dataset.uid); toast("You're now friends"); }catch{ toast("Couldn't add them back."); } render(); },
  signOut:async()=>{ await sb.auth.signOut(); },
  ideasFilter:t=>{ S.ideasFilter=t.dataset.f; render(); },
  pickGoal:t=>{ S.goalIn=t.dataset.goal; render(); },
  editGoal:()=>{ S.goalEdit=true; S.goalIn=null; render(); setTimeout(()=>$("#goalIn")?.focus(),0); },
  saveGoal:async()=>{ const goal=String(S.goalIn ?? S.goal).trim().slice(0,40);
    const { error } = await sb.from("user_settings").upsert({user_id:S.uid, style_goal:goal, updated_at:new Date().toISOString()});
    if(error){ toast("Couldn't save your goal."); return; } S.goal=goal; S.goalEdit=false; render(); toast(goal?"Style goal saved":"Style goal removed"); },
  clearGoal:async()=>{ S.goalIn=""; await ACT.saveGoal(); },
  authBack:()=>{ S.auth={step:"email",email:S.auth.email,code:"",busy:false,msg:""}; render(); },
};
document.addEventListener("click", e=>{
  const ci=e.target.closest(".swipe .citem");
  if(ci && (ci.dataset.swiped || ci.classList.contains("open"))){ ci.classList.remove("open"); hideDel(ci); return; }
  const c=e.target.closest("#shareCanvas");
  if(c&&S.share&&S.share.blur.on){ const r=c.getBoundingClientRect(); S.share.blur.x=(e.clientX-r.left)/r.width; S.share.blur.y=(e.clientY-r.top)/r.height; drawShare(); return; }
  const t=e.target.closest("[data-act]"); if(!t||t.disabled) return; const f=ACT[t.dataset.act]; if(f) f(t,e);
});
document.addEventListener("submit", e=>{ if(e.target.id==="authForm"){ e.preventDefault(); submitAuth(); } });
document.addEventListener("input", e=>{
  const t=e.target;
  if(t.id==="authEmail") S.auth.email=t.value;
  else if(t.id==="authCode") S.auth.code=t.value;
  else if(t.id==="detail"&&S.flow) S.flow.detail=t.value;
  else if(t.dataset.itemI!=null){ curFit().items[t.dataset.itemI].label=t.value; $("#saveItemsBtn").hidden=false; }
  else if(t.id==="caption"&&S.share) S.share.caption=t.value;
  else if(t.dataset.plugI!=null&&S.share){ S.share.plugs[t.dataset.plugI][t.dataset.field]=t.value;
    if(t.dataset.field==="brand"){ const it=curFit()?.items?.[t.dataset.plugI]; const hint=t.parentElement?.querySelector("p.small"); if(hint&&it) hint.textContent=`Friends get a Shop it button that searches for ${[t.value.trim(),it.label].filter(Boolean).join(" ")}.`; } }
  else if(t.id==="blurSize"&&S.share){ S.share.blur.r=Number(t.value)/100; drawShare(); }
  else if(t.id==="codeIn") S.codeIn=t.value;
  else if(t.id==="handleIn") S.handleIn=t.value;
  else if(t.id==="goalIn") S.goalIn=t.value;
  else if(t.id==="itemLabel") (S.itemEdit||(S.itemEdit={})).label=t.value;
});
document.addEventListener("change", e=>{
  const t=e.target;
  if(t.id==="photoIn") startFlow(t.files&&t.files[0]);
  else if(t.dataset.itemType!=null){ curFit().items[t.dataset.itemType].type=t.value; $("#saveItemsBtn").hidden=false; }
  else if(t.id==="keepBg"&&S.flow){ S.flow.keepBg=t.checked; render(); }
  else if(t.id==="buyRecs") setBuyRecs(t.checked);
  else if(t.id==="itemType") (S.itemEdit||(S.itemEdit={})).type=t.value;
  else if(t.id==="mergeTo") { S.mergeTo=t.value; render(); }
  else if(t.id==="blurOn"&&S.share){ S.share.blur.on=t.checked; render(); }
  else if(t.dataset.plugOn!=null&&S.share){ const i=t.dataset.plugOn; if(t.checked) S.share.plugs[i]={brand:(curFit()?.items?.[i]?.brand)||"",review:""}; else delete S.share.plugs[i]; render(); }
});

/* ---------- boot ---------- */
async function onSession(session){
  const uid=session?.user?.id||null;
  if(S.booted && uid===S.uid) return;
  S.booted=true;
  S.uid=uid; S.email=session?.user?.email||""; S.loaded=false; S.urls={};
  S.fits=[]; S.recs=[]; S.posts=[]; S.out=new Set(); S.inc=new Set(); S.people={}; S.profile=null; S.closet=[]; S.closetReady=false; S.view="home"; S.socialAt=0; S.mineAt=0;
  if(!uid){ S.auth={step:"email",email:S.auth.email,code:"",busy:false,msg:""}; render(); return; }
  render();
  try { await loadMine(); } catch(e){ console.error(e); toast("Couldn't load your fits. Close and reopen the app to try again."); }
  S.loaded=true; render();
  backfillCloset().then(()=>softRender(["closet","item","fit"])).catch(console.error);
  loadSocial().then(()=>acceptInvite()).then(()=>softRender(["feed","friends"])).catch(console.error);
}
async function acceptInvite(){
  const code=pendingInvite(); if(!code || !S.uid) return;
  try {
    const { data, error } = await sb.rpc("find_by_code",{code}); if(error) throw error;
    const hit=(data||[])[0]; clearInvite();
    if(!hit || hit.id===S.uid || S.out.has(hit.id)) return;
    S.people[hit.id]={id:hit.id,handle:hit.handle}; await addFriend(hit.id);
    toast(S.inc.has(hit.id) ? `You and ${hit.handle||"your friend"} are now friends` : `You added ${hit.handle||"your friend"}. Once they add you back, you'll see each other's fits.`);
  } catch(e){ console.error("invite",e); }
}
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
if(sb){
  sb.auth.onAuthStateChange((_ev,session)=>{ setTimeout(()=>onSession(session),0); });
  sb.auth.getSession().then(({data})=>onSession(data.session));
} else render();
// Coming back to the app: refresh at most once a minute, and only on list screens (not mid-log or mid-edit).
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible"||!S.uid||!S.loaded||S.refreshing) return;
  if(!["home","saved","closet"].includes(S.view) || Date.now()-(S.mineAt||0)<60e3) return;
  S.refreshing=true; loadMine().then(()=>softRender(["home","saved","closet"])).catch(()=>{}).finally(()=>{ S.refreshing=false; });
});
