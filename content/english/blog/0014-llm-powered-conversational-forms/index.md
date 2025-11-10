---
title: "Structured Conversations with Task-Oriented Dialogue Systems"
meta_title: "Building Low-Agency AI for Guided Conversations: Task-Oriented Dialogue with LLMs"
description: "Learn how to build task-oriented dialogue systems using LLMs and metadata-driven architecture. From lead qualification to government form assistance, discover how low-agency AI achieves higher completion rates than traditional forms at 1/10th the cost."
date: 2025-11-08T00:00:00Z
image: "assets/cover.jpg"
image_credits: "[Unsplash](https://unsplash.com/photos/stack-of-papers-flat-lay-photography-tQQ4BwN_UFs)"
categories: ["AI", "Development"]
author: "Alphons Jaimon"
ai_assistance: true
tags: ["LLM", "Task-Oriented Dialogue", "AI Agents", "Conversational UI", "Slot-Filling", "Form Design", "Prompt Engineering", "Low-Agency AI"]
draft: false
---

## The Form Problem Nobody Talks About

Here's a stat you should know: **~30-50% of users complete web forms, meaning half of them just drop out entirely** [^form-stats]. And the ones who do complete them? They're probably gritting their teeth through the experience. For complex forms like insurance applications or government benefits, abandonment rates can exceed 80% [^complex-forms].

Think about the last time you filled out:
- A **government benefits application** with over 40+ fields across pages
- A **healthcare intake form** list all your past medications, dosages, and prescribing physicians...
- A **legal document questionnaire** with Terms you don't understand, consequences you can't predict
- A **loan application** with Financial details scattered across multiple sources
- A **service provider inquiry** Do you even qualify? Who knows until page 8!
- A **complex search interface** with 10+ filters, nested options, textual fields

Traditional web forms are painful - endless fields staring at you, dropdown menus missing the option you need, zero guidance when you're confused. It's like dealing with a bureaucratic government office (think DMV or passport renewal) where you're just expected to know what information they want and in what format.

Simple chatbots promised to fix this. "Make forms conversational!" they said. But most chatbot builders just turned your 40-field form into 40 sequential questions with fancy speech bubbles. Same problem, different interface. Users still got frustrated when the bot didn't understand their natural language, forcing them back into rigid multiple-choice options.

**So lets be real: Can we collect structured data through natural conversation, across ANY domain?**

The answer is yes; using a low-agency AI architecture that costs 1/10th of commercial platforms.

## Introducing Task-Oriented Dialogue Systems

Before diving into implementation, let's understand what the academic world calls what we're building: **Task-Oriented Dialogue (TOD) Systems**.

Unlike open-ended chatbots (like ChatGPT), TOD systems have a specific goal: collect structured information through natural conversation. Classic examples include booking flights, ordering food, or scheduling appointments. But the same architecture works for:

- **Lead qualification** - Service providers collecting client information
- **Form assistance** - Helping users complete government applications, tax forms, legal documents
- **Search optimization** - Guiding users through complex database filters
- **Healthcare intake** - Collecting medical history, symptoms, insurance details
- **Compliance questionnaires** - KYC, AML, regulatory documentation
- **Survey tools** - Research studies, customer feedback, assessments
- **Document filling** - Assisted completion of lengthy PDFs, contracts, applications

The pattern is universal: **any scenario where you need structured data from unstructured conversation**.

### The Core Components

Traditional TOD systems consist of:

1. **Natural Language Understanding (NLU)**: Understanding what the user wants
2. **Dialogue State Tracking (DST)**: Remembering what's been collected
3. **Slot-Filling**: The process of collecting required data points
4. **Dialogue Management**: Deciding what to ask next
5. **Natural Language Generation (NLG)**: Responding naturally

Here's the beautiful part: **LLMs handle all of these simultaneously**.

Before GPT-4, you'd need separate trained models for each component. Companies would spend months building intent classifiers, entity extractors, and state trackers. Now? One well-crafted system prompt does it all. Isn't that wild?

