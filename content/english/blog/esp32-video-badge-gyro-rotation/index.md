---
title: "Building a Video Badge with ESP32-S3: Gyro-Rotating MJPEG Playback"
meta_title: "ESP32-S3 Video Badge with Gyro-Based Auto-Rotation"
description: "Exploring embedded video playback on ESP32-S3 with gyro-based auto-rotation. From MP4 to MJPEG conversion, PSRAM buffering, IMU integration, and building a smooth looping video player on a microcontroller."
date: 2025-11-09T00:00:00Z
image: "assets/cover.png"
categories: ["Hardware", "Embedded Systems"]
author: "Alphons Jaimon"
tags: ["ESP32", "ESP32-S3", "MJPEG", "Video Playback", "IMU", "Gyroscope", "Arduino", "Embedded Video", "FFmpeg", "PSRAM"]
draft: true
---

I recently got my hands on an ESP32-S3 development board with an integrated LCD display, and naturally, the first thing I wondered was: "Can I play video on this thing?" Not just display some static images or animations, but actual smooth video playback from a file, complete with interactive controls. And while I'm at it, why not make it automatically rotate based on how I'm holding it?

Spoiler: Yes, you can. And it's pretty awesome.

## The Hardware: ESP32-S3-LCD-2

The board I'm working with is the ESP32-S3-LCD-2, which is basically an all-in-one solution for display projects. Here's what makes it interesting:

- **ESP32-S3 chip**: Dual-core Xtensa LX7 @ 240MHz
- **Memory**: 512KB SRAM + 8MB PSRAM (this PSRAM is crucial for video buffering)
- **Display**: 2.4" ST7789 LCD with 240×320 resolution
- **IMU**: QMI8658 6-axis sensor (accelerometer + gyroscope)
- **Storage**: 16MB Flash memory
- **Connectivity**: USB-C for programming and power

What's great about this board is that everything is already wired up. No breadboard maze, no jumper wires, no wondering if you got the SPI pins right. Just plug it in and start coding.

## The Vision: A Self-Contained Video Player

I wanted to build something that could:

1. Play a video file in an infinite loop
2. Store the video in flash memory (no SD card needed)
3. Automatically rotate the display based on device orientation
4. Respond to button presses (pause/play, power management)
5. Run smoothly without stuttering

Think of it like a digital photo frame, but cooler because it's a video badge that knows which way is up.

## Video Format: Why MJPEG?

First question: What video format should we use? The options aren't great for microcontrollers:

- **H.264/MP4**: Too complex, requires dedicated hardware decoder
- **Raw RGB frames**: 240 × 320 × 2 bytes × 30fps = Way too much data
- **GIF**: Limited colors, larger files than you'd expect
- **MJPEG**: Just a series of JPEG images back-to-back

MJPEG (Motion JPEG) turned out to be perfect for this use case. It's essentially just JPEG images played one after another, which means:

- We can decode one frame at a time (low memory overhead)
- JPEG compression is efficient (~90% size reduction)
- No complex inter-frame dependencies
- Easy to seek and loop

The tradeoff is file size compared to modern codecs like H.264, but for a 3-second loop stored in flash? MJPEG is ideal.

## Converting Video with FFmpeg

Getting video into MJPEG format is straightforward with FFmpeg. Here's what I'm doing:

```bash
ffmpeg -i input.mp4 \
  -vf "scale=240:320:force_original_aspect_ratio=decrease,
       pad=240:320:(ow-iw)/2:(oh-ih)/2,
       fps=15" \
  -q:v 8 \
  -f mjpeg \
  output.mjpeg
```

Let's break this down:

- **scale=240:320**: Resize to match the display resolution
- **force_original_aspect_ratio=decrease**: Keep aspect ratio, fit within bounds
- **pad=240:320**: Add black bars if needed to reach exact dimensions
- **fps=15**: Target 15 frames per second (smooth enough for most content)
- **-q:v 8**: JPEG quality (2-31 scale, lower is better quality)

The result is a 1.2MB file for about 3 seconds of video. Small enough to fit comfortably in flash with room to spare.

## The Architecture: How It All Fits Together

Here's the high-level flow:

