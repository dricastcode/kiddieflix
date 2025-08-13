// ===============================
// Keys & defaults
// ===============================
const STORAGE_KEY = "kiddieflix.videos";
const PIN_KEY = "kiddieflix.pinHash";
const PROFILES_KEY = "kiddieflix.profiles";
const CURRENT_PROFILE_KEY = "kiddieflix.currentProfileId";
const FAV_KEY = "kiddieflix.favorites"; // { [profileId]: ["videoId", ...] }

const defaultVideos = [
  { id: "M7lc1UVf-VE", title: "Demo Video (YouTube API)" } // visible to ALL by default
];

const defaultProfiles = [
  { id: cryptoRandomId(), name: "Kid 1", color: "#1DD75B", emoji: "🟢" },
  { id: cryptoRandomId(), name: "Kid 2", color: "#FFD234", emoji: "🟡" }
];

// ===============================
// State
// ===============================
let videos = loadVideos();
let profiles = loadProfiles();
let currentProfileId = loadCurrentProfile();
let favoritesMap = loadFavorites();

let favOnly = false;
let selectionMode = false;
let selectedIds = new Set();

function ensureProfiles(){
  try{
    if(!Array.isArray(profiles) || profiles.length === 0){
      profiles = [
        { id: cryptoRandomId(), name: "Kid 1", color: "#1DD75B", emoji: "🟢" },
        { id: cryptoRandomId(), name: "Kid 2", color: "#FFD234", emoji: "🟡" }
      ];
      saveProfiles();
    }
  }catch(e){
    console.warn("[KiddieFlix] ensureProfiles fallback:", e);
    profiles = [
      { id: "kid1", name: "Kid 1", color: "#1DD75B", emoji: "🟢" },
      { id: "kid2", name: "Kid 2", color: "#FFD234", emoji: "🟡" }
    ];
    saveProfiles();
  }
}
ensureProfiles();

// ===============================
// Load/save helpers
// ===============================
function loadVideos(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultVideos.slice();
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : defaultVideos.slice();
  }catch{ return defaultVideos.slice(); }
}
function saveVideos(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(videos)); }

function loadProfiles(){
  try{
    const raw = localStorage.getItem(PROFILES_KEY);
    if(!raw) return defaultProfiles.slice();
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length ? data : defaultProfiles.slice();
  }catch{ return defaultProfiles.slice(); }
}
function saveProfiles(){ localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }

function loadCurrentProfile(){
  const id = localStorage.getItem(CURRENT_PROFILE_KEY);
  return profiles.some(p => p.id === id) ? id : null;
}
function setCurrentProfile(id){
  currentProfileId = id;
  localStorage.setItem(CURRENT_PROFILE_KEY, id || "");
  updateProfilePill();
  // Reset favorites filter when profile changes
  favOnly = false;
  favToggleBtn?.setAttribute("aria-pressed", "false");
  renderGrid();
}

function loadFavorites(){
  try{
    const raw = localStorage.getItem(FAV_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === "object") ? obj : {};
  }catch{ return {}; }
}
function saveFavorites(){
  localStorage.setItem(FAV_KEY, JSON.stringify(favoritesMap));
}
function getFavSet(profileId){
  const arr = favoritesMap[profileId] || [];
  return new Set(arr);
}
function setFavSet(profileId, set){
  favoritesMap[profileId] = Array.from(set);
  saveFavorites();
}
function isFavorite(videoId){
  if(!currentProfileId) return false;
  return getFavSet(currentProfileId).has(videoId);
}
function toggleFavorite(videoId){
  if(!currentProfileId){ alert("Pick a profile first."); return; }
  const favs = getFavSet(currentProfileId);
  if(favs.has(videoId)) favs.delete(videoId); else favs.add(videoId);
  setFavSet(currentProfileId, favs);
  renderGrid();
}

