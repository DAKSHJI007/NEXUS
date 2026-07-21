import { useEffect, useMemo, useState } from 'react';
import {
  Radar, Settings as SettingsIcon, Command as CommandIcon, GripVertical,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { ThemeApplier } from '@/lib/theme';
import AuthScreen from '@/components/AuthScreen';
import OnboardingWizard from '@/components/OnboardingWizard';
import SettingsPanel from '@/components/SettingsPanel';
import CommandPalette, { type Command } from '@/components/CommandPalette';
import ParticleField from '@/components/ParticleField';
import ClockWidget from '@/components/widgets/ClockWidget';
import WeatherWidget from '@/components/widgets/WeatherWidget';
import TodosWidget from '@/components/widgets/TodosWidget';
import NotesWidget from '@/components/widgets/NotesWidget';
import PomodoroWidget from '@/components/widgets/PomodoroWidget';
import NewsWidget from '@/components/widgets/NewsWidget';

const WIDGETS: Record<string, () => JSX.Element> = {
  clock: ClockWidget,
  weather: WeatherWidget,
  todos: TodosWidget,
  notes: NotesWidget,
  pomodoro: PomodoroWidget,
  news: NewsWidget,
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, toggleWidget, reorderWidgets } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const layout = settings?.widget_layout ?? ['clock', 'weather', 'todos', 'notes', 'pomodoro', 'news'];
  const visibleLayout = useMemo(
    () => layout.filter((id) => settings?.widget_visibility?.[id] ?? true),
    [layout, settings?.widget_visibility]
  );

  const commands: Command[] = [
    { id: 'settings', label: 'Open Settings', hint: 'panel', run: () => setSettingsOpen(true) },
    { id: 'scroll-top', label: 'Scroll to top', hint: 'nav', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    ...visibleLayout.map((id) => ({
      id: `goto-${id}`,
      label: `Jump to ${id.charAt(0).toUpperCase() + id.slice(1)}`,
      hint: 'nav',
      run: () => document.getElementById(`widget-${id}`)?.scrollIntoView({ behavior: 'smooth' }),
    })),
  ];

  const onDrop = () => {
    if (dragIdx === null || dragOver === null || dragIdx === dragOver) {
      setDragIdx(null); setDragOver(null);
      return;
    }
    const next = [...visibleLayout];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dragOver, 0, moved);
    reorderWidgets(next);
    setDragIdx(null); setDragOver(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-8 w-48" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (settingsLoading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-8 w-48" />
      </div>
    );
  }

  if (!settings.onboarded) {
    return (
      <>
        <ThemeApplier />
        <OnboardingWizard />
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <ThemeApplier />
      <ParticleField active={settings.background === 'particles'} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-soft backdrop-blur-xl" style={{ borderColor: 'var(--border-soft)', background: 'var(--overlay)' }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Radar className="h-6 w-6 text-accent" style={{ color: 'var(--accent)' }} />
            <div className="leading-none">
              <div className="text-sm font-bold tracking-wide">NEXUS</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted">Mission Control</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-soft px-2.5 py-1.5 text-xs text-secondary transition-colors hover:text-primary"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <CommandIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Command</span>
              <kbd className="rounded border border-soft px-1 text-[10px] text-muted" style={{ borderColor: 'var(--border-soft)' }}>⌘K</kbd>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-soft px-2.5 py-1.5 text-xs text-secondary transition-colors hover:text-primary"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 fade-in">
          <h1 className="text-2xl font-bold">
            {settings.timezone ? `Hello, ${user.email?.split('@')[0] ?? 'there'}` : 'Welcome back'}
          </h1>
          <p className="text-sm text-secondary">Your personal command center — synced across devices.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleLayout.map((id, idx) => {
            const Widget = WIDGETS[id];
            if (!Widget) return null;
            return (
              <div
                key={id}
                id={`widget-${id}`}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDragEnd={onDrop}
                className={`slide-up transition-opacity ${dragOver === idx && dragIdx !== null ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative h-full">
                  <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 opacity-0 transition-opacity hover:opacity-60">
                    <GripVertical className="h-4 w-4 text-muted" />
                  </div>
                  <Widget />
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-8 border-t border-soft py-6 text-center text-xs text-muted" style={{ borderColor: 'var(--border-soft)' }}>
          <p>NEXUS Mission Control — press ⌘K for commands, drag widgets to reorder.</p>
        </footer>
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
