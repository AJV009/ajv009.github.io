---
title: "Lead Collection"
draft: true
---
A guide to build an LLM-powered lead collection system

---

## Step 1: Define Your Field Schema

Copy this template and customize the placeholders:

```json
{
  "state": {
    "uiLabel": "State",
    "type": "select",
    "options": ["StateA", "StateB", "StateC"],  // ← YOUR STATES
    "required": true,
    "fieldGroup": "eligibility",
    "chatbot": {
      "askOrder": 1,
      "contextualQuestions": ["Which state are you located in?"],
      "importance": "high",
      "eligibilityField": true
    }
  },

  "hasQualifyingCondition": {
    "uiLabel": "Qualifying Condition",
    "type": "radio",
    "options": ["yes", "no", "unsure"],
    "optionLabels": {
      "yes": "Yes, meets criteria",
      "no": "No",
      "unsure": "Not sure/need assessment"
    },
    "required": true,
    "fieldGroup": "eligibility",
    "chatbot": {
      "askOrder": 2,
      "contextualQuestions": ["Does this apply: [YOUR CRITERIA]?"],  // ← YOUR CRITERIA
      "importance": "high",
      "eligibilityField": true
    }
  },

  "clientAge": {
    "uiLabel": "Age",
    "type": "number",
    "required": true,
    "fieldGroup": "basic",
    "validation": {
      "required": true,
      "min": 1,
      "max": 100
    },
    "chatbot": {
      "askOrder": 3,
      "contextualQuestions": ["How old is the person needing services?"],
      "importance": "high"
    }
  },

  "serviceGoals": {
    "uiLabel": "Service Goals",
    "type": "multiselect",
    "options": ["goal1", "goal2", "goal3"],  // ← YOUR GOALS
    "optionLabels": {
      "goal1": "Goal 1 Description",  // ← YOUR DESCRIPTIONS
      "goal2": "Goal 2 Description",
      "goal3": "Goal 3 Description"
    },
    "fieldGroup": "goals",
    "validation": {
      "minSelected": 1
    },
    "chatbot": {
      "askOrder": 4,
      "contextualQuestions": ["What are your primary goals?"],
      "helpText": "Many clients focus on [EXAMPLES]. Which sounds most important?",
      "field_instruction": "Map user input flexibly to options. If not possible, mark as 'other'.",
      "importance": "high"
    }
  },

  "insuranceStatus": {
    "uiLabel": "Insurance Status",
    "type": "radio",
    "options": ["private_insurance", "public_insurance", "no_insurance", "unsure"],
    "optionLabels": {
      "private_insurance": "Private insurance",
      "public_insurance": "Public insurance (Medicare/Medicaid)",
      "no_insurance": "No insurance",
      "unsure": "Not sure about coverage"
    },
    "fieldGroup": "insurance",
    "chatbot": {
      "askOrder": 5,
      "contextualQuestions": ["Do you have insurance coverage?"],
      "field_instruction": "Accept insurance company names and map to appropriate category.",
      "importance": "medium"
    }
  },

  "insuranceProvider": {
    "uiLabel": "Insurance Provider",
    "type": "select",
    "options": ["BlueCross BlueShield", "Aetna", "UnitedHealthcare", "Cigna", "Other"],
    "fieldGroup": "insurance",
    "visibleWhen": {
      "insuranceStatus": ["private_insurance", "unsure"]
    },
    "validation": {
      "requiredWhen": {
        "insuranceStatus": ["private_insurance"]
      }
    },
    "chatbot": {
      "askOrder": 6,
      "contextualQuestions": ["Which insurance company do you have?"],
      "onlyAskWhen": {
        "insuranceStatus": ["private_insurance", "unsure"]
      },
      "field_instruction": "Very flexible. Map any insurance name to closest option or 'Other'.",
      "importance": "medium"
    }
  },

  "servicePreferences": {
    "uiLabel": "Service Preferences",
    "type": "multiselect",
    "options": ["in_person", "virtual", "hybrid", "no_preference"],
    "optionLabels": {
      "in_person": "In-person services",
      "virtual": "Virtual/telehealth",
      "hybrid": "Mix of both",
      "no_preference": "No preference"
    },
    "validation": {
      "minSelected": 1
    },
    "chatbot": {
      "askOrder": 7,
      "contextualQuestions": ["Do you prefer in-person or virtual services?"],
      "importance": "medium"
    }
  },

  "urgencyLevel": {
    "uiLabel": "Urgency Level",
    "type": "radio",
    "options": ["immediate", "within_month", "within_3months", "just_exploring"],
    "optionLabels": {
      "immediate": "Need to start immediately",
      "within_month": "Within the next month",
      "within_3months": "Within 3 months",
      "just_exploring": "Just exploring options"
    },
    "default": "within_month",
    "chatbot": {
      "askOrder": 8,
      "contextualQuestions": ["How soon would you like to start services?"],
      "importance": "medium"
    }
  },

  "contactPhone": {
    "uiLabel": "Phone Number",
    "type": "text",
    "required": true,
    "fieldGroup": "contact",
    "validation": {
      "required": true,
      "pattern": "phone",
      "maxLength": 20
    },
    "placeholder": "e.g., (555) 123-4567",
    "chatbot": {
      "askOrder": 9,
      "contextualQuestions": ["What's the best phone number to reach you?"],
      "importance": "high"
    }
  },

  "contactEmail": {
    "uiLabel": "Email Address",
    "type": "text",
    "required": true,
    "fieldGroup": "contact",
    "validation": {
      "required": true,
      "pattern": "email",
      "maxLength": 100
    },
    "placeholder": "e.g., your@email.com",
    "chatbot": {
      "askOrder": 10,
      "contextualQuestions": ["What's your email address?"],
      "importance": "high"
    }
  },

  "additionalNotes": {
    "uiLabel": "Additional Questions",
    "type": "textarea",
    "default": "",
    "validation": {
      "maxLength": 500
    },
    "placeholder": "Any other questions about our services?",
    "chatbot": {
      "askOrder": 11,
      "contextualQuestions": ["Any other questions for now?"],
      "importance": "low",
      "optional": true
    }
  }
}
```

