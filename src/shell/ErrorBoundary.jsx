import { Component } from "react";

// Fängt Renderfehler ab: statt leerem Bildschirm eine verständliche Seite mit
// Ausweg. Bewusst ohne Abhängigkeiten, damit sie auch bei kaputtem Modul rendert.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[pharos] Renderfehler", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-4">
        <div role="alert" className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold">Hier ist etwas schiefgelaufen</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Die Ansicht konnte nicht geladen werden. Deine gespeicherten Favoriten und der Verlauf bleiben erhalten.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 h-12 rounded-lg bg-accent text-bg-primary font-semibold"
            >
              Neu laden
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="flex-1 h-12 rounded-lg border border-border text-text-secondary"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </main>
    );
  }
}
