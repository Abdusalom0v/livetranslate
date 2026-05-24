// Web Worker: SSE tarjima so'rovlarini UI threaddan ajratib bajaradi
// postMessage({ id, text, sourceLang, targetLang, baseUrl })  ← kirish
// postMessage({ id, chunk })                                  ← har chunk
// postMessage({ id, done: true })                             ← tugaganda

const controllers = new Map(); // id → AbortController (faol so'rovlar)

self.onmessage = async ({ data }) => {
  const { id, text, sourceLang, targetLang, baseUrl } = data;

  // Oldingi so'rovni bekor qilish (agar mavjud bo'lsa)
  if (controllers.has(id)) {
    controllers.get(id).abort();
    controllers.delete(id);
  }

  const ctrl = new AbortController();
  controllers.set(id, ctrl);

  try {
    const res = await fetch(`${baseUrl}/api/translate/stream`, {
      method:  'POST',
      headers: {
        'Content-Type':               'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body:   JSON.stringify({ text, sourceLang, targetLang }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const raw = part.slice(6).trim();
        if (raw === '[DONE]') break outer;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.chunk) self.postMessage({ id, chunk: parsed.chunk });
        } catch {}
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      self.postMessage({ id, error: err.message });
    }
  } finally {
    controllers.delete(id);
    self.postMessage({ id, done: true });
  }
};
