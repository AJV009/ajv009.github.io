# Search Filter Optimization - Step-by-Step Guide

A practical guide to build an LLM-powered search assistant for complex databases in under 3 hours.

---

## Step 1: Define Your Field Schema (30 min)

Copy this template and customize the placeholders:

```json
{
  "preset": {
    "uiLabel": "Search Mode",
    "type": "select",
    "options": ["default", "comparison", "discovery", "research"],  // ← YOUR MODES
    "default": "default",
    "required": true,
    "chatbot": {
      "askOrder": 1,
      "contextualQuestions": ["What kind of search would you like to perform?"],
      "examples": {
        "default": "General search",
        "comparison": "Compare multiple items",
        "discovery": "Explore new options",
        "research": "In-depth research"
      },
      "importance": "high"
    },
    "dependencies": {
      "affects": ["categories", "enableAnalysis"]
    },
    "stateManagement": {
      "triggers": {
        "onChange": {
          "reset": ["analysisQuery"],
          "update": ["enableAnalysis"]
        }
      }
    }
  },

  "categories": {
    "uiLabel": "Categories",
    "type": "multiselect",
    "options": ["cat1", "cat2", "cat3", "cat4"],  // ← YOUR CATEGORIES
    "default": ["cat1", "cat2", "cat3", "cat4"],
    "validation": {
      "required": true,
      "minSelected": 1
    },
    "presetBasedDefaults": {
      "research": ["cat1", "cat2", "cat3", "cat4"],
      "discovery": ["cat1", "cat3"]
    },
    "disabledWhen": {
      "preset": ["comparison"]
    },
    "chatbot": {
      "askOrder": 2,
      "contextualQuestions": ["Which categories would you like to search?"],
      "skipWhen": {
        "preset": ["comparison"]
      }
    }
  },

  "status": {
    "uiLabel": "Item Status",
    "type": "multiselect",
    "options": ["active", "inactive", "archived"],
    "default": ["active"],
    "validation": {
      "required": true,
      "minSelected": 1
    },
    "presetBasedDefaults": {
      "default": ["active"],
      "research": ["active", "inactive"]
    },
    "chatbot": {
      "askOrder": 3,
      "contextualQuestions": ["Which item statuses to include?"]
    }
  },

  "location": {
    "uiLabel": "Location",
    "type": "multiselect",
    "options": "dynamicLocationList",  // Loaded from API
    "default": [],
    "validation": {
      "dynamicOptions": true
    },
    "disabledWhen": {
      "preset": ["comparison"]
    },
    "chatbot": {
      "askOrder": 4,
      "contextualQuestions": ["Filter by specific locations?"],
      "followUpFields": ["subLocation"]
    },
    "dependencies": {
      "affects": ["subLocation"]
    }
  },

  "subLocation": {
    "uiLabel": "Sub-Location",
    "type": "multiselect",
    "options": "dynamicSubLocationList",
    "default": [],
    "visibleWhen": {
      "location": "!empty"
    },
    "chatbot": {
      "askOrder": 5,
      "contextualQuestions": ["Narrow down to specific areas?"],
      "onlyAskWhen": {
        "location": "!empty"
      }
    }
  },

  "dateRange": {
    "uiLabel": "Date Range",
    "type": "select",
    "options": ["last_week", "last_month", "last_year", "all_time", "custom"],
    "default": "all_time",
    "chatbot": {
      "askOrder": 6,
      "contextualQuestions": ["What date range?"],
      "followUpFields": ["customStartDate", "customEndDate"]
    },
    "dependencies": {
      "affects": ["customStartDate", "customEndDate"]
    }
  },

  "customStartDate": {
    "uiLabel": "Start Date",
    "type": "date",
    "visibleWhen": {
      "dateRange": "custom"
    },
    "validation": {
      "requiredWhen": {
        "dateRange": "custom"
      }
    },
    "chatbot": {
      "askOrder": 7,
      "contextualQuestions": ["What start date?"],
      "onlyAskWhen": {
        "dateRange": "custom"
      }
    }
  },

  "customEndDate": {
    "uiLabel": "End Date",
    "type": "date",
    "visibleWhen": {
      "dateRange": "custom"
    },
    "validation": {
      "requiredWhen": {
        "dateRange": "custom"
      }
    },
    "chatbot": {
      "askOrder": 8,
      "contextualQuestions": ["What end date?"]
    }
  },

  "resultCount": {
    "uiLabel": "Number of Results",
    "type": "number",
    "default": 50,
    "validation": {
      "required": true,
      "min": 1,
      "max": 500,
      "warningThreshold": 200
    },
    "chatbot": {
      "askOrder": 9,
      "contextualQuestions": ["How many results?"],
      "defaultBehavior": "useDefault"
    }
  },

  "sortBy": {
    "uiLabel": "Sort Results By",
    "type": "select",
    "options": ["relevance", "date_desc", "date_asc", "alphabetical"],
    "optionLabels": {
      "relevance": "Most relevant first",
      "date_desc": "Newest first",
      "date_asc": "Oldest first",
      "alphabetical": "Alphabetical"
    },
    "default": "relevance",
    "chatbot": {
      "askOrder": 10,
      "contextualQuestions": ["How to sort results?"],
      "defaultBehavior": "useDefault"
    }
  },

  "enableAnalysis": {
    "uiLabel": "Enable Analysis",
    "type": "switch",
    "default": false,
    "presetBasedDefaults": {
      "comparison": true,
      "research": true
    },
    "chatbot": {
      "askOrder": 11,
      "contextualQuestions": ["Include detailed analysis?"],
      "autoEnable": {
        "preset": ["comparison", "research"]
      }
    },
    "dependencies": {
      "affects": ["analysisQuery", "clusterAnalysis"]
    },
    "stateManagement": {
      "triggers": {
        "onDisable": {
          "disable": ["clusterAnalysis"],
          "reset": ["analysisQuery", "clusterQuery"]
        }
      }
    }
  },

  "analysisQuery": {
    "uiLabel": "Analysis Instructions",
    "type": "textarea",
    "default": "",
    "validation": {
      "maxLength": 1000,
      "requiredWhen": {
        "enableAnalysis": true,
        "preset": ["comparison", "research"]
      }
    },
    "placeholder": "Optional. Example: Focus on innovative approaches.",
    "visibleWhen": {
      "enableAnalysis": true
    },
    "chatbot": {
      "askOrder": 12,
      "contextualQuestions": ["How should we analyze results?"],
      "examples": {
        "comparison": "Focus on key differentiators",
        "research": "Emphasize methodology and impact"
      }
    }
  },

  "clusterAnalysis": {
    "uiLabel": "Cluster Analysis",
    "type": "switch",
    "default": false,
    "presetBasedDefaults": {
      "comparison": true,
      "research": true
    },
    "enabledWhen": {
      "enableAnalysis": true
    },
    "chatbot": {
      "askOrder": 13,
      "contextualQuestions": ["Analyze patterns across all results?"],
      "autoEnable": {
        "preset": ["comparison", "research"]
      }
    }
  },

  "clusterQuery": {
    "uiLabel": "Cluster Analysis Query",
    "type": "textarea",
    "default": "",
    "validation": {
      "maxLength": 2000,
      "required": true,
      "requiredWhen": {
        "clusterAnalysis": true
      }
    },
    "placeholder": "Required. Example: What common approaches emerge?",
    "visibleWhen": {
      "clusterAnalysis": true
    },
    "chatbot": {
      "askOrder": 14,
      "contextualQuestions": ["What patterns to identify?"],
      "examples": {
        "comparison": "Key differentiators among options?",
        "research": "What trends emerge?"
      }
    }
  }
}
```

