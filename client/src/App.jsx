import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
const ArenaCanvas = lazy(() => import('./game/ArenaCanvas.jsx'));
import MobileControls from './components/MobileControls.jsx';
import RulesPanel from './components/RulesPanel.jsx';
import { socket, request } from './network/socket.js';
import { playTone } from './game/audio.js';

const initialInput = () => ({ x: 0, z: 0, moveX: 0, moveZ: 0, touchActive: false, aimX: 0, aimZ: -1 });
const formatTime = (ms) => `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor((Math.max(0, ms) % 60000) / 1000)).padStart(2, '0')}`;

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState(null);
  const [state, setState] = useState(null);
  const [selfId, setSelfId] = useState('');
  const [name, setName] = useState(() => localStorage.getItem('neon-pilot') || '');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [timeNow, setTimeNow] = useState(Date.now());
  const inputRef = useRef(initialInput());
  const lastShot = useRef(0);
  const mouseDown = useRef(false);

  const currentRoom = state || room;
  const notice = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  // Parse invite room parameter from URL on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room') || params.get('join');
      if (code) {
        setJoinCode(code.trim().toUpperCase().slice(0, 5));
      }
    } catch {
      /* ignore URL parse errors */
    }
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      if (currentRoom) setError('Connection lost. Reconnect to rejoin the arena.');
    };
    const onRoom = (value) => {
      setRoom(value);
      setState((prev) => (prev ? { ...prev, ...value } : value));
    };
    const onState = (value) => {
      setState(value);
      setRoom(value);
    };
    const onEvent = (event) => {
      if (event.type === 'hit') {
        if (soundOn) playTone('hit');
        notice(event.victimId === selfId ? 'SHIELD HIT · -34' : 'DIRECT HIT · +34');
      }
      if (event.type === 'elimination') {
        if (soundOn) playTone('eliminate');
        notice(event.victimId === selfId ? 'SIGNAL LOST · RESPAWNING' : 'RIVAL ELIMINATED · +1');
      }
      if (event.type === 'match-start' && soundOn) playTone('start');
      if (event.type === 'sudden-death') notice('SUDDEN DEATH · NEXT ELIMINATION WINS');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoom);
    socket.on('game:state', onState);
    socket.on('game:event', onEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onRoom);
      socket.off('game:state', onState);
      socket.off('game:event', onEvent);
    };
  }, [currentRoom?.code, notice, selfId, soundOn]);

  useEffect(() => {
    const t = window.setInterval(() => setTimeNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const connectIfNeeded = async () => {
    if (socket.connected) return;
    socket.connect();
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        reject(new Error('Could not reach the arena server. Try again in a moment.'));
      }, 8500);
      const onConnect = () => {
        clearTimeout(timer);
        socket.off('connect_error', onError);
        resolve();
      };
      const onError = () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        reject(new Error('Could not reach the arena server. Try again in a moment.'));
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    });
  };

  const enterRoom = async (actionFn) => {
    setError('');
    setBusy(true);
    try {
      const clean = name.trim().slice(0, 18);
      if (!clean) throw new Error('Choose a pilot callsign first.');
      localStorage.setItem('neon-pilot', clean);
      await connectIfNeeded();
      const result = await actionFn(clean);
      setSelfId(result.playerId);
      setRoom(result.room);
      setState(result.room);
      inputRef.current = initialInput();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createRoom = () => enterRoom((pilot) => request('room:create', { name: pilot }));
  const joinRoom = (event) => {
    if (event) event.preventDefault();
    enterRoom((pilot) => request('room:join', { name: pilot, code: joinCode }));
  };

  const action = async (event, payload) => {
    setError('');
    try {
      const result = await request(event, payload);
      if (result.room) {
        setRoom(result.room);
        setState(result.room);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const fire = useCallback(() => {
    if (!socket.connected || Date.now() - lastShot.current < 450) return;
    lastShot.current = Date.now();
    if (soundOn) playTone('shot');
    socket.emit('game:fire', {}, (response) => {
      if (response && !response.ok && response.error.includes('inactive')) {
        setError(response.error);
      }
    });
  }, [soundOn]);

  const dodge = useCallback(() => {
    const i = inputRef.current;
    if (soundOn) playTone('dodge');
    socket.emit('game:dodge', { x: i.x || i.aimX, z: i.z || i.aimZ });
  }, [soundOn]);

  // Game Input Tick (AUTHORITATIVE STREAMING)
  useEffect(() => {
    if (currentRoom?.phase !== 'active') return undefined;
    const timer = window.setInterval(() => {
      const keys = window.__arenaKeys || new Set();
      let x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      let z = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
      if (Math.hypot(x, z) > 1) {
        const len = Math.hypot(x, z);
        x /= len;
        z /= len;
      }

      const hasKeyInput = Math.hypot(x, z) > 0.01;
      if (hasKeyInput) {
        // Physical keyboard immediately takes priority over touch
        inputRef.current.touchActive = false;
        inputRef.current.x = x;
        inputRef.current.z = z;
      } else if (inputRef.current.touchActive) {
        inputRef.current.x = inputRef.current.moveX;
        inputRef.current.z = inputRef.current.moveZ;
      } else {
        inputRef.current.x = 0;
        inputRef.current.z = 0;
      }

      socket.emit('game:input', inputRef.current);
      if (mouseDown.current) fire();
    }, 50);

    return () => clearInterval(timer);
  }, [currentRoom?.phase, fire]);

  // KEYBOARD & POINTER LISTENERS WITH AZERTY & IME FOCUS PROTECTION
  useEffect(() => {
    const keys = new Set();
    window.__arenaKeys = keys;

    const isTyping = (target) => {
      if (!target) return false;
      const tag = target.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    };

    const down = (e) => {
      if (isTyping(e.target)) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      // Support QWERTY (WASD), AZERTY (ZQSD), Arrows & NumPad
      const isUp = code === 'KeyW' || code === 'KeyZ' || key === 'w' || key === 'z' || key === 'arrowup' || code === 'Numpad8';
      const isLeft = code === 'KeyA' || code === 'KeyQ' || key === 'a' || key === 'q' || key === 'arrowleft' || code === 'Numpad4';
      const isDown = code === 'KeyS' || key === 's' || key === 'arrowdown' || code === 'Numpad2';
      const isRight = code === 'KeyD' || key === 'd' || key === 'arrowright' || code === 'Numpad6';
      const isDodge = code === 'Space' || key === ' ' || code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyK' || code === 'Numpad0';
      const isFire = code === 'KeyF' || code === 'KeyE' || code === 'KeyJ' || code === 'Numpad5' || code === 'Enter';

      if (isUp || isLeft || isDown || isRight || isDodge) {
        e.preventDefault();
      }

      if (isUp) keys.add('up');
      if (isLeft) keys.add('left');
      if (isDown) keys.add('down');
      if (isRight) keys.add('right');

      if (key === 'escape') setShowSettings((v) => !v);
      if (isDodge && currentRoom?.phase === 'active') dodge();
      if (isFire && currentRoom?.phase === 'active') fire();
    };

    const up = (e) => {
      if (isTyping(e.target)) return;
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || code === 'KeyZ' || key === 'w' || key === 'z' || key === 'arrowup' || code === 'Numpad8') keys.delete('up');
      if (code === 'KeyA' || code === 'KeyQ' || key === 'a' || key === 'q' || key === 'arrowleft' || code === 'Numpad4') keys.delete('left');
      if (code === 'KeyS' || key === 's' || key === 'arrowdown' || code === 'Numpad2') keys.delete('down');
      if (code === 'KeyD' || key === 'd' || key === 'arrowright' || code === 'Numpad6') keys.delete('right');
    };

    const blur = () => {
      keys.clear();
      mouseDown.current = false;
    };

    const pointerDown = (event) => {
      if (event.button !== 0 || !event.target.closest?.('.arena-canvas') || currentRoom?.phase !== 'active') return;
      mouseDown.current = true;
      fire();
    };

    const pointerUp = () => {
      mouseDown.current = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
    };
  }, [currentRoom?.phase, dodge, fire]);

  const leave = async () => {
    await action('room:leave');
    socket.disconnect();
    setRoom(null);
    setState(null);
    setSelfId('');
    setError('');
  };

  const addBot = () => action('room:add-bot');
  const removeBot = (botId) => action('room:remove-bot', { botId });

  // Main Menu Screen
  if (!currentRoom) {
    return (
      <main className="menu-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <header className="topbar">
          <a className="brand" href="#home">
            <span className="brand-mark">N</span>
            <span>NEON<span className="brand-light">/ARENA</span></span>
          </a>
          <div className="connection">
            <i className={connected ? 'online' : ''} />
            {connected ? 'ARENA LINKED' : 'READY TO CONNECT'}
          </div>
        </header>

        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />MULTIPLAYER COMBAT · SEASON 01
            </div>
            <h1>ENTER<br /><span>THE ARENA.</span></h1>
            <p className="tagline">Master the energy. Become the champion.</p>
            <div className="hero-stats">
              <span><b>02—04</b> PILOTS</span>
              <span className="stat-divider" />
              <span><b>05</b> ELIMS TO WIN</span>
              <span className="stat-divider" />
              <span><b>03:00</b> PER MATCH</span>
            </div>
          </div>

          <div className="entry-card">
            <div className="card-overline">
              PILOT TERMINAL <span>● ONLINE</span>
            </div>
            <label htmlFor="pilot-name">CALLSIGN</label>
            <input
              id="pilot-name"
              maxLength="18"
              autoComplete="nickname"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[<>]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            />
            <button className="primary-button" disabled={busy} onClick={createRoom}>
              <span>{busy ? 'CONNECTING…' : 'CREATE A ROOM'}</span>
              <b>↗</b>
            </button>
            <div className="or-divider"><span /> OR JOIN SQUAD <span /></div>
            <form className="join-row" onSubmit={joinRoom}>
              <input
                aria-label="Room code"
                maxLength="5"
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
              />
              <button disabled={busy || joinCode.length !== 5}>JOIN <b>→</b></button>
            </form>
            {error && <div className="error-message" role="alert">{error}</div>}
            <p className="privacy-note"><span>⌁</span> Share the 5-digit room code with your friends or play against AI bots.</p>
          </div>
        </section>

        <div className="bottom-layout">
          <RulesPanel />
          <aside className="first-run">
            <div className="eyebrow">FIRST DROP?</div>
            <h2>Your first 30 seconds</h2>
            <ol>
              <li><i>01</i> Pick a callsign and create or join a room.</li>
              <li><i>02</i> Ready up with a friend or add AI Training Bots.</li>
              <li><i>03</i> WASD/Arrows to move, Mouse/E/F to Pulse, Space to Dodge. First to 5 wins.</li>
            </ol>
          </aside>
        </div>

        <footer className="footer">
          <span>NEON ARENA BATTLE · BUILD 02</span>
          <span>BUILT FOR THE HANDSHAKE X OPENAI MULTIPLAYER GAME CHALLENGE</span>
        </footer>
      </main>
    );
  }

  // Active / Lobby / Ended Match Screen
  const players = currentRoom.players || [];
  const me = players.find((p) => p.id === selfId);
  const remaining = currentRoom.phase === 'active' ? currentRoom.endsAt - timeNow : 0;
  const countdown = currentRoom.phase === 'countdown' ? Math.max(1, Math.ceil((currentRoom.countdownEndsAt - timeNow) / 1000)) : 0;
  const winner = players.find((p) => p.id === currentRoom.winnerId);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.code);
      notice('ROOM CODE COPIED');
    } catch {
      notice(`ROOM CODE · ${currentRoom.code}`);
    }
  };

  const copyInvite = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      notice('INVITE LINK COPIED');
    } catch {
      copyCode();
    }
  };

  return (
    <main className="game-shell">
      <Suspense fallback={<div className="arena-loading">CHARGING THE ARENA…</div>}>
        <ArenaCanvas state={currentRoom} selfId={selfId} inputRef={inputRef} />
      </Suspense>

      <header className="game-topbar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>NEON<span className="brand-light">/ARENA</span></span>
        </div>
        <div className="room-chip">
          <span>ROOM</span>
          <b>{currentRoom.code}</b>
          <button onClick={copyInvite} title="Copy invite link" aria-label="Copy invite link">🔗</button>
        </div>
        <div className={`connection game-connection ${connected ? '' : 'offline'}`}>
          <i className={connected ? 'online' : ''} />
          {connected ? 'LIVE' : 'RECONNECTING'}
        </div>
      </header>

      <aside className="scoreboard">
        <div className="scoreboard-label">PILOTS <span>{players.length}/4</span></div>
        {players.map((p, index) => (
          <div key={p.id} className={`pilot-score ${p.id === selfId ? 'is-self' : ''}`}>
            <span className={`pilot-dot c${index}`} />
            <div>
              <b>{p.name}{p.id === selfId ? ' · YOU' : p.isBot ? ' [AI]' : ''}</b>
              <small>{p.alive ? 'IN THE ARENA' : 'RESPAWNING'}</small>
            </div>
            <strong>{String(p.score).padStart(2, '0')}</strong>
          </div>
        ))}
      </aside>

      <div className="match-clock">
        <span>
          {currentRoom.suddenDeath
            ? 'SUDDEN DEATH'
            : currentRoom.phase === 'lobby'
            ? 'LOBBY'
            : currentRoom.phase === 'countdown'
            ? 'MATCH START'
            : currentRoom.phase === 'ended'
            ? 'MATCH COMPLETE'
            : 'TIME REMAINING'}
        </span>
        <b>
          {currentRoom.suddenDeath
            ? 'NEXT ELIM'
            : currentRoom.phase === 'active'
            ? formatTime(remaining)
            : currentRoom.phase === 'countdown'
            ? `0:0${countdown}`
            : currentRoom.phase === 'lobby'
            ? '—:——'
            : 'FINAL'}
        </b>
      </div>

      <div className="bottom-hud">
        <div className="health-panel">
          <div className="health-caption">
            <span>VITALS <b>{me?.alive ? `${me.hp ?? 100}%` : 'OFFLINE'}</b></span>
            <span>{Date.now() < (me?.protectedUntil || 0) ? 'SHIELD' : 'PULSE READY'}</span>
          </div>
          <div className="health-track">
            <i style={{ width: `${Math.max(0, me?.hp ?? 100)}%` }} />
          </div>
        </div>
        <div className="combat-tip">
          WASD/ARROWS MOVE <i>·</i> MOUSE/E/F AIM & PULSE <i>·</i> SPACE/SHIFT DODGE
        </div>
      </div>

      {currentRoom.phase === 'lobby' && (
        <section className="lobby-panel">
          <div className="eyebrow">SQUAD LOBBY · {players.length}/4</div>
          <h1>Rally your crew.</h1>
          <p>Share the room code or invite link. You can also add AI training bots for solo practice.</p>
          <div className="lobby-players">
            {Array.from({ length: 4 }, (_, i) => {
              const p = players[i];
              return (
                <div className={`lobby-player ${p ? 'occupied' : ''}`} key={p?.id || i}>
                  <span className={`pilot-dot c${i}`} />
                  {p ? (
                    <>
                      <b>{p.name}{p.id === selfId ? ' (YOU)' : p.isBot ? ' [AI]' : ''}</b>
                      <small>{p.ready ? 'READY' : 'WARMING UP'}</small>
                      {p.isBot && currentRoom.hostId === selfId && (
                        <button
                          className="bot-remove-btn"
                          title="Remove bot"
                          onClick={() => removeBot(p.id)}
                        >
                          ×
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="waiting">AWAITING PILOT</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="lobby-actions">
            <button
              className={`ready-button ${me?.ready ? 'ready-on' : ''}`}
              onClick={() => action('room:ready', { ready: !me?.ready })}
            >
              {me?.ready ? '✓ READY' : 'I’M READY'}
            </button>

            {currentRoom.hostId === selfId && players.length < 4 && (
              <button className="add-bot-button" onClick={addBot}>
                + ADD AI BOT
              </button>
            )}

            {currentRoom.hostId === selfId && (
              <button
                className="start-button"
                disabled={players.length < 2 || players.some((p) => !p.ready)}
                onClick={() => action('room:start')}
              >
                START MATCH <b>→</b>
              </button>
            )}
          </div>
          <button className="text-button" onClick={leave}>LEAVE ROOM</button>
        </section>
      )}

      {currentRoom.phase === 'countdown' && (
        <div className="phase-overlay">
          <div className="eyebrow">LOCKING IN</div>
          <strong>{countdown}</strong>
          <span>GET READY</span>
        </div>
      )}

      {currentRoom.phase === 'ended' && (
        <section className="results-card">
          <div className="eyebrow">MATCH COMPLETE</div>
          <h1>{winner?.id === selfId ? 'CHAMPION.' : winner ? `${winner.name} WINS.` : 'MATCH DRAW.'}</h1>
          <p>{winner?.id === selfId ? 'The arena remembers.' : `${winner?.name || 'The squad'} claimed the final pulse.`}</p>
          <div className="results-list">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id}>
                <span>0{i + 1} &nbsp; {p.name}{p.isBot ? ' [AI]' : ''}</span>
                <b>{p.score} ELIMS</b>
              </div>
            ))}
          </div>
          {currentRoom.hostId === selfId ? (
            <button className="primary-button" onClick={() => action('room:rematch')}>
              <span>RETURN TO LOBBY</span><b>↻</b>
            </button>
          ) : (
            <p className="waiting-host">Waiting for the host to return to lobby…</p>
          )}
          <button className="text-button" onClick={leave}>LEAVE ROOM</button>
        </section>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {error && (
        <div className="game-error" role="alert">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {currentRoom.phase === 'active' && (
        <MobileControls inputRef={inputRef} onFire={fire} onDodge={dodge} />
      )}

      {showSettings && (
        <div className="settings-scrim">
          <section className="settings-card">
            <button className="close-settings" onClick={() => setShowSettings(false)}>×</button>
            <div className="eyebrow">PILOT SETTINGS</div>
            <h2>Stay in the fight.</h2>
            <p>Opening settings does not pause the live match.</p>
            <button className="setting-row" onClick={() => setSoundOn((v) => !v)}>
              SOUND EFFECTS <b>{soundOn ? 'ON' : 'OFF'}</b>
            </button>
            <button className="setting-row" onClick={leave}>
              LEAVE ROOM <b>↗</b>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
