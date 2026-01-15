# Podcast RSS Previewer

Internal testing utility to preview stream from the MuseDrops API.




## Running Locally

Due to CORS, you'll need a local server:

```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000/?the-mindful-warrior
```

## Features

- Displays show artwork, title, and description
- Lists all episodes with thumbnails and subtitles
- Audio player with play/pause, seek, and time display
- Only one episode plays at a time
- Auto-advances to next episode when one ends
