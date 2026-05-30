# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Real-time hand gesture recognition using MediaPipe (Python) and two TFLite classifiers. A webcam feed is processed frame-by-frame: MediaPipe detects 21 hand landmarks, which are normalized and fed into lightweight MLP models to classify static hand signs and dynamic finger gestures simultaneously.

## Running the App

```bash
python app.py
```

Key options:
- `--device <int>` — camera device index (default: 0)
- `--width / --height` — capture resolution (default: 960×540)
- `--min_detection_confidence` — MediaPipe threshold (default: 0.7)
- `--use_static_image_mode` — disables tracking, re-detects each frame

Press `ESC` to exit.

## Dependencies

```bash
pip install -r requirements.txt
```

Core: `mediapipe==0.8.4`, `opencv-python==4.6.0.66`, `tensorflow==2.9.0`, `protobuf<3.20,>=3.9.2`

Optional (only needed when retraining): `scikit-learn`, `matplotlib`

## Architecture

```
app.py                          ← main loop: capture → detect → classify → render
model/
  keypoint_classifier/          ← static hand sign model (MLP, 42 inputs)
    keypoint_classifier.tflite  ← loaded at runtime
    keypoint_classifier.py      ← KeyPointClassifier wrapper (tf.lite.Interpreter)
    keypoint_classifier_label.csv
    keypoint.csv                ← training data (appended during data collection)
  point_history_classifier/     ← dynamic gesture model (MLP, 32 inputs = 16 frames × 2)
    point_history_classifier.tflite
    point_history_classifier.py ← PointHistoryClassifier wrapper
    point_history_classifier_label.csv
    point_history.csv           ← training data
utils/
  cvfpscalc.py                  ← rolling FPS counter using cv2.getTickCount
keypoint_classification.ipynb   ← retrain keypoint model
point_history_classification.ipynb ← retrain point history model
```

## Two-Pipeline Design

**Pipeline 1 — Hand Sign (static):** 21 landmarks → relative coordinates → normalized by max absolute value → 42 floats → `KeyPointClassifier` → label index

**Pipeline 2 — Finger Gesture (dynamic):** 16-frame deque of index finger tip position → normalized relative to first point → 32 floats → `PointHistoryClassifier` → label index. Only activated when hand sign #2 (pointing) is detected.

The most common gesture ID over the last 16 frames (via `Counter`) is displayed, smoothing out frame-level noise.

## Training Data Collection

While `app.py` is running:
- Press `k` → enter keypoint logging mode; press `0`–`9` to select a class label → gesture is appended to `keypoint.csv`
- Press `h` → enter point history logging mode; same class selection → appended to `point_history.csv`
- Press `n` → return to normal (no logging) mode

After collecting data, retrain by running the corresponding Jupyter notebook. It exports a new `.tflite` file that replaces the existing one in the `model/` subdirectory.

## Adding Gesture Classes

1. Add the new label name to the appropriate `*_label.csv` (one label per line, 0-indexed)
2. Collect training samples using the data collection mode above (assign the new class number)
3. Retrain via the notebook and verify the exported `.tflite` covers the new class index
