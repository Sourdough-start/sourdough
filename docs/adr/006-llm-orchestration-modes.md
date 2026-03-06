# ADR-006: LLM Orchestration Modes

## Status

Accepted

## Date

2026-01-24

## Context

Sourdough needs to support multiple LLM providers to:
- Avoid vendor lock-in
- Leverage different models' strengths
- Provide redundancy and failover
- Enable "council" mode for consensus-based responses

We need an abstraction layer that supports single-provider usage, multi-provider aggregation, and a novel "council" mode for improved response quality.

## Decision

We will implement an **LLM Orchestrator** with three operating modes: Single, Aggregation, and Council.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      LLM Orchestrator                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Request ──► LLMOrchestrator                                     │
│                    │                                              │
│                    ▼                                              │
│             ┌──────────────┐                                     │
│             │  Mode Check  │                                     │
│             └──────┬───────┘                                     │
│         ┌──────────┼──────────┐                                  │
│         ▼          ▼          ▼                                  │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│    │ Single  │ │  Agg    │ │ Council │                          │
│    │  Mode   │ │  Mode   │ │  Mode   │                          │
│    └────┬────┘ └────┬────┘ └────┬────┘                          │
│         │          │          │                                  │
│         ▼          ▼          ▼                                  │
│    ┌─────────────────────────────────────────┐                  │
│    │            Provider Pool                 │                  │
│    │  ┌───────┐ ┌───────┐ ┌───────┐ ┌──────┐│                  │
│    │  │Claude │ │OpenAI │ │Gemini │ │Ollama││                  │
│    │  └───────┘ └───────┘ └───────┘ └──────┘│                  │
│    └─────────────────────────────────────────┘                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Operating Modes

#### 1. Single Mode

Direct query to one provider. Simplest and most cost-effective.

```
Request ──► Selected Provider ──► Response
```

Use case: Standard usage, cost-conscious deployments.

#### 2. Aggregation Mode

Query all enabled providers in parallel, then have the primary provider synthesize the responses.

```
                    ┌──► Provider A ──┐
                    │                 │
Request ──► Split ──┼──► Provider B ──┼──► Collect ──► Primary Synthesizes
                    │                 │
                    └──► Provider C ──┘
```

Use case: Complex questions where different models may have different insights.

#### 3. Council Mode

All providers independently respond, then the primary provider synthesizes the results. The current implementation uses a simplified consensus approach: all providers respond in parallel, and the primary provider produces a final response that considers all inputs.

> **Implementation note:** The full consensus engine described below (majority agreement, confidence scores, dissenting views) is an aspirational design. The current implementation collects all responses and has the primary provider synthesize them into a final answer. The advanced voting/confidence features may be added in a future iteration.

```
                    ┌──► Provider A ──► Response A ──┐
                    │                                │
Request ──► Split ──┼──► Provider B ──► Response B ──┼──► Primary Synthesizes
                    │                                │
                    └──► Provider C ──► Response C ──┘
                                                     │
                                                     ▼
                                              Final Response
```

Use case: Critical decisions, fact verification, reducing hallucinations.

### Provider Interface

```php
interface LLMProviderInterface
{
    public function query(string $prompt, array $options = []): LLMResponse;
    public function queryWithVision(string $prompt, array $images, array $options = []): LLMResponse;
    public function isConfigured(): bool;
    public function getIdentifier(): string;
    public function getName(): string;
    public function supportsVision(): bool;
    public function getModels(): array;
}
```

### Supported Providers

| Provider | Text | Vision | Streaming | Models |
|----------|------|--------|-----------|--------|
| Claude (Anthropic) | ✅ | ✅ | ✅ | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| OpenAI | ✅ | ✅ | ✅ | gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo |
| Gemini (Google) | ✅ | ✅ | ✅ | gemini-pro, gemini-pro-vision |
| Ollama | ✅ | ✅* | ✅ | llama2, mistral, llava, etc. |
| AWS Bedrock | ✅ | ✅ | ✅ | claude via Bedrock |
| Azure OpenAI | ✅ | ✅ | ✅ | gpt-4, gpt-35-turbo |

