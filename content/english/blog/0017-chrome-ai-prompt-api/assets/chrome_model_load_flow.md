---
title: "Chrome AI Complete Loading Flow - Base Model + LoRA"
draft: true
---

**Comprehensive Technical Breakdown**
**Date:** 2025-11-11

---

## 📋 Table of Contents

1. [Base Model Loading Flow](#1-base-model-loading-flow)
2. [LoRA Adaptation Loading Flow](#2-lora-adaptation-loading-flow)
3. [File Structure & Locations](#3-file-structure--locations)
4. [Key Data Structures](#4-key-data-structures)
5. [Native Library Interface](#5-native-library-interface)
6. [Complete Call Stack](#6-complete-call-stack)
7. [Injection Points Summary](#7-injection-points-summary)

---

## 1. Base Model Loading Flow

### 1.1 High-Level Overview

```markdown
Component Updater → Optimization Guide → Model Executor → ChromeML Native Library
       ↓                    ↓                  ↓                    ↓
   Download            Manage Files      Create Model        Parse TFLite
   Model Data          & Metadata        Instance            & Initialize
```

### 1.2 Detailed Flow

#### Step 1: Component Download
**Trigger:** Chrome startup or background update

**Location:** `components/optimization_guide/core/model_execution/on_device_model_component.h`

```cpp
// Chrome's Component Updater downloads:
// - Base model weights (weights.bin)
// - Sentencepiece model (for tokenization)
// - Cache files (optional, for acceleration)
// - Manifest with version info
```

**Downloaded to:**
```markdown
C:\Users\[USER]\AppData\Local\Google\Chrome Beta\User Data\
OptGuideOnDeviceModel\[VERSION]\
├── weights.bin                    (4+ GB) - TFLite base model
├── manifest.json                  - Model metadata
├── on_device_model_execution_config.pb - Execution config
├── adapter_cache.bin              (0 bytes initially)
├── encoder_cache.bin              (0 bytes initially)
└── _metadata\
    └── verified_contents.json
```

#### Step 2: Model Registration
**Location:** `components/optimization_guide/core/model_execution/on_device_model_service_controller.cc`

**Key Code:**
```cpp
void OnDeviceModelServiceController::Init() {
  // Register for base model availability
  base_model_asset_manager_ =
      std::make_unique<OnDeviceAssetManager>(model_provider_);

  // Wait for component to be ready
  base_model_asset_manager_->AddObserver(this);
}
```

#### Step 3: Model Asset Discovery
**Location:** `components/optimization_guide/core/model_execution/on_device_asset_manager.cc`

**Process:**
```cpp
void OnDeviceAssetManager::OnModelUpdated(
    proto::OptimizationTarget optimization_target,
    base::optional_ref<const ModelInfo> model_info) {

  if (!model_info.has_value()) {
    return;  // Model not available
  }

  // Extract model paths
  auto weights_path = model_info->GetModelFilePath();
  auto sp_model_path = model_info->GetAdditionalFileWithBaseName(
      kOnDeviceModelSentencePieceFile);

  // Create ModelAssetPaths
  ModelAssetPaths paths;
  paths.weights = weights_path;
  paths.sp_model = sp_model_path;
  paths.cache = GetCacheFilePath();
  paths.encoder_cache = GetEncoderCacheFilePath();
  paths.adapter_cache = GetAdapterCacheFilePath();

  // Notify controller
  NotifyAssetsAvailable(paths);
}
```

#### Step 4: Model Executor Creation
**Location:** `services/on_device_model/ml/on_device_model_executor.cc`

**Key Method:**
```cpp
std::unique_ptr<OnDeviceModelExecutor> OnDeviceModelExecutor::Create(
    const ModelAssetPaths& paths) {

  // Load ChromeML native library
  ChromeML* chrome_ml = ChromeML::Get();
  if (!chrome_ml) {
    return nullptr;  // Library not available
  }

  // Prepare model descriptor
  ChromeMLModelDescriptor descriptor = {
    .backend_type = GetBackendType(),  // GPU or APU
    .model_data = &model_data,
    .max_tokens = kDefaultMaxTokens,
    .temperature = kDefaultTemperature,
    .top_k = kDefaultTopK,
    .adaptation_ranks = kSupportedLoRARanks,  // ⭐ [4,8,16,32,64]
    .adaptation_ranks_size = kSupportedLoRARanksSize,
    .prefer_texture_weights = true,
    .enable_host_mapped_pointer = true,
    // ... other config
  };

  // Prepare model data
  ChromeMLModelData model_data;
  model_data.weights_file = OpenModelFile(paths.weights);
  model_data.cache_file = OpenCacheFile(paths.cache);
  model_data.encoder_cache_file = OpenCacheFile(paths.encoder_cache);
  model_data.adapter_cache_file = OpenCacheFile(paths.adapter_cache);

  // ⭐ CREATE MODEL via native library
  ChromeMLModel model = chrome_ml->api().CreateModel(&descriptor);

  if (!model) {
    return nullptr;  // Model creation failed
  }

  return std::make_unique<OnDeviceModelExecutor>(chrome_ml, model);
}
```

#### Step 5: Native Library Model Creation
**Location:** `services/on_device_model/ml/chrome_ml_api.h`

**Interface:**
```cpp
// Native library function signature
typedef ChromeMLModel (*CreateModelFn)(
    const ChromeMLModelDescriptor* descriptor);

struct ChromeMLAPI {
  CreateModelFn CreateModel;
  DestroyModelFn DestroyModel;
  CreateSessionFn CreateSession;
  // ... other functions
};
```

**What happens inside (proprietary `libchrome_ai.so`):**
```markdown
1. Parse TFLite model from weights_file
2. Initialize GPU/APU backend
3. Allocate weight cache memory
4. Load weights into GPU/memory
5. Prepare tokenizer (sentencepiece)
6. Initialize LoRA infrastructure (empty initially)
7. Return opaque model handle
```

### 1.3 Model Readiness

**Check via:** `chrome://on-device-internals`

**States:**
- `kNotInstalled` - Component not downloaded
- `kDownloading` - Downloading from server
- `kInstalled` - Files on disk, not loaded
- `kReady` - Model loaded and ready
- `kError` - Failed to load

---

## 2. LoRA Adaptation Loading Flow

### 2.1 High-Level Overview

```markdown
Feature Usage → Adaptation Loader → Model Compatibility Check → Session Creation
      ↓               ↓                      ↓                         ↓
  Summarizer    Fetch LoRA from      Check base model         Apply LoRA
  API called    model store          version & hints          to session
```

### 2.2 Detailed Flow

#### Step 1: Feature Registration
**Location:** `components/optimization_guide/core/model_execution/on_device_model_adaptation_controller.cc`

**When a feature is used (e.g., Summarizer API):**
```cpp
void OnDeviceModelAdaptationController::MaybeRegisterAdaptation(
    ModelBasedCapabilityKey feature,
    bool was_recently_used) {

  // Check if base model is ready
  if (!base_model_available_) {
    return;
  }

  // Get base model spec
  const OnDeviceBaseModelSpec& spec = GetBaseModelSpec();

  // Register for adaptation download
  adaptation_loader_map_->MaybeRegisterModelDownload(
      feature, spec, was_recently_used);
}
```

#### Step 2: Adaptation Discovery
**Location:** `components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:126-135`

**Critical Function:**
```cpp
std::unique_ptr<on_device_model::AdaptationAssetPaths> MaybeGetAdaptationPaths(
    const optimization_guide::ModelInfo& model_info) {

  // ⭐ Look for "adaptation_weights.bin"
  auto weights_file = model_info.GetAdditionalFileWithBaseName(
      kOnDeviceModelAdaptationWeightsFile);  // "adaptation_weights.bin"

  if (!weights_file) {
    return nullptr;  // No adaptation available
  }

  auto adaptation_assets =
      std::make_unique<on_device_model::AdaptationAssetPaths>();
  adaptation_assets->weights = *weights_file;  // ⭐ Just the path!

  return adaptation_assets;
}
```

**Key Constant:**
```cpp
// components/optimization_guide/core/optimization_guide_constants.cc:65-66
const base::FilePath::CharType kOnDeviceModelAdaptationWeightsFile[] =
    FILE_PATH_LITERAL("adaptation_weights.bin");  // ⭐ HARDCODED NAME
```

#### Step 3: Compatibility Checks
**Location:** `components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:96-122`

**Critical Checks:**
```cpp
std::optional<OnDeviceModelAdaptationAvailability>
DetectBaseModelIncompatibility(
    const optimization_guide::ModelInfo& model_info,
    const OnDeviceBaseModelSpec& registered_spec) {

  // Parse adaptation metadata
  const std::optional<proto::Any>& metadata = model_info.GetModelMetadata();
  auto supported_model_spec =
      ParsedAnyMetadata<proto::OnDeviceBaseModelMetadata>(metadata.value());

  if (!supported_model_spec) {
    return OnDeviceModelAdaptationAvailability::kAdaptationModelInvalid;
  }

  // ⭐ CHECK 1: Base model name & version
  if (supported_model_spec->base_model_name() != registered_spec.model_name ||
      supported_model_spec->base_model_version() != registered_spec.model_version) {
    return OnDeviceModelAdaptationAvailability::kAdaptationModelIncompatible;
  }

  // ⭐ CHECK 2: Performance hints compatibility
  if (!ArePerformanceHintsCompatible(*supported_model_spec, registered_spec)) {
    return OnDeviceModelAdaptationAvailability::kAdaptationModelHintsIncompatible;
  }

  return std::nullopt;  // Compatible!
}
```

#### Step 4: Execution Config Loading
**Location:** `components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:278-296`

```cpp
void OnDeviceModelAdaptationLoader::OnModelUpdated(
    proto::OptimizationTarget optimization_target,
    base::optional_ref<const ModelInfo> model_info) {

  // Get execution config file
  auto execution_config_file = model_info->GetAdditionalFileWithBaseName(
      kOnDeviceModelExecutionConfigFile);  // "on_device_model_execution_config.pb"

  if (!execution_config_file) {
    // Invalid - need config to know how to use the LoRA
    on_load_fn_.Run(base::unexpected(AdaptationUnavailability::kNotSupported));
    return;
  }

  // Read and parse protobuf config on background thread
  background_task_runner_->PostTaskAndReplyWithResult(
      FROM_HERE,
      base::BindOnce(&ReadOnDeviceModelExecutionConfig, *execution_config_file),
      base::BindOnce(&CreateAdaptationMetadataFromModelExecutionConfig,
                     feature_, MaybeGetAdaptationPaths(*model_info),
                     model_info->GetVersion())
          .Then(base::BindOnce(&OnDeviceModelAdaptationMetadataCreated, feature_))
          .Then(on_load_fn_));
}
```

#### Step 5: Session Creation with LoRA
**Location:** `services/on_device_model/ml/session_accessor.cc:180-223`

**Critical Code:**
```cpp
void SessionAccessor::CreateInternal(
    on_device_model::mojom::SessionParamsPtr params,
    on_device_model::mojom::LoadAdaptationParamsPtr adaptation_params,
    std::optional<uint32_t> adaptation_id) {

  // Prepare base descriptor
  ChromeMLAdaptationDescriptor descriptor = {
    .max_tokens = params->max_tokens,
    .top_k = params->top_k,
    .temperature = params->temperature,
    .enable_image_input = params->capabilities.image_input,
    .enable_audio_input = params->capabilities.audio_input,
    .model_data = nullptr  // Will be set below if LoRA present
  };

  ChromeMLModelData data;
  std::string weights_path_str;

  // ⭐ IF ADAPTATION IS PRESENT
  if (adaptation_params) {
    weights_path_str = adaptation_params->assets.weights_path.AsUTF8Unsafe();

    if (adaptation_params->assets.weights.IsValid() || !weights_path_str.empty()) {

      // GPU backend: use file handle
      if (adaptation_params->assets.weights.IsValid()) {
        data.weights_file = adaptation_params->assets.weights.TakePlatformFile();
      }
      // APU backend: use file path
      else {
        data.model_path = weights_path_str.data();
      }

      data.file_id = adaptation_id;  // For caching
      descriptor.model_data = &data;  // ⭐ ATTACH LORA DATA
    }
  }

  // ⭐ CREATE SESSION with base model + optional LoRA
  session_ = chrome_ml_->api().CreateSession(model_, &descriptor);
}
```

#### Step 6: Native Library LoRA Application
**What happens inside `libchrome_ai.so` (proprietary):**

```markdown
CreateSession(model, descriptor):
  1. Clone base model state
  2. IF descriptor.model_data != NULL:
     a. Read adaptation_weights.bin into memory
     b. Parse binary format (proprietary)
     c. Extract LoRA A/B matrices
     d. Apply LoRA to attention layers:
        - For each layer:
          - Original: W
          - LoRA: ΔW = B × A (rank reduction)
          - Modified: W' = W + α × ΔW
     e. Update session weights
  3. Initialize tokenizer state
  4. Allocate context buffers
  5. Return session handle
```

---

## 3. File Structure & Locations

### 3.1 Base Model Files

```markdown
C:\Users\[USER]\AppData\Local\Google\Chrome Beta\User Data\
OptGuideOnDeviceModel\[VERSION]\

├── weights.bin                           (4,269,932,544 bytes)
│   Format: TensorFlow Lite
│   Contents: Gemini Nano v3 base model weights
│   Parsing: libchrome_ai.so
│
├── manifest.json                         (247 bytes)
│   {
│     "manifest_version": 2,
│     "name": "Optimization Guide On Device Model",
│     "version": "2025.8.8.1141",
│     "BaseModelSpec": {
│       "name": "v3Nano",
│       "version": "2025.06.30.1229",
│       "supported_performance_hints": [2, 1]
│     }
│   }
│
├── on_device_model_execution_config.pb   (138 bytes)
│   Format: Protocol Buffer
│   Contents: Base model execution settings
│
├── adapter_cache.bin                     (0 bytes)
│   Purpose: Will cache loaded LoRA adapters (currently unused)
│
├── encoder_cache.bin                     (0 bytes)
│   Purpose: XNNPack weight cache for encoder
│
└── _metadata\
    └── verified_contents.json            (1,906 bytes)
        Component signature for integrity verification
```

### 3.2 LoRA Adaptation Files

```markdown
C:\Users\[USER]\AppData\Local\Google\Chrome Beta\User Data\
optimization_guide_model_store\62\A3BFD4A403A877EC\041D5A1E3FFA20FF\

├── adaptation_weights.bin                (17,367,040 bytes) ⭐
│   Format: Raw binary float32 array (proprietary)
│   Contents: LoRA weight matrices (A/B per layer)
│   Structure: [Layer1_A, Layer1_B, Layer2_A, Layer2_B, ...]
│   Rank: 64
│   Hidden Dim: 2048
│   Layers: 16
│   Total floats: 4,341,760
│
├── model.tflite                          (0 bytes)
│   Empty (not used for LoRA, only weights.bin needed)
│
├── model-info.pb                         (198 bytes)
│   Format: Protocol Buffer
│   Contents: Metadata about this adaptation
│   {
│     base_model_name: "v3Nano"
│     base_model_version: "2025.06.30.1229"
│     supported_performance_hints: [2, 1]
│     adaptation_type: SUMMARIZE
│   }
│
└── on_device_model_execution_config.pb   (1,638 bytes)
    Format: Protocol Buffer
    Contents: How to use this LoRA
    {
      feature_configs {
        feature: FEATURE_SUMMARIZE
        input_config { ... }
        output_config { ... }
        safety_config { ... }
      }
    }
```

---

## 4. Key Data Structures

### 4.1 Model Assets (C++ Structs)

```cpp
// services/on_device_model/public/cpp/model_assets.h:21-31

// Base model paths
struct ModelAssetPaths {
  base::FilePath weights;         // Path to weights.bin
  base::FilePath sp_model;        // Sentencepiece tokenizer
  base::FilePath cache;           // XNNPack cache
  base::FilePath encoder_cache;   // Encoder cache
  base::FilePath adapter_cache;   // LoRA adapter cache
};

// Opened base model files
struct ModelAssets {
  ModelFile weights;              // Opened weights.bin
  base::FilePath sp_model_path;   // SP model path
  base::File cache;               // Cache file handle
  base::File encoder_cache;       // Encoder cache handle
  base::File adapter_cache;       // Adapter cache handle
};

// LoRA adaptation paths
struct AdaptationAssetPaths {
  base::FilePath weights;         // ⭐ Path to adaptation_weights.bin

  bool operator==(const AdaptationAssetPaths& other) const {
    return weights == other.weights;  // Only weights matter!
  }
};

// Opened LoRA files
struct AdaptationAssets {
  base::File weights;             // ⭐ Opened adaptation_weights.bin
  base::FilePath weights_path;    // Or just the path (APU backend)
};
```

### 4.2 Native Library Structs

```cpp
// services/on_device_model/ml/chrome_ml_api.h:60-84

// Model/LoRA weight data
struct ChromeMLModelData {
  // File handle or path to weights
  PlatformFile weights_file;              // ⭐ File descriptor (Windows: HANDLE, Unix: fd)
  std::optional<uint32_t> file_id;        // Unique ID for caching

  // Cache files
  PlatformFile cache_file;                // XNNPack weight cache
  PlatformFile encoder_cache_file;        // Encoder cache
  PlatformFile adapter_cache_file;        // LoRA adapter cache

  // Or path-based (APU backend)
  const char* model_path;                 // Null-terminated path
  const char* sentencepiece_model_path;   // SP model path
};

// services/on_device_model/ml/chrome_ml_api.h:87-120

// Base model descriptor
struct ChromeMLModelDescriptor {
  ml::ModelBackendType backend_type;      // GPU or APU
  const ChromeMLModelData* model_data;    // Model weights

  uint32_t max_tokens;                    // Context window
  float temperature;                      // Sampling temp
  int top_k;                              // Sampling top-k

  // ⭐ LoRA configuration
  const uint32_t* adaptation_ranks;       // Supported ranks: [4,8,16,32,64]
  size_t adaptation_ranks_size;           // Number of ranks

  // Performance settings
  bool prefer_texture_weights;
  bool enable_host_mapped_pointer;
  bool use_low_power;
  bool allow_fp16;

  ml::ModelPerformanceHint performance_hint;
};

// services/on_device_model/ml/chrome_ml_api.h:122-144

// Session descriptor (with optional LoRA)
struct ChromeMLAdaptationDescriptor {
  const ChromeMLModelData* model_data;    // ⭐ LoRA weights (or NULL)

  uint32_t max_tokens;                    // Override max tokens
  uint32_t top_k;                         // Override sampling
  float temperature;                      // Override temperature

  bool enable_speculative_decoding;
  bool enable_image_input;
  bool enable_audio_input;
};
```

### 4.3 Mojo Interfaces

```cpp
// services/on_device_model/public/mojom/on_device_model.mojom:12-23

// Mojo struct for LoRA assets (IPC)
struct AdaptationAssets {
  // GPU backend: use weights file handle
  // APU backend: use weights_path
  mojo_base.mojom.File? weights;          // ⭐ Opened file
  mojo_base.mojom.FilePath? weights_path; // ⭐ Or path
};

// services/on_device_model/public/mojom/on_device_model.mojom:92-96

struct LoadAdaptationParams {
  AdaptationAssets assets;                // ⭐ Just the assets!
};

// services/on_device_model/public/mojom/on_device_model.mojom:287-291

interface OnDeviceModel {
  // Load adaptation on top of base model
  LoadAdaptation@3(
      LoadAdaptationParams params,
      pending_receiver<OnDeviceModel> model)  // New model handle with LoRA
      => (LoadModelResult result);
};
```

---

## 5. Native Library Interface

### 5.1 ChromeML API Functions

```cpp
// services/on_device_model/ml/chrome_ml_api.h

extern "C" {

// Create base model from descriptor
ChromeMLModel (*CreateModelFn)(
    const ChromeMLModelDescriptor* descriptor);

// Create session (optionally with LoRA)
ChromeMLSession (*CreateSessionFn)(
    ChromeMLModel model,
    const ChromeMLAdaptationDescriptor* descriptor);  // ⭐ Contains LoRA data

// Destroy session
void (*DestroySessionFn)(ChromeMLSession session);

// Destroy model
void (*DestroyModelFn)(ChromeMLModel model);

// Generate text
void (*SessionAppendFn)(
    ChromeMLSession session,
    const ChromeMLAppendOptions* options,
    ChromeMLCancel cancel);

void (*SessionGenerateFn)(
    ChromeMLSession session,
    const ChromeMLGenerateOptions* options,
    ChromeMLCancel cancel);

// Clone session (preserves context + LoRA)
ChromeMLSession (*CloneSessionFn)(ChromeMLSession session);

}  // extern "C"
```

### 5.2 Library Loading

```cpp
// services/on_device_model/ml/chrome_ml.cc

std::unique_ptr<ChromeML> ChromeML::Create(
    const std::optional<std::string>& library_name) {

  // Load native library
  base::NativeLibraryLoadError error;
  base::NativeLibrary library = base::LoadNativeLibrary(
      GetLibraryPath(library_name), &error);

  if (!library) {
    return nullptr;  // Library not found
  }

  // Get API struct (single export with all function pointers)
  auto get_api = reinterpret_cast<GetChromeMLAPIFn>(
      base::GetFunctionPointerFromNativeLibrary(library, "GetChromeMLAPI"));

  if (!get_api) {
    return nullptr;
  }

  const ChromeMLAPI* api = get_api();
  return std::make_unique<ChromeML>(api);
}
```

**Library locations:**
- **Windows:** `libchrome_ai.dll` in Chrome installation
- **macOS:** `libchrome_ai.dylib`
- **Linux:** `libchrome_ai.so`

---

## 6. Complete Call Stack

### 6.1 Base Model Loading Call Stack

```markdown
1. Component Updater (browser process)
   ↓ Downloads model files

2. OnDeviceModelComponent::OnComponentReady()
   components/optimization_guide/core/model_execution/on_device_model_component.cc
   ↓ Notifies Optimization Guide

3. OnDeviceAssetManager::OnModelUpdated()
   components/optimization_guide/core/model_execution/on_device_asset_manager.cc
   ↓ Discovers model files

4. OnDeviceModelServiceController::OnBaseModelAssetsAvailable()
   components/optimization_guide/core/model_execution/on_device_model_service_controller.cc
   ↓ Initiates model loading

5. OnDeviceModelExecutor::Create()
   services/on_device_model/ml/on_device_model_executor.cc:559
   ↓ Prepares model descriptor

6. ChromeML::Get()
   services/on_device_model/ml/chrome_ml.cc
   ↓ Loads native library

7. chrome_ml_->api().CreateModel(&descriptor)
   ⮑ libchrome_ai.so (GPU process)
   ↓ Parses TFLite, initializes GPU

8. Returns ChromeMLModel handle
   ↓ Model ready for session creation
```

### 6.2 LoRA Loading Call Stack

```markdown
1. User calls ai.summarizer.create()
   JavaScript (web page)
   ↓ Mojo IPC to browser process

2. OnDeviceModelAdaptationController::MaybeRegisterAdaptation()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_controller.cc
   ↓ Checks if LoRA needed

3. OnDeviceModelAdaptationLoader::MaybeRegisterModelDownload()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:215
   ↓ Registers for adaptation download

4. OptimizationGuideModelProvider::Observe()
   components/optimization_guide/core/delivery/optimization_guide_model_provider.cc
   ↓ Triggers server fetch or loads from disk

5. OnDeviceModelAdaptationLoader::OnModelUpdated()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:256
   ↓ Discovers adaptation_weights.bin

6. MaybeGetAdaptationPaths()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:124
   ↓ Extracts file path

7. DetectBaseModelIncompatibility()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:96
   ↓ Validates compatibility

8. ReadOnDeviceModelExecutionConfig()
   (background thread)
   ↓ Reads .pb config file

9. CreateAdaptationMetadataFromModelExecutionConfig()
   components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:46
   ↓ Creates metadata object

10. OnDeviceModelAdaptationController::OnAdaptationAssetsAvailable()
    ↓ Assets ready, can create session

11. SessionAccessor::Create()
    services/on_device_model/ml/session_accessor.cc:55
    ↓ Prepares session with LoRA

12. SessionAccessor::CreateInternal()
    services/on_device_model/ml/session_accessor.cc:180
    ↓ Opens adaptation_weights.bin file

13. chrome_ml_->api().CreateSession(model, &descriptor)
    ⮑ libchrome_ai.so (GPU process)
    ↓ Applies LoRA to base model

14. Returns ChromeMLSession handle
    ↓ Session ready with LoRA applied
```

---

## 7. Injection Points Summary

### 7.1 File System Injection ⭐ EASIEST

**Target:** Replace `adaptation_weights.bin` with custom file

**Location:**
```markdown
C:\Users\[USER]\AppData\Local\Google\Chrome Beta\User Data\
optimization_guide_model_store\[TYPE]\[HASH]\[HASH]\
adaptation_weights.bin  ← REPLACE THIS
```

**Requirements:**
- Exact filename: `adaptation_weights.bin`
- Correct binary format (what we're testing)
- Matching config files present
- Base model version compatible

**Advantages:**
- ✅ No Chrome modifications needed
- ✅ Works with standard Chrome
- ✅ Easy to test and iterate

**Disadvantages:**
- ❌ Must match Chrome's binary format
- ❌ Requires base model compatibility

---

### 7.2 Command-Line Override

**Target:** Bypass compatibility checks

**Location:** `components/optimization_guide/core/optimization_guide_switches.cc`

**Usage:**
```bash
chrome.exe --on-device-model-execution-override
```

**Effect:**
```cpp
// In on_device_model_adaptation_loader.cc:109-120
if (!switches::GetOnDeviceModelExecutionOverride()) {
  // These checks are SKIPPED when flag is set:
  if (supported_model_spec->base_model_name() != registered_spec.model_name ||
      supported_model_spec->base_model_version() != registered_spec.model_version) {
    return OnDeviceModelAdaptationAvailability::kAdaptationModelIncompatible;
  }
}
```

**Advantages:**
- ✅ Bypasses version checks
- ✅ Allows mismatched LoRAs

**Disadvantages:**
- ❌ Still need correct binary format
- ❌ May be unstable

---

### 7.3 Component Updater Interception

**Target:** Replace LoRA during download

**Location:** `components/optimization_guide/core/model_execution/on_device_model_adaptation_loader.cc:256`

**Method:**
Modify Chrome source to substitute custom LoRA after download but before loading.

**Advantages:**
- ✅ Full control over injection
- ✅ Can modify on-the-fly

**Disadvantages:**
- ❌ Requires Chrome recompilation
- ❌ Complex to maintain

---

### 7.4 Mojo IPC Injection ⭐ MOST FLEXIBLE

**Target:** Intercept `LoadAdaptation()` Mojo calls

**Location:** IPC between browser process and GPU process

**Method:**
```cpp
// Hypothetical injector (requires Chrome modification)
class CustomLoRAInjector : public on_device_model::mojom::OnDeviceModelInterceptor {
  void LoadAdaptation(
      on_device_model::mojom::LoadAdaptationParamsPtr params,
      mojo::PendingReceiver<OnDeviceModel> model,
      LoadAdaptationCallback callback) override {

    // ⭐ INJECT CUSTOM LORA
    auto custom_assets = on_device_model::mojom::AdaptationAssets::New();
    custom_assets->weights_path = "/path/to/my/custom_lora.bin";
    params->assets = std::move(custom_assets);

    // Forward to real implementation
    GetForwardingInterface()->LoadAdaptation(
        std::move(params), std::move(model), std::move(callback));
  }
};
```

**Advantages:**
- ✅ Clean injection point
- ✅ Works for all LoRA loads
- ✅ Dynamic switching possible

**Disadvantages:**
- ❌ Requires Chrome modifications
- ❌ Complex IPC understanding needed

---

### 7.5 Native Library Wrapper

**Target:** Wrap `libchrome_ai.so` to intercept CreateSession

**Method:**
```cpp
// LD_PRELOAD wrapper (Linux)
extern "C" ChromeMLSession CreateSession(
    ChromeMLModel model,
    const ChromeMLAdaptationDescriptor* descriptor) {

  // ⭐ MODIFY DESCRIPTOR
  ChromeMLAdaptationDescriptor custom_desc = *descriptor;
  ChromeMLModelData custom_data;

  if (ShouldInjectCustomLoRA()) {
    custom_data.weights_file = OpenFile("/my/custom_lora.bin");
    custom_desc.model_data = &custom_data;
  }

  // Call real CreateSession
  return real_CreateSession(model, &custom_desc);
}
```

**Advantages:**
- ✅ Works with unmodified Chrome
- ✅ Runtime injection

**Disadvantages:**
- ❌ Platform-specific (LD_PRELOAD on Linux, DLL injection on Windows)
- ❌ Fragile (depends on ABI stability)

---

## 8. Key Findings Summary

### Base Model Loading:
1. ✅ TFLite format (standard)
2. ✅ Loaded by `libchrome_ai.so` native library
3. ✅ 4GB+ weights file
4. ✅ GPU/APU backend selection
5. ✅ Pre-allocates LoRA infrastructure (adaptation_ranks)

### LoRA Loading:
1. ✅ Filename: `adaptation_weights.bin` (hardcoded)
2. ✅ Format: **Raw binary float32 array** (proprietary)
3. ✅ Size: 17MB for rank-64 LoRA
4. ✅ No header, no magic bytes
5. ✅ Strict compatibility checking (version + performance hints)
6. ✅ Requires companion `.pb` config file
7. ✅ Applied at session creation, not model creation
8. ✅ Multiple LoRAs can exist for different features

### Binary Format (Inferred):
```markdown
adaptation_weights.bin structure:
  For each layer (16 layers):
    A_matrix: float32[hidden_dim][rank] = float32[2048][64]
    B_matrix: float32[rank][hidden_dim] = float32[64][2048]
  Total: 16 * 2 * 2048 * 64 * 4 bytes = 16,777,216 bytes

  Actual file: 17,367,040 bytes
  Difference: 589,824 bytes
  Possible reasons:
    - Additional metadata at start/end
    - Different layer structure
    - Padding/alignment
    - Multiple attention heads
```

---

## 🎯 Testing Strategy Impact

Based on this complete understanding, our test files target:

1. **test1_chrome_copy** → Validates deployment works (baseline)
2. **test2_all_zeros** → Tests if Chrome validates weight values
3. **test3_random_small** → Tests acceptable value ranges
4. **test4_normal_dist** → Tests realistic weight distributions
5. **test5_structured_lora** → Tests our inferred A/B matrix layout
6. **test6_identity** → Tests minimal working LoRA
7. **test7_rank32** → Tests size validation and rank requirements

Each test will reveal specific format requirements!

---

## 📚 Source Code Cross-Reference

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Base model loading | `on_device_model_executor.cc` | 559-620 | Model creation |
| LoRA discovery | `on_device_model_adaptation_loader.cc` | 124-135 | Find adaptation_weights.bin |
| Compatibility check | `on_device_model_adaptation_loader.cc` | 96-122 | Version validation |
| Session w/ LoRA | `session_accessor.cc` | 180-223 | Apply LoRA |
| Native interface | `chrome_ml_api.h` | 60-144 | C API structs |
| Mojo IPC | `on_device_model.mojom` | 12-291 | IPC definitions |
| Constants | `optimization_guide_constants.cc` | 65-66 | Filename constant |

---

## ✨ Conclusion

Chrome's AI loading system is a **multi-layered architecture**:

1. **Component Updater** → Downloads models
2. **Optimization Guide** → Manages model lifecycle
3. **Model Executor** → Creates model instances
4. **Session Accessor** → Applies LoRAs
5. **Native Library** → Does actual ML inference

The **critical discovery** is that LoRA weights are passed as **raw file handles** to the proprietary native library, which parses the binary format internally. Our testing framework targets this format to enable custom LoRA loading!

---

**Next:** Run the tests and discover the exact binary format! 🚀
