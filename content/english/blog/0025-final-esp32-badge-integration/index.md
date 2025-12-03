---
title: "Putting It All Together - The Complete Badge Flow"
meta_title: "Integrating Wake Word, Embeddings, LLM, and TTS on ESP32-S3"
description: "Five separate systems. One badge. Here's how we orchestrated wake word detection, audio embeddings, LLM inference, and TTS into a seamless voice-activated experience—all within 8MB of RAM."
date: 2025-12-02T00:00:00Z
image: "assets/cover.jpg"
categories: ["Hardware", "Embedded Systems", "AI", "GenAI"]
author: "Alphons Jaimon"
ai_assistance: true
tags: ["ESP32", "ESP32-S3", "State Machine", "Memory Management", "System Integration", "TinyML"]
series_id: "esp32-oaisys25-badge"
series_name: "Project 'Tiny Daisy' - An ESP32 powered Digital Badge"
series_order: 6
draft: true
---

Here we are. The final blog in this series. If you've been following along, we've built a video player with gyro rotation, dissected transformer architectures, trained a custom wake word detector, invented an embedding-based intent matching system because STT was too big, and squeezed a fine-tuned LLM with PIE assembly optimizations onto a chip with 8MB of RAM. Now comes the hard part: making all of these systems work together.

I'll be honest with you—this was the part I was most nervous about. Getting individual components working is one thing. Orchestrating them into a coherent experience while respecting brutal memory constraints? That's a different beast entirely.

