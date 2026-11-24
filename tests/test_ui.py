from pathlib import Path
from streamlit.testing.v1 import AppTest

APP=Path(__file__).parents[1]/'course_demo.py'

def button(at,label):
    return next(x for x in at.button if x.label==label)

def test_ui_both_episodes_and_reset():
    at=AppTest.from_file(str(APP), default_timeout=20).run()
    assert not at.exception
    assert button(at,'Scan').disabled and button(at,'Decide').disabled
    for _ in range(9): button(at,'Step').click().run()
    button(at,'Scan').click().run()
    button(at,'Decide').click().run()
    assert not at.exception
    assert at.session_state['sim'].decision.action=='Clean'
    at.selectbox[0].select('Negative').run()
    button(at,'Reset').click().run()
    assert at.session_state['sim'].phase=='READY'
    assert not at.session_state['sim'].log
    for _ in range(11): button(at,'Step').click().run()
    assert at.session_state['sim'].decision.action=='Move On'
    assert not at.exception
    assert button(at,'Step').disabled


def test_new_settings_do_not_change_active_episode_until_reset():
    at = AppTest.from_file(str(APP), default_timeout=20).run()
    button(at, 'Step').click().run()
    original_path = list(at.session_state['sim'].path)
    original_log = list(at.session_state['sim'].log)

    at.selectbox[0].select('Negative').run()
    at.selectbox[1].select('Clean').run()
    at.number_input[0].set_value(42).run()

    active = at.session_state['sim']
    assert active.mode == 'Positive'
    assert active.dirty is True
    assert active.seed == 7
    assert active.path == original_path
    assert active.log == original_log

    button(at, 'Reset').click().run()
    fresh = at.session_state['sim']
    assert fresh.mode == 'Negative'
    assert fresh.dirty is False
    assert fresh.seed == 42
    assert fresh.phase == 'READY'
    assert fresh.position == (0, 0)
    assert fresh.path == [] and fresh.log == []
    assert fresh.belief is None and fresh.decision is None
    assert not at.exception


def test_controls_follow_observation_and_decision_order():
    at = AppTest.from_file(str(APP), default_timeout=20).run()
    for _ in range(9):
        assert button(at, 'Scan').disabled
        assert button(at, 'Decide').disabled
        button(at, 'Step').click().run()

    assert not button(at, 'Scan').disabled
    assert button(at, 'Decide').disabled
    button(at, 'Scan').click().run()
    assert button(at, 'Scan').disabled
    assert not button(at, 'Decide').disabled
    assert at.session_state['sim'].decision is None
    assert at.session_state['sim'].belief.posterior > 0.6

    # Rerunning with a widget change must not take another observation.
    scan_log = list(at.session_state['sim'].log)
    at.number_input[0].set_value(8).run()
    assert at.session_state['sim'].log == scan_log
    assert button(at, 'Scan').disabled

    button(at, 'Decide').click().run()
    for label in ('Step', 'Scan', 'Decide'):
        assert button(at, label).disabled
    assert not button(at, 'Reset').disabled
    assert not at.exception


def test_random_episode_repeats_after_reset_with_same_seed():
    at = AppTest.from_file(str(APP), default_timeout=20).run()
    at.selectbox[0].select('Random').run()
    at.number_input[0].set_value(42).run()
    button(at, 'Reset').click().run()
    for _ in range(11):
        button(at, 'Step').click().run()
    first_log = list(at.session_state['sim'].log)
    first_observation = at.session_state['sim'].belief.positive

    button(at, 'Reset').click().run()
    for _ in range(11):
        button(at, 'Step').click().run()
    assert at.session_state['sim'].log == first_log
    assert at.session_state['sim'].belief.positive == first_observation
    assert not at.exception
