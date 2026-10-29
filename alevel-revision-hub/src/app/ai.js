/* One way to ask Claude, wherever the hub runs.
   Inside claude.ai the page uses the viewer's own Claude through the `sample` capability.
   Anywhere else (preview.html, a hosted copy) it uses an Anthropic API key the student pastes in Settings,
   through the official Anthropic SDK. The key stays in this browser and is never synced or backed up. */
(function (RH) {
  'use strict';
  const A = RH.ai = {};
  const LS = 'alevel-revision-hub:ai';
  const SDK = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.134.0/+esm';

  A.MODELS = [
    ['claude-opus-5-5', 'Claude Opus 5.5', 'Most careful marking'],
    ['claude-sonnet-5-5', 'Claude Sonnet 5.5', 'Faster, about half the cost'],
    ['claude-haiku-5-5', 'Claude Haiku 5.5', 'Cheapest, for quick checks']
  ];

  A.inClaude = !!(window.claude && typeof window.claude.use === 'function');
  A.cfg = function () { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
  A.saveCfg = function (c) { try { localStorage.setItem(LS, JSON.stringify(c)); return true; } catch (e) { return false; } };

  // What the page knows so far: 'claude' | 'api' | 'none', and whether the viewer said no to Claude this visit.
  A.known = { sample: A.inClaude ? 'pending' : 'absent', declined: false, images: null };
  let sampleP = null;
  A.sample = function () {
    if (!sampleP) {
      sampleP = A.inClaude ? Promise.resolve(window.claude.use('sample')).catch(() => null) : Promise.resolve(null);
      sampleP.then(function (s) {
        A.known.sample = s ? 'ready' : 'absent';
        if (s && s.limits) s.limits().then((l) => { A.known.images = !!(l && l.images); A.known.maxImages = l && l.images ? l.images.maxCount : 0; }).catch(() => { A.known.images = false; });
        if (RH.render) RH.render({ keepScroll: true });
      });
    }
    return sampleP;
  };
  A.status = function () {
    if (A.known.sample === 'ready' && !A.known.declined) return 'claude';
    if (A.cfg().key) return 'api';
    if (A.known.sample === 'pending') return 'pending';
    return 'none';
  };
  A.label = function () {
    const s = A.status();
    if (s === 'claude') return 'Marked by Claude in your claude.ai account';
    if (s === 'api') return 'Marked by ' + ((A.MODELS.find((m) => m[0] === A.cfg().model) || A.MODELS[0])[1]) + ' with your API key';
    if (s === 'pending') return 'Connecting to Claude…';
    return 'Not connected';
  };
  A.maxImages = () => A.status() === 'claude' ? (A.known.images ? (A.known.maxImages || 4) : 0) : 6;

  function err(code, message, text) { return { code: code, message: message, text: text }; }

  // The JSON object in a reply, read tolerantly: the whole reply, a fenced block, or the outermost braces.
  A.parseJSON = function (text) {
    const t = String(text || '').trim();
    try { return JSON.parse(t); } catch (e) { /* keep looking */ }
    const f = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
    if (f) { try { return JSON.parse(f[1]); } catch (e) { /* keep looking */ } }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* fall through */ } }
    throw err('invalid_json', 'The reply could not be read.', t);
  };

  // Shrink an image for the API path (the claude.ai path resizes on its own).
  async function toBase64(blob) {
    let w, h, src;
    try { src = await createImageBitmap(blob); w = src.width; h = src.height; } catch (e) { src = null; }
    if (src) {
      const k = Math.min(1, 1568 / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.85);
      return { media_type: 'image/jpeg', data: url.split(',')[1] };
    }
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { media_type: blob.type || 'image/png', data: btoa(bin) };
  }

  let sdk = null;
  async function loadSDK() {
    if (!sdk) sdk = import(SDK).catch(function (e) { sdk = null; throw err('network', 'Could not load the Anthropic SDK. Check your internet connection.'); });
    return sdk;
  }

  // input: a prompt string, or turns [{role, content}] starting and ending with the student.
  // opts: { images: Blob[], json: bool, onText({text}), signal, effort }
  A.ask = async function (input, opts) {
    opts = opts || {};
    const s = await A.sample();
    if (s && !A.known.declined) {
      const o = { modelTier: opts.tier || 'default', cache: false };
      if (opts.signal) o.signal = opts.signal;
      if (opts.onText) o.onText = opts.onText;
      if (opts.images && opts.images.length) o.images = opts.images;
      try {
        if (opts.json) return await s.json(input, o);
        return (await s(input, o)).text;
      } catch (e) {
        if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared' || e.code === 'capability_disabled')) A.known.declined = true;
        throw e && e.code ? e : err('upstream_error', 'Something went wrong talking to Claude.');
      }
    }
    const cfg = A.cfg();
    if (!cfg.key) throw err('no_ai', 'Connect Claude first.');
    const mod = await loadSDK();
    const Anthropic = mod.default || mod.Anthropic;
    const client = new Anthropic({ apiKey: cfg.key, dangerouslyAllowBrowser: true });
    // Merge consecutive turns from the same side, then attach images to the last student turn.
    const turns = [];
    (typeof input === 'string' ? [{ role: 'user', content: input }] : input).forEach(function (t) {
      const last = turns[turns.length - 1];
      if (last && last.role === t.role) last.content += '\n\n' + t.content; else turns.push({ role: t.role, content: t.content });
    });
    const lastTurn = turns[turns.length - 1];
    if (opts.images && opts.images.length) {
      const blocks = [];
      for (const b of opts.images) { const img = await toBase64(b); blocks.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } }); }
      blocks.push({ type: 'text', text: lastTurn.content });
      lastTurn.content = blocks;
    }
    let text = '';
    try {
      const stream = client.beta.messages.stream({
        model: cfg.model || 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: opts.effort || (opts.json ? 'high' : 'medium') },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: turns
      }, opts.signal ? { signal: opts.signal } : undefined);
      stream.on('text', function (delta) { text += delta; if (opts.onText) opts.onText({ text: text, delta: delta }); });
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') throw err('refused', 'Claude declined to answer this one.');
      const out = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (opts.json) {
        if (final.stop_reason === 'max_tokens') throw err('invalid_json', 'The reply was cut short.', out);
        return A.parseJSON(out);
      }
      return out;
    } catch (e) {
      if (e && e.code && !(e instanceof Error)) throw e;
      if (e instanceof Anthropic.APIUserAbortError) throw err('cancelled', 'Stopped.', text);
      if (e instanceof Anthropic.AuthenticationError) throw err('bad_key', 'That API key was not accepted. Check it in Settings.');
      if (e instanceof Anthropic.PermissionDeniedError) throw err('bad_key', 'This API key cannot use that model. Try another model in Settings.');
      if (e instanceof Anthropic.RateLimitError) throw err('rate_limited', 'Too many requests for this key right now. Wait a minute and try again.', text);
      if (e instanceof Anthropic.BadRequestError) throw err('invalid_request', e.message || 'The request was not accepted.');
      if (e instanceof Anthropic.APIConnectionError) throw err('network', 'Could not reach the Anthropic API. Check your connection.', text);
      if (e instanceof Anthropic.APIError) throw err('upstream_error', e.message || 'The Anthropic API had a problem. Try again.', text);
      throw err('upstream_error', (e && e.message) || 'Something went wrong.', text);
    }
  };

  // Plain-English explanations for each failure.
  A.errorText = function (e) {
    const c = e && e.code;
    return ({
      no_ai: 'Claude is not connected. Open the hub on claude.ai, or add an Anthropic API key in Settings.',
      not_granted: 'Claude was not allowed for this page. You can allow it from the page’s Permissions menu.',
      sampling_disabled: 'Claude is not available on this account.',
      rate_limited: 'You have hit a usage limit for now. Try again in a little while.',
      refused: 'Claude declined to mark this. Check the question and answer are about A-level work.',
      image_rejected: 'One of the photos could not be used. Try a smaller JPEG or PNG.',
      images_unavailable: 'Photos can’t be sent from this view. Type the answer instead.',
      invalid_json: 'The feedback came back in an unexpected shape. Press Mark again.',
      prompt_too_large: 'That is too much text in one go. Shorten the mark scheme or answer.',
      session_expired: 'Sign in to claude.ai again, then retry.',
      cancelled: 'Stopped.'
    })[c] || (e && e.message) || 'Something went wrong. Try again.';
  };

  A.sample();
})(window.RH = window.RH || {});
