const $ = (id) => document.getElementById(id);
const input = $("urlInput"), statusBox = $("status"), button = $("downloadBtn");
let busy = false;

function setStatus(message, error=false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", error);
}
function validInstagramUrl(raw) {
  try {
    const u = new URL(raw.trim());
    return ["instagram.com","www.instagram.com","m.instagram.com"].includes(u.hostname) &&
      /^\/(reel|reels|p|tv|stories)\//.test(u.pathname);
  } catch { return false; }
}
async function pasteLink() {
  try {
    const value = await navigator.clipboard.readText();
    if (!value) return setStatus("Clipboard is empty.", true);
    input.value = value.trim();
    setStatus(validInstagramUrl(input.value) ? "Instagram link detected." : "Pasted. Check that this is an Instagram post link.");
  } catch {
    input.focus();
    setStatus("Clipboard access needs permission. Long-press the field and choose Paste.");
  }
}
function renderItems(items) {
  const list = $("results"); list.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement("div"); row.className = "result";
    const info = document.createElement("div"); info.className = "result-info";
    const title = document.createElement("div"); title.className = "result-title";
    title.textContent = item.filename || `Media ${index + 1}`;
    const meta = document.createElement("div"); meta.className = "result-meta";
    meta.textContent = item.type ? `${item.type} · Original available source` : "Original available source";
    info.append(title, meta);
    const link = document.createElement("a"); link.className = "save"; link.href = item.url;
    link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Save file";
    link.setAttribute("download", item.filename || "");
    row.append(info, link); list.append(row);
  });
  $("resultsSection").classList.remove("hidden");
}
async function getMedia() {
  if (busy) return;
  const url = input.value.trim();
  if (!validInstagramUrl(url)) return setStatus("Enter a valid Instagram Reel, post, photo or video URL.", true);
  busy = true; button.disabled = true; button.querySelector("span").textContent = "Finding media…";
  setStatus("Contacting the configured media service…");
  $("resultsSection").classList.add("hidden");
  try {
    const response = await fetch("/api/download", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({url})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The media service could not process this link.");
    if (data.status === "picker" && Array.isArray(data.items)) {
      renderItems(data.items); setStatus("Choose the item you want to save.");
    } else if (data.status === "redirect" || data.status === "tunnel") {
      renderItems([{url:data.url, filename:data.filename || "instagram-media", type:"Media"}]);
      setStatus("Media is ready. Select Save file.");
    } else if (data.status === "error") {
      throw new Error(data.error?.code || "The media service returned an error.");
    } else {
      throw new Error("Unsupported response from the media service. Check your API version/configuration.");
    }
  } catch (e) {
    setStatus(e.message || "Something went wrong. Try again.", true);
  } finally {
    busy = false; button.disabled = false; button.querySelector("span").textContent = "Get media";
  }
}
$("pasteBtn").addEventListener("click", pasteLink);
button.addEventListener("click", getMedia);
$("clearBtn").addEventListener("click", () => { $("results").replaceChildren(); $("resultsSection").classList.add("hidden"); setStatus(""); });
input.addEventListener("keydown", e => { if (e.key === "Enter") getMedia(); });

// A PWA cannot silently monitor the clipboard in the background. Try a permission-gated
// read when the app is opened/focused; manual Paste remains available on all browsers.
async function checkClipboard() {
  if (!navigator.clipboard?.readText || document.visibilityState !== "visible" || input.value) return;
  try {
    const clip = (await navigator.clipboard.readText()).trim();
    if (validInstagramUrl(clip)) { input.value = clip; setStatus("Copied Instagram link detected — ready to download."); }
  } catch {}
}
window.addEventListener("focus", checkClipboard);
document.addEventListener("visibilitychange", checkClipboard);

// Android Web Share Target: Instagram's share sheet opens this PWA with the URL in query params.
const params = new URLSearchParams(location.search);
const shared = params.get("url") || params.get("text");
if (shared) {
  const match = shared.match(/https?:\/\/(?:www\.)?(?:m\.)?instagram\.com\/[^\s]+/i);
  if (match) { input.value = match[0].replace(/[),.]+$/, ""); setStatus("Link received from Share. Ready when you are."); }
  history.replaceState({}, "", "/");
}
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));
