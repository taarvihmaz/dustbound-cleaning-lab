# Play Dustbound

Double-click **Dustbound.html**. Select a cleaner and a board size, then press **Start campaign**. A named cleaner stays with you. **Random each level** picks another character at each new location.

Click a patch or a piece of bare floor to send the robot. The click selects a destination. The robot takes a shortest path, checks the tile and chooses an action. The speech bubble shows the reading and the calculation. Clear every patch to open the next level. On large boards, **Floor plan** helps you pick an exact tile.

**Verified inspection** always detects a patch. For a classroom experiment, switch to **Noisy course sensor**, or force a reading. A missed patch stays on the floor so you can check it again.

## Open the Python course demo

The fixed demo uses a 5 × 5 room with two walls. On macOS or Linux, start it from inside the extracted folder.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Follow the local address shown by Streamlit. Select **Open the course demo · 5 × 5**. Use **Step** to plan and move, **Scan** to read the sensor, **Decide** to apply the best action, and **Reset** to replay.

To use the same fixed course exercise without installing Python, open **game/lab.html** in this folder.
