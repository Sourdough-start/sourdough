<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\UrlValidationService;
use App\Services\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function __construct(
        private UrlValidationService $urlValidator,
        private WebhookService $webhookService
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
        $result = $this->webhookService->sendTest($webhook);

        $status = ($result['ssrf_blocked'] ?? false) ? 422 : ($result['success'] ? 200 : 500);

        return response()->json([
            'message' => $result['message'],
            'success' => $result['success'],
            'status_code' => $result['status_code'] ?? null,
        ], $status);
    }
}
