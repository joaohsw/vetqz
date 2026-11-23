import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CoilLanding from '../../src/pages/CoilLanding';

describe('CoilLanding', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders academic COIL details, courses, teams, advisors, videos, and links to the app', () => {
    render(<CoilLanding />);

    const appLinks = screen.getAllByRole('link', { name: /Acessar/i });
    expect(appLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of appLinks) {
      expect(link.getAttribute('href')).toBe('/');
    }

    // Academic context & courses
    expect(screen.getAllByText(/ELC1074 — Projeto de Software II/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ZOO-00171 — Anatomía de Animales de Compañía/i).length).toBeGreaterThanOrEqual(1);

    // Chilean validation and multiple-choice addition
    expect(screen.getByText(/Evidências de uso e contribuição das colegas chilenas/i)).toBeTruthy();
    expect(screen.getByText(/Inclusão do modo de múltipla escolha/i)).toBeTruthy();

    // Teams & advisors
    expect(screen.getByText('Valentina Ávila Reyes')).toBeTruthy();
    expect(screen.getByText('Flávia Montenegro')).toBeTruthy();
    expect(screen.getByText('João Henrique Scherer Wolski')).toBeTruthy();
    expect(screen.getByText('Andrea Schwertner Charão')).toBeTruthy();
    expect(screen.getByText('Celio Trois')).toBeTruthy();

    // Video elements (demo and making-of YouTube embeds)
    const iframes = Array.from(document.querySelectorAll('iframe')).map((el) =>
      el.getAttribute('src')
    );
    expect(iframes).toEqual([
      'https://www.youtube.com/embed/Ngf2J0JtF64',
      'https://www.youtube.com/embed/onNsnU_wX50',
    ]);
  });

  it('switches language to es-CL and switches interactive figure tabs', async () => {
    const user = userEvent.setup();
    render(<CoilLanding />);

    await user.click(screen.getByRole('button', { name: /Mudar para Español/i }));
    expect(screen.getByText(/Evidencias de uso y aportes de las colegas chilenas/i)).toBeTruthy();

    const mcTab = screen.getByRole('tab', { name: /Opción múltiple/i });
    await user.click(mcTab);
    expect(mcTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Revisión de pregunta de opción múltiple/i)).toBeTruthy();
  });
});