function cryptoRandomId(){
  // Safe across http://localhost and older browsers
  try{
    if (typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  }catch(_e){}
  return "id-" + Math.random().toString(36).slice(2,10);
}

// ===============================
// Elements
// ===============================
const gridEl = document.getElementById("grid");

const parentBtn = document.getElementById("parentBtn");
const parentPanel = document.getElementById("parentPanel");

const pinDialog = document.getElementById("pinDialog");
const pinForm = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const pinInput2 = document.getElementById("pinInput2");
const pinConfirmWrap = document.getElementById("pinConfirmWrap");
const pinTitle = document.getElementById("pinTitle");
const pinMsg = document.getElementById("pinMsg");
const forgotPinBtn = document.getElementById("forgotPinBtn");
const changePinBtn = document.getElementById("changePinBtn");
const removePinBtn = document.getElementById("removePinBtn");

const profilePill = document.getElementById("profilePill");
const profileDot = document.getElementById("profileDot");
const profileName = document.getElementById("profileName");
const gate = document.getElementById("profileGate");
const listEl = document.getElementById("profileList");
const addProfileBtn = document.getElementById("addProfileBtn");

const favToggleBtn = document.getElementById("favToggleBtn");
const editModeBtn = document.getElementById("editModeBtn");
const editBar = document.getElementById("editBar");
const editCount = document.getElementById("editCount");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const addVideoForm = document.getElementById("addVideoForm");
const urlInput = document.getElementById("videoUrl");
const titleInput = document.getElementById("videoTitle");
const dropZone = document.getElementById("dropZone");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const clearBtn = document.getElementById("clearBtn");
const checksWrap = document.getElementById("checksWrap");
const showAllChk = document.getElementById("showAll");

const closeParentBtn = document.getElementById("closeParent");
closeParentBtn?.addEventListener("click", (e) => {
  e.preventDefault(); // avoid any form submit path
  parentPanel.close();
});

// ===============================
// Profile UI (gate + pill)
// ===============================
function showGate(){ gate.hidden = false; renderProfileCards(); }
function hideGate(){ gate.hidden = true; }

function renderProfileCards(){
  if(!listEl){
    console.error("[KiddieFlix] #profileList not found.");
    return;
  }
  listEl.innerHTML = "";
  try{
    if(!Array.isArray(profiles) || profiles.length===0){
      console.warn("[KiddieFlix] No profiles; creating defaults.");
      ensureProfiles();
    }
    profiles.forEach(p => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "profile-card";
      card.innerHTML = `
        <div class="prof-avatar" style="background:${p.color}">${p.emoji || "⭐"}</div>
        <div class="prof-name">${escapeHtml(p.name)}</div>
      `;
      card.addEventListener("click", () => {
        const switching = currentProfileId && currentProfileId !== p.id;
        maybeRequirePin(switching).then(ok => { if(ok){ setCurrentProfile(p.id); hideGate(); } });
      });
      // long-press manage
      let t = null;
      card.addEventListener("touchstart", () => t = setTimeout(() => manageProfile(p), 600));
      card.addEventListener("touchend", () => clearTimeout(t));
      card.addEventListener("mousedown", () => t = setTimeout(() => manageProfile(p), 600));
      card.addEventListener("mouseup", () => clearTimeout(t));
      listEl.appendChild(card);
    });
    console.debug("[KiddieFlix] renderProfileCards:", profiles.length);
  } catch(err){
    console.error("[KiddieFlix] renderProfileCards error:", err);
  }
}

addProfileBtn?.addEventListener("click", async () => {
  const ok = await maybeRequirePin(true);
  if(!ok) return;
  const name = prompt("Profile name?");
  if(!name) return;
  const colors = ["#1DD75B","#FFD234","#7B5CFF","#00D1FF","#FF7B9E","#FF9F1C"];
  const emojis = ["🟢","🟡","🟣","🔵","🩷","🟧","⭐","🎈","🧩","📺"];
  const p = { id: cryptoRandomId(), name: name.trim().slice(0,18), color: colors[Math.floor(Math.random()*colors.length)], emoji: emojis[Math.floor(Math.random()*emojis.length)] };
  profiles.push(p); saveProfiles(); renderProfileCards(); updateProfilePill(); renderProfileChecks();
});

function manageProfile(p){
  maybeRequirePin(true).then(ok => {
    if(!ok) return;
    const action = prompt(`Edit profile "${p.name}".\nType: rename, color, emoji, delete`, "rename");
    if(!action) return;
    if(action.toLowerCase()==="rename"){
      const n = prompt("New name:", p.name); if(n){ p.name = n.trim().slice(0,18); }
    } else if(action.toLowerCase()==="color"){
      const c = prompt("Hex color (e.g. #1DD75B):", p.color); if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c||"")) p.color=c;
    } else if(action.toLowerCase()==="emoji"){
      const e = prompt("Emoji (e.g. ⭐):", p.emoji||"⭐"); if(e){ p.emoji = e; }
    } else if(action.toLowerCase()==="delete"){
      if(confirm("Delete profile? This won’t delete any videos.")){
        profiles = profiles.filter(x => x.id !== p.id);
        if(currentProfileId === p.id) setCurrentProfile(null);
      }
    }
    saveProfiles(); renderProfileCards(); updateProfilePill(); renderProfileChecks();
  });
}

