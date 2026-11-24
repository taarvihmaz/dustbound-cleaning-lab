import json
from pathlib import Path
import shutil
import subprocess

import pytest
from streamlit.testing.v1 import AppTest

from game.bundle import campaign_html
from src.bayes import infer
from src.mdp import decide


ROOT = Path(__file__).resolve().parents[1]


def test_export_is_current_and_portable():
    html = campaign_html()
    assert (ROOT / "Dustbound.html").read_text(encoding="utf-8") == html
    assert "<script src=" not in html
    assert 'rel="stylesheet"' not in html
    assert "data:image/jpeg;base64," not in html
    assert "data:image/webp;base64," not in html
    assert "ScenePhotos" not in html
    assert "Materials.ready" not in html


def test_streamlit_opens_game_and_navigates_to_course_demo():
    app = AppTest.from_file(str(ROOT / "app.py"), default_timeout=20).run()
    assert not app.exception
    assert app.get("iframe")
    app.switch_page("course_demo.py").run()
    assert not app.exception
    assert {button.label for button in app.button} == {"Step", "Scan", "Decide", "Reset"}


@pytest.mark.skipif(not shutil.which("node"), reason="Node is optional for Python-only runs")
def test_campaign_and_course_demo_agree_on_sensor_and_policy():
    probe = """
    const model = require('./game/engine.js');
    const readings = [true, false].map(signal => model.infer(signal).posterior);
    const choices = [...readings, 0, 0.25, 1].map(belief => model.choose(belief));
    console.log(JSON.stringify({readings, choices}));
    """
    raw = subprocess.check_output(["node", "-e", probe], cwd=ROOT, text=True)
    actual = json.loads(raw)
    readings = [infer(positive=signal).posterior for signal in (True, False)]
    assert actual["readings"] == pytest.approx(readings)
    for belief, choice in zip([*readings, 0, 0.25, 1], actual["choices"], strict=True):
        expected = decide(belief)
        assert choice["action"] == expected.action
        assert choice["cleanQ"] == pytest.approx(expected.q_clean)
        assert choice["moveQ"] == pytest.approx(expected.q_move_on)