```
┌─────────────┐
│ Flash (16MB)│
│ output.mjpeg│
└──────┬──────┘
       │ Load into PSRAM at startup
       ▼
┌─────────────┐
│ PSRAM (8MB) │
│ Video Buffer│
└──────┬──────┘
       │ Stream frames
       ▼
┌─────────────┐      ┌──────────────┐
│ MJPEG Parser├─────►│ JPEG Decoder │
└─────────────┘      └──────┬───────┘
                            │ Render
                            ▼
                     ┌──────────────┐
                     │ ST7789 LCD   │
                     └──────────────┘

┌─────────────┐      ┌──────────────────┐
│ QMI8658 IMU ├─────►│ Orientation Mgr  │──► Auto-rotate
└─────────────┘      └──────────────────┘

┌─────────────┐      ┌──────────────────┐
│ BOOT Button ├─────►│ Button Handler   │──► Pause/Power
└─────────────┘      └──────────────────┘
```

The key insight: Load the entire video into PSRAM (external RAM) at startup, then stream from there. PSRAM is slower than internal SRAM, but it's perfect for bulk storage like this.

## Memory Strategy: PSRAM vs SRAM

The ESP32-S3 has two types of memory:

- **SRAM (512KB)**: Fast, but limited
- **PSRAM (8MB)**: Slower, but abundant

Here's how I'm using them:

```cpp
// Load entire video into PSRAM (external RAM)
size_t fileSize = videoFile.size();
videoBuf = (uint8_t*)ps_malloc(fileSize);  // ps_malloc = PSRAM allocation
videoFile.read(videoBuf, fileSize);

// Decode buffer in SRAM (faster for active processing)
decodeBuf = (uint8_t*)malloc(320 * 240 / 2);  // malloc = SRAM allocation
```

**Why this works:**
- Video buffer (1.2MB) → PSRAM (plenty of space)
- Decode buffer (38KB) → SRAM (speed matters here)
- Working memory → SRAM (everything else)

## The MemoryStream Class: Streaming from PSRAM

To make the video loop infinitely, I created a simple `MemoryStream` class that implements Arduino's `Stream` interface:

```cpp
class MemoryStream : public Stream {
  uint8_t *buf;
  size_t sz, pos;
public:
  MemoryStream(uint8_t *b, size_t s) : buf(b), sz(s), pos(0) {}

  int available() override { return sz - pos; }

  int read() override {
    return (pos < sz) ? buf[pos++] : -1;
  }

  void reset() { pos = 0; }  // Loop back to start!

  // ... other Stream interface methods
};
```

This lets us treat the PSRAM buffer as if it were a file. When we reach the end, just call `reset()` and start over. Simple and effective.

## Parsing MJPEG: Finding Frame Boundaries

MJPEG is just a sequence of JPEG images concatenated together. Each JPEG image starts with the marker `FF D8` (Start of Image) and ends with `FF D9` (End of Image).

The parser's job is to:
1. Scan through the stream looking for `FF D8`
2. Copy bytes into a buffer until we find `FF D9`
3. Pass that buffer to the JPEG decoder
4. Repeat for the next frame

Here's the essence of the frame extraction logic:

```cpp
bool readMjpegBuf() {
  // Find Start of Image marker (FF D8)
  while (buf_read > 0 && !found_FFD8) {
    if (read_buf[i] == 0xFF && read_buf[i + 1] == 0xD8) {
      found_FFD8 = true;
    }
    i++;
  }

  // Copy data until End of Image marker (FF D9)
  while (buf_read > 0 && !found_FFD9) {
    if (p[i] == 0xFF && p[i + 1] == 0xD9) {
      found_FFD9 = true;
    }
    memcpy(mjpeg_buf + offset, p, i);
    offset += i;
    // Continue reading...
  }

  return found_FFD9;  // Frame complete!
}
```

Once we have a complete frame, we hand it off to the JPEGDEC library which handles the decompression and renders directly to the display.

## Gyro-Based Auto-Rotation: The Fun Part

The board has a QMI8658 IMU with both accelerometer and gyroscope. For orientation detection, we only need the accelerometer - specifically the Y-axis reading.

When the device is held normally (USB port on the right), gravity pulls down, giving us a positive Y acceleration. Flip it 180° (USB port on the left), and the Y reading becomes negative.