**Customization Checklist:**
- Replace `StateA, StateB, StateC` with your service states
- Update `[YOUR CRITERIA]` in hasQualifyingCondition
- Define your `serviceGoals` options and labels
- Adjust insurance providers list if needed
- Add/remove fields based on your needs

---

## Step 2: Write Your System Prompt

Copy and customize this prompt:

```markdown
# Core Identity
You are a [COMPANY NAME] intake assistant helping [TARGET AUDIENCE] explore
[SERVICE TYPE] services in [SERVICE AREAS]. Conduct warm, conversational
intake sessions while systematically collecting information.

# Conversation Style
- Tone: Warm, supportive, professional but approachable
- Keep responses to 1-2 sentences typically
- Avoid robotic phrases like "Options include..." - use "Maybe...", "Perhaps..."
- Recognize this may be emotional/difficult for users

# Primary Goals
1. Eligibility Check: Quickly verify state + qualifying condition
2. Data Collection: Gather required fields following askOrder (1-11)
3. Lead Capture: Secure contact info for qualified leads

# Field Processing Rules

**Use Field Metadata:**
- `contextualQuestions`: Vary phrasing naturally
- `optionLabels`: Use friendly labels, not technical values
- `helpText`: Provide when users are uncertain
- `field_instruction`: Follow specific handling rules

**Flexible Mapping Examples:**
- "yeah my kid has autism" → maps to hasQualifyingCondition: "yes"
- "blue cross" → maps to insuranceProvider: "BlueCross BlueShield"
- "we're in Virginia" → maps to state: "Virginia"

**Conditional Logic:**
- Skip fields with `visibleWhen` conditions not met
- Only ask `insuranceProvider` when `insuranceStatus` is "private_insurance" or "unsure"
- Check `validation.requiredWhen` for conditional requirements

# Eligibility Gating

**Step 1:** Ask about state
- If not in [ELIGIBLE_STATES]: "We currently only serve [STATES]. Let me connect you with resources in your area."

**Step 2:** Ask about qualifying condition
- If "no": "Since we work only with [CRITERIA], we won't be able to provide services right now. When [CONDITION CHANGES], we'd love to support you!"
- If "unsure": Continue but note assessment may be needed

# Dynamic Suggestion System

**ALWAYS use this marker for fields with options:**
'''
[[showSuggestions:fieldName]]
'''

**Examples:**
- "Which state are you in? [[showSuggestions:state]]"
- "What are your goals? [[showSuggestions:serviceGoals]]"
- "Do you have insurance? [[showSuggestions:insuranceStatus]]"

**Important:** Marker triggers buttons automatically - don't list options manually

# Lead Capture System

**When you've collected minimum required info, send this marker ONCE:**
'''
[[leadCaptured:{"state":"Virginia","hasQualifyingCondition":"yes","contactEmail":"user@email.com",...}]]
'''

**Minimum Required:**
- state: Must be in [ELIGIBLE_STATES]
- hasQualifyingCondition: Must be "yes" or "unsure"
- Either contactPhone OR contactEmail

**Include ALL collected fields in the JSON, not just minimum.**

# Conversation Endings

**Successful Intake:**
"You'll get a follow-up soon from our team. Any other questions?"

**Wrong Location:**
"We currently only serve [STATES], but I'd be happy to help you find providers in [their location]."

**Doesn't Meet Criteria:**
"Since we work only with [CRITERIA], we won't be able to provide services right now. When [CONDITION CHANGES], we'd love to support you!"

# The Fields Definition
{{fields_json}} -- INSERT YOUR FIELDS SCHEMA JSON HERE --
```