## The Modern Enterprise Platform Landscape

Before we dive deeper, let's acknowledge existing **major conversational AI platforms have already integrated LLMs**. And they're sophisticated.

- **Google Dialogflow CX** features Gemini-powered "hybrid agents" combining traditional flow control with LLM-generated responses. [^dialogflow] You design flows and intents, then let LLMs generate dynamic answers via "generators" and data stores for RAG.
- **Amazon Lex** introduced "descriptive bot building" in 2024; describe your bot in plain English and it auto-generates intents, slots, and flows. [^lex] Enhanced slot resolution uses LLMs when native NLU fails.
- **Microsoft Copilot Studio** runs on Azure OpenAI, offering generative answers from knowledge bases with a no-code interface. [^copilot] Over 10,000 organizations use it.
- **Rasa CALM** explicitly combines LLMs with business logic; LLMs handle natural language, deterministic flows handle workflow orchestration. [^rasa] They claim 80% development time reduction.
- **Botpress** rebuilt as a "GPT-native platform" with an Autonomous Engine using LLM reasoning to decide next steps without rigid scripting. [^botpress]
- **Landbot** leverages GPT for FAQ chatbots and dynamic conversations through a no-code drag-and-drop interface. [^landbot]

These platforms offer visual development environments, pre-built integrations, enterprise support, team collaboration, and managed infrastructure. They're real solutions serving real enterprises.

### So Why Another Approach?

Well to be blunt honest I needed something very quick, easy to control, guide, customize and manage without being locked into a platform suddenly. one of my most hated things in my life is tying myself to a platform that am not fully invested or build trust with. So I built this system that anyone can implement on any LLM API. This metadata-driven pattern isn't "better"; it's **different**.

**Enterprise platforms** start with conversation design paradigms (intents, flows, topics), then add LLM capabilities to make them more flexible.

**Our approach** starts with data requirements (what fields do you need?), then uses LLMs to collect them conversationally.

**When to use enterprise platforms:**
- Visual conversation designers for non-technical teams
- Pre-built integrations and enterprise support needed
- Customer-facing bots requiring monitoring dashboards
- Budget for $2,500-50,000/year platforms

**When to use metadata-driven approach:**
- Full control over conversation logic and costs desired
- Building internal tools or specialized applications
- Comfortable with code and prompt engineering
- Need deep domain-specific customization
- Want to own infrastructure

Both approaches leverage LLMs. Both work. The choice depends on your needs, team, and philosophy.

**The closest analog?** Salesforce Einstein Copilot also uses metadata (data models, field relationships) to ground conversations. [^salesforce] But it's Salesforce-specific. Our approach is portable; run it on any LLM API, any cloud, any stack.

### Commercial Platforms

Let's talk about economics. **Enterprise conversational AI platforms offer tremendous value; but at enterprise prices**.

The platforms we mentioned earlier (Dialogflow CX, Amazon Lex, Copilot Studio, Rasa, Botpress, Landbot) provide managed infrastructure, support teams, visual builders, and integrations. That infrastructure costs money.

### Economics

**Pricing models** (approximate, as of 2024-2025):
- **Dialogflow CX**: Pay-per-request pricing, can range from hundreds to thousands monthly depending on volume [^dialogflow-pricing]
- **Amazon Lex**: $0.75 per 1,000 text requests, $1.00 per 1,000 speech requests [^lex-pricing]
- **Microsoft Copilot Studio**: Starts at $200/month per user for standard capacity [^copilot-pricing]
- **Rasa**: Enterprise pricing (custom quotes, typically $50k+ annually for production deployments)
- **Botpress**: Open-source (free) or Cloud ($10-500+/mo depending on usage) [^botpress-pricing]
- **Landbot**: $40-1,200+/mo depending on features and conversations [^landbot-pricing]

