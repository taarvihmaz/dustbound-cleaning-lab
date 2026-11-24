"""Open the campaign or the original step-by-step course demonstration."""
from pathlib import Path

import streamlit as st

GAME_FILE = Path(__file__).with_name("Dustbound.html")


def play_campaign():
    st.set_page_config(page_title="Dustbound · Mini Robot Vacuum", layout="wide")
    st.markdown(
        """<style>
        [data-testid="stHeader"] {display:none}
        .stMainBlockContainer {max-width:none;padding:.125rem 0 .5rem}
        [data-testid="stPageLink"] {margin-left:1rem}
        </style>""",
        unsafe_allow_html=True,
    )
    if hasattr(st, "iframe"):
        st.iframe(GAME_FILE, height="content", alt="Dustbound campaign")
    else:
        import streamlit.components.v1 as components

        components.html(GAME_FILE.read_text(encoding="utf-8"), height=780, scrolling=True)
    st.page_link(lab, label="Open the course demo · 5 × 5")


campaign = st.Page(play_campaign, title="Dustbound", default=True)
lab = st.Page("course_demo.py", title="Course demo", url_path="lab")
current = st.navigation([campaign, lab], position="hidden")
current.run()
if current.url_path == lab.url_path:
    st.page_link(campaign, label="Back to Dustbound")