**Customization Checklist:**
- [ ] Define your search preset modes and what they optimize for
- [ ] Update `categories.options` with your actual categories
- [ ] Adjust `status.options` for your data
- [ ] Set up dynamic options loading for location fields (if needed)
- [ ] Configure analysis features based on your capabilities

---

## Step 2: Write Your System Prompt (45 min)

Copy and customize this prompt:

```markdown
# Core Identity
You are a search assistant for [DATABASE_NAME]. Guide users through filter
selection and analysis options to find exactly what they're looking for.

# Conversation Style
- Tone: Helpful, knowledgeable, efficient
- Explain trade-offs between options when relevant
- Suggest defaults for uncertain users
- Clarify filter impacts on result quality

# Primary Goals
1. Understand Search Intent: Determine search mode/preset quickly
2. Configure Filters: Collect relevant criteria based on mode
3. Optimize Results: Help refine search parameters
4. Setup Analysis: Suggest analysis when appropriate

# Field Processing Rules

**Use Field Metadata:**
- `contextualQuestions`: Vary phrasing naturally
- `examples`: Provide mode-specific examples
- `presetBasedDefaults`: Auto-configure based on mode
- `disabledWhen`: Skip fields entirely when conditions met

**Preset-Based Flow:**

When preset = "default":
  - Offer full customization
  - Make analysis optional
  - Use standard defaults

When preset = "comparison":
  - Skip category selection (auto-configured)
  - Enable analysis by default
  - Require analysis query

When preset = "discovery":
  - Use discovery-optimized defaults
  - Keep filters minimal

When preset = "research":
  - Enable all categories
  - Enable both analysis types
  - Require detailed instructions

**Conditional Logic:**
- Skip fields when `disabledWhen` conditions met
- Use `presetBasedDefaults` for common scenarios
- Only require when `requiredWhen` conditions match
- Auto-enable features using `autoEnable`

**State Management:**
When preset changes:
  - Reset dependent fields (analysisQuery)
  - Update filter defaults
  - Disable inapplicable features

When enableAnalysis disabled:
  - Auto-disable clusterAnalysis
  - Reset analysis query fields

# Dynamic Suggestion System

**ALWAYS use this marker for fields with options:**
```
[[showSuggestions:fieldName]]
```

**Examples:**
- "What search mode? [[showSuggestions:preset]]"
- "Which categories? [[showSuggestions:categories]]"
- "How to sort? [[showSuggestions:sortBy]]"

# Search Execution

**When all required fields collected:**
"Perfect! Configured search:
- Mode: [preset]
- Filters: [summary]
- Analysis: [enabled/disabled]

Ready to search!"

Then execute search with collected parameters.

# Advanced Handling

**Dynamic Options:**
For fields with "dynamicLocationList":
- Explain options populate from database
- Don't list specific values
- Guide on making selections

**Large Result Warnings:**
If resultCount > 200:
"That's a large result set. Consider more filters for focus. Proceed with [N] results?"

**Complementary Features:**
When enableAnalysis true but clusterAnalysis false:
"Since you're getting analysis, want pattern analysis across results? Reveals trends."

# The Fields Definition
{{fields_json}}
```