**Customization Checklist:**
- Replace all `[PLACEHOLDERS]` with your info
- Update eligibility rejection messages
- Adjust conversation style to match your brand
- Define your service areas and criteria

---

## Step 3: Build the Widget

### HTML Structure

```html
<div id="chat-widget">
  <div id="messages"></div>
  <div id="suggestions"></div>
  <input id="user-input" type="text" placeholder="Type here...">
  <button id="send-btn">Send</button>
</div>
```

### JavaScript Core Functions

```javascript
class LeadFormWidget {
  constructor() {
    this.messages = JSON.parse(sessionStorage.getItem('chat-messages') || '[]');
    this.fields = JSON.parse(sessionStorage.getItem('form-fields') || '{}');
  }

  // Strip markers before displaying to user
  stripMarkers(content) {
    return content
      .replace(/\[\[showSuggestions:.*?\]\]/g, '')
      .replace(/\[\[leadCaptured:.*?\]\]/g, '');
  }

  // Process suggestion markers during streaming
  processSuggestions(content) {
    const suggestionRegex = /\[\[showSuggestions:(.*?)\]\]/g;
    let match;

    while ((match = suggestionRegex.exec(content)) !== null) {
      const fieldName = match[1];
      this.showSuggestions(fieldName);
    }
  }

  // Show suggestion buttons
  showSuggestions(fieldName) {
    const field = this.schema[fieldName];
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = '';

    field.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = field.optionLabels?.[option] || option;
      button.onclick = () => {
        document.getElementById('user-input').value = button.textContent;
        this.sendMessage();
      };
      suggestionsContainer.appendChild(button);
    });
  }

  // Process lead capture marker
  processLeadCapture(content) {
    const leadRegex = /\[\[leadCaptured:(.*?)\]\]/;
    const match = content.match(leadRegex);

    if (match) {
      const leadData = JSON.parse(match[1]);
      this.captureLead(leadData);
    }
  }

  // Send to backend
  async captureLead(data) {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'conversational_form',
        timestamp: Date.now(),
        ...data
      })
    });
  }

  // Save state
  saveState() {
    sessionStorage.setItem('chat-messages', JSON.stringify(this.messages));
    sessionStorage.setItem('form-fields', JSON.stringify(this.fields));
  }
}
```

---

## Step 4: Set Up API Endpoint

### Request Format

```javascript
POST /api/chat
{
  "messages": [
    {"role": "system", "content": "{{your_system_prompt}}"},
    {"role": "assistant", "content": "Hi! How can I help you today?"},
    {"role": "user", "content": "I need therapy services"}
  ],
  "stream": true
}
```

OR better just use it with your existing OpenAI SDK setup or similar, its just a prompt 

### Response (Server-Sent Events)

```
data: {"choices":[{"delta":{"content":"Which"}}]}
data: {"choices":[{"delta":{"content":" state"}}]}
data: {"choices":[{"delta":{"content":" are"}}]}
data: [DONE]
```

### Example with OpenAI

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
    const content = chunk.choices[0]?.delta?.content || '';
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

---

**Next:** Monitor drop-off points, iterate on question phrasing, A/B test different flows.
