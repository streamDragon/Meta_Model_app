// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SleightOfMouthPage } from './SleightOfMouthPage';
import {
  CHALLENGE_FAMILIES,
  CONVERSATION_CASES,
  DIALOGUE_MOVES,
  movesFor,
} from '../../data/sleightConversation';
import { readyToChallenge, repairConnection, simulateChallenge } from './simulation';

afterEach(cleanup);

function startCase() {
  render(<SleightOfMouthPage />);
  fireEvent.click(screen.getByRole('button', { name: 'התחל מקרה' }));
}

function unlockBelief() {
  fireEvent.click(screen.getByRole('button', { name: 'בעיני מי ספציפית האיחור היה בעיה?' }));
  fireEvent.click(screen.getByRole('button', { name: 'מה זה אומר לך שהוא איחר?' }));
  fireEvent.click(screen.getByRole('button', { name: 'נתחיל את מהלכי זריזות הלשון' }));
}

describe('Sleight of Mouth conversation simulator', () => {
  it('has 14 Dilts patterns, seven Mind-Lines directions, and three challenge families', () => {
    expect(DIALOGUE_MOVES.filter((x) => x.system === 'dilts')).toHaveLength(14);
    expect(DIALOGUE_MOVES.filter((x) => x.system === 'mindlines')).toHaveLength(7);
    expect(CHALLENGE_FAMILIES).toHaveLength(3);
    expect(new Set(DIALOGUE_MOVES.map((x) => x.id)).size).toBe(21);
    for (const move of DIALOGUE_MOVES) {
      expect(move.sample).toHaveLength(CONVERSATION_CASES.length);
      expect(CHALLENGE_FAMILIES.map((x) => x.id)).toContain(move.family);
    }
    expect(movesFor('criteria', 'dilts').length).toBeGreaterThanOrEqual(2);
  });

  it('starts with a person telling a case and a short training introduction', () => {
    render(<SleightOfMouthPage />);
    expect(screen.getByRole('dialog', { name: 'איך מתרגלים זריזות לשון' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'התחל מקרה' }));
    expect(screen.getByText(/החתן שלי הוזמן לסעודת שבת/)).toBeTruthy();
    expect(screen.queryByText('״מי שמאחר ולא מודיע לי לא מכבד אותי.״')).toBeNull();
    expect(screen.getByRole('button', { name: 'מה זה אומר לך שהוא איחר?' })).toBeTruthy();
  });

  it('requires meta-model clarification of meaning before challenging a core belief', () => {
    expect(readyToChallenge(['whose', 'details'])).toBe(false);
    expect(readyToChallenge(['meaning'])).toBe(false);
    expect(readyToChallenge(['meaning', 'whose'])).toBe(true);
    startCase();
    fireEvent.click(screen.getByRole('button', { name: 'בעיני מי ספציפית האיחור היה בעיה?' }));
    expect(screen.getAllByText(/בעיניי. כולם חיכו/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: 'נתחיל את מהלכי זריזות הלשון' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'מה זה אומר לך שהוא איחר?' }));
    expect(screen.getByText('״מי שמאחר ולא מודיע לי לא מכבד אותי.״')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'נתחיל את מהלכי זריזות הלשון' }));
    expect(screen.getByRole('group', { name: 'שלוש משפחות של מהלכי אתגור' })).toBeTruthy();
  });

  it('keeps the original belief pinned, records an actual conversation and reveals the move on the map', () => {
    startCase();
    unlockBelief();
    fireEvent.click(screen.getByRole('button', { name: /כוונה איזה ערך האמונה/ }));
    expect(screen.getByLabelText('מה תגיד לדמות?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'אמור את המשפט' }));
    expect(screen.getAllByText(CONVERSATION_CASES[0].reactions.open).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('״מי שמאחר ולא מודיע לי לא מכבד אותי.״')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'פתח מפה חזותית של זריזות לשון' }));
    const map = screen.getByRole('dialog', { name: 'מפת זריזות לשון' });
    expect(within(map).getByText('כוונה')).toBeTruthy();
    expect(within(map).getAllByText('לא נחשף').length).toBe(20);
    fireEvent.click(within(map).getByRole('button', { name: 'סגור מפה' }));
    expect(screen.queryByRole('dialog', { name: 'מפת זריזות לשון' })).toBeNull();
  });

  it('keeps the three meters at their last reported values until the trainee asks calibration', () => {
    startCase();
    unlockBelief();
    fireEvent.click(screen.getByRole('button', { name: /כוונה איזה ערך האמונה/ }));
    fireEvent.click(screen.getByRole('button', { name: 'אמור את המשפט' }));
    expect(screen.getByText(/המדדים מציגים את הדיווח האחרון/)).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'ודאות באמונה' }).getAttribute('aria-valuenow')).toBe('9');
    fireEvent.click(screen.getByRole('button', { name: 'שאל את שלוש השאלות' }));
    expect(screen.getByRole('meter', { name: 'ודאות באמונה' }).getAttribute('aria-valuenow')).toBe('8');
    expect(screen.getByRole('meter', { name: 'אפשרויות טובות' }).getAttribute('aria-valuenow')).toBe('3');
    expect(screen.getAllByText(/אני מרגיש 4\/10/).length).toBeGreaterThanOrEqual(2);
  });

  it('lets a sharp challenge reinforce a belief and eventually cause a rupture', () => {
    const initial = { feeling: 3, conviction: 9, choices: 2, pressure: 0, turns: 0 };
    const move = DIALOGUE_MOVES[0];
    const first = simulateChallenge(initial, move, 'sharp');
    expect(first.reaction).toBe('resist');
    expect(first.next.conviction).toBe(10);
    const second = simulateChallenge(first.next, move, 'sharp');
    expect(second.reaction).toBe('rupture');
    expect(repairConnection(second.next).feeling).toBeGreaterThan(second.next.feeling);
  });

  it('offers an interactive explosion workshop, then allows connection repair', () => {
    startCase();
    unlockBelief();
    fireEvent.click(screen.getByRole('button', { name: /כוונה איזה ערך האמונה/ }));
    fireEvent.click(screen.getByRole('button', { name: /נוקב מאתגר בחדות/ }));
    fireEvent.click(screen.getByRole('button', { name: 'אמור את המשפט' }));
    fireEvent.click(screen.getByRole('button', { name: /כוונה איזה ערך האמונה/ }));
    fireEvent.click(screen.getByRole('button', { name: 'אמור את המשפט' }));
    expect(screen.getByRole('alertdialog', { name: 'פיצוץ בשיחה' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לסדנת פיצוצים' }));
    expect(screen.getByRole('dialog', { name: 'סדנת פיצוצים' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לצעד הבא' }));
    fireEvent.click(screen.getByRole('button', { name: 'לצעד הבא' }));
    fireEvent.click(screen.getByRole('button', { name: 'להחזיר קשר ולהמשיך' }));
    expect(screen.queryByRole('dialog', { name: 'סדנת פיצוצים' })).toBeNull();
    expect(screen.getAllByText(CONVERSATION_CASES[0].reactions.repair).length).toBeGreaterThanOrEqual(2);
  });

  it('switches scenarios, resets the story and clears previous move history', () => {
    startCase();
    unlockBelief();
    fireEvent.click(screen.getByRole('button', { name: /כוונה איזה ערך האמונה/ }));
    fireEvent.click(screen.getByRole('button', { name: 'אמור את המשפט' }));
    fireEvent.click(screen.getByRole('button', { name: 'הערה בישיבה' }));
    expect(screen.getByText(/בישיבת הצוות המנהלת/)).toBeTruthy();
    expect(screen.queryByText(CONVERSATION_CASES[0].coreBelief)).toBeNull();
    expect(screen.getByRole('meter', { name: 'ודאות באמונה' }).getAttribute('aria-valuenow')).toBe('8');
  });
});
