---
title: "From STT Failure to Intent Embeddings - When Plan A Doesn't Work"
meta_title: "Audio Embeddings for Intent Matching on ESP32-S3"
description: "When Speech-to-Text models were too big for our 8MB PSRAM, we pivoted to a clever alternative: contrastive learning to match spoken audio directly to pre-embedded intents. Here's how we trained that system."
date: 2025-12-02T00:00:00Z
image: "assets/cover.jpg"
categories: ["Hardware", "Embedded Systems", "AI", "GenAI", "Machine Learning"]
author: "Alphons Jaimon"
ai_assistance: true
tags: ["ESP32", "ESP32-S3", "Audio Embeddings", "Contrastive Learning", "YAMNet", "Intent Classification", "TinyML", "SIMD"]
series_id: "esp32-oaisys25-badge"
series_name: "Project 'Tiny Daisy' - An ESP32 powered Digital Badge"
series_order: 4
draft: true
---

This is Blog 4 in a 6-part series about building an AI-powered conference badge on the ESP32-S3. In the [previous blog](/blog/wake-word-detection), we got our custom "Hey Daisy" wake word working reliably. Now the badge can listen for its trigger phrase. But what happens after it hears "Hey Daisy"?

The original plan was simple: Wake word triggers recording, recording goes to Speech-to-Text, transcribed text feeds into the LLM. Clean, elegant, and completely impossible on our hardware.

This is the story of how a dead end led to something better.

## The STT Dream That Died

{{< sub-section title="The Original Vision" icon="fa-microphone" >}}

I had this beautiful mental model of how voice interaction would work. User says "Hey Daisy," badge starts recording, audio gets transcribed to text, text gets processed by the LLM, response gets spoken back. Just like every smart speaker you've ever used.

The problem? Smart speakers have cloud backends. We have 8MB of PSRAM.

Let me share the math that crushed my dreams:

| Model | Size | Notes |
|-------|------|-------|
| Whisper Tiny | ~75MB | Smallest official Whisper |
| Whisper Tiny.en (INT8) | ~39MB | Quantized, English-only |
| wav2vec 2.0 | ~100MB+ | Facebook's model |
| DeepSpeech | ~180MB | Mozilla's attempt |
| Vosk (small) | ~50MB | Supposedly "lightweight" |

Our constraint: 8MB PSRAM total. The LLM alone needs 6MB. That leaves 2MB for everything else - video buffers, embedding database, audio recording, and... where exactly was STT supposed to fit?

I spent an embarrassing amount of time looking for The Magical Tiny STT Model that surely existed somewhere. Claude Code helped me search through every TinyML repository, every quantization paper, every pruning technique. The answer was always the same: speech recognition requires representing the acoustic space of human language, and that space is fundamentally large.

{{< /sub-section >}}

{{< sub-section title="The Moment of Despair" icon="fa-cloud-rain" >}}

I'll be honest - I was stuck for a couple of days. The architecture I'd been planning assumed STT would work. Without it, how would the LLM know what the user asked?

The obvious fallback was push-button interaction with a text interface. Type your question, get a response. But that defeats the entire point of a voice-activated badge. Conference attendees shouldn't need to pull out their phones to interact with a novelty item.

I was staring at my dataset - 2,008 questions about myself that the LLM was trained to answer - when the insight hit me.

{{< /sub-section >}}

## The Pivot: Intent Similarity

{{< sub-section title="The Key Insight" icon="fa-lightbulb" >}}

Wait. I have 2,008 known questions. Why do I need to transcribe the audio at all?

Think about it. Speech-to-Text is general-purpose - it can transcribe anything you say into text. But I don't need "anything." I need to figure out which of my 2,008 questions the user just asked.

This isn't transcription. This is classification. Or more precisely, it's similarity matching.

The idea:
1. Pre-compute text embeddings for all 2,008 questions (stored on SD card)
2. Record user's spoken question
3. Generate an audio embedding from the recording
4. Find the closest text embedding using cosine similarity
5. Pass that matched question to the LLM

