// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { certaintyColor, BeliefDiagram } from './DiltsBeliefMap';
import type { MoveId } from '../../data/sleightConversation';

afterEach(cleanup);

describe('Dilts diagram certainty and interaction', () => {
  it('uses more intense purple for stronger certainty, not for the number of moves', () => {
    expect(certaintyColor(2).fill).toBe('hsl(256 75% 86.4%)');
    expect(certaintyColor(9).fill).toBe('hsl(256 75% 49.3%)');
    expect(certaintyColor(-5)).toEqual(certaintyColor(0));
    expect(certaintyColor(20)).toEqual(certaintyColor(10));
  });

  it('keeps all Dilts patterns visible even when none are completed', () => {
    render(<BeliefDiagram belief="אמונה לבחינה" conviction={9} used={[]} certainties={{}} caseIndex={0} />);
    expect(document.querySelectorAll('.som-diagram-node')).toHaveLength(14);
    expect(screen.getByTestId('map-node-intention').getAttribute('data-certainty')).toBe('unmeasured');
    expect(screen.getByText('נוסו 0 מתוך 21')).toBeTruthy();
    expect(screen.getByText(/מידת ודאות: 9 מתוך 10/)).toBeTruthy();
  });

  it('shows calibrated certainty only on the measured move and switches to Mind-Lines', () => {
    const scores: Partial<Record<MoveId, number>> = { intention: 4 };
    render(<BeliefDiagram belief="אמונה" conviction={4} used={['intention']} certainties={scores} caseIndex={0} />);
    expect(screen.getByTestId('map-node-intention').getAttribute('data-certainty')).toBe('4');
    expect(screen.getByTestId('map-node-redefine').getAttribute('data-certainty')).toBe('unmeasured');
    fireEvent.click(screen.getByRole('button', { name: '7 כיווני Mind-Lines' }));
    expect(document.querySelectorAll('.som-diagram-node')).toHaveLength(7);
    expect(screen.getByTestId('map-node-mind-pre')).toBeTruthy();
  });

  it('opens the clicked technique and offers it for use in the conversation', () => {
    let picked: MoveId | null = null;
    render(<BeliefDiagram belief="אמונה" conviction={9} used={[]} certainties={{}} caseIndex={0} onChoose={(move)=>{picked=move.id;}} />);
    fireEvent.click(screen.getByTestId('map-node-intention'));
    expect(screen.getByRole('region', { name: 'פרטי המהלך שנבחר' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'בחר את המהלך לשיחה' }));
    expect(picked).toBe('intention');
  });
});