function updateProfilePill(){
  const p = profiles.find(x => x.id === currentProfileId);
  if(!p){ profileName.textContent = "Profile"; profileDot.style.background = "#FFD234"; return; }
  profileName.textContent = p.name;
  profileDot.style.background = p.color || "#FFD234";
}

// Pill click = open gate (PIN if switching)
profilePill?.addEventListener("click", () => {
  maybeRequirePin(!!currentProfileId).then(ok => { if(ok) showGate(); });
});

// First run
if(!currentProfileId){ showGate(); } else { updateProfilePill(); }

// ===============================
// Grid (filter by profile + favorites + selection UI)
// ===============================
function thumbUrl(id){ return `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderGrid(){
  gridEl.innerHTML = "";

  let list = videos;
  if(currentProfileId){
    list = list.filter(v => {
      // If no v.profiles, it's for ALL
      if(!Array.isArray(v.profiles) || v.profiles.length===0) return true;
      return v.profiles.includes(currentProfileId);
    });
  }
  if(favOnly && currentProfileId){
    const favs = getFavSet(currentProfileId);
    list = list.filter(v => favs.has(v.id));
  }

  if(!list.length){
    gridEl.innerHTML = `<p class="muted" style="font-size:16px;">No videos ${favOnly ? "in favorites " : ""}for this profile yet.</p>`;
    return;
  }

  for(const v of list){
    const card = document.createElement("article");
    const fav = isFavorite(v.id);
    card.className = "card" + (fav ? " favorite" : "");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <img src="${thumbUrl(v.id)}" alt="">
      <div class="title">${escapeHtml(v.title || "Untitled")}</div>
    `;

    // Favorite button
    const favBtn = document.createElement("button");
    favBtn.className = "fav-btn";
    favBtn.setAttribute("aria-label", fav ? "Unfavorite" : "Favorite");
    favBtn.textContent = "⭐";
    favBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleFavorite(v.id); });
    card.appendChild(favBtn);

    if(selectionMode){
      // Selection checkbox
      const wrap = document.createElement("div");
      wrap.className = "select-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selectedIds.has(v.id);
      cb.addEventListener("click", (e) => { e.stopPropagation(); toggleSelected(v.id); });
      wrap.appendChild(cb);
      card.appendChild(wrap);

      // Card toggles selection
      card.addEventListener("click", () => { cb.checked = !cb.checked; toggleSelected(v.id); });
      card.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){ e.preventDefault(); cb.checked = !cb.checked; toggleSelected(v.id); }
      });
    } else {
      // Normal behavior: open player
      card.addEventListener("click", () => openPlayer(v.id));
      card.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openPlayer(v.id); }
      });
    }

    gridEl.appendChild(card);
  }
}

// ===============================
// YouTube Player (custom controls)
// ===============================
let player;
window.onYouTubeIframeAPIReady = function(){
  player = new YT.Player('player', {
  host: 'https://www.youtube.com',
  width: '100%',
  height: '100%',
  videoId: '',
  playerVars: {
    autoplay: 0, controls: 0, rel: 0, modestbranding: 1,
    iv_load_policy: 3, fs: 1, playsinline: 1, enablejsapi: 1,
    origin: location.origin
  }
});
};

const modal = document.getElementById("playerModal");
const playPauseBtn = document.getElementById("playPauseBtn");
const closeBtn = document.getElementById("closeBtn");
const fsBtn = document.getElementById("fullscreenBtn");

