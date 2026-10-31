// Cloudflare Pages Function: proxy the request to YOUR Cobalt-compatible API.
// Configure COBALT_API_URL in Pages > Settings > Variables and Secrets.
// Example: https://your-own-cobalt-host.example (do not use an untrusted public instance).
export async function onRequestPost({ request, env }) {
  const cors = { "Content-Type":"application/json", "Cache-Control":"no-store" };
  try {
    if (!env.COBALT_API_URL) {
      return new Response(JSON.stringify({error:"Downloader backend is not configured. Set COBALT_API_URL in Cloudflare Pages."}), {status:503,headers:cors});
    }
    const body = await request.json();
    let source;
    try { source = new URL(body.url); } catch { return new Response(JSON.stringify({error:"Invalid URL."}),{status:400,headers:cors}); }
    if (!["instagram.com","www.instagram.com","m.instagram.com"].includes(source.hostname) ||
        !/^\/(reel|reels|p|tv|stories)\//.test(source.pathname)) {
      return new Response(JSON.stringify({error:"Only Instagram post, Reel, photo and video links are accepted."}),{status:400,headers:cors});
    }
    const endpoint = env.COBALT_API_URL.replace(/\\/$/,"") + "/";
    const headers = {"Accept":"application/json","Content-Type":"application/json"};
    if (env.COBALT_API_KEY) headers["Authorization"] = env.COBALT_API_KEY;
    const upstream = await fetch(endpoint, {
      method:"POST", headers,
      body:JSON.stringify({url:source.toString(),videoQuality:"max",filenameStyle:"pretty",downloadMode:"auto"})
    });
    const data = await upstream.json();
    if (!upstream.ok) return new Response(JSON.stringify({error:data?.error?.code || data?.message || "Media service request failed."}),{status:502,headers:cors});
    // Normalize picker responses to a small safe shape for the frontend.
    if (data.status === "picker" && Array.isArray(data.picker)) {
      const items = data.picker.filter(x=>typeof x.url==="string" && /^https?:/.test(x.url))
        .map(x=>({url:x.url,filename:x.filename || "instagram-media",type:x.type || "Media"}));
      return new Response(JSON.stringify({status:"picker",items}),{headers:cors});
    }
    if (["redirect","tunnel"].includes(data.status) && typeof data.url==="string" && /^https?:/.test(data.url)) {
      return new Response(JSON.stringify({status:data.status,url:data.url,filename:data.filename || "instagram-media"}),{headers:cors});
    }
    if (data.status === "error") return new Response(JSON.stringify({status:"error",error:data.error}),{headers:cors});
    return new Response(JSON.stringify({error:"Unsupported backend response. Check the Cobalt API version."}),{status:502,headers:cors});
  } catch {
    return new Response(JSON.stringify({error:"Unexpected server error. Check backend configuration and logs."}),{status:500,headers:cors});
  }
}