You are obviously paying for the managed hosting, infrastructure, support, and visual tools. If your organization needs those, great! These platforms are worth it. Honestly it might **not be a rip-off**; you're paying for the platform ecosystem, not just the LLM calls.

## Why LLMs Change Everything

The breakthrough isn't just that LLMs can understand language better (though they absolutely can, and we know that since GPT-3 days). It's these three capabilities combined:

### 1. Zero-Shot Slot-Filling

LLMs can map user intent to structured data without training:

```markdown
Healthcare Intake:
User: "yeah my kid is autistic"
→ hasAutismDiagnosis: "yes"

User: "blue cross through my employer"
→ insuranceProvider: "BlueCross BlueShield"
→ insuranceSource: "employer"

Government Benefits:
User: "I've been unemployed since march"
→ employmentStatus: "unemployed"
→ unemploymentStartDate: "2024-03"

User: "I got two kids, 8 and 11"
→ dependents: [{"age": 8}, {"age": 11}]

Legal Questionnaire:
User: "We split up last summer but aren't officially divorced yet"
→ maritalStatus: "separated"
→ separationDate: "2024-06" (approximate)

Search Filters:
User: "I want to see recent stuff from the east coast"
→ dateRange: "2024-2025"
→ location: "East Coast"
```

This flexible mapping is impossible with traditional chatbots that rely on exact phrase matching or button clicks.

### 2. Context-Aware Conversation

LLMs maintain conversation state and use it intelligently:

```markdown
Service Provider Intake:
AI: "Which state are you located in?"
User: "Virginia"
AI: "Does your child have an autism diagnosis?"
User: "Yes"
AI: "Great! We serve families across Virginia. How old is your child?"

Government Benefits:
AI: "Are you currently employed?"
User: "No, I lost my job in March"
AI: "I'm sorry to hear that. Since you're unemployed, you may qualify for additional benefits.
     Do you have any dependents?"

Legal Document:
AI: "What's your current marital status?"
User: "Separated"
AI: "When did you and your spouse separate? This affects property division rules."
User: "Last June"
AI: "Thank you. In your state, separations over 6 months have different requirements.
     Do you have a separation agreement?"
```

Notice how the AI references previous answers naturally and adapts follow-up questions based on context? That's what you'd need complex state management to achieve with traditional systems.

### 3. Conditional Logic Without Code

Tell the LLM the rules, and it follows them:

```markdown
Healthcare: "Only ask about insurance provider if they selected private insurance"
Search: "Skip profile sections when preset is 'benchmark'"
Government: "Only ask about spouse income if marital status is 'married' or 'separated'"
Legal: "Skip property division questions if no shared assets"
Finance: "Only require tax documents if annual income exceeds $50,000"
```

Traditional form builders require complex branching logic setup with visual flow diagrams and nested conditions. LLMs just... get it from plain English instructions.

## Low-Agency AI: A Feature when carefully Designed

Before diving into the architecture, let's address a crucial design philosophy: **this is intentionally low-agency AI**.

### Understanding Agency Levels

**High-Agency AI Agents** have broad autonomy:
- Make independent decisions about goals and strategies
- Choose their own tools and approaches
- Adapt freely to changing circumstances
- Example: "Help me plan my wedding" → AI decides what questions to ask, what vendors to research, what timeline to suggest

**Low-Agency AI Systems** follow structured paths:
- Execute within defined guardrails
- Follow predetermined conversation flows
- Collect specific, structured information
- Example: "Help me fill out this wedding venue questionnaire" → AI follows the form's required fields

### Why Low-Agency Wins for Structured Data Collection

You might think, "Why constrain the AI? Why not let it intelligently figure out what to ask?"

Here's the uncomfortable truth: **High-agency AI is unpredictable for structured tasks**.

Imagine a high-agency AI conducting a government benefits application:
- It might decide certain questions aren't important
- It could ask questions in an order that doesn't match legal requirements
- It might skip mandatory fields because the conversation "felt complete"
- The collected data wouldn't match your database schema
- You'd have no guarantee of completion or compliance

