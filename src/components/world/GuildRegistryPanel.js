import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import bus from '../../game/bus';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import './GuildPanel.css';

// Debe coincidir con GUILD_CREATE_COST de routes/guilds.js en el back.
const CREATE_COST = 50000;

// Registro de Gremios de Aurelia (Oswin): buscar un gremio para unirse o fundar uno nuevo.
// Solo se abre hablando con Oswin; tu gremio, una vez dentro, se ve con la tecla G.
export default function GuildRegistryPanel({ id, tab: startTab = 'unirse', gold, onChanged, openWindow, refreshKey, ...props }) {
  const { token } = useAuth();
  const [tab, setTab] = useState(startTab);
  const [mine, setMine] = useState(undefined);
  const [guilds, setGuilds] = useState(null);
  const [search, setSearch] = useState('');
  const [requested, setRequested] = useState(() => new Set());
  const [form, setForm] = useState({ name: '', description: '', type: 'OPEN' });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(() => api.getMyGuildOpcional(token).then(setMine).catch(() => setMine(null)), [token]);
  const loadList = useCallback((q) => api.getGuilds(token, q).then(setGuilds).catch((e) => setMessage({ ok: false, text: e.message })), [token]);
  useEffect(() => { loadList(''); }, [loadList]);
  // también al cambiar algo en otra ventana (p. ej. salir del gremio desde G)
  useEffect(() => { loadMine(); }, [loadMine, refreshKey]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const run = async (fn, after) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      audio.sfx('mejora');
      setMessage({ ok: true, text: r?.message ?? 'Hecho.' });
      after?.(r);
      await loadMine();
      onChanged?.();
      bus.emit('guild-changed');
    } catch (err) {
      audio.sfx('error');
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const canAfford = Number(gold ?? 0) >= CREATE_COST;
  const nameOk = form.name.trim().length >= 3;

  return (
    <FloatingPanel
      {...props}
      id={id}
      title="Registro de Gremios"
      icon={<GameIcon name="quill-ink" artist="lorc" />}
      width={540}
      footer={(
        <div className="wp-tabs">
          {[['unirse', 'Unirse'], ['fundar', 'Fundar']].map(([t, label]) => (
            <button key={t} type="button" className={`wp-tab${tab === t ? ' wp-tab--active' : ''}`} onClick={() => setTab(t)}>{label}</button>
          ))}
          <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text}</span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(gold ?? 0).toLocaleString()}</span>
        </div>
      )}
    >
      <header className="gh-banner">
        <img className="gh-oswin" src={`${process.env.PUBLIC_URL}/assets/mundo/retratos/oswin.png`} alt="" />
        <div className="gh-banner-main">
          <strong>Oswin</strong>
          <small>Registro de Gremios de Aurelia</small>
          <p className="gh-note">
            {mine
              ? `«Ya figuras en el registro de ${mine.name}. Para cambiar de gremio, primero tienes que salir del tuyo (tecla G).»`
              : tab === 'fundar' ? '«Fundar un gremio cuesta 50.000 de oro. Elige bien el nombre: no se aceptan repetidos.»' : '«Los gremios abiertos te aceptan al momento; los cerrados reciben tu solicitud.»'}
          </p>
        </div>
      </header>

      {mine && (
        <div className="gh-card">
          <div className="gh-row"><span>Tu gremio</span><b>{mine.name} · nivel {mine.level}</b></div>
          <button type="button" className="wp-btn wp-btn--gold" onClick={() => openWindow?.('gremio')}>Abrir mi gremio (G)</button>
        </div>
      )}

      {!mine && mine !== undefined && tab === 'unirse' && (
        <>
          <form className="gh-actions gh-search" onSubmit={(e) => { e.preventDefault(); loadList(search); }}>
            <input className="wp-search" placeholder="Buscar gremio por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="wp-btn">Buscar</button>
          </form>
          <div className="gh-scroll">
            {guilds === null && <p className="wp-empty">Abriendo el registro…</p>}
            {guilds?.length === 0 && <p className="wp-empty">No hay gremios{search ? ` que se llamen «${search}»` : ''}. ¿Por qué no fundas el tuyo?</p>}
            {guilds?.map((g) => (
              <div key={g.id} className="gh-card">
                <div className="gh-row">
                  <b className="gh-guild-name">{g.name}</b>
                  <small>Nv {g.level} · {g.memberCount} miembro{g.memberCount === 1 ? '' : 's'} · {g.type === 'OPEN' ? 'Abierto' : 'Cerrado'}</small>
                </div>
                {g.description && <p className="gh-note">«{g.description}»</p>}
                <div className="gh-row">
                  <span>Líder: {g.leaderName}</span>
                  {g.type === 'OPEN'
                    ? <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={() => run(() => api.joinGuild(token, g.id))}>Unirme</button>
                    : (
                      <button type="button" className="wp-btn" disabled={busy || requested.has(g.id)} onClick={() => run(() => api.requestJoinGuild(token, g.id), () => setRequested((s) => new Set([...s, g.id])))}>
                        {requested.has(g.id) ? '✓ Solicitud enviada' : 'Pedir ingreso'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!mine && mine !== undefined && tab === 'fundar' && (
        <form
          className="gh-card gh-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.createGuild(token, { name: form.name.trim(), description: form.description.trim() || undefined, type: form.type }),
              () => setForm({ name: '', description: '', type: 'OPEN' }));
          }}
        >
          <label>Nombre del gremio<input className="wp-search" maxLength={50} placeholder="Entre 3 y 50 letras" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Mensaje para los miembros (opcional)<textarea className="wp-search" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="gh-radio">
            {[['OPEN', 'Abierto: cualquiera entra'], ['CLOSED', 'Cerrado: por solicitud']].map(([v, l]) => (
              <label key={v}><input type="radio" checked={form.type === v} onChange={() => setForm({ ...form, type: v })} /> {l}</label>
            ))}
          </div>
          <div className="gh-row">
            <span className={canAfford ? '' : 'gh-poor'}>
              Cuesta <GameIcon name="two-coins" artist="delapouite" /> {CREATE_COST.toLocaleString()}
              {!canAfford && ` · te faltan ${(CREATE_COST - Number(gold ?? 0)).toLocaleString()}`}
            </span>
            <button type="submit" className="wp-btn wp-btn--gold" disabled={busy || !canAfford || !nameOk}>Fundar gremio</button>
          </div>
        </form>
      )}
    </FloatingPanel>
  );
}