And yes, as with every other blog in this series, Claude Code (Anthropic's AI coding assistant) was instrumental in helping me think through the architecture and debug the inevitable issues. I don't think I could have pulled this off on my own timeline.

{{< sub-section title="The Integration Challenge" icon="fa-puzzle-piece" >}}

Let me recap what we're dealing with. By the time we reached this point, we had five distinct systems:

1. **Video Player** ([Blog 1: Video Badge with Gyro Rotation](/blog/0015-esp32-video-badge-gyro-rotation/)) - MJPEG playback with gyro-based display rotation
2. **LLM Inference** ([Blog 2: Deconstructing llama2.c](/blog/0018-decontructing-llama2-c-and-exp32-llm/)) - Transformer-based text generation
3. **Wake Word Detection** ([Blog 3: Wake Word Detection](/blog/0019-wake-word-detection/)) - Always-listening "Hey Daisy" trigger
4. **Intent Embeddings** ([Blog 4: Intent Embeddings](/blog/0020-intent-embeddings/)) - Audio-to-intent similarity matching
5. **Fine-Tuned LLM + TTS** ([Blog 5: Fine-Tuned LLM with PIE Assembly](/blog/0021-llm-pie-assembly/)) - Q8_0 quantized model with robotic speech

Each of these works beautifully in isolation. The problem? They can't all fit in memory at the same time.

Let me show you the math that kept me up at night:

| Component | Memory Required |
|-----------|-----------------|
| Video Buffer | ~1.2 MB |
| Embeddings DB | ~2.0 MB |
| ML Pool (wake word) | ~1.0 MB |
| LLM Model | ~6.0 MB |
| **Total if loaded together** | **~10.2 MB** |
| **Available PSRAM** | **8 MB** |

We're 2.2MB over budget. And that's before accounting for any runtime buffers, the TFLite interpreter, or the Arduino framework overhead. Sounds stupid right? How do you ship something that can't fit?

{{< /sub-section >}}

{{< sub-section title="The State Machine Architecture" icon="fa-sitemap" >}}

The answer, as it turns out, is that you don't need everything loaded at once. The badge follows a linear interaction flow—you're either playing the logo animation, listening for a wake word, processing a query, or generating a response. Never all at once.

This led me to design a state machine that explicitly manages which components are in memory at any given moment:

```
                    ┌─────────────────┐
                    │      BOOT       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
        ┌──────────►│   LOGO_LOOP     │◄──────────┐
        │           │ (wake word ON)  │           │
        │           └────────┬────────┘           │
        │                    │                    │
        │       wake word    │  5min idle         │
        │       detected     │                    │
        │                    │           ┌────────▼────────┐
        │                    │           │   DEEP_SLEEP    │
        │                    │           │  (BTN2 switch)  │
        │                    │           └─────────────────┘
        │                    │
        │           ┌────────▼────────┐
        │           │   RECORDING     │ 5 seconds
        │           │   (RED screen)  │
        │           └────────┬────────┘
        │                    │
        │           ┌────────▼────────┐
        │           │   EMBEDDING     │ Extract 256-dim vector
        │           └────────┬────────┘
        │                    │
        │           ┌────────▼────────┐
        │           │   SIMILARITY    │ vs 256 stored embeddings
        │           └────────┬────────┘
        │                    │
        │        ┌───────────┴───────────┐
        │        │                       │
        │   score >= 0.3            score < 0.3
        │        │                       │
        │  ┌─────▼─────┐          ┌──────▼──────┐
        │  │   LLM     │          │  TTS_SORRY  │
        │  │ INFERENCE │          │ "Couldn't   │
        │  │ Load 6MB  │          │  understand"│
        │  └─────┬─────┘          └──────┬──────┘
        │        │                       │
        │  ┌─────▼─────┐                 │
        │  │    TTS    │                 │
        │  │  OUTPUT   │                 │
        │  │Robot voice│                 │
        │  └─────┬─────┘                 │
        │        │                       │
        └────────┴───────────────────────┘
```

The states are defined in `/home/alphons/project/OAISYS25/badge/local_llm_badge/config.h`:

```cpp
enum BadgeState {
    STATE_BOOT,
    STATE_LOGO_LOOP,
    STATE_DEEP_SLEEP,
    STATE_RECORDING,
    STATE_EMBEDDING,
    STATE_SIMILARITY,
    STATE_LLM_INFERENCE,
    STATE_DISPLAY_RESPONSE,
    STATE_TTS_OUTPUT,
    STATE_STASH_DATA,
    STATE_TTS_SORRY
};
```

Each state knows exactly what resources it needs, and transitions explicitly handle loading and unloading.

{{< /sub-section >}}

{{< sub-section title="The Memory Dance" icon="fa-memory" >}}

This is the heart of the integration—the part that makes everything possible. I call it "The Memory Dance" because there's a careful choreography to how we load and unload components.

The key insight: **only one large model needs to be active at a time.** During normal operation (LOGO_LOOP), we have:

| Component | Memory | Purpose |
|-----------|--------|---------|
| Video Buffer | ~1.2 MB | MJPEG frames in PSRAM |
| Embeddings DB | ~2.0 MB | 256 intent embeddings (256-dim each) |
| ML Pool | ~1.0 MB | Shared arena for wake word/audio encoder |
| **Total** | **~4.2 MB** | Leaves room for runtime overhead |

When the wake word fires and we need to run LLM inference, we perform a complete swap:

```cpp
// From local_llm_badge.ino - STATE_LLM_INFERENCE entry

// CRITICAL: Free everything possible to make room for LLM model (~7MB needed)
Serial.println("Freeing memory for LLM...");

// Free embeddings (~2MB)
embedSearch.end();
printPSRAM("after embed unload");

// Free ML pool (~1MB) - LLM doesn't use it
if (mlPool) {
    free(mlPool);
    mlPool = nullptr;
    Serial.println("Freed ML pool");
}

// Free video buffer (~1.2MB) - we only need display for text
video.unloadVideo();
printPSRAM("after video unload");

// Load LLM model
Serial.println("Loading LLM model...");
if (!llmInference.begin(nullptr, 0, LLM_MODEL_PATH, TOKENIZER_PATH)) {
    Serial.println("LLM init failed");
    // ... error handling
}
```

After LLM generation completes, we reverse the process:

```cpp
// Unload LLM to free memory
llmInference.end();
printPSRAM("after LLM unload");

// Reload video buffer
Serial.println("Reloading video...");
if (!video.reloadVideo()) {
    Serial.println("WARNING: Failed to reload video!");
}
printPSRAM("after video reload");

// Reload embeddings now that LLM is unloaded
Serial.println("Reloading embeddings...");
if (!embedSearch.begin(EMBEDDINGS_PATH, INTENTS_PATH)) {
    Serial.println("WARNING: Failed to reload embeddings!");
}
printPSRAM("after embed reload");

// Reallocate ML pool for wake word / audio embed
if (!mlPool) {
    mlPool = (uint8_t*)ps_malloc(ML_POOL_SIZE);
}
printPSRAM("after pool realloc");
```

The magic here is that the SD card acts as our "swap space." The video reloads from `/media/logo.mjpeg`, the embeddings reload from `/data/embeddings.bin`. It takes about a second to reload everything, which is acceptable latency after the user has already waited 60-90 seconds for LLM generation.

The `printPSRAM()` helper was invaluable during development:

```cpp
void printPSRAM(const char* label) {
    Serial.printf("PSRAM [%s]: %dKB free / %dKB total\n",
                  label,
                  ESP.getFreePsram() / 1024,
                  ESP.getPsramSize() / 1024);
}
```

Watching those numbers dance up and down as components loaded and unloaded gave me confidence the memory management was working correctly.

{{< /sub-section >}}

{{< sub-section title="The Configuration System" icon="fa-cog" >}}

One thing I learned early: you do NOT want to recompile every time you need to tweak a threshold. The badge reads runtime configuration from a JSON file on the SD card:

```json
{
  "wake_word_threshold": 0.5,
  "embed_threshold": 0.3,
  "llm_temperature": 0.8,
  "llm_topp": 0.9,
  "llm_max_tokens": 128,
  "idle_sleep_ms": 300000,
  "record_duration_ms": 5000
}
```

The configuration structure and loading logic (from `/home/alphons/project/OAISYS25/badge/local_llm_badge/local_llm_badge.ino`):

```cpp
struct RuntimeConfig {
    float wakeWordThreshold = DEFAULT_WAKE_THRESHOLD;
    float embedThreshold = DEFAULT_EMBED_THRESHOLD;
    float llmTemperature = DEFAULT_LLM_TEMPERATURE;
    float llmTopP = DEFAULT_LLM_TOPP;
    int llmMaxTokens = 128;
    unsigned long idleSleepMs = IDLE_SLEEP_MS;
    int recordDurationMs = RECORD_DURATION_MS;
} runtimeConfig;

bool loadConfig() {
    File f = SD.open(CONFIG_PATH);
    if (!f) {
        Serial.println("Config: Using defaults (no config.json)");
        return false;
    }

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, f);
    f.close();

    if (error) {
        Serial.printf("Config: Parse error - %s\n", error.c_str());
        return false;
    }

    // Load values with defaults as fallback
    runtimeConfig.wakeWordThreshold = doc["wake_word_threshold"] | DEFAULT_WAKE_THRESHOLD;
    runtimeConfig.embedThreshold = doc["embed_threshold"] | DEFAULT_EMBED_THRESHOLD;
    runtimeConfig.llmTemperature = doc["llm_temperature"] | DEFAULT_LLM_TEMPERATURE;
    // ... etc

    Serial.println("Config: Loaded from SD card");
    return true;
}
```

This means I can adjust how sensitive the wake word detection is, how aggressive the embedding similarity threshold is, or how creative the LLM gets—all without touching code. During the conference, I could even swap SD cards to try different configurations on different badges.

The defaults are defined in `/home/alphons/project/OAISYS25/badge/local_llm_badge/config.h`:

```cpp
#define DEFAULT_WAKE_THRESHOLD  0.5f
#define DEFAULT_EMBED_THRESHOLD 0.3f  // Lowered for testing (was 0.7f)
#define DEFAULT_LLM_TEMPERATURE 0.8f
#define DEFAULT_LLM_TOPP        0.9f
```

{{< /sub-section >}}

{{< sub-section title="Visual Feedback" icon="fa-eye" >}}

Users need to know what's happening. A badge that appears frozen is worse than one that's obviously processing.

During **recording**, the screen goes solid RED:

```cpp
case STATE_RECORDING:
    // Pause video during recording
    video.pause();
    recorder.startRecording(runtimeConfig.recordDurationMs / 1000.0f);
    break;
```

And in `handleRecording()`:
```cpp
void handleRecording() {
    // Update recording (video paused)
    if (recorder.update()) {
        // Recording complete
        Serial.printf("Recording done: %d samples (%.2fs)\n",
                      recorder.getSampleCount(), recorder.getDurationSec());
        // ...
    }
}
```

For **LLM responses**, I use a Matrix-style green text on black background. The text box in the video player draws with these colors from `config.h`:

```cpp
#define TEXT_COLOR              0x07E0  // Green (RGB565)
#define TEXT_BG_COLOR           0x0000  // Black
#define TEXT_BORDER_COLOR       0x07E0  // Green border
```

The LLM tokens stream in real-time via a callback:

```cpp
void onLLMToken(const char* token, void* userData) {
    // Append token to response buffer and display
    llmResponse += token;
    video.appendText(token);
    Serial.print(token);  // Also print to serial for debugging
}
```

This gives that satisfying "AI is thinking" effect where text appears word by word.

{{< /sub-section >}}

{{< sub-section title="Hardware Mode Switches" icon="fa-toggle-on" >}}

Here's something I didn't anticipate: the badge enclosure has no buttons. It's a sealed 3D-printed case with just the screen visible. So how do you control it?

I repurposed some unused GPIO pins as "mode switches." By bridging specific pin pairs (with solder blobs or jumper wires inside the case), you can change the badge's behavior:

```cpp
// From config.h
// BTN1: Voice disable switch (bridging 13 & 11)
// When bridged: Logo loops forever, voice detection disabled
#define BTN1_OUT        13  // Output pin (always LOW)
#define BTN1_IN         11  // Input pin (PULLUP - reads LOW when bridged)

// BTN2: Deep sleep switch (bridging 12 & 14)
// When bridged: Enter deep sleep mode
#define BTN2_OUT        12  // Output pin (always LOW)
#define BTN2_IN         14  // Input pin (PULLUP - reads LOW when bridged)
```

The logic is simple: the output pin is held LOW, and the input pin has an internal pull-up. If they're bridged together, the input reads LOW.

```cpp
void initSwitches() {
    // Configure output pins (always LOW)
    pinMode(BTN1_OUT, OUTPUT);
    digitalWrite(BTN1_OUT, LOW);
    pinMode(BTN2_OUT, OUTPUT);
    digitalWrite(BTN2_OUT, LOW);

    // Configure input pins with internal pull-up
    pinMode(BTN1_IN, INPUT_PULLUP);
    pinMode(BTN2_IN, INPUT_PULLUP);
}

bool isBTN1Bridged() {
    return digitalRead(BTN1_IN) == LOW;
}

bool isBTN2Bridged() {
    return digitalRead(BTN2_IN) == LOW;
}
```

When BTN2 is bridged, the badge enters deep sleep:

```cpp
void enterDeepSleep() {
    Serial.println("Entering deep sleep mode...");

    // Turn off display backlight
    digitalWrite(LCD_BL, LOW);

    // Configure BTN2_IN as wake-up source (when switch is opened, pin goes HIGH)
    esp_sleep_enable_ext0_wakeup((gpio_num_t)BTN2_IN, HIGH);

    // Enter deep sleep
    Serial.println("Sleeping...");
    delay(100);  // Let serial flush
    esp_deep_sleep_start();
}
```

This means you can put the badge to sleep by bridging two pins, and wake it by un-bridging them. No buttons needed!

{{< /sub-section >}}

{{< sub-section title="Performance Timeline" icon="fa-clock" >}}

Let me give you realistic expectations for how long each phase takes. This is measured on the actual hardware with the final firmware:

| Phase | Duration | Notes |
|-------|----------|-------|
| Wake word detection | ~50ms per inference | Continuous, 400ms of audio per frame |
| Recording | 5 seconds | Configurable via JSON |
| Audio embedding extraction | ~150-200ms | Mel spectrogram + CNN inference |
| Similarity search | ~50-100ms | SIMD-accelerated cosine similarity |
| Memory swap (for LLM) | ~500ms | Unload video/embeddings, load LLM |
| LLM generation (128 tokens) | 60-90 seconds | Depends on response length |
| Memory swap (after LLM) | ~1 second | Reload video/embeddings from SD |
| TTS synthesis | 2-4 seconds | Depends on response length |
| **Total interaction** | **~70-100 seconds** | From wake word to speech output |

Yeah, it's not fast. But remember what this is: a 6 million parameter language model running entirely on a microcontroller with 8MB of RAM. No cloud. No WiFi required. The entire interaction happens locally on a device you can hang around your neck.

As covered in [Blog 5: Fine-Tuned LLM with PIE Assembly](/blog/0021-llm-pie-assembly/), the PIE assembly optimizations give us about 2 tokens per second. That's actually pretty good for on-device inference!

{{< /sub-section >}}

{{< sub-section title="Error Handling" icon="fa-exclamation-triangle" >}}

Things go wrong. Models fail to load. SD cards get corrupted. Users speak gibberish. The firmware handles these gracefully:

**Low similarity score** (query doesn't match any known intent):

```cpp
void handleSimilarity() {
    lastSearchResult = embedSearch.search(queryEmbedding);

    Serial.printf("Best match: %s (score: %.3f)\n",
                  lastSearchResult.intent, lastSearchResult.score);

    if (lastSearchResult.score >= runtimeConfig.embedThreshold) {
        // Good match - run LLM inference
        setState(STATE_LLM_INFERENCE);
    } else {
        // Low confidence - apologize
        Serial.println("Low confidence - stashing");
        setState(STATE_TTS_SORRY);
    }
}
```

The `STATE_TTS_SORRY` state speaks an apology:

```cpp
void handleTtsSorry() {
    if (ttsSpeaking) {
        tts.speak("Sorry, I could not understand that.");
        ttsSpeaking = false;
        lastActivityTime = millis();
    }

    // Wait a bit after speaking, then return to logo
    if (millis() - lastActivityTime > 1000) {
        setState(STATE_LOGO_LOOP);
    }
}
```

**Model load failure** falls back to displaying the raw intent:

```cpp
if (!llmInference.begin(nullptr, 0, LLM_MODEL_PATH, TOKENIZER_PATH)) {
    Serial.println("LLM init failed - showing intent only");
    video.showText(lastSearchResult.intent);
    llmGenerating = false;
    // Reload video buffer and embeddings
    video.reloadVideo();
    embedSearch.begin(EMBEDDINGS_PATH, INTENTS_PATH);
    if (!mlPool) {
        mlPool = (uint8_t*)ps_malloc(ML_POOL_SIZE);
    }
    setState(STATE_DISPLAY_RESPONSE);
}
```

**Missing SD card** uses compiled-in defaults (those `DEFAULT_*` constants).

The philosophy is: never leave the user staring at a frozen screen. Always provide feedback, even if it's "something went wrong."

{{< /sub-section >}}

{{< sub-section title="The Main Loop" icon="fa-sync" >}}

Here's the complete main loop that ties everything together. It's surprisingly clean thanks to the state machine abstraction:

```cpp
void loop() {
    // Check mode switches first
    // BTN2: Deep sleep when bridged
    if (isBTN2Bridged()) {
        enterDeepSleep();
        // Won't reach here - ESP will reset on wake
    }

    // BTN1: Voice disable - check and update flag
    bool btn1State = isBTN1Bridged();
    if (btn1State != voiceDisabled) {
        voiceDisabled = btn1State;
        if (voiceDisabled) {
            Serial.println("BTN1: Voice DISABLED");
            if (wakeWordActive) {
                wakeWord.end();
                micStream.end();
                wakeWordActive = false;
            }
        } else {
            Serial.println("BTN1: Voice ENABLED");
        }
    }

    // State-specific handling
    switch (currentState) {
        case STATE_BOOT:
            setState(STATE_LOGO_LOOP);
            break;

        case STATE_LOGO_LOOP:
            handleLogoLoop();
            break;

        case STATE_RECORDING:
            handleRecording();
            break;

        case STATE_EMBEDDING:
            handleEmbedding();
            break;

        case STATE_SIMILARITY:
            handleSimilarity();
            break;

        case STATE_LLM_INFERENCE:
            handleLLMInference();
            break;

        case STATE_TTS_SORRY:
            handleTtsSorry();
            break;

        case STATE_TTS_OUTPUT:
            handleTtsOutput();
            break;

        case STATE_DISPLAY_RESPONSE:
            handleDisplayResponse();
            break;

        case STATE_DEEP_SLEEP:
        case STATE_STASH_DATA:
            // Not implemented yet - return to logo
            setState(STATE_LOGO_LOOP);
            break;
    }
}
```

Each `handle*()` function encapsulates the logic for its state, including when to transition to the next state. This keeps the main loop readable and makes debugging much easier.

{{< /sub-section >}}

{{< sub-section title="Lessons Learned" icon="fa-graduation-cap" >}}

Looking back at this integration effort, a few lessons stand out:

1. **Sequential loading beats parallel everything.** My initial instinct was to keep as much loaded as possible. Wrong. Explicit load/unload cycles are more predictable and easier to debug.

2. **The SD card is your friend.** Yes, it's slow. But it's effectively infinite storage compared to PSRAM. Use it as overflow.

3. **State machines make complexity manageable.** Without the explicit state enum and transitions, this code would be a tangled mess of flags and conditionals.

4. **JSON config saves sanity.** Being able to adjust thresholds without recompiling is worth the small overhead of the ArduinoJson library.

5. **Hardware switches for headless operation.** When your enclosure has no buttons, you get creative with GPIO.

6. **Print everything during development.** Those `printPSRAM()` calls and Serial.printf statements were essential for understanding what was happening.

{{< /sub-section >}}

{{< sub-section title="What's Next" icon="fa-rocket" >}}

The badge works! It detects the wake word (as described in [Blog 3](/blog/0019-wake-word-detection/)), extracts embeddings (using the techniques from [Blog 4](/blog/0020-intent-embeddings/)), runs the fine-tuned LLM (with the PIE optimizations from [Blog 5](/blog/0021-llm-pie-assembly/)), and speaks the response. All on a battery-powered device hanging from a lanyard.

But there's more I want to do:

- **WiFi model updates** - Download new LLM or embedding models over WiFi
- **Stash upload** - Send unrecognized queries to a server for analysis
- **Smaller models** - Trade some quality for faster response times
- **Battery optimization** - The current firmware is not power-efficient

These are documented in the original plan at `/home/alphons/project/OAISYS25/badge/workbench/docs/OAISYS_BADGE_PLAN.md` as Phases 7 and 8. Maybe there will be a Blog 7 someday.

For now, I'm happy that this works at all. When I started this project, I genuinely wasn't sure if fitting a useful LLM on an ESP32 was possible. It is. And it's surprisingly usable.

The complete firmware lives in `/home/alphons/project/OAISYS25/badge/local_llm_badge/`. If you want to build your own, all the code is there. The state machine is in `local_llm_badge.ino`, the pin definitions are in `config.h`, and the individual components are organized under `src/`.

Thanks for following along on this journey. Building AI that runs on a chip you can hold in your hand feels like the future, even if that future is a bit slow and speaks in a robotic voice. hehe

{{< /sub-section >}}

---

*This post is part of the "Project 'Tiny Daisy' - An ESP32 powered Digital Badge" series. Check out the other posts:*

- *[Blog 1: Video Badge with Gyro Rotation](/blog/0015-esp32-video-badge-gyro-rotation/) - Hardware overview and video playback*
- *[Blog 2: Deconstructing llama2.c](/blog/0018-decontructing-llama2-c-and-exp32-llm/) - Transformer internals and ESP-DSP optimization*
- *[Blog 3: Wake Word Detection](/blog/0019-wake-word-detection/) - Training "Hey Daisy" from scratch*
- *[Blog 4: Intent Embeddings](/blog/0020-intent-embeddings/) - Audio-to-intent similarity matching*
- *[Blog 5: Fine-Tuned LLM with PIE Assembly](/blog/0021-llm-pie-assembly/) - Q8_0 quantization and 100x faster matmul*