The metadata (fields.json which we will refer later) is the real "agent" - it encodes domain expertise, legal requirements, and business logic. The LLM is just an incredibly flexible user interface to that structured system.

Just a quick note, high-agency AI orchestrates low-agency systems in a way if you think about it. So in most cases today high-agency AI auto-magically spins up new sub-agents with goals, and these sub-agents often use specific tools or MCPs or APIs, and these tools often have a ideal method of usage, which has to be often followed to get things working for them. So here basically the tool definitions become the low-agency systems.

## The Architecture: Metadata-Driven Conversational Forms

Here's the core idea: **separate your conversation logic from your conversation execution**.

Instead of hardcoding conversation flow, we define it declaratively in JSON metadata and let the LLM interpret and execute it.

### The Three-Layer System

```markdown
┌─────────────────────────────────────┐
│  Field Schema (JSON)                  ← Business logic
│  - What to collect                  
│  - Validation rules                 
│  - Conditional visibility           
│  - Samples, Suggestions, Helpers    
├─────────────────────────────────────┤
│  LLM Agent (System Prompt)            ← Intelligence
│  - Interprets schema                
│  - Conducts conversation            
│  - Handles flexible input           
├─────────────────────────────────────┤
│  Widget (UI + Markers)                ← User experience
│  - Message display                  
│  - Suggestion buttons               
│  - Lead capture                     
└─────────────────────────────────────┘
```

This separation is powerful. Non-developers can modify conversation flow by editing JSON. Developers focus on the UI and backend integration. The LLM bridges them together. Maybe if you fancy it maybe the JSON can be dynamically generated from existing forms or databases too.

## Real-World Examples: The Same Architecture, Different Domains

I've built and used this architecture for multiple real scenarios. Let's examine two very different use cases to understand how the same pattern adapts across domains.

> Note: The actual field schemas that we use are quite large and comprehensive with more features. The examples below are simplified for clarity.

### Use Case 1: Lead Collection for Service Providers

**The Challenge**: Collect contact information and qualification data for services provider while maintaining empathy and trust.

**Field Examples**:

```json
{
  "hasAutismDiagnosis": {
    "uiLabel": "Autism Diagnosis",
    "type": "radio",
    "options": ["yes", "no", "unsure"],
    "optionLabels": {
      "yes": "Yes, has autism diagnosis",
      "no": "No diagnosis",
      "unsure": "Not sure/need evaluation"
    },
    "fieldGroup": "eligibility",
    "chatbot": {
      "askOrder": 3,
      "contextualQuestions": [
        "Does your child have an autism diagnosis?",
        "Has your child been diagnosed with autism?"
      ],
      "importance": "high",
      "eligibilityField": true
    }
  },

  "therapyGoals": {
    "uiLabel": "Therapy Goals",
    "type": "multiselect",
    "options": ["communication", "positive_behavior", "social_skills"],
    "optionLabels": {
      "communication": "Communication skills",
      "positive_behavior": "Reducing challenging behaviors",
      "social_skills": "Social skills"
    },
    "chatbot": {
      "askOrder": 5,
      "contextualQuestions": [
        "What are your therapy goals for your child?"
      ],
      "helpText": "Many families start by focusing on improving communication, social skills, or reducing challenging behaviors. Which of these sounds most important for your child?",
      "field_instruction": "This is a non-restrictive field. Try your best to map user input to options. If not possible, mark as 'other' and move to next field."
    }
  }
}
```

Notice `field_instruction` in `therapyGoals`? That's an instruction directly to the LLM on how to handle this specific field. This is metadata-driven prompt engineering. And other things like `askOrder`, `contextualQuestions`, and `helpText` guide the conversation flow and helps LLMs craft better responses and questions when conversing with the users.

### Use Case 2: Search Filter Optimization for a human resource Directory

**The Challenge**: Help users build complex search queries across a human resource database with conditional filters and analysis options.

