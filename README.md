Demo project:

Browser (GitHub Issue Page)
│
│  Content Script (JavaScript)
│  - Injected sidebar chat UI
│  - Extracts structured page context
│  - Captures user intent
│
▼
HTTPS (JSON)
│
│  FAST / API Boundary
│  - Webhook-style request/response
│  - Strict JSON contract
│
▼
Azure Container Apps
│
│  n8n (Workflow Orchestration)
│  - Webhook trigger
│  - Context shaping (JS Function nodes)
│  - Prompt construction
│  - OpenAI API call
│  - Response normalization
│
▼
Azure PostgreSQL Flexible Server
│
│  - n8n workflows & execution state
│  - Encrypted credentials
│
▼
Response
│
│  Structured JSON:
│  { answerMarkdown, suggestedActions, confidence }
│
▼
Browser Sidebar UI