We're trading flexibility for efficiency. A traditional STT system could transcribe "Tell me about your favorite debugging story from 2019" even if that exact phrase isn't in our database. Our approach can only match to known questions. But for a conference badge about one specific person? That's not a limitation - it's the entire use case.

{{< /sub-section >}}

{{< sub-section title="The Architecture" icon="fa-project-diagram" >}}

The system has two branches that need to produce compatible embeddings:

**Audio Branch (runs on ESP32):**
```
Raw Audio (16kHz) → Mel-Spectrogram (64×96) → CNN Encoder → 256-dim embedding
```

**Text Branch (runs once during training):**
```
Question Text → MPNet (768-dim) → Projection Layer → 256-dim embedding
```

The magic is that both branches output vectors in the same 256-dimensional space. If the audio and text represent the same question, their embeddings should be close together. If they're different questions, the embeddings should be far apart.

This is exactly what contrastive learning does.

{{< /sub-section >}}

## Contrastive Learning Primer

{{< sub-section title="Bringing Modalities Together" icon="fa-magnet" >}}

Contrastive learning is one of those techniques that sounds complicated but has a beautifully simple core idea: learn to tell what goes together and what doesn't.

In our case, we have audio-text pairs. The audio of someone saying "What's your favorite programming language?" should match the text "What's your favorite programming language?" but NOT match the text "Where did you go to school?"

The loss function that makes this work is called InfoNCE (Noise-Contrastive Estimation). Here's the intuition:

```python
# Pseudo-code for contrastive loss
def contrastive_loss(audio_embeddings, text_embeddings):
    # Similarity matrix: each audio vs all texts
    similarity = audio_embeddings @ text_embeddings.T  # [B, B]

    # Temperature scaling (sharpens the distribution)
    similarity = similarity / temperature

    # Labels: diagonal entries are the correct pairs
    labels = torch.arange(batch_size)  # [0, 1, 2, ..., B-1]

    # Cross-entropy: maximize probability of correct pair
    loss = cross_entropy(similarity, labels)
    return loss
```

The key insight: in a batch of B samples, there's exactly one correct text for each audio (the diagonal of the similarity matrix). The other B-1 texts are "negatives." Training pushes the correct pair's similarity up while pushing incorrect pairs down.

{{< /sub-section >}}

{{< sub-section title="Visualization" icon="fa-chart-scatter" >}}

Imagine a 256-dimensional space (impossible to visualize, but humor me). Before training, audio and text embeddings are scattered randomly. After training:

```
Before Training:           After Training:

  A1    T3                   A1≈T1
     T1      A2              A2≈T2
  T2           A3            A3≈T3
                 T1
```

Same questions cluster together regardless of modality. Different questions stay far apart.

{{< /sub-section >}}

## The Bucketed Batch Sampling Innovation

{{< sub-section title="When Naive Training Fails Spectacularly" icon="fa-bomb" >}}

Here's where things got interesting. I implemented the contrastive training pipeline, ran it for 300 epochs, and got... 4% accuracy.

Four percent. On a classification task with 10 classes. Random guessing would give 10%.

What went wrong?

I dug into the training dynamics with Claude Code's help and found the problem: my batches were contaminated.

When you randomly sample a batch of 32 audio-text pairs, some of those pairs might be variations of the same question. For example:
- Audio 1: "What's your favorite language?" (voice A)
- Audio 2: "What's your favorite language?" (voice B, augmented)
- Audio 3: "Which programming language do you prefer?"

All three are semantically identical. But in contrastive learning, they're treated as different negatives!

The model learns a trivial solution: "these three audios sound similar to each other, so they must be negative examples for each other's text." It never learns that they should ALL match the same semantic intent.

{{< /sub-section >}}

{{< sub-section title="The Solution: Semantic Clustering" icon="fa-layer-group" >}}

The fix required preprocessing our 2,008 questions. I used MPNet embeddings to cluster semantically similar questions:

```python
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

# Get embeddings for all questions
encoder = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
embeddings = encoder.encode(questions)

# Cluster by similarity (threshold 0.85)
similarity_matrix = cosine_similarity(embeddings)
buckets = []
assigned = set()

for i in range(len(questions)):
    if i in assigned:
        continue
    bucket = [i]
    for j in range(i + 1, len(questions)):
        if j not in assigned and similarity_matrix[i, j] >= 0.85:
            bucket.append(j)
            assigned.add(j)
    buckets.append(bucket)
    assigned.add(i)

print(f"2,008 questions → {len(buckets)} semantic buckets")
# Output: 2,008 questions → 1,698 semantic buckets
```

Result: 1,698 semantic buckets. Questions like "What's your favorite language?" and "Which language do you like most?" end up in the same bucket.

Now the critical change: **each training batch contains at most ONE sample from each bucket**.

```python
class BucketBatchGenerator:
    def __init__(self, samples, bucket_ids, batch_size):
        self.bucket_to_samples = defaultdict(list)
        for i, bucket_id in enumerate(bucket_ids):
            self.bucket_to_samples[bucket_id].append(i)
        self.all_buckets = list(self.bucket_to_samples.keys())
        self.batch_size = min(batch_size, len(self.all_buckets))

    def generate_batch(self):
        # Select batch_size DIFFERENT buckets
        selected_buckets = random.sample(self.all_buckets, self.batch_size)

        batch = []
        for bucket_id in selected_buckets:
            # Pick ONE random sample from this bucket
            sample_idx = random.choice(self.bucket_to_samples[bucket_id])
            batch.append(sample_idx)

        return batch
```

Now when the model sees a batch, every sample is semantically distinct. The negatives are truly different questions. The model can no longer cheat.

{{< /sub-section >}}

{{< sub-section title="The Results Were Dramatic" icon="fa-chart-line" >}}

| Metric | Naive Batching | Bucketed Batching |
|--------|----------------|-------------------|
| Accuracy | 4% | 70-90% |
| Diagonal Similarity | 0.577 | 0.844 |
| Off-Diagonal Similarity | 0.177 | -0.002 |
| Similarity Gap | 0.40 | 0.846 |

The diagonal similarity jumped from 0.577 to 0.844. More importantly, incorrect pairs went from 0.177 (still somewhat similar) to -0.002 (completely orthogonal).

This was the breakthrough that made the whole system work.

{{< /sub-section >}}

## Multi-GPU Dataset Generation

{{< sub-section title="Scale Matters" icon="fa-server" >}}

Training a contrastive model needs data. Lots of data. And not just any data - diverse audio variations of each question.

The math:
- 2,008 questions
- 8 different voice speakers
- 2 augmentation variants each
- **Total: 32,128 audio samples**

Generating 32,000 audio clips with a neural TTS model is not fast. XTTS-v2, the model I chose for realistic voice synthesis, takes about 2-3 seconds per clip on a GPU. That's... 18+ hours on a single GPU.

Enter vast.ai.

{{< /sub-section >}}

{{< sub-section title="Parallelizing with vast.ai" icon="fa-cubes" >}}

I rented 12 RTX 4070 SUPER instances, each costing about $0.20/hour. The total dataset generation took approximately 5 hours and cost under $15.

The architecture was straightforward:
1. Split the 2,008 questions into 12 chunks (167 questions each)
2. Each worker generates all 8 voice variants for its questions
3. Workers save checkpoints to handle preemption
4. Final step: collect and merge all audio files

```python
# Worker configuration
WORKER_ID = int(os.environ.get('WORKER_ID', 0))
TOTAL_WORKERS = 12
QUESTIONS_PER_WORKER = len(all_questions) // TOTAL_WORKERS

start_idx = WORKER_ID * QUESTIONS_PER_WORKER
end_idx = start_idx + QUESTIONS_PER_WORKER

my_questions = all_questions[start_idx:end_idx]
```