**Field Examples**:

```json
{
  "preset": {
    "uiLabel": "Search Mode",
    "type": "select",
    "options": ["default", "benchmark", "collaboration", "journalism", "supporter"],
    "chatbot": {
      "askOrder": 1,
      "affectsOtherFields": true,
      "contextualQuestions": [
        "What kind of search would you like to perform?",
        "Are you looking to benchmark against existing Fellows?"
      ]
    },
    "dependencies": {
      "affects": [
        "benchmarkType",
        "profileSections",
        "relevanceAnalysis"
      ]
    },
    "stateManagement": {
      "triggers": {
        "onChange": {
          "reset": ["benchmarkType", "relevanceAnalysisQuery"],
          "update": ["profileSections", "relevanceAnalysis"]
        }
      }
    }
  },

  "profileSections": {
    "uiLabel": "Profile Sections",
    "type": "multiselect",
    "options": ["introduction", "newidea", "problem", "strategy", "person"],
    "disabledWhen": {
      "preset": ["benchmark", "collaboration"]
    },
    "presetBasedDefaults": {
      "journalism": ["introduction", "newidea", "problem"],
      "supporter": ["introduction", "newidea", "person"]
    },
    "chatbot": {
      "skipWhen": {
        "preset": ["benchmark", "collaboration"]
      }
    }
  },

  "relevanceAnalysisQuery": {
    "uiLabel": "Relevance Analysis Query",
    "type": "textarea",
    "placeholder": "Optional. The default analysis is fine 98% of the time.\nExample: Include the sport that the Fellow is most passionate about.",
    "visibleWhen": {
      "relevanceAnalysis": true
    },
    "validation": {
      "maxLength": 1000,
      "requiredWhen": {
        "relevanceAnalysis": true,
        "preset": ["benchmark", "collaboration"]
      }
    }
  }
}
```

Look at the conditional logic:
- `disabledWhen`: Entire fields become irrelevant based on other choices
- `presetBasedDefaults`: Different defaults depending on use case
- `skipWhen`: Don't even ask about this field in certain scenarios
- `requiredWhen`: Conditional validation rules

The LLM interprets all of this and adjusts the conversation accordingly. No complex branching code needed.

## The Field Schema: Your Conversation Blueprint

Let's break down what makes an effective field schema:

### Essential Properties

```json
{
  "fieldName": {
    "uiLabel": "Human-readable label",
    "description": "What this field is for",
    "type": "select|multiselect|radio|switch|textarea|number|text",
    "options": ["option1", "option2"],
    "optionLabels": {
      "option1": "Friendly label for option 1"
    },
    "default": "default_value",
    "fieldGroup": "basic|eligibility|contact|analysis",
    "validation": {
      "required": true,
      "min": 1,
      "max": 100,
      "pattern": "email|phone"
    }
  }
}
```

### Chatbot-Specific Metadata

The `chatbot` object contains instructions specifically for the LLM:

```json
"chatbot": {
  "askOrder": 5,
  "synonyms": ["alternative terms", "users might use"],
  "contextualQuestions": [
    "Natural question template 1",
    "Natural question template 2"
  ],
  "examples": {
    "option1": "Explanation of what this option means"
  },
  "importance": "high|medium|low",
  "followUpFields": ["nextFieldToAsk"],
  "helpText": "Guidance when users are unsure",
  "field_instruction": "Special handling rules for this field"
}
```

### Conditional Logic

Conditional logic allows us to tune and change the conversation flow dynamically:

```json
{
  "visibleWhen": {
    "otherField": ["value1", "value2"]
  },
  "disabledWhen": {
    "preset": ["benchmark"]
  },
  "enabledWhen": {
    "someSwitch": true
  },
  "validation": {
    "requiredWhen": {
      "conditionalField": ["specific_value"]
    }
  }
}
```


## The System Prompt: Teaching the LLM to Be a Conversational Form

