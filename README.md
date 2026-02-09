Demo project:

- Sidebar DOM on Github Issues.
- REST Post request that forwards to n8n.
- Local n8n running in Docker:
  - Webhook
  - Prompt builder
  - OpenAI node
  - Answer JSON parser
  - Return webhook

┌─────────────────────────────┐
│   Browser (GitHub Issue)    │
│                             │
│  ┌───────────────────────┐  │
│  │  Sidebar Copilot UI   │  │
│  │  (content script)     │  │
│  └──────────┬────────────┘  │
│             │                │
│   Extracted context + intent │
│             │                │
└─────────────▼────────────────┘
              │ HTTPS (JSON)
              ▼
┌────────────────────────────────────────┐
│ Azure Container Apps                    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ n8n Workflow Engine               │  │
│  │                                  │  │
│  │  - Webhook trigger                │  │
│  │  - Context shaping (JS)           │  │
│  │  - Prompt building                │  │
│  │  - OpenAI API call                │  │
│  │  - Response normalization (JS)    │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│         Structured AI response          │
└─────────────────▼───────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ Azure PostgreSQL Flexible Server        │
│                                        │
│  - n8n workflow state                  │
│  - credentials & encrypted secrets     │
│  - execution history                   │
└────────────────────────────────────────┘