**Customization Checklist:**
- [ ] Replace `[DATABASE_NAME]` with your database name
- [ ] Define what each preset mode optimizes for
- [ ] Update category-related descriptions
- [ ] Adjust analysis feature descriptions

---

## Step 3: Build the Widget (1 hour)

### HTML Structure

```html
<div id="search-widget">
  <div id="messages"></div>
  <div id="suggestions"></div>
  <input id="user-input" type="text" placeholder="Describe your search...">
  <button id="send-btn">Send</button>
</div>
```

### JavaScript Core Functions

```javascript
class SearchFilterWidget {
  constructor() {
    this.messages = JSON.parse(sessionStorage.getItem('search-messages') || '[]');
    this.filters = JSON.parse(sessionStorage.getItem('search-filters') || '{}');
    this.schema = {}; // Load your field schema
  }

  // Handle preset changes - update dependent fields
  handlePresetChange(newPreset) {
    const presetField = this.schema.preset;

    // Reset fields specified in stateManagement
    const resetFields = presetField.stateManagement.triggers.onChange.reset;
    resetFields.forEach(field => {
      this.filters[field] = this.schema[field].default;
    });

    // Update fields with preset-based defaults
    Object.keys(this.schema).forEach(fieldName => {
      const field = this.schema[fieldName];
      if (field.presetBasedDefaults?.[newPreset]) {
        this.filters[fieldName] = field.presetBasedDefaults[newPreset];
      }
    });

    this.saveState();
  }

  // Check if field should be visible
  isFieldVisible(fieldName) {
    const field = this.schema[fieldName];

    // Check disabledWhen
    if (field.disabledWhen) {
      for (const [checkField, checkValues] of Object.entries(field.disabledWhen)) {
        if (checkValues.includes(this.filters[checkField])) {
          return false;
        }
      }
    }

    // Check visibleWhen
    if (field.visibleWhen) {
      for (const [checkField, checkValues] of Object.entries(field.visibleWhen)) {
        if (checkValues === "!empty") {
          return this.filters[checkField] && this.filters[checkField].length > 0;
        }
        if (!checkValues.includes(this.filters[checkField])) {
          return false;
        }
      }
    }

    // Check enabledWhen
    if (field.enabledWhen) {
      for (const [checkField, checkValue] of Object.entries(field.enabledWhen)) {
        if (this.filters[checkField] !== checkValue) {
          return false;
        }
      }
    }

    return true;
  }

  // Load dynamic options from API
  async getFieldOptions(fieldName) {
    const field = this.schema[fieldName];

    if (typeof field.options === 'string' && field.options.startsWith('dynamic')) {
      const response = await fetch(`/api/options/${fieldName}`);
      return response.json();
    }

    return field.options;
  }

  // Execute search with collected filters
  async executeSearch() {
    const searchParams = {
      filters: {
        preset: this.filters.preset,
        categories: this.filters.categories,
        status: this.filters.status,
        location: this.filters.location,
        dateRange: this.filters.dateRange,
        resultCount: this.filters.resultCount,
        sortBy: this.filters.sortBy
      },
      analysis: {
        enabled: this.filters.enableAnalysis,
        query: this.filters.analysisQuery,
        clusterAnalysis: this.filters.clusterAnalysis,
        clusterQuery: this.filters.clusterQuery
      }
    };

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });

    return response.json();
  }

  // Save state
  saveState() {
    sessionStorage.setItem('search-messages', JSON.stringify(this.messages));
    sessionStorage.setItem('search-filters', JSON.stringify(this.filters));
  }
}
```