Now that we have our schema, we need to instruct the LLM how to use it. This is where prompt engineering becomes critical.

### Core Prompt Structure

Here's the template I use across both implementations:

> Note: The original prompt is obviously behind NDA. Below is an AI synthesized shortened version that captures the essence without revealing proprietary details.

```markdown
# Core Identity
You are a [use case] assistant, helping users [accomplish goal].
You conduct warm, conversational sessions while systematically collecting information using the provided field definitions.

# Conversation Personality
- Tone: Warm, supportive, professional but approachable
- Style: Brief, conversational responses (1-2 sentences typically)
- Empathy: Recognize this may be emotional/difficult for users

# Primary Objectives
1. Information Gathering: Collect required data following askOrder sequence
2. Support Provision: Guide uncertain users with examples and reassurance
3. Eligibility Assessment: Quickly determine if criteria are met
4. Lead Capture: Secure contact information for qualified users
```

We added a dynamic suggestion system because we if we provide options in the JSON, its not that super necessary to show the suggestions every single time, a mid-agency level bot would be able to judge a users conversation flow to decide if they would need suggestions or not. I appreciate having less elements than overwhelm the user with options when not needed.

The trigger looks something like this
```markdown
AI: "What are your therapy goals? [[showSuggestions:therapyGoals]]"

→ Widget shows:
  [Communication Skills] [Reducing Behaviors] [Social Skills]
```

The guiding prompt for it:
```markdown
# Dynamic Suggestion System

ALWAYS include a suggestion marker when asking about any field that
has predefined options to trigger automatic suggestion buttons.

Format: [[showSuggestions:fieldName]]

Examples:
- "Does your child have an autism diagnosis? [[showSuggestions:hasAutismDiagnosis]]"
- "Which state are you located in? [[showSuggestions:state]]"
- "What are your therapy goals? [[showSuggestions:therapyGoals]]"

Important:
- Only use suggestion markers for fields that have 'options' or 'allowedValues'
- The marker comes immediately after your question
- Don't list specific options when using markers - let the buttons do the work

```

We had an additional trigger for the chatbot to use when it felt it had collected enough information to qualify a lead. I know - I know that there are much better systems for lead capture but this was one of the simplest ways to do it without having to build complex API integrations into the chatbot itself.

The trigger looks something like this:
```markdown
[[leadCaptured:{
  "state": "Virginia",
  "hasAutismDiagnosis": "yes",
  "contactEmail": "parent@email.com",
  "therapyGoals": ["communication", "social_skills"]
}]]

→ Invisible to user, triggers lead creation in CRM
```

The guiding prompt for it:
```markdown

# Lead Capture System

When you have collected the minimum required information to qualify
someone as a potential lead, send a lead capture marker.

Format: [[leadCaptured:{"field1":"value1","field2":"value2"}]]

Minimum Required Fields:
- Eligibility fields (based on your use case)
- Either contactPhone OR contactEmail (for follow-up)

Rules:
- Send the marker ONLY ONCE per conversation when minimum criteria are met
- Include ALL collected field data in the JSON, not just the minimum
- The marker will not be shown to the user - it processes lead data in background
- If the user doesn't qualify, do NOT send the marker

```

## Where This Is Going

This architecture isn't just about replacing forms. It's a **general pattern for task-oriented dialogue in any domain**.

But hold on what if or imagine metadata that learns:

- Which question order converts best for different user segments
- What examples resonate most by demographic
- When to offer suggestions vs free-form input
- How to detect and recover from user frustration

**Still low-agency** (still following the schema), but **adaptive within constraints**.

Because now you can track outcomes, flow, and user satisfaction tied directly to field-level metadata. Optimize not just the conversation, but the underlying schema itself. Maybe even connect with A/B testing frameworks to try different field definitions and see what works best. After all, its just a file that can be modified and updated as you see fit.

## Conclusion

Traditional forms are dying. But their replacement isn't fully autonomous AI; it's **metadata-driven conversational systems**.

Whether you're building Government benefit applications, Healthcare intake systems, Legal document assistance, Financial compliance questionnaires, Service provider qualification, Complex database search interfaces, and Survey and assessment tools.

**The same three-layer pattern works**: Metadata defines structure, LLM provides understanding, widget delivers experience. **Start with your worst-performing form**. The one with high abandonment. The one users complain about. The 40-field monster that takes 20 minutes. Map out the required fields. Define conditional logic. Write a system prompt. Build a prototype this weekend. The tools are free. The models cost pennies. The results speak for themselves: higher completion rates, better data quality, happier users.

*Build something that makes forms less painful.*

---

## Additional Resources

Want to dive deeper? Here are starting points:

### Academic Foundation
- [Task-Oriented Dialogue Systems: A Survey](https://arxiv.org/abs/2003.07490)
- [Dialogue State Tracking Challenge Series](https://www.microsoft.com/en-us/research/event/dialog-state-tracking-challenge/)
- [Zero-Shot Slot Filling with LLMs](https://arxiv.org/abs/2402.10466)

### Additional Guides
Two simple guides that you can refer if needed. Note that I used AI to alter the original prod template to clean it off brand names and sensitive info. So its not the exact template but more or less similar, but if you have understand everything so far, you prolly can skip this entirely and just built one in like 30-40mins, you do understand its that simple, all you need is a structured JSON, a good system prompt and finally some programming knowledge to write some code that captures, stores and maintains the states and triggers.

{{< sub-section "assets/lead-collection-template.md" >}}{{< /sub-section >}}

{{< sub-section "assets/search-filter-template.md" >}}{{< /sub-section >}}

*Build something amazing.*

[^form-stats]: Zuko Analytics (2024). "Average Conversion Rates on Forms and Checkouts: Industry Benchmarking" - https://www.zuko.io/benchmarking/industry-benchmarking
[^complex-forms]: SaleCycle Research (2024). "Over 80% of shoppers abandon booking and checkout forms" - Referenced in WPForms Statistics 2024
[^dialogflow]: Google Cloud Documentation (2024). "Generative features overview | Dialogflow CX" - https://cloud.google.com/dialogflow/cx/docs/concept/generative
[^lex]: AWS Blog (2024). "Elevate your self-service assistants with new generative AI features in Amazon Lex" - https://aws.amazon.com/blogs/machine-learning/elevate-your-self-service-assistants-with-new-generative-ai-features-in-amazon-lex/
[^copilot]: Microsoft Learn (2024). "Overview - Microsoft Copilot Studio" - https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio
[^rasa]: Rasa Blog (2024). "Rasa Developer Edition for LLM-Powered Chatbots" - https://rasa.com/blog/rasa-developer-edition-revolutionizing-llm-powered-chatbots/
[^botpress]: Botpress (2024). "The Complete AI Agent Platform" - https://www.botpress.com/
[^landbot]: Landbot (2024). "AI Chatbot Generator for Conversational Experiences" - https://landbot.io
[^salesforce]: Salesforce (2024). "Salesforce Announces General Availability of Einstein Copilot" - https://www.salesforce.com/news/press-releases/2024/04/25/einstein-copilot-general-availability/
[^dialogflow-pricing]: Google Cloud Pricing (2024). "Dialogflow CX Pricing" - https://cloud.google.com/dialogflow/pricing
[^lex-pricing]: AWS Pricing (2024). "Amazon Lex Pricing" - https://aws.amazon.com/lex/pricing/
[^copilot-pricing]: Microsoft (2024). "Microsoft Copilot Studio Pricing" - https://www.microsoft.com/en-us/microsoft-copilot/microsoft-copilot-studio
[^botpress-pricing]: Botpress Pricing (2024). "Botpress Cloud Pricing" - https://www.botpress.com/pricing
[^landbot-pricing]: Landbot Pricing (2024). "Landbot Pricing Plans" - https://landbot.io/pricing
