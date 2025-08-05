# MotionCurve

MotionCurve is an interactive CSS **[easing](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function)** visualizer and playground that lets developers preview, tweak, and compare easing functions in real-time.

## Features

- **Built-in Easing Presets**  
  Includes standard CSS easings (`ease`, `ease-in-out`, etc.), Material Design easings, and other custom variants.

- **Custom Cubic-Bezier Editor**  
  Drag control points or manually enter values to create your own easing curves.

- **Graph Preview**  
  Interactive canvas visualizes the easing curve with a moving dot during animation.

- **Animation Demo**  
  See how the easing affects a real moving box with play, pause, and scrub controls.

- **Dark Mode Support**  
  Toggle light/dark mode with a single click. Preference is saved in localStorage.

- **Auto Replay & Scrubbing**  
  Enable auto-replay or manually control progress via a slider.

- **Live Bezier Output**  
  View and copy the `cubic-bezier()` string for any easing option.

- **Dynamic JSON Loading**  
  Easing functions and categories are loaded from a structured JSON file.

## How It Works

- The easing options are grouped and loaded from a `easings.json` file.
- You can add more easing function presets from the `easings.json` file.
- When an easing function is selected, its `cubic-bezier(...)` is applied to the animation.
- If `"custom"` is selected, a bezier canvas editor appears allowing you to modify control points.
- A canvas graph always displays the curve. A moving dot indicates current progress in real-time.
- The easing string can be copied for use in your own CSS/JS animations.
