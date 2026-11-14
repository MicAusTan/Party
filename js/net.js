// PeerJS wrapper. Star topology: clients talk to the host only.
// Messages are {t: type, d: data}. Host's own id is 'host'.
// Reconnection: a client keeps the SAME peer id for the whole browser tab (sessionStorage 'pg-pid'), so when its connection drops (wifi blip, sleeping
// laptop, page refresh) it can reconnect as the same player. Events: 'lost' (connection dropped, retrying), 'back' (reconnected - re-send your hello),
// 'closed' (gave up). The host ignores a close event from a connection that was already replaced by a newer one from the same id.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ', IDC = 'abcdefghjkmnpqrstuvwxyz23456789';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch {} return null; };
export class Net {
  constructor() { this.h = {}; this.conns = new Map(); this.isHost = false; this.id = null; this.hostConn = null; this.leaving = false; this.rc = false; this.retryMs = 150000; }
  on(t, f) { (this.h[t] ??= []).push(f); }
  emit(t, d, from) { (this.h[t] || []).forEach(f => f(d, from)); }
  host() {
    return new Promise((res, rej) => {
      this.isHost = true; this.id = 'host';
      this.code = Array.from({ length: 5 }, () => ALPHA[Math.random() * ALPHA.length | 0]).join('');
      this.peer = new Peer('partygame7-' + this.code);
      this.peer.on('open', () => res(this.code));
      this.peer.on('error', rej);
      this.peer.on('connection', c => {
        c.on('open', () => {
          const old = this.conns.get(c.peer); this.conns.set(c.peer, c);
          if (old && old !== c) { try { old.close(); } catch {} }            // the same player came back on a new connection: the old one is dead weight
          this.emit('join', null, c.peer);
        });
        c.on('data', m => { if (this.conns.get(c.peer) === c) this.emit(m.t, m.d, c.peer); });
        c.on('close', () => { if (this.conns.get(c.peer) !== c) return; this.conns.delete(c.peer); this.emit('leave', null, c.peer); });     // (a replaced connection closing is not a leave)
      });
    });
  }
  pid() { let p = store('pg-pid'); if (!p) { p = 'partygame7-c-' + Array.from({ length: 10 }, () => IDC[Math.random() * IDC.length | 0]).join(''); store('pg-pid', p); } return p; }
  openPeer() {              // (re)register our stable id with the signalling server; resolves with the id
    return new Promise((res, rej) => {
      let done = false; const p = this.peer = new Peer(this.pid());
      p.on('open', id => { done = true; this.id = id; res(id); });
      p.on('error', e => { if (!done) { done = true; try { p.destroy(); } catch {} rej(e); } });
    });
  }
  connectOnce() {           // one attempt to (re)open the data connection to the host
    return new Promise(async (res, rej) => {
      try {
        if (!this.peer || this.peer.destroyed) await this.openPeer();
        else if (this.peer.disconnected) { this.peer.reconnect(); for (let i = 0; i < 40 && this.peer.disconnected; i++) await sleep(100); }
        let settled = false; const p = this.peer, c = p.connect('partygame7-' + this.code, { reliable: true });
        const onErr = e => fail(e);       // e.g. 'peer-unavailable' (wrong room code / host gone) comes through the peer, not the connection
        const fail = e => { if (!settled) { settled = true; p.off?.('error', onErr); try { c.close(); } catch {} rej(e); } };
        p.on('error', onErr); setTimeout(() => fail(new Error('timeout')), 8000);
        c.on('open', () => { if (settled) return; settled = true; p.off?.('error', onErr); this.hostConn = c; res(); });
        c.on('error', fail);
        c.on('data', m => { if (this.hostConn === c) this.emit(m.t, m.d, 'host'); });
        c.on('close', () => { if (this.hostConn !== c) return; this.hostConn = null; if (this.leaving) return; this.emit('lost'); this.reconnect(); });
      } catch (e) { rej(e); }
    });
  }
  async join(code) {
    this.code = code.toUpperCase(); this.leaving = false; store('pg-room', this.code);
    try { for (let i = 0; ; i++) { try { await this.openPeer(); break; } catch (e) { if (e?.type !== 'unavailable-id' || i >= 9) throw e; await sleep(1500); } }      // after a refresh the server may still hold our old id for a few seconds
      await this.connectOnce(); }
    catch (e) { store('pg-room', null); throw e; }
  }
  async reconnect() {       // keep trying (about 2.5 minutes - the host keeps our seat for the same time), then give up
    if (this.rc || this.leaving || this.isHost) return; this.rc = true; const t0 = Date.now(); let ok = false, gone = 0;
    while (!this.leaving && Date.now() - t0 < this.retryMs) {
      try { await this.connectOnce(); ok = true; break; }
      catch (e) { if (e?.type === 'peer-unavailable' && ++gone >= 6) break; if (e?.type !== 'peer-unavailable') gone = 0; await sleep(1500 + Math.min(4000, (Date.now() - t0) / 20)); }       // the host's id is no longer registered for ~10s in a row: the room is gone, stop waiting
    }
    this.rc = false; if (this.leaving) return;
    if (ok) this.emit('back'); else { store('pg-room', null); this.emit('closed'); }
  }
  leave() { this.leaving = true; store('pg-room', null); store('pg-pid', null); try { this.hostConn?.send({ t: 'bye' }); } catch {} setTimeout(() => { try { this.hostConn?.close(); this.peer?.destroy(); } catch {} }, 150); }      // an intentional leave frees the seat at once
  send(t, d) { try { if (this.hostConn?.open) this.hostConn.send({ t, d }); } catch {} }              // client -> host (dropped while the connection is down)
  broadcast(t, d) { for (const c of this.conns.values()) { try { c.send({ t, d }); } catch {} } } // host -> all
  sendTo(id, t, d) { try { this.conns.get(id)?.send({ t, d }); } catch {} }
}
