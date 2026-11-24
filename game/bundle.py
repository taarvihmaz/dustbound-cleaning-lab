"""Embed the local campaign assets so the game can open from a single file."""
import argparse
from pathlib import Path
import re


GAME_DIR = Path(__file__).resolve().parent
ASSETS = ("game.css", "locations.js", "engine.js", "location-props.js", "art.js", "ui.js")


def campaign_html():
    html = (GAME_DIR / "menu.html").read_text(encoding="utf-8")
    for name in ASSETS:
        filename = re.escape(name)
        content = (GAME_DIR / name).read_text(encoding="utf-8")
        if name.endswith(".css"):
            pattern = rf"""<link\b[^>]*\bhref=["'](?:\./)?{filename}["'][^>]*>"""
            inline = f"<style>\n{content}\n</style>"
        else:
            pattern = rf"""<script\b[^>]*\bsrc=["'](?:\./)?{filename}["'][^>]*>\s*</script>"""
            inline = f"<script>\n{content}\n</script>"
        html, count = re.subn(pattern, lambda _: inline, html)
        if count != 1:
            raise ValueError(f"Expected one reference to {name}, found {count}")
    return html


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    destination = parser.parse_args().output
    destination.write_text(campaign_html(), encoding="utf-8")