The key to reliability was state persistence. Each worker maintained a JSON checkpoint:

```python
checkpoint = {
    'worker_id': WORKER_ID,
    'completed_questions': completed_list,
    'last_question_idx': current_idx,
    'voices_completed': voices_done
}

# Save after every question
with open(f'checkpoint_worker_{WORKER_ID}.json', 'w') as f:
    json.dump(checkpoint, f)
```

If a spot instance got preempted (which happened twice), the replacement just loaded the checkpoint and continued from where it left off.

{{< /sub-section >}}

{{< sub-section title="XTTS-v2 Voice Cloning" icon="fa-users" >}}

XTTS-v2 is remarkable for voice cloning. You give it a 6-second reference sample and it can synthesize new speech in that voice. I downloaded 8 TED talk speaker samples for maximum diversity:

- Bill Gates (Male, US accent)
- Daphne Koller (Female, US accent)
- Fei-Fei Li (Female, Chinese-American accent)
- Jane Goodall (Female, British accent)
- Salman Khan (Male, US accent)
- George Takei (Male, US distinctive)
- Stephen Hawking (Male, British synthesized)
- Stephen Wolfram (Male, British accent)

The diversity here is intentional. The model needs to generalize across genders, accents, and speaking styles. If it only ever hears American male voices during training, it'll fail on everyone else.

```python
# Pre-compute speaker latents for efficiency
speaker_latents = {}
for speaker_file in speaker_files:
    gpt_cond_latent, speaker_embedding = tts.get_conditioning_latents(
        audio_path=speaker_file
    )
    speaker_latents[speaker_file] = (gpt_cond_latent, speaker_embedding)

# Generation with cached latents (much faster)
for question in my_questions:
    for speaker_file in speaker_files:
        gpt_cond, spk_emb = speaker_latents[speaker_file]
        tts.tts_to_file(
            text=question,
            file_path=output_path,
            gpt_cond_latent=gpt_cond,
            speaker_embedding=spk_emb,
            language="en"
        )
```

{{< /sub-section >}}

## Audio Augmentation

{{< sub-section title="Making Models Robust" icon="fa-random" >}}

Raw TTS output is too clean. Real conference audio will have background noise, people speaking at different speeds, maybe some acoustic weirdness from the venue. Augmentation bridges this gap.

I used the `audiomentations` library with these transforms:

```python
from audiomentations import Compose, AddGaussianNoise, TimeStretch, PitchShift

augmenter = Compose([
    AddGaussianNoise(min_amplitude=0.005, max_amplitude=0.02, p=1.0),
    TimeStretch(min_rate=0.9, max_rate=1.1, p=0.5),
    PitchShift(min_semitones=-2, max_semitones=2, p=0.5),
])
```

Each audio file gets processed twice:
1. Original (just normalized)
2. Augmented (noise + random stretch + random pitch)

This doubles the dataset to 32,128 samples while adding crucial variation.

**Why these specific augmentations?**
- **Gaussian noise**: Simulates ambient conference chatter
- **Time stretch**: People speak at different speeds (0.9x to 1.1x)
- **Pitch shift**: Voices naturally vary by ±2 semitones

I deliberately avoided heavy augmentations like room reverb or extreme distortion. The goal is realism, not stress-testing. A conference badge doesn't need to understand speech through a wall.

{{< /sub-section >}}

## ESP32-Optimized CNN Encoder

{{< sub-section title="Ditching YAMNet" icon="fa-cut" >}}

My first prototype used Google's YAMNet, a pre-trained audio classification model. It produces excellent 1024-dimensional embeddings and has been trained on millions of audio clips.

It's also 3.5MB.

For context, our entire ML pool budget is 1MB. YAMNet would eat that three times over, leaving nothing for the actual inference.

The solution: train a tiny custom encoder from scratch.

{{< /sub-section >}}

{{< sub-section title="The Architecture" icon="fa-layer-group" >}}

The final encoder is embarrassingly simple:

```
Input: (64, 96, 1) - mel-spectrogram
    ↓
Conv2D(32, 3×3, ReLU) + MaxPool(2×2)  →  (32, 48, 32)
    ↓
Conv2D(64, 3×3, ReLU) + MaxPool(2×2)  →  (16, 24, 64)
    ↓
Conv2D(128, 3×3, ReLU) + MaxPool(2×2) →  (8, 12, 128)
    ↓
Conv2D(128, 3×3, ReLU) + GlobalAvgPool →  (128,)
    ↓
Dense(256) + L2Normalize  →  (256,)
```

Total parameters: 273,280
- Float32: 1.04 MB
- INT8 quantized: **288 KB**

This fits comfortably in our memory budget with room to spare.

The architecture follows a classic pattern: progressively increase channels while decreasing spatial dimensions. GlobalAveragePooling at the end collapses the spatial dimensions entirely, producing a fixed-size vector regardless of input length variations.

{{< /sub-section >}}

{{< sub-section title="Training Details" icon="fa-cogs" >}}

```python
# Model definition
def build_audio_encoder():
    inputs = tf.keras.Input(shape=(64, 96, 1))

    x = tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu')(inputs)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    x = tf.keras.layers.Dense(256)(x)
    outputs = tf.keras.layers.Lambda(lambda x: tf.nn.l2_normalize(x, axis=1))(x)

    return tf.keras.Model(inputs, outputs)

# Training
optimizer = tf.keras.optimizers.Adam(1e-4)
temperature = 0.2  # Sharpens contrastive loss

for epoch in range(3000):
    for batch in bucketed_dataloader:
        with tf.GradientTape() as tape:
            audio_emb = audio_encoder(mel_specs)
            text_emb = text_projection(text_embeddings)

            logits = tf.matmul(audio_emb, text_emb, transpose_b=True) / temperature
            labels = tf.range(batch_size)
            loss = tf.nn.sparse_softmax_cross_entropy_with_logits(labels, logits)

        grads = tape.gradient(loss, trainable_vars)
        optimizer.apply_gradients(zip(grads, trainable_vars))
```

3000 epochs sounds like a lot, but each epoch processes the 32K samples in batches of 32, and the model is tiny. Total training time: about 2 hours on a single GPU.

{{< /sub-section >}}

## Mel-Spectrogram with ESP-DSP

{{< sub-section title="Feature Extraction on Device" icon="fa-wave-square" >}}

The CNN encoder expects a mel-spectrogram as input. This is a 2D representation of audio that emphasizes frequency bands the human ear cares about.

Parameters (must match training exactly):
- 64 mel bins
- 96 frames (~1 second of audio at 16kHz)
- 512-point FFT with Hann window
- 160-sample hop length (10ms)
- Frequency range: 125Hz - 7500Hz

The ESP32-S3 has dedicated DSP instructions that make FFT blazingly fast. I use the ESP-DSP library for the heavy lifting:

```cpp
// From local_llm_badge/src/ml/audio_embed.cpp

void AudioEmbedder::_computeFFTFrame(const int16_t* audio, int startIdx, float* powerSpectrum) {
    // Apply Hann window and convert to float
    for (int i = 0; i < AUDIO_FFT_SIZE; i++) {
        _fftInput[i] = (float)audio[startIdx + i] * _window[i] / 32768.0f;
    }

    // Prepare complex input (real part only)
    for (int i = 0; i < AUDIO_FFT_SIZE; i++) {
        _fftOutput[i * 2] = _fftInput[i];
        _fftOutput[i * 2 + 1] = 0.0f;
    }

    // ESP-DSP hardware-accelerated FFT
    dsps_fft2r_fc32(_fftOutput, AUDIO_FFT_SIZE);
    dsps_bit_rev_fc32(_fftOutput, AUDIO_FFT_SIZE);

    // Compute power spectrum: |X[k]|^2
    for (int k = 0; k < AUDIO_FFT_SIZE / 2 + 1; k++) {
        float real = _fftOutput[k * 2];
        float imag = _fftOutput[k * 2 + 1];
        powerSpectrum[k] = real * real + imag * imag;
    }
}
```

The `dsps_fft2r_fc32()` function is the star here. It's a radix-2 FFT optimized for the ESP32's PIE (Processor Instruction Extensions) SIMD unit. A 512-point FFT that would take milliseconds in pure C completes in microseconds.

{{< /sub-section >}}

{{< sub-section title="SIMD Mel Filterbank" icon="fa-filter" >}}

After FFT, we need to apply triangular mel filters. This is essentially 64 dot products (one per mel bin), each multiplying a frequency-domain weight vector against the power spectrum.

Dot products are exactly what SIMD excels at:

```cpp
void AudioEmbedder::_applyMelFilterbank(float* powerSpectrum, float* melOutput) {
    int numFreqBins = AUDIO_FFT_SIZE / 2 + 1;  // 257 bins

    for (int m = 0; m < AUDIO_MEL_BINS; m++) {
        float sum = 0.0f;

        // ESP-DSP SIMD dot product for mel filter application
        dsps_dotprod_f32_aes3(&_melFilterbank[m * numFreqBins],
                              powerSpectrum, &sum, numFreqBins);

        // Log transform (dB scale)
        melOutput[m] = log10f(sum + 1e-10f);
    }
}
```

The `dsps_dotprod_f32_aes3()` function processes 4 floats per instruction using the AES3 SIMD instructions. For 257 frequency bins, that's about 65 SIMD operations instead of 257 scalar operations. Roughly 4x speedup.

The mel filterbank itself is precomputed during initialization:

```cpp
// Triangular mel filters
for (int m = 0; m < AUDIO_MEL_BINS; m++) {
    float left = melCenters[m];
    float center = melCenters[m + 1];
    float right = melCenters[m + 2];

    for (int k = 0; k < numFreqBins; k++) {
        float freq = k * freqResolution;
        float weight = 0.0f;

        if (freq >= left && freq <= center) {
            weight = (freq - left) / (center - left);  // Rising edge
        } else if (freq > center && freq <= right) {
            weight = (right - freq) / (right - center);  // Falling edge
        }

        _melFilterbank[m * numFreqBins + k] = weight;
    }
}
```

{{< /sub-section >}}

## SIMD Similarity Search

{{< sub-section title="Finding the Best Match" icon="fa-search" >}}

Once we have a 256-dimensional audio embedding, we need to find the closest text embedding from our database of 256 pre-computed question embeddings.

Database size: 256 questions × 256 dimensions × 4 bytes = **262 KB**

This fits entirely in PSRAM and stays resident throughout operation. No loading/unloading needed.

The search is a straightforward linear scan with cosine similarity:

```cpp
// From local_llm_badge/src/ml/embed_search.cpp

float EmbeddingSearch::_cosineSimilarity(const float* a, const float* b) {
    float dot = 0.0f;
    float normA = 0.0f;
    float normB = 0.0f;

    // ESP-DSP SIMD dot products - 5-10x faster than manual loops
    dsps_dotprod_f32_aes3(a, b, &dot, AUDIO_EMBEDDING_DIM);
    dsps_dotprod_f32_aes3(a, a, &normA, AUDIO_EMBEDDING_DIM);
    dsps_dotprod_f32_aes3(b, b, &normB, AUDIO_EMBEDDING_DIM);

    float denom = sqrtf(normA) * sqrtf(normB);
    return (denom > 1e-8f) ? dot / denom : 0.0f;
}
```

Three SIMD dot products per comparison: one for the actual dot product, two for the vector norms. With 256 dimensions and 256 database entries, that's 768 SIMD operations total. The entire search completes in under 100ms.

{{< /sub-section >}}

{{< sub-section title="Top-K Tracking" icon="fa-list-ol" >}}

For debugging purposes, I track the top 5 matches rather than just the best one. This uses a simple insertion sort:

```cpp
SearchResult EmbeddingSearch::search(const float* embedding) {
    const int TOP_K = 5;
    float topScores[TOP_K] = {-1, -1, -1, -1, -1};
    int topIndices[TOP_K] = {-1, -1, -1, -1, -1};

    for (int i = 0; i < _count; i++) {
        float score = _cosineSimilarity(embedding, &_embeddings[i * AUDIO_EMBEDDING_DIM]);

        // Insert into top-K if better than worst
        if (score > topScores[TOP_K - 1]) {
            int insertAt = TOP_K - 1;
            while (insertAt > 0 && score > topScores[insertAt - 1]) {
                topScores[insertAt] = topScores[insertAt - 1];
                topIndices[insertAt] = topIndices[insertAt - 1];
                insertAt--;
            }
            topScores[insertAt] = score;
            topIndices[insertAt] = i;
        }
    }

    // Return best match
    SearchResult result;
    result.intentIdx = topIndices[0];
    result.score = topScores[0];
    _getIntent(topIndices[0], result.intent, sizeof(result.intent));
    return result;
}
```

The serial monitor output shows all 5 top matches, which is invaluable for debugging misclassifications.

{{< /sub-section >}}

{{< sub-section title="Offset-Based Intent Storage" icon="fa-database" >}}

A small but important optimization: the intent strings (the actual question text) are stored with O(1) lookup.

The naive approach would store each string separately, requiring a string search or index structure. Instead, I concatenate all intents into a single buffer and precompute byte offsets:

```cpp
bool EmbeddingSearch::_loadIntents(const char* path) {
    // Read entire file into memory
    _intentsData = (char*)ps_malloc(fileSize + 1);
    file.read((uint8_t*)_intentsData, fileSize);

    // Replace newlines with null terminators
    for (size_t i = 0; i < fileSize; i++) {
        if (_intentsData[i] == '\n') {
            _intentsData[i] = '\0';
        }
    }

    // Build offset table for O(1) lookup
    _intentOffsets = (int*)ps_malloc(_count * sizeof(int));
    _intentOffsets[0] = 0;

    int line = 0;
    for (size_t i = 0; i < fileSize && line < _count; i++) {
        if (_intentsData[i] == '\0') {  // Found a terminator
            line++;
            if (line < _count) {
                _intentOffsets[line] = i + 1;  // Next string starts here
            }
        }
    }

    return true;
}

// O(1) intent lookup
void EmbeddingSearch::_getIntent(int idx, char* buffer, size_t bufSize) {
    const char* intentStr = _intentsData + _intentOffsets[idx];
    strncpy(buffer, intentStr, bufSize - 1);
}
```

Memory for 256 questions with average length 50 characters: about 15KB for strings plus 1KB for offsets. Negligible.

{{< /sub-section >}}

## Results and Integration

{{< sub-section title="Performance Numbers" icon="fa-tachometer-alt" >}}

On the ESP32-S3 running at 240MHz:

| Stage | Time |
|-------|------|
| Mel-spectrogram extraction | ~80-100ms |
| CNN inference | ~100-150ms |
| Similarity search | ~50-80ms |
| **Total** | **~200-300ms** |

For comparison, even the tiniest STT model would take 5-10 seconds. We're 20-50x faster while using 1/100th the memory.

{{< /sub-section >}}

{{< sub-section title="Accuracy" icon="fa-bullseye" >}}

On a held-out test set of real voice recordings (not TTS):
- Top-1 accuracy: **100%** (on known question variants)
- Top-5 accuracy: **100%**
- Average similarity score for correct match: **0.82-0.88**
- Average similarity score for next-best: **0.45-0.55**

The gap between correct and incorrect is large enough that we can confidently threshold at 0.7 (configured in `config.h` as `DEFAULT_EMBED_THRESHOLD`).

When the user asks something completely off-topic - "What's the weather like?" - the best match score drops below 0.5 and we trigger the fallback behavior (TTS "Sorry, I don't know about that" + stash the audio for later review).

{{< /sub-section >}}

{{< sub-section title="How It Flows Into the LLM" icon="fa-arrow-right" >}}

The embedding search returns an intent string - the matched question. This becomes the prompt for the LLM:

```cpp
// In the main state machine
case STATE_SIMILARITY: {
    SearchResult result = embedSearch.search(audioEmbedding);

    if (result.score >= config.embedThreshold) {
        // High confidence - proceed to LLM
        strcpy(llmPrompt, result.intent);
        state = STATE_LLM_INFERENCE;
    } else {
        // Low confidence - apologize and stash
        state = STATE_TTS_SORRY;
    }
    break;
}

case STATE_LLM_INFERENCE: {
    // The matched question becomes the LLM prompt
    // LLM generates a response specific to that question
    llm.generate(llmPrompt, responseBuffer, maxTokens);
    state = STATE_DISPLAY_RESPONSE;
    break;
}
```

The beauty of this approach: the LLM was trained on the exact same 2,008 questions. When it receives "What's your favorite programming language?" as input, it knows exactly how to respond because it's seen that question thousands of times during fine-tuning.

In the [next blog](/blog/fine-tuned-llm), I'll cover how we trained that LLM and the PIE assembly optimizations that make inference actually usable on embedded hardware.

{{< /sub-section >}}

## Lessons Learned

{{< sub-section title="Constraints Breed Creativity" icon="fa-brain" >}}

The STT failure felt like a disaster at the time. In retrospect, it led to a better solution. Intent similarity is faster, smaller, and arguably more accurate for our specific use case than any STT+classification pipeline would have been.

If we'd had 32GB of RAM, we probably would have just run Whisper and called it a day. The constraint forced us to really think about what problem we were actually solving.

{{< /sub-section >}}

{{< sub-section title="Batch Sampling Matters More Than Model Size" icon="fa-balance-scale" >}}

I spent a week tweaking model architectures before realizing the problem was in the data pipeline. A perfect model can't overcome fundamentally broken training signals.

The bucketed batch sampling fix took an afternoon to implement and 20x'd our accuracy. Sometimes the bottleneck isn't where you expect.

{{< /sub-section >}}

{{< sub-section title="Claude Code Made This Possible" icon="fa-robot" >}}

I need to be honest: I don't have a deep background in contrastive learning. Claude Code helped me understand InfoNCE loss, debug the batch sampling issue, and optimize the SIMD implementations. The multi-GPU dataset generation script was a collaborative effort.

This project wouldn't exist in its current form without AI assistance. I think that's fine. The goal was never to demonstrate my personal expertise in every subdomain - it was to build something cool that works.

{{< /sub-section >}}

## What's Next

With wake word detection (Blog 3) and intent embeddings (this post), we can now:
1. Listen for "Hey Daisy"
2. Record the user's question
3. Match it to a known intent

The next step is actually answering the question. That means running a 6MB language model on a microcontroller with 8MB of RAM.

[Blog 5: Fine-Tuned LLM with PIE Assembly](/blog/fine-tuned-llm) covers the three-phase training pipeline, Q8_0 quantization, and the inline ESP32-S3 PIE assembly that achieves 16 int8 MACs per cycle.

See you there.

---

*All code referenced in this post is available in the [OAISYS25 badge repository](https://github.com/alphonsez/oaisys25-badge). Key files:*
- `/home/alphons/project/OAISYS25/badge/local_llm_badge/src/ml/audio_embed.cpp` - Mel-spectrogram + CNN inference
- `/home/alphons/project/OAISYS25/badge/local_llm_badge/src/ml/embed_search.cpp` - SIMD similarity search
- `/home/alphons/project/OAISYS25/badge/workbench/tests/audio_embedding_dataset_ipynb/train_audio_encoder.ipynb` - Training notebook
- `/home/alphons/project/OAISYS25/badge/workbench/tests/audio_semantic_xtts_ipynb/audio_semantic_xtts.ipynb` - XTTS synthesis pipeline
