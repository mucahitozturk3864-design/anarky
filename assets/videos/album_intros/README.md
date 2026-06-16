# ANARKY DAW — Album Intro Videos

Drop your album intro video files here. Each file name must match the album ID exactly.

## Album Intro Videos (5 seconds recommended)

| Filename                   | Album                            |
|----------------------------|----------------------------------|
| `eminem-mmlp.mp4`          | The Marshall Mathers LP          |
| `ye-graduation.mp4`        | Graduation                       |
| `mavi-veritas.mp4`         | VERITAS                          |
| `hayko-sandik.mp4`         | Sandık                           |
| `slipknot-verses.mp4`      | Vol. 3: (The Subliminal Verses)  |
| `motive-taycan.mp4`        | Taycan                           |
| `ezhel-muptezhel.mp4`      | Müptezhel                        |
| `kendrick-damn.mp4`        | DAMN.                            |

## How It Works

When a user clicks an album, the TransitionEngine calls:
`AssetManager.resolveAlbumIntro(albumId)` → checks for this file via HEAD request.

If found → plays the real video.
If not → falls back to canvas animation with the album's SVG art displayed over it.

No code changes needed. Drop the file and refresh.