function openPlayer(videoId){
  modal.hidden = false;
  player.loadVideoById({ videoId });
  playPauseBtn.textContent = "Pause";
  requestFullscreen(modal.querySelector(".modal-inner"));
}
function closePlayer(){
  modal.hidden = true;
  if(player && player.stopVideo){ player.stopVideo(); }
}
function togglePlayPause(){
  if(!player) return;
  const state = player.getPlayerState();
  if(state === YT.PlayerState.PLAYING){ player.pauseVideo(); playPauseBtn.textContent = "Play"; }
  else { player.playVideo(); playPauseBtn.textContent = "Pause"; }
}
function requestFullscreen(el){
  const elem = el || document.documentElement;
  if(elem.requestFullscreen) elem.requestFullscreen().catch(()=>{});
  else if(elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
}
function exitFullscreen(){
  if(document.fullscreenElement){
    document.exitFullscreen().catch(()=>{});
  }
}
playPauseBtn.addEventListener("click", togglePlayPause);
closeBtn.addEventListener("click", () => { exitFullscreen(); closePlayer(); });
fsBtn.addEventListener("click", () => requestFullscreen(modal.querySelector(".modal-inner")));
document.addEventListener("keydown", (e) => {
  if(modal.hidden) return;
  if(e.key === "Escape"){ exitFullscreen(); closePlayer(); }
  if(e.key === " "){ e.preventDefault(); togglePlayPause(); }
});

// ===============================
// PIN Logic
// ===============================
let pinMode = "setup"; // "setup" | "enter" | "change"

parentBtn.addEventListener("click", () => {
  const hasPin = !!localStorage.getItem(PIN_KEY);
  if(!hasPin) openPinDialog("setup");
  else openPinDialog("enter");
});

changePinBtn?.addEventListener("click", () => openPinDialog("change"));
removePinBtn?.addEventListener("click", async () => {
  const ok = await promptPinConfirm("Enter current PIN to remove:");
  if(ok){ localStorage.removeItem(PIN_KEY); alert("PIN removed."); }
});
forgotPinBtn.addEventListener("click", () => {
  alert("Forgot the PIN? Export your videos, then clear site data (or remove the PIN via browser storage tools) to reset.");
});

pinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const p1 = pinInput.value.trim();
  if(pinMode === "setup"){
    const p2 = pinInput2.value.trim();
    if(p1.length < 4 || p1.length > 8) return alert("PIN should be 4–8 digits.");
    if(p1 !== p2) return alert("PINs don’t match.");
    const hash = await sha256(p1);
    localStorage.setItem(PIN_KEY, hash);
    pinDialog.close();
    parentPanel.showModal();
    syncProfileChecksUI();
  } else if(pinMode === "enter"){
    const ok = await verifyPin(p1);
    if(!ok) return alert("Wrong PIN.");
    pinDialog.close();
    parentPanel.showModal();
    syncProfileChecksUI();
  } else if(pinMode === "change"){
    const p2 = pinInput2.value.trim();
    if(p1.length < 4 || p1.length > 8) return alert("PIN should be 4–8 digits.");
    if(p1 !== p2) return alert("PINs don’t match.");
    const hash = await sha256(p1);
    localStorage.setItem(PIN_KEY, hash);
    pinDialog.close();
    alert("PIN changed.");
  }
});

function openPinDialog(mode){
  pinMode = mode;
  if(mode === "setup"){
    pinTitle.textContent = "Set Parent PIN";
    pinMsg.textContent = "Choose a 4–8 digit PIN you’ll remember.";
    pinConfirmWrap.style.display = "";
    pinInput.value = ""; pinInput2.value = "";
    pinDialog.showModal(); setTimeout(()=>pinInput.focus(),0);
  } else if(mode === "enter"){
    pinTitle.textContent = "Enter Parent PIN";
    pinMsg.textContent = "Parents only.";
    pinConfirmWrap.style.display = "none";
    pinInput.value = ""; pinDialog.showModal(); setTimeout(()=>pinInput.focus(),0);
  } else if(mode === "change"){
    promptPinConfirm("Enter current PIN to change:").then(ok => {
      if(!ok) return;
      pinTitle.textContent = "Set New PIN";
      pinMsg.textContent = "Enter new 4–8 digit PIN.";
      pinConfirmWrap.style.display = "";
      pinInput.value = ""; pinInput2.value = "";
      pinDialog.showModal(); setTimeout(()=>pinInput.focus(),0);
    });
  }
}
async function promptPinConfirm(message){
  const current = prompt(message || "Enter current PIN:");
  if(current == null) return false;
  return verifyPin(current);
}
async function verifyPin(pin){
  const saved = localStorage.getItem(PIN_KEY);
  if(!saved) return true;
  const hash = await sha256(pin.trim());
  return hash === saved;
}
async function sha256(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

// Require PIN for profile switches / edits
async function maybeRequirePin(requireIt){
  const hasPin = !!localStorage.getItem(PIN_KEY);
  if(!hasPin || !requireIt) return true;
  const code = prompt("Parent PIN:");
  if(code == null) return false;
  return verifyPin(code);
}

// ===============================
// Parent Panel: profile checks + add/import/export/clear
// ===============================
function renderProfileChecks(){
  checksWrap.innerHTML = "";
  profiles.forEach(p => {
    const id = "prof-" + p.id;
    const label = document.createElement("label");
    label.className = "chk";
    label.innerHTML = `<input type="checkbox" id="${id}" data-pid="${p.id}"> ${escapeHtml(p.name)}`;
    checksWrap.appendChild(label);
  });
  syncProfileChecksUI();
}
function syncProfileChecksUI(){
  const inputs = checksWrap.querySelectorAll('input[type="checkbox"]');
  const disabled = showAllChk.checked;
  inputs.forEach(i => { i.disabled = disabled; i.checked = !disabled; });
}
renderProfileChecks();

showAllChk?.addEventListener("change", syncProfileChecksUI);

addVideoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  const title = titleInput.value.trim() || "Untitled";
  const id = extractYouTubeId(url);
  if(!id){ alert("Hmm, that doesn't look like a valid YouTube URL."); return; }

  const payload = { id, title };
  if(!showAllChk.checked){
    const arr = [];
    checksWrap.querySelectorAll('input[type="checkbox"]').forEach(i => {
      if(!i.disabled && i.checked) arr.push(i.dataset.pid);
    });
    if(arr.length === 0){
      alert("Pick at least one profile or choose ‘All profiles’."); return;
    }
    payload.profiles = arr; // store ONLY when targeting specific profiles
  }

  videos.push(payload);
  saveVideos();
  renderGrid();
  urlInput.value = ""; titleInput.value = "";
});

