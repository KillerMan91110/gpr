import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveCombat, isCombatInProgress } from '../utils/activeCombat';
import GameIcon from './GameIcon';

const VIDEO_ID = 'oCA8DkQHC40';
const COMBAT_POLL_MS = 1500;
const MUTE_PREF_KEY = 'bgmMuted';
const VOLUME_PREF_KEY = 'bgmVolume';
const DEFAULT_VOLUME = 50;

// Carga el IFrame Player API de YouTube una sola vez (persiste entre navegaciones porque este
// componente vive en App.js, fuera de <Routes>, igual que CoopBar/ChatBox).
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!window.__ytApiPromise) {
    window.__ytApiPromise = new Promise((resolve) => {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        resolve(window.YT);
      };
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
  }
  return window.__ytApiPromise;
}

// Música de fondo global: suena en cualquier pantalla mientras estás logueado, se pausa sola
// apenas hay un combate en curso (mismo activeCombat que usa ProtectedRoute para redirigir) y
// retoma cuando el combate termina. Arranca muteada (autoplay con sonido lo bloquean los
// navegadores) y se desmutea sola en la primera interacción, salvo que el jugador la haya
// muteado a mano — esa preferencia sí se respeta y se guarda.
export default function BackgroundMusic() {
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_PREF_KEY) === 'true');
  const [volume, setVolume] = useState(() => {
    const stored = Number(localStorage.getItem(VOLUME_PREF_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : DEFAULT_VOLUME;
  });
  const playerRef = useRef(null);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  const wasInCombatRef = useRef(false);
  const unlockedRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new YT.Player('bgm-player', {
        height: '0',
        width: '0',
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: VIDEO_ID,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volumeRef.current);
            if (mutedRef.current) e.target.mute();
            e.target.playVideo();
            setReady(true);
          },
        },
      });
    });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Desmutea en la primera interacción del usuario (click/tecla/touch) si no la muteó a mano —
  // los navegadores bloquean audio con sonido sin gesto previo, así que arranca en silencio.
  useEffect(() => {
    if (!ready || muted || unlockedRef.current) return undefined;
    function unlock() {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      playerRef.current?.unMute();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [ready, muted]);

  // Pausa/reanuda según haya o no un combate en curso — mismo flag que ya escribe
  // ExploreZone/Tower/WorldBoss vía setActiveCombat/clearActiveCombat.
  useEffect(() => {
    if (!ready) return undefined;
    const iv = setInterval(() => {
      const inCombat = isCombatInProgress(getActiveCombat());
      if (inCombat === wasInCombatRef.current) return;
      wasInCombatRef.current = inCombat;
      if (inCombat) playerRef.current?.pauseVideo();
      else playerRef.current?.playVideo();
    }, COMBAT_POLL_MS);
    return () => clearInterval(iv);
  }, [ready]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_PREF_KEY, String(next));
    unlockedRef.current = true;
    if (next) playerRef.current?.mute();
    else playerRef.current?.unMute();
  }

  function handleVolumeChange(e) {
    const next = Number(e.target.value);
    setVolume(next);
    localStorage.setItem(VOLUME_PREF_KEY, String(next));
    unlockedRef.current = true;
    playerRef.current?.setVolume(next);
    if (next > 0 && muted) {
      setMuted(false);
      localStorage.setItem(MUTE_PREF_KEY, 'false');
      playerRef.current?.unMute();
    }
  }

  if (!isAuthenticated) return null;
  const isSilent = muted || volume === 0;

  return (
    <>
      <div id="bgm-player" style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden' }} />
      <div className="bgm-control">
        <button
          type="button"
          className="bgm-toggle"
          onClick={toggleMute}
          aria-label={isSilent ? 'Activar música' : 'Silenciar música'}
          title={isSilent ? 'Activar música' : 'Silenciar música'}
        >
          <GameIcon name={isSilent ? 'speaker-off' : 'speaker'} artist="delapouite" />
        </button>
        <div className="bgm-volume-popover">
          <input
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="bgm-volume-slider"
            aria-label="Volumen de la música"
          />
        </div>
      </div>
    </>
  );
}