*Ollama vision depends on model (llava, bakllava)

### Request Logging

All LLM requests are logged for debugging and cost tracking:

```sql
ai_request_logs
├── id
├── user_id (FK → users)
├── provider (claude, openai, etc.)
├── model
├── mode (single, aggregation, council)
├── prompt_tokens
├── completion_tokens
├── total_tokens
├── duration_ms
├── estimated_cost
├── success (boolean)
├── error_message (nullable)
└── created_at
```

### API Key Management

- Per-user API keys stored encrypted
- System-wide keys for self-hosted deployments
- Keys validated on save (test API call)
- Keys never returned in responses (only existence flag)

### Configuration

```php
// config/llm.php
return [
    'default_mode' => env('LLM_MODE', 'single'),
    'default_provider' => env('LLM_PROVIDER', 'openai'),
    'primary_provider' => env('LLM_PRIMARY', 'claude'), // For aggregation synthesis
    
    'providers' => [
        'claude' => [
            'api_key' => env('ANTHROPIC_API_KEY'),
            'default_model' => 'claude-3-sonnet-20240229',
        ],
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'default_model' => 'gpt-4o',
        ],
        // ...
    ],
    
    'council' => [
        'min_providers' => 3,
        'consensus_threshold' => 0.7, // 70% agreement
        'include_dissent' => true,
    ],
];
```

## Consequences

### Positive

- Provider abstraction prevents vendor lock-in
- Council mode can improve accuracy on factual queries
- Aggregation mode leverages multiple perspectives
- Request logging enables cost monitoring
- Graceful fallback if one provider fails

### Negative

- Council mode is expensive (3+ API calls per request)
- Response time increases with more providers
- Consensus algorithm adds complexity
- Different providers have different capabilities

### Neutral

- Users can choose their preferred mode per-request
- System-wide defaults can be overridden
- Vision support varies by provider

## Related Decisions

- [ADR-001: Technology Stack](./001-technology-stack.md)

## Notes

### Council Mode Algorithm (Aspirational Design)

> **Note:** This describes the full design vision. The current implementation uses a simplified approach where all providers respond and the primary provider synthesizes the results. See the [implementation note above](#3-council-mode).

1. Send identical prompt to all enabled providers
2. Collect responses with metadata (confidence if available)
3. Extract key claims/facts from each response
4. Compare claims across responses
5. Build consensus response with:
   - Points agreed by majority (>70%)
   - Confidence score based on agreement
   - Optional: dissenting views on disagreements
6. Return structured response

## API Documentation

- [Anthropic Claude API](https://docs.anthropic.com/en/docs)
- [OpenAI API](https://platform.openai.com/docs/api-reference/introduction)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [AWS Bedrock API](https://docs.aws.amazon.com/bedrock/latest/APIReference/welcome.html)
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

### Future Enhancements

1. ~~**Streaming Support**~~ - **[PARTIALLY IMPLEMENTED]** Real-time streaming available via Reverb/Echo ([ADR-027](./027-real-time-streaming.md)) for app logs and audit; LLM response streaming still pending
2. **Tool Use** - Function calling across providers
3. **Fine-tuned Routing** - Route to best provider per task
4. ~~**Cost Budgets**~~ - **[PARTIALLY IMPLEMENTED]** Usage tracking and budget alerts via [ADR-029](./029-usage-tracking-alerts.md)
5. **Context Caching** - Reuse long contexts across calls

## Implementation Journal

- [LLM Settings Consolidation (2026-01-29)](../journal/2026-01-29-llm-settings-consolidation.md)
- [LLM Model Discovery (2026-01-29)](../journal/2026-01-29-llm-model-discovery.md)
- [Notification LLM Settings Migration (2026-01-28)](../journal/2026-01-28-notification-llm-settings-migration.md)
