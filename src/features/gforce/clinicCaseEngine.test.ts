import { describe, it, expect } from 'vitest';
import { ask, createSession, moveScene, SCENES, suggestedQuestions, summarizeSession } from './clinicCaseEngine';

describe('non-linear G-Force clinic simulation', () => {
  it('starts without any known images and without a prescribed sequence', () => {
    const session = createSession();
    expect(session.sceneOrder).toEqual([]);
    expect(session.turns).toHaveLength(0);
    expect(suggestedQuestions(session).some(question => question.id === 'now-sense')).toBe(true);
  });

  it('reveals visuals only from exact sensory questions, not meta questions alone', () => {
    let session = ask(createSession(), 'goal');
    session = ask(session, 'first-action');
    session = ask(session, 'prepare');
    session = ask(session, 'time-before');
    session = ask(session, 'values');
    expect(session.sceneOrder).toEqual([]);
    session = ask(session, 'goal-sense');
    expect(session.sceneOrder).toEqual(['goal']);
    expect(session.lastReveal).toBe('goal');
    session = ask(session, 'goal-sense');
    expect(session.sceneOrder).toEqual(['goal']);
    expect(session.lastReveal).toBeNull();
  });

  it('allows a final scene to appear before the initial scene, then reorder', () => {
    let session = ask(createSession(), 'goal-sense');
    session = ask(session, 'now-sense');
    expect(session.sceneOrder).toEqual(['goal', 'room']);
    expect(summarizeSession(session).canCompare).toBe(true);
    session = moveScene(session, 'room', -1);
    expect(session.sceneOrder).toEqual(['room', 'goal']);
  });

  it('returns an honest I do not know when a precise scene is requested prematurely', () => {
    let session = ask(createSession(), 'first-sense');
    expect(session.sceneOrder).toHaveLength(0);
    expect(session.response).toContain('עוד לא יודע');
    session = ask(session, 'first-action');
    session = ask(session, 'first-sense');
    expect(session.sceneOrder).toEqual(['collect']);
  });

  it('treats exploration of barriers as a branch and not a required main step', () => {
    let session = ask(createSession(), 'barrier');
    expect(session.sceneOrder).toHaveLength(0);
    session = ask(session, 'stuck-sense');
    expect(session.sceneOrder).toEqual(['stuck']);
    expect(SCENES[session.sceneOrder[0]].kind).toBe('branch');
    expect(summarizeSession(session).main).toHaveLength(0);
    expect(summarizeSession(session).branches).toEqual(['stuck']);
  });

  it('has consequences for pushing and for repairing rapport', () => {
    let session = createSession();
    session = ask(session, 'push');
    expect(session.rapport).toBe(1);
    expect(session.load).toBe(4);
    session = ask(session, 'all-or-nothing');
    expect(session.response).toContain('להוכיח');
    session = ask(session, 'repair');
    expect(session.rapport).toBe(3);
    expect(session.load).toBe(4);
  });

  it('makes sequence order editable without granting undiscovered scenes', () => {
    let session = createSession();
    session = moveScene(session, 'tools', 1);
    expect(session.sceneOrder).toEqual([]);
    session = ask(session, 'prepare');
    session = ask(session, 'prepare-sense');
    session = ask(session, 'now-sense');
    session = moveScene(session, 'tools', 1);
    expect(session.sceneOrder).toEqual(['room', 'tools']);
    expect(session.sceneOrder).not.toContain('goal');
  });

  it('does not manufacture motivation without a concrete final picture', () => {
    let session = ask(createSession(), 'state');
    expect(session.energy).toBe(2);
    expect(session.response).toContain('עדיין אין לי תמונה');
    session = ask(session, 'goal-sense');
    session = ask(session, 'state');
    expect(session.energy).toBe(4);
    expect(session.facts).toContain('state');
  });
});