---

## Step 4: Set Up API Endpoints (30 min)

### Chat Endpoint

```javascript
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    stream: true,
  });

  res.setHeader('Content-Type', 'text/event-stream');

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

### Search Execution Endpoint

```javascript
app.post('/api/search', async (req, res) => {
  const { filters, analysis } = req.body;

  // Build database query
  let query = db.collection('items')
    .where('status', 'in', filters.status)
    .where('category', 'in', filters.categories);

  if (filters.location?.length) {
    query = query.where('location', 'in', filters.location);
  }

  // Execute search
  let results = await query
    .limit(filters.resultCount)
    .orderBy(filters.sortBy)
    .get();

  // Optional: Run analysis if enabled
  if (analysis.enabled) {
    for (let result of results) {
      result.analysis = await analyzeResult(result, analysis.query);
    }
  }

  // Optional: Cluster analysis
  if (analysis.clusterAnalysis) {
    results.clusterAnalysis = await analyzeCluster(results, analysis.clusterQuery);
  }

  res.json({
    results: results,
    metadata: {
      totalResults: results.length,
      executionTime: Date.now() - startTime
    }
  });
});
```

### Dynamic Options Endpoint

```javascript
app.get('/api/options/:fieldName', async (req, res) => {
  const { fieldName } = req.params;

  switch(fieldName) {
    case 'location':
      const locations = await db.collection('locations').distinct('name');
      res.json(locations);
      break;

    case 'subLocation':
      const parentLocation = req.query.parent;
      const subLocations = await db.collection('locations')
        .where('parent', '==', parentLocation)
        .distinct('name');
      res.json(subLocations);
      break;

    default:
      res.status(404).json({ error: 'Unknown field' });
  }
});
```

---

## Step 5: Test Critical Paths (30 min)

### Test 1: Default Mode
1. User selects "default" preset
2. Customizes all filters manually
3. **Expected:** Full customization, no auto-config

### Test 2: Comparison Mode
1. User selects "comparison" preset
2. **Expected:** Categories skipped (auto-configured)
3. **Expected:** Analysis enabled automatically
4. **Expected:** Analysis query required

### Test 3: Conditional Visibility
1. User selects location
2. **Expected:** subLocation field appears
3. User clears location
4. **Expected:** subLocation field hidden

### Test 4: Custom Date Range
1. User selects "custom" for dateRange
2. **Expected:** customStartDate and customEndDate appear
3. **Expected:** Both dates required

### Test 5: Cascading Analysis
1. User enables enableAnalysis
2. **Expected:** clusterAnalysis becomes available
3. User disables enableAnalysis
4. **Expected:** clusterAnalysis auto-disabled, queries reset

### Test 6: Preset State Management
1. User selects "research" preset with analysis query filled
2. User changes to "default" preset
3. **Expected:** analysisQuery reset, filters updated

---

## Quick Reference

### Preset Configuration Patterns

**Hide in Specific Modes:**
```json
"disabledWhen": {
  "preset": ["comparison"]
}
```

**Show Only in Specific Modes:**
```json
"visibleWhen": {
  "preset": ["expert_mode"]
}
```

**Mode-Specific Defaults:**
```json
"presetBasedDefaults": {
  "research": ["all", "categories"],
  "discovery": ["some", "categories"]
}
```

**Required in Specific Modes:**
```json
"validation": {
  "requiredWhen": {
    "preset": ["comparison", "research"]
  }
}
```

### State Management Patterns

**Reset on Change:**
```json
"stateManagement": {
  "triggers": {
    "onChange": {
      "reset": ["field1", "field2"]
    }
  }
}
```

**Disable Cascading:**
```json
"stateManagement": {
  "triggers": {
    "onDisable": {
      "disable": ["dependent"],
      "reset": ["queries"]
    }
  }
}
```

---

## Common Issues & Fixes

**Issue:** Preset change doesn't update fields
- **Fix:** Implement `handlePresetChange()` properly, check stateManagement

**Issue:** Conditional fields not hiding/showing
- **Fix:** Implement `isFieldVisible()`, check all condition types

**Issue:** Dynamic options not loading
- **Fix:** Verify API endpoint, check options field format

**Issue:** Analysis not triggering
- **Fix:** Check enabledWhen conditions, verify dependencies

---

## Deployment Checklist

- [ ] Schema defines all preset modes
- [ ] System prompt handles all presets correctly
- [ ] Widget handles preset changes (state management)
- [ ] Conditional field visibility works
- [ ] Dynamic options loading implemented
- [ ] Search endpoint executes queries correctly
- [ ] Analysis endpoints functional (if applicable)
- [ ] All 6 test scenarios pass
- [ ] State persists correctly
- [ ] Error handling for failed searches

---

**Estimated Total Time:** 3 hours

**Cost per search:** ~$0.001 (using GPT-4o-mini for conversation)

**Next:** Monitor search quality, track most-used presets, optimize defaults based on usage patterns.
