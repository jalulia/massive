# MASSIVE 95

Windows 95-inspired browser desktop and Windows 10/11 x64 screen saver, sharing the same offline HTML/Canvas/video collection.

## Coverage

Eight worlds from the current Unity LevelCatalog: LATTICE, HIGGS, ORBITAL, PULSAR, DYNAMO, NOVA, SINGULARITY, COSMOS. The generative collection includes one ambient study per world, eight level-event studies (renormalization, Symmetry Knot, electron strike, Astral Rhythms, magnetic storm, Core Collapse, horizon transit, supernovae), and four shared-event studies (Resonance, Amplifier goal, Repulsor, enemy formations). These animations reinterpret the source; they are not Unity ports or scientific simulations.

Game recordings retain their own provenance in `sources.json`. The September archive includes isolated visual studies and computer-controlled gameplay. October recordings use the actual level scenes and scripted player inputs in a disposable Unity copy. No footage is represented as human play.

## Use

Serve this folder over HTTP, open `index.html`, choose a saver and use Preview. Apply persists the selection in this browser only. Names, cycle duration, playback mode and generative speed are saved. Native footage retains normal speed. Escape exits browser preview; input exits the Windows screen saver. The Windows package includes all media for offline playback.

## Windows

`../windows/` is the WinForms/WebView2 host. GitHub Actions builds a self-contained x64 executable, renames it to `.scr`, and bundles this folder as `wwwroot`. `/c` opens configuration, `/s` covers all displays, and `/p <HWND>` embeds the preview in Windows settings. `--smoke-test` loads the same app and records its animation / collection state. Native installation is per-user and leaves timeout/sign-in settings to Windows. WebView2 Runtime is required. This does not support Windows 95 itself.

## Reference source

Game: `mattfryed/massive`, commit `3d9127b1ef95c90ff1f4999497b7789eda50040b`. Relevant files include `Assets/Scripts/CORE/LevelCatalog.asset`, the level definitions, `Assets/Scripts/Anomalies/{LATTICE,HIGGS,ORBITAL,SINGULARITY,COSMOS}/README.md`, `Assets/Scripts/Anomalies/PULSAR/PulsarRhythmSession.cs`, `Assets/Scripts/Anomalies/Magnetosphere/DynamoStormController.cs`, `Assets/Prefabs/Levels/README.md`, `Assets/Resonance/README.md`, `Assets/Enemy System/Encounters/README.md`, and `Assets/Scripts/Player/Actions/Repulsor.md`. Some historical scene names/stage numbers in feature notes differ from the saved assets; scene GUIDs and catalog membership determine coverage here.
