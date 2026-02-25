<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\UrlValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(
        private UrlValidationService $urlValidator
    ) {}

    /**
     * Get all webhooks.
     */
    public function index(): JsonResponse
    {
        $webhooks = Webhook::orderBy('created_at', 'desc')->get();

        return response()->json([
            'webhooks' => $webhooks,
        ]);
    }

    /**
     * Create a new webhook.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'url' => ['required', 'url'],
            'secret' => ['sometimes', 'nullable', 'string'],
            'events' => ['required', 'array'],
            'events.*' => ['string'],
            'active' => ['sometimes', 'boolean'],
        ]);

        // Validate URL for SSRF protection
        if (!$this->urlValidator->validateUrl($validated['url'])) {
            return response()->json([
                'message' => 'Invalid webhook URL: URLs pointing to internal or private addresses are not allowed',
            ], 422);
        }

        $webhook = Webhook::create($validated);

        return response()->json([
            'message' => 'Webhook created successfully',
            'webhook' => $webhook,
        ], 201);
    }

    /**
     * Update a webhook.
     */
    public function update(Request $request, Webhook $webhook): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'url' => ['sometimes', 'url'],
            'secret' => ['sometimes', 'nullable', 'string'],
            'events' => ['sometimes', 'array'],
            'events.*' => ['string'],
            'active' => ['sometimes', 'boolean'],
        ]);

        // Validate URL for SSRF protection if being updated
        if (isset($validated['url']) && !$this->urlValidator->validateUrl($validated['url'])) {
            return response()->json([
                'message' => 'Invalid webhook URL: URLs pointing to internal or private addresses are not allowed',
            ], 422);
        }

        $webhook->update($validated);

        return response()->json([
            'message' => 'Webhook updated successfully',
            'webhook' => $webhook->fresh(),
        ]);
    }

    /**
     * Delete a webhook.
     */
    public function destroy(Webhook $webhook): JsonResponse
    {
        $webhook->delete();

        return response()->json([
            'message' => 'Webhook deleted successfully',
        ]);
    }

    /**
     * Get webhook deliveries.
     */
    public function deliveries(Webhook $webhook, Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', config('app.pagination.default'));

        $deliveries = $webhook->deliveries()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($deliveries);
    }

    /**
     * Test a webhook.
     */
    public function test(Webhook $webhook): JsonResponse
    {
        // Validate URL and resolve DNS for SSRF protection (pins DNS to prevent rebinding)
        $resolved = $this->urlValidator->validateAndResolve($webhook->url);
        if ($resolved === null) {
            return response()->json([
                'message' => 'Webhook test failed: URL points to an internal or private address',
                'success' => false,
            ], 422);
        }

        try {
            $payload = [
                'event' => 'webhook.test',
                'timestamp' => now()->toIso8601String(),
                'data' => [
                    'message' => 'This is a test webhook',
                ],
            ];

            $headers = $this->buildWebhookHeaders($webhook, $payload);

            $response = Http::timeout(10)
                ->withHeaders($headers)
                ->withOptions($this->urlValidator->pinnedOptions($resolved))
                ->post($webhook->url, $payload);

            // Log the delivery
            $webhook->deliveries()->create([
                'event' => 'webhook.test',
                'payload' => $payload,
                'response_code' => $response->status(),
                'response_body' => $response->body(),
                'success' => $response->successful(),
            ]);

            $webhook->update(['last_triggered_at' => now()]);

            return response()->json([
                'message' => 'Webhook test completed',
                'success' => $response->successful(),
                'status_code' => $response->status(),
            ]);
        } catch (\Exception $e) {
            Log::error('Webhook test failed', ['webhook_id' => $webhook->id, 'exception' => $e]);

            // Log failed delivery (generic message to avoid leaking internal details)
            $webhook->deliveries()->create([
                'event' => 'webhook.test',
                'payload' => $payload ?? [],
                'response_code' => null,
                'response_body' => 'Connection failed',
                'success' => false,
            ]);

            return response()->json([
                'message' => 'Webhook test failed',
                'success' => false,
            ], 500);
        }
    }

    /**
     * Build webhook headers including signature if secret is configured.
     */
    private function buildWebhookHeaders(Webhook $webhook, array $payload): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'User-Agent' => 'Sourdough-Webhook/1.0',
        ];

        if (!empty($webhook->secret)) {
            $timestamp = time();
            $signature = $this->generateSignature($webhook->secret, $timestamp, $payload);

            $headers['X-Webhook-Timestamp'] = $timestamp;
            $headers['X-Webhook-Signature'] = 'sha256=' . $signature;
        }

        return $headers;
    }

    /**
     * Generate HMAC-SHA256 signature for webhook payload.
     *
     * The signature is computed over: timestamp.json_payload
     * This prevents replay attacks by binding the signature to a specific timestamp.
     */
    private function generateSignature(string $secret, int $timestamp, array $payload): string
    {
        $payloadJson = json_encode($payload);
        $signaturePayload = $timestamp . '.' . $payloadJson;

        return hash_hmac('sha256', $signaturePayload, $secret);
    }
}