But there's a problem: Sensors are noisy. If we just check the raw accelerometer value, the screen would flicker constantly as tiny vibrations cross the threshold.

### Debouncing with Hysteresis

The solution is a two-part strategy:

**1. Hysteresis** - Create a "dead zone" around zero:

```cpp
const float THRESHOLD = 0.5;  // ±0.5g dead zone

if (accelY > THRESHOLD) {
  desiredRotation = 1;  // USB on right
} else if (accelY < -THRESHOLD) {
  desiredRotation = 3;  // USB on left (180° flip)
} else {
  desiredRotation = currentRotation;  // Stay put!
}
```

**2. Debouncing** - Require 1 second of stability before committing:

```cpp
const unsigned long DEBOUNCE_MS = 1000;

if (desiredRotation != currentRotation) {
  if (pendingRotation == desiredRotation) {
    // Same desired rotation, check if enough time has passed
    if (millis() - debounceStartTime >= DEBOUNCE_MS) {
      currentRotation = desiredRotation;  // Commit the change
    }
  } else {
    // Different desired rotation, restart the timer
    pendingRotation = desiredRotation;
    debounceStartTime = millis();
  }
}
```

This means you have to hold the device in the new orientation for a full second before it rotates. It sounds like a long time, but in practice it feels natural - you flip the device, and a moment later the screen updates. No jitter, no accidental rotations.

## The OrientationManager Class

I packaged all this logic into an `OrientationManager` class:

```cpp
class OrientationManager {
  const float THRESHOLD = 0.5;
  const unsigned long DEBOUNCE_MS = 1000;
  const unsigned long POLL_INTERVAL_MS = 50;  // 20Hz polling

  uint8_t currentRotation;
  uint8_t pendingRotation;
  unsigned long debounceStartTime;
  bool rotationJustChanged;

public:
  void update() {
    // Poll sensor at 20Hz
    if (millis() - lastPollTime < POLL_INTERVAL_MS) return;

    // Read accelerometer
    IMU.update();
    IMU.getAccel(&accelData);

    // Apply hysteresis and debouncing logic
    // ...
  }

  uint8_t getRotation() { return currentRotation; }

  bool hasChanged() {
    if (rotationJustChanged) {
      rotationJustChanged = false;  // One-shot flag
      return true;
    }
    return false;
  }
};
```

The `hasChanged()` method returns `true` exactly once when a rotation occurs, making it easy to react to orientation changes without continuously updating the display.

## Button Controls: Pause and Power

The board has a BOOT button (GPIO 0) that we can repurpose for user interaction. Using the OneButton library, I set up two actions:

- **Single click**: Toggle pause/play
- **Long press**: Toggle power (blank screen + backlight off)

```cpp
OneButton button(BTN_BOOT, true);

void onButtonClick() {
  player.togglePause();
}

void onButtonLongPressStart() {
  player.togglePower();
}

void setup() {
  button.attachClick(onButtonClick);
  button.attachLongPressStart(onButtonLongPressStart);
}

void loop() {
  button.tick();  // Process button events
  // ...
}
```

The power-off feature is especially useful for battery-powered scenarios. Long-press the button, and the screen goes blank with the backlight off, saving significant power while keeping the device technically running.

## The Main Loop: Putting It All Together

After all that setup, the main loop is surprisingly simple:

```cpp
void loop() {
  // Check for orientation changes (20Hz polling internally)
  orientationMgr.update();

  // If orientation changed, update display rotation
  if (orientationMgr.hasChanged()) {
    player.setRotation(orientationMgr.getRotation());
  }

  // Handle button events
  button.tick();

  // Decode and display next frame (if not paused/powered off)
  player.play();
}
```

That's it. No complex state management, no threading, no interrupts. Just:
1. Check the gyro
2. Check the button
3. Play the next frame
4. Repeat

## Uploading to Flash: The upload_to_flash.sh Script

Getting the MJPEG file onto the ESP32's flash memory requires a few steps:

1. Create a FAT filesystem image with the video file
2. Flash that image to the FFat partition

I automated this with a bash script:

```bash
#!/bin/bash
# Find mkfatfs tool
MKFATFS=$(find ~/.arduino15/packages/esp32/tools/mkfatfs -name "mkfatfs" | head -1)

# Create filesystem image from data/ folder
$MKFATFS -c data -t fatfs -s 10354688 ffat.bin

# Find esptool
ESPTOOL=$(which esptool.py || find ~/.arduino15/packages/esp32/tools -name "esptool.py" | head -1)

# Flash to partition at offset 0x611000
python3 $ESPTOOL --chip esp32s3 --port /dev/ttyUSB0 --baud 460800 \
  write_flash 0x611000 ffat.bin
```

Just drop your `output.mjpeg` file in the `data/` folder and run the script. The FFat partition mounts automatically on boot, and the video is ready to play.

## Performance and Results

Here's what I'm seeing in practice:

- **Frame rate**: Consistent 15fps playback
- **Frame decode time**: 40-60ms per frame (well within the 66ms budget for 15fps)
- **Memory usage**: 1.2MB PSRAM + 38KB SRAM
- **Loop latency**: Seamless - you can't tell where it restarts
- **Orientation detection**: Smooth, no jitter, 1-second response time
- **Power draw**: ~150mA @ 5V during active playback

The video loops infinitely without any glitches. Click the button, and it pauses instantly. Long-press, and the screen powers off. Flip the device, and after a brief moment, the video rotates to match. It all just works.

## The Code Structure

The final implementation is organized into clean, reusable components:

**MjpegClass.h**: MJPEG parser and JPEG decoder wrapper
- Finds frame boundaries in the stream
- Interfaces with JPEGDEC library
- Handles scaling and rendering

**VideoPlayer class**: Playback state management
- Controls display and backlight
- Manages pause/power states
- Wraps the decoder

**OrientationManager class**: Sensor fusion and debouncing
- Polls IMU at 20Hz
- Applies hysteresis and debouncing
- Provides clean change notifications

**MemoryStream class**: PSRAM streaming abstraction
- Implements Arduino Stream interface
- Enables infinite looping with reset()

Each class has a single, well-defined responsibility, making the code easy to understand and modify.

## Things I Learned

**1. PSRAM is a game-changer** for ESP32 projects that need to buffer large amounts of data. The external RAM is slower than SRAM, but for sequential access patterns like video playback, it's perfect.

**2. MJPEG is underrated** for embedded video. Yes, it's less efficient than modern codecs, but the simplicity and low computational requirements make it ideal for microcontrollers.

**3. Sensor debouncing matters** more than you'd think. The first version without debouncing was unusable - the screen would flip-flop constantly. Adding hysteresis and time-based debouncing transformed it into a smooth experience.

**4. FFmpeg is incredibly powerful** for video preprocessing. Being able to resize, pad, adjust frame rate, and control quality all in a single command is invaluable.

**5. Class-based architecture works well** even in Arduino/embedded contexts. It might seem like overkill, but having clean abstractions makes debugging and extending the code much easier.

## Possible Improvements

If I continue experimenting with this, here are some ideas:

- **Multiple videos**: Store several MJPEG files and switch between them with button presses
- **Battery power**: Add a LiPo battery and power management for truly portable operation
- **Web interface**: Use ESP32's WiFi to upload new videos without reprogramming
- **GIF export**: Automatically convert MJPEG to animated GIF for sharing
- **Sound**: The ESP32-S3 has I2S - could add audio playback synchronized with video
- **4-way rotation**: Use all axes of the IMU for full 360° rotation support

## Conclusion

Building a video badge with gyro-based auto-rotation turned out to be more straightforward than I expected, thanks to the right combination of hardware and software choices. The ESP32-S3 with its PSRAM provides enough memory headroom, MJPEG gives us a simple format to work with, and careful sensor processing eliminates jitter.

The result is a smooth, responsive video player that fits in the palm of your hand and knows which way is up. Perfect for conference badges, wearable art projects, or just showing off at the next maker meetup.

All the code and scripts are available in the project repository. If you have an ESP32-S3 board with a display, give it a try - it's a fun weekend project that teaches a lot about embedded video, memory management, and sensor integration.

---

**Hardware**: ESP32-S3-LCD-2 Development Board
**Libraries**: Arduino_GFX, JPEGDEC, FastIMU, OneButton
**Tools**: Arduino IDE, FFmpeg, esptool
