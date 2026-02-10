Demo project:

Browser (GitHub Issue Page) <br/>
│<br/>
│  Content Script (JavaScript)<br/>
│  - Injected sidebar chat UI<br/>
│  - Extracts structured page context<br/>
│  - Captures user intent<br/>
│<br/>
▼<br/>
HTTPS (JSON)<br/>
│<br/>
│  FAST / API Boundary<br/>
│  - Webhook-style request/response<br/>
│  - Strict JSON contract<br/>
│<br/>
▼<br/>
Azure Container Apps<br/>
│<br/>
│  n8n (Workflow Orchestration)<br/>
│  - Webhook trigger<br/>
│  - Context shaping (JS Function nodes)<br/>
│  - Prompt construction<br/>
│  - OpenAI API call<br/>
│  - Response normalization<br/>
│<br/>
▼<br/>
Azure PostgreSQL Flexible Server<br/>
│<br/>
│  - n8n workflows & execution state<br/>
│  - Encrypted credentials<br/>
│<br/>
▼<br/>
Response and logging<br/>
│<br/>
│  - Structured JSON:<br/>
│  { answerMarkdown, suggestedActions, confidence }<br/>
|  - Log creation via GCP Google Sheets API node.
│<br/>
▼<br/>
Browser Sidebar UI<br/>
