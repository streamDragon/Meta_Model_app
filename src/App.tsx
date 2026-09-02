import { useCallback, useEffect, useState } from 'react';
import { FEATURES, isValidFeatureId } from './registry';
import { MobileFallback } from './components/MobileFallback';
import { WhyItMatters } from './components/WhyItMatters';
import { CourseDoor } from './features/home/CourseDoor';
import { useIsMobile } from './lib/useIsMobile';
import { HintProvider, useHint } from './store/hint';
import { ProgressProvider, useProgress } from './store/useProgress';
import { PracticeLaunchProvider } from './store/practiceLaunch';
import type { BadgeAward } from './store/progress';

const SOUND_KEY = 'soundEnabled';

function getTabFromHash(): string {
  const hashTab = decodeURIComponent(window.location.hash || '').replace('#', '');
  return hashTab && isValidFeatureId(hashTab) ? hashTab : 'home';
}

function useHashRoute() {
  const [activeTab, setActiveTab] = useState<string>(getTabFromHash);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(getTabFromHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((tab: string) => {
    window.location.hash = tab;
  }, []);

  return { activeTab, navigate };
}

// Short welcome chime (Web Audio). Played only when the user enables sound —
// audio is opt-in (audit Phase 2: no surprise autoplay).
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, duration: 0.4, delay: 0 },
      { freq: 659.25, duration: 0.4, delay: 0.15 },
      { freq: 783.99, duration: 0.5, delay: 0.3 },
    ];
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = note.freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, now + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.delay + note.duration);
      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.duration);
    });
  } catch {
    // audio not supported — ignore
  }
}

function useSoundSetting() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable
      }
      if (next) playChime();
      return next;
    });
  }, []);

  return { enabled, toggle };
}

function RailProgress() {
  const { progress } = useProgress();
  return (
    <div className="rail-progress" aria-label="התקדמות מהירה">
      <div className="rail-progress-item">
        <strong>{progress.xp}</strong>
        <span>XP</span>
      </div>
      <div className="rail-progress-item">
        <strong>{progress.streak}</strong>
        <span>רצף ימים</span>
      </div>
      <div className="rail-progress-item">
        <strong>{progress.badges.length}</strong>
        <span>תגים</span>
      </div>
    </div>
  );
}

function AppShell() {
  const { activeTab, navigate } = useHashRoute();
  const { hint, closeHint } = useHint();
  const sound = useSoundSetting();
  const isMobile = useIsMobile();
  // Lazy mount + keep alive: a feature renders on first visit and stays
  // mounted afterwards so in-progress sessions survive tab switches.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([activeTab]));
  useEffect(() => {
    setVisited((v) => (v.has(activeTab) ? v : new Set(v).add(activeTab)));
  }, [activeTab]);

  return (
    <div className="app-layout">
      <aside className="side-rail">
        <div className="rail-brand">
          <span className="rail-logo" aria-hidden="true">
            🧠
          </span>
          <div>
            <div className="rail-title">Meta Model Gym</div>
            <div className="rail-tagline">מעבדת שפה לאימון קוגניטיבי</div>
          </div>
        </div>

        <nav className="rail-nav" aria-label="מסכי האפליקציה">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`rail-link ${activeTab === f.id ? 'active' : ''}`}
              data-tab={f.id}
              aria-current={activeTab === f.id ? 'page' : undefined}
              onClick={() => navigate(f.id)}
            >
              <span className="rail-icon" aria-hidden="true">
                {f.icon}
              </span>
              <span className="rail-label">{f.navLabel}</span>
              {f.status !== 'production' && (
                <span className="status-chip">{f.status}</span>
              )}
            </button>
          ))}
        </nav>

        <RailProgress />

        <button type="button" className="sound-toggle" onClick={sound.toggle}>
          <span aria-hidden="true">{sound.enabled ? '🔊' : '🔇'}</span>
          <span>{sound.enabled ? 'צלילים פעילים' : 'צלילים כבויים'}</span>
        </button>
      </aside>

      <div className="workspace-wrap">
        <header className="mobile-topbar">
          <span className="topbar-logo" aria-hidden="true">
            🧠
          </span>
          <div>
            <strong>Meta Model Gym</strong>
            <small>מעבדת שפה לאימון קוגניטיבי</small>
          </div>
        </header>

        {hint && (
          <div className="app-toast" role="status">
            <span>{hint}</span>
            <button type="button" onClick={closeHint} className="close-hint" aria-label="סגור הודעה">
              ✕
            </button>
          </div>
        )}

        <main className="workspace">
          {/* All features stay mounted (like the legacy tab system) so
              in-progress trainer/blueprint/prism state survives tab switches. */}
          {FEATURES.map((f) => {
            const Feature = f.component;
            if (!visited.has(f.id) && activeTab !== f.id) return null;
            // Desktop-only features get a graceful fallback on small screens
            // instead of a broken squeezed layout (product rule, audit §5).
            const showFallback = isMobile && f.mobileSupport === 'none';
            return (
              <section
                key={f.id}
                id={f.id}
                className={`tab-content ${activeTab === f.id ? 'active' : ''}`}
              >
                {f.id === 'home' && <CourseDoor />}
                {showFallback ? <MobileFallback feature={f} /> : <Feature />}
              </section>
            );
          })}
        </main>

        <WhyItMatters featureId={activeTab} />

        <nav className="bottom-nav" aria-label="ניווט מהיר במובייל">
          {FEATURES.filter((f) => f.inBottomNav).map((f) => (
            <button
              key={f.id}
              type="button"
              className={`bottom-nav-btn ${activeTab === f.id ? 'active' : ''}`}
              data-tab={f.id}
              onClick={() => navigate(f.id)}
            >
              <span aria-hidden="true">{f.icon}</span>
              <strong>
                {f.id === 'blueprint'
                  ? 'Blueprint'
                  : f.id === 'prismlab'
                    ? 'פריזמות'
                    : f.navLabel}
              </strong>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function AppWithProviders() {
  const { showHint } = useHint();
  const onBadges = useCallback(
    (badges: BadgeAward[]) => {
      badges.forEach((b) => showHint(`🏆 פתחת תג חדש: ${b.name}`));
    },
    [showHint],
  );

  return (
    <ProgressProvider onBadges={onBadges}>
      <PracticeLaunchProvider>
        <AppShell />
      </PracticeLaunchProvider>
    </ProgressProvider>
  );
}

export default function App() {
  return (
    <HintProvider>
      <AppWithProviders />
    </HintProvider>
  );
}
