"use client";

import * as React from "react";

import {
  CardFallbackLinks,
  type CardFallbackLink,
} from "./card-fallback-links";

type Props = {
  title: string;
  fallbackLinks?: readonly CardFallbackLink[];
  /** Overrides the default “section failed, rest of card still works” copy. */
  fallbackMessage?: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Isolates special card tools (budget, categorías, emails, …) so a render or
 * child failure does not blank the whole card dialog — description, checklists
 * and Excel/Drive attachments stay usable.
 */
export class CardSpecialSectionBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("boards.card_special_section", this.props.title, error);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const links = this.props.fallbackLinks ?? [];

    return (
      <section className="space-y-3 border-t border-dashed pt-4">
        <h3 className="text-sm font-semibold">{this.props.title}</h3>
        <p className="text-muted-foreground text-sm">
          {this.props.fallbackMessage ??
            "Esta sección no se pudo mostrar. El resto de la tarjeta sigue disponible (descripción, adjuntos y comentarios)."}
        </p>
        <CardFallbackLinks
          links={links}
          note="Continúa con estos respaldos mientras se resuelve:"
        />
        <button
          type="button"
          className="text-primary text-sm underline-offset-4 hover:underline"
          onClick={() => this.setState({ error: null })}
        >
          Reintentar
        </button>
      </section>
    );
  }
}
