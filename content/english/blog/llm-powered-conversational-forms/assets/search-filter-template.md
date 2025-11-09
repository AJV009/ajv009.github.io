---
title: "Search Filters"
draft: true
---
A guide to build an LLM-powered search assistant for complex filter configurations.

---

## Step 1: Define Your Field Schema

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
- Define your search preset modes and what they optimize for
- Update `categories.options` with your actual categories
- Adjust `status.options` for your data
- Set up dynamic options loading for location fields (if needed)
- Configure analysis features based on your capabilities

---

## Step 2: Write Your System Prompt

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
'''
[[showSuggestions:fieldName]]
'''

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
- Replace `[DATABASE_NAME]` with your database name
- Define what each preset mode optimizes for
- Update category-related descriptions
- Adjust analysis feature descriptions

---

**Next:** Monitor search quality, track most-used presets, optimize defaults based on usage patterns.