// Drag & drop URL
["dragenter","dragover"].forEach(evt =>
  dropZone.addEventListener(evt, e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; dropZone.classList.add("dragover"); })
);
["dragleave","drop"].forEach(evt =>
  dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove("dragover"); })
);
dropZone.addEventListener("drop", (e) => {
  const text = e.dataTransfer.getData("text") || "";
  urlInput.value = text.trim();
});

// Export includes profiles + videos + favorites
exportBtn.addEventListener("click", () => {
  const payload = { profiles, videos, favoritesMap };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kiddieflix-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Import supports old (array) or new (object) format
importInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(Array.isArray(data)){ // old format: videos only
      videos = data;
    } else if (data && Array.isArray(data.videos)){
      videos = data.videos;
      if(Array.isArray(data.profiles) && data.profiles.length){
        profiles = data.profiles; saveProfiles(); renderProfileChecks(); updateProfilePill();
      }
      if(data.favoritesMap && typeof data.favoritesMap === "object"){
        favoritesMap = data.favoritesMap; saveFavorites();
      }
    } else {
      return alert("Invalid JSON format.");
    }
    saveVideos();
    renderGrid();
    alert("Imported!");
  }catch{ alert("Couldn't read that file."); }
});

// Clear ONLY videos (keep profiles)
clearBtn.addEventListener("click", () => {
  if(confirm("Clear ALL saved videos from this device? Profiles stay.")){
    videos = []; saveVideos(); renderGrid();
  }
});

// ===============================
// Favorites toggle
// ===============================
favToggleBtn?.addEventListener("click", () => {
  if(!currentProfileId){ alert("Pick a profile first."); return; }
  favOnly = !favOnly;
  favToggleBtn.setAttribute("aria-pressed", String(favOnly));
  renderGrid();
});

// ===============================
// Selection mode (multi-delete)
// ===============================
editModeBtn?.addEventListener("click", () => enterSelectionMode());
cancelEditBtn?.addEventListener("click", () => exitSelectionMode());
deleteSelectedBtn?.addEventListener("click", () => deleteSelected());

async function enterSelectionMode(){
  const ok = await maybeRequirePin(true);
  if(!ok) return;
  selectionMode = true;
  selectedIds.clear();
  document.body.classList.add("selecting");
  editBar.hidden = false;
  updateEditCount();
  renderGrid();
}
function exitSelectionMode(){
  selectionMode = false;
  selectedIds.clear();
  document.body.classList.remove("selecting");
  editBar.hidden = true;
  updateEditCount();
  renderGrid();
}
function updateEditCount(){
  editCount.textContent = `${selectedIds.size} selected`;
}
function toggleSelected(videoId){
  if(selectedIds.has(videoId)) selectedIds.delete(videoId);
  else selectedIds.add(videoId);
  updateEditCount();
}
function deleteSelected(){
  if(selectedIds.size === 0) return;
  if(!confirm(`Delete ${selectedIds.size} video(s)?`)) return;

  // Remove from videos
  videos = videos.filter(v => !selectedIds.has(v.id));
  saveVideos();

  // Scrub favorites across all profiles
  for(const pid of Object.keys(favoritesMap)){
    const set = new Set(favoritesMap[pid] || []);
    for(const vid of selectedIds) set.delete(vid);
    favoritesMap[pid] = Array.from(set);
  }
  saveFavorites();

  exitSelectionMode();
}

// ===============================
// Utils
// ===============================
function extractYouTubeId(url){
  // supports youtube.com/watch?v=ID and youtu.be/ID with params
  const re = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const m = url.match(re);
  return m ? m[1] : null;
}

// Initial render
renderGrid();