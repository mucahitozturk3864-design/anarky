# ANARKY DAW — Video Assets

Drop your video files here to enable dynamic video transitions.

## Transition Videos (5 seconds recommended)

| Filename                         | When Played                        |
|----------------------------------|------------------------------------|
| `mix_transition.mp4`             | Navigating to Mix module           |
| `beat_transition.mp4`            | Navigating to Beat module          |
| `vokal_transition.mp4`           | Navigating to Vokal module         |
| `discography_transition.mp4`     | Navigating to Discography module   |
| `album-detail_transition.mp4`    | Navigating to any Album Detail     |

## How It Works

The **AssetManager** (`src/components/AssetManager.js`) performs a HEAD request
for each file. If the file exists → plays the real video. If not → falls back
to the animated canvas particle system automatically.

No code changes required — just drop the `.mp4` file here and refresh.

## Recommended Specs

- Format: H.264 MP4
- Duration: 4–6 seconds
- Resolution: 1920×1080 (landscape)
- No audio (the app plays its own DSP sweep)
