/* Far Out — online transport. Every player publishes one small "presence" object;
   everyone sees everyone's. The host's presence carries the game state.
   Two free transports behind one interface:
   - room: the claude.ai artifact runtime's live room (when opened as a claude.ai artifact)
   - peer: PeerJS WebRTC with its free public broker (any normal web host, or a local file)
   Session: { kind, set(obj), onPeers(cb(list[{id,isMe,p}])), onStatus(cb({connected,error})), close() } */
(function () {
  'use strict';
  const FO = window.FarOut;
  const inArtifact = !!(window.claude && typeof window.claude.use === 'function');
  const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const PREFIX = 'farout-v1-';
  let roomCap = null, peerLib = null;

  function roomCapability() {
    if (!inArtifact) return Promise.resolve(null);
    return roomCap || (roomCap = window.claude.use('room').catch(() => null));
  }

  function loadPeerJs() {
    if (window.Peer) return Promise.resolve();
    return peerLib || (peerLib = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.onload = () => (window.Peer ? res() : rej(new Error('PeerJS failed to load')));
      s.onerror = () => { peerLib = null; rej(new Error('PeerJS failed to load')); };
      document.head.appendChild(s);
    }));
  }

  // ---------- claude.ai room ----------
  async function openRoom(code) {
    const room = await roomCapability();
    if (!room) throw new Error('unavailable');
    const r = await room.join('fo-' + code.toLowerCase());
    let peersCb = () => {}, statusCb = () => {}, mine = {};
    const map = (list) => list.map((pp) => ({ id: pp.peer, isMe: pp.sameTab, p: pp.presence || {} }));
    const fail = (e) => statusCb({ connected: false, error: e && e.code });
    const offP = r.onPeers((ch) => peersCb(map(ch.peers)), fail);
    const offC = r.onConnection((c) => statusCb({ connected: c }), fail);
    return {
      kind: 'room',
      set(obj) {
        const patch = Object.assign({}, obj);
        for (const k of Object.keys(mine)) if (!(k in obj)) patch[k] = null;
        mine = obj;
        r.presence(patch).catch((e) => console.warn('presence', e && e.code, e && e.message));
      },
      onPeers(cb) { peersCb = cb; cb(map(r.peers())); },
      onStatus(cb) { statusCb = cb; cb({ connected: r.connected() }); },
      close() { offP(); offC(); r.leave().catch(() => {}); },
    };
  }

  // ---------- PeerJS ----------
  function waitOpen(peer) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 15000);
      peer.once('open', (id) => { clearTimeout(t); res(id); });
      peer.once('error', (e) => { clearTimeout(t); rej(e); });
    });
  }

  async function openPeerHost(code) {
    await loadPeerJs();
    const peer = new window.Peer(PREFIX + code.toLowerCase(), { debug: 1 });
    const me = await waitOpen(peer);
    const conns = new Map();
    let mine = {}, peersCb = () => {}, statusCb = () => {}, queued = false;
    const list = () => [{ id: me, isMe: true, p: mine }]
      .concat([...conns].filter(([, c]) => c.p).map(([id, c]) => ({ id, isMe: false, p: c.p })));
    function broadcast() {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        const all = list().map((x) => ({ id: x.id, p: x.p }));
        for (const [, c] of conns) if (c.conn.open) c.conn.send({ t: 'all', all });
        peersCb(list());
      }, 30);
    }
    peer.on('connection', (conn) => {
      if (conns.size >= 9) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
      conns.set(conn.peer, { conn, p: null });
      conn.on('data', (d) => {
        const e = conns.get(conn.peer);
        if (!e || !d || d.t !== 'p' || !d.p || typeof d.p !== 'object' || Array.isArray(d.p)) return;
        const p = Object.assign({}, d.p);
        delete p.host; delete p.g; // only the host speaks for the game
        e.p = p;
        broadcast();
      });
      const drop = () => { conns.delete(conn.peer); broadcast(); };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* retry on next drop */ } });
    peer.on('error', (e) => console.warn('peer', e.type));
    return {
      kind: 'peer',
      set(obj) { mine = obj; broadcast(); },
      onPeers(cb) { peersCb = cb; cb(list()); },
      onStatus(cb) { statusCb = cb; cb({ connected: true }); },
      close() { peer.destroy(); },
    };
  }

  async function openPeerClient(code) {
    await loadPeerJs();
    const peer = new window.Peer({ debug: 1 });
    const me = await waitOpen(peer);
    const conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true });
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 15000);
      conn.on('open', () => { clearTimeout(t); res(); });
      peer.on('error', (e) => { clearTimeout(t); rej(e); });
    });
    let mine = {}, all = [], peersCb = () => {}, statusCb = () => {}, full = false;
    const view = () => all.filter((x) => x.id !== me).map((x) => ({ id: x.id, isMe: false, p: x.p || {} }))
      .concat([{ id: me, isMe: true, p: mine }]);
    conn.on('data', (d) => {
      if (d && d.t === 'all' && Array.isArray(d.all)) { all = d.all; peersCb(view()); }
      else if (d && d.t === 'full') { full = true; statusCb({ connected: false, error: 'full' }); }
    });
    conn.on('close', () => { if (!full) statusCb({ connected: false, error: 'host-left' }); });
    return {
      kind: 'peer',
      hostId: PREFIX + code.toLowerCase(),
      set(obj) { mine = obj; if (conn.open) conn.send({ t: 'p', p: obj }); peersCb(view()); },
      onPeers(cb) { peersCb = cb; cb(view()); },
      onStatus(cb) { statusCb = cb; cb({ connected: true }); },
      close() { peer.destroy(); },
    };
  }

  FO.Net = {
    inArtifact,
    /** 'room' | 'peer' | 'none' */
    async kind() {
      if (!inArtifact) return 'peer';
      return (await roomCapability()) ? 'room' : 'none';
    },
    async open(code, host) {
      const k = await FO.Net.kind();
      if (k === 'room') return openRoom(code);
      if (k === 'peer') return host ? openPeerHost(code) : openPeerClient(code);
      throw new Error('unavailable');
    },
    /** Friendly text for a connection error. */
    explain(e) {
      const t = (e && (e.type || e.code || e.message)) || '';
      if (t === 'peer-unavailable') return 'No room with that code. Check the code with your host.';
      if (t === 'unavailable-id') return 'That room code is taken. Try again.';
      if (t === 'timeout') return 'Connection timed out. Check your internet and try again.';
      if (t === 'unavailable' || t === 'not_granted') return 'Online play needs this page opened in the Claude app or browser while signed in.';
      if (t === 'not_permitted') return "Your access to this page doesn't include live rooms. Ask its owner to share it with you.";
      if (t === 'limit_reached' || t === 'upstream_error') return 'The live room is busy. Try again in a moment.';
      if (/network|server-error|socket/.test(t)) return 'Could not reach the free matchmaking server. Try again in a moment.';
      return 'Could not connect (' + t + '). Try again.';
    },
  };
})();
