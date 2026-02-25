<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LLM\LLMOrchestrator;
use App\Services\UrlValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LLMController extends Controller
{
    public function __construct(
        private LLMOrchestrator $orchestrator,
        private UrlValidationService $urlValidator
    ) {}

    /**
     * Get available LLM providers.
     */
    public function providers(): JsonResponse
    {
        $providers = collect(config('llm.providers'))
            ->map(fn ($config, $key) => [
                'id' => $key,
                'name' => $config['name'],
                'enabled' => $config['enabled'],
                'supports_vision' => $config['supports_vision'] ?? false,
                'supports_tools' => $config['supports_tools'] ?? false,
            ]);

        return response()->json([
            'providers' => $providers,
            'current_mode' => config('llm.mode'),
            'primary' => config('llm.primary'),
        ]);
    }

    /**
     * Get user's LLM configuration.
     */
    public function config(Request $request): JsonResponse
    {
        $user = $request->user();

        $providers = $user->aiProviders()->get()->map(fn ($p) => $this->formatProvider($p));

        $mode = $user->getSetting('defaults', 'llm_mode', config('llm.mode'));

        return response()->json([
            'mode' => $mode,
            'providers' => $providers,
        ]);
    }

    /**
     * Update user's LLM configuration.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['sometimes', 'in:single,aggregation,council'],
            'providers' => ['sometimes', 'array'],
            'providers.*.provider' => ['required', 'string'],
            'providers.*.api_key' => ['sometimes', 'nullable', 'string'],
            'providers.*.model' => ['sometimes', 'string'],
            'providers.*.is_enabled' => ['sometimes', 'boolean'],
            'providers.*.is_primary' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();

        if (isset($validated['mode'])) {
            $user->setSetting('defaults', 'llm_mode', $validated['mode']);
        }

        if (isset($validated['providers'])) {
            foreach ($validated['providers'] as $providerConfig) {
                $data = [
                    'provider' => $providerConfig['provider'],
                ];

                if (isset($providerConfig['api_key'])) {
                    $data['api_key'] = $providerConfig['api_key'];
                }
                if (isset($providerConfig['model'])) {
                    $data['model'] = $providerConfig['model'];
                }
                if (isset($providerConfig['is_enabled'])) {
                    $data['is_enabled'] = $providerConfig['is_enabled'];
                }
                if (isset($providerConfig['is_primary'])) {
                    $data['is_primary'] = $providerConfig['is_primary'];

                    // Ensure only one primary
                    if ($providerConfig['is_primary']) {
                        $user->aiProviders()
                            ->where('provider', '!=', $providerConfig['provider'])
                            ->update(['is_primary' => false]);
                    }
                }

                $user->aiProviders()->updateOrCreate(
                    ['provider' => $providerConfig['provider']],
                    $data
                );
            }
        }

        return response()->json([
            'message' => 'LLM configuration updated',
        ]);
    }

    /**
     * Add a new LLM provider.
     */
    public function storeProvider(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:claude,openai,gemini,ollama,azure,bedrock'],
            'model' => ['required', 'string'],
            'api_key' => ['sometimes', 'nullable', 'string'],
            'base_url' => ['sometimes', 'nullable', 'string'],
            'endpoint' => ['sometimes', 'nullable', 'string'],
            'region' => ['sometimes', 'nullable', 'string'],
            'access_key' => ['sometimes', 'nullable', 'string'],
            'secret_key' => ['sometimes', 'nullable', 'string'],
        ]);

        $user = $request->user();

        // Check if provider already exists for this user
        $existing = $user->aiProviders()->where('provider', $validated['provider'])->first();
        if ($existing) {
            return response()->json([
                'message' => 'Provider already exists',
            ], 400);
        }

        $settings = [];
        if (isset($validated['base_url']) && ! empty($validated['base_url'])) {
            $settings['base_url'] = $validated['base_url'];
        }
        if (isset($validated['endpoint']) && ! empty($validated['endpoint'])) {
            $settings['endpoint'] = $validated['endpoint'];
        }
        if (isset($validated['region']) && ! empty($validated['region'])) {
            $settings['region'] = $validated['region'];
        }
        if (isset($validated['access_key']) && ! empty($validated['access_key'])) {
            $settings['access_key'] = $validated['access_key'];
        }
        if (isset($validated['secret_key']) && ! empty($validated['secret_key'])) {
            $settings['secret_key'] = $validated['secret_key'];
        }
        if ($validated['provider'] === 'azure' && ! empty($validated['model'])) {
            $settings['deployment'] = $validated['model'];
        }
        if ($validated['provider'] === 'bedrock') {
            if (! empty($validated['access_key'])) {
                $settings['access_key_id'] = $validated['access_key'];
            }
            if (! empty($validated['secret_key'])) {
                $settings['secret_access_key'] = $validated['secret_key'];
            }
        }

        $provider = $user->aiProviders()->create([
            'provider' => $validated['provider'],
            'model' => $validated['model'],
            'api_key' => $validated['api_key'] ?? null,
            'is_enabled' => true,
            'is_primary' => $user->aiProviders()->count() === 0,
            'settings' => !empty($settings) ? $settings : null,
        ]);

        return response()->json([
            'message' => 'Provider added',
            'provider' => $this->formatProvider($provider),
        ], 201);
    }

    /**
     * Update an LLM provider.
     */
    public function updateProvider(Request $request, int $provider): JsonResponse
    {
        $user = $request->user();
        $providerModel = $user->aiProviders()->findOrFail($provider);

        $validated = $request->validate([
            'model' => ['sometimes', 'string'],
            'api_key' => ['sometimes', 'nullable', 'string'],
            'base_url' => ['sometimes', 'nullable', 'string'],
            'endpoint' => ['sometimes', 'nullable', 'string'],
            'region' => ['sometimes', 'nullable', 'string'],
            'access_key' => ['sometimes', 'nullable', 'string'],
            'secret_key' => ['sometimes', 'nullable', 'string'],
            'is_enabled' => ['sometimes', 'boolean'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        // Handle primary flag (ensure only one primary)
        if (isset($validated['is_primary']) && $validated['is_primary']) {
            $user->aiProviders()
                ->where('id', '!=', $provider)
                ->update(['is_primary' => false]);
        }

        // Merge provider-specific fields into the settings JSON column
        $settingsFields = ['base_url', 'endpoint', 'region', 'access_key', 'secret_key'];
        $hasSettingsUpdate = false;
        foreach ($settingsFields as $field) {
            if (isset($validated[$field])) {
                $hasSettingsUpdate = true;
                break;
            }
        }

        if ($hasSettingsUpdate || (isset($validated['model']) && $providerModel->provider === 'azure')) {
            $settings = $providerModel->settings ?? [];

            foreach (['base_url', 'endpoint', 'region'] as $field) {
                if (isset($validated[$field])) {
                    if (!empty($validated[$field])) {
                        $settings[$field] = $validated[$field];
                    } else {
                        unset($settings[$field]);
                    }
                    unset($validated[$field]);
                }
            }

            // Handle Bedrock AWS credentials (map to access_key_id / secret_access_key)
            if (isset($validated['access_key'])) {
                if (!empty($validated['access_key'])) {
                    $settings['access_key'] = $validated['access_key'];
                    if ($providerModel->provider === 'bedrock') {
                        $settings['access_key_id'] = $validated['access_key'];
                    }
                } else {
                    unset($settings['access_key'], $settings['access_key_id']);
                }
                unset($validated['access_key']);
            }

            if (isset($validated['secret_key'])) {
                if (!empty($validated['secret_key'])) {
                    $settings['secret_key'] = $validated['secret_key'];
                    if ($providerModel->provider === 'bedrock') {
                        $settings['secret_access_key'] = $validated['secret_key'];
                    }
                } else {
                    unset($settings['secret_key'], $settings['secret_access_key']);
                }
                unset($validated['secret_key']);
            }

            // Update Azure deployment name when model changes
            if (isset($validated['model']) && $providerModel->provider === 'azure') {
                $settings['deployment'] = $validated['model'];
            }

            $validated['settings'] = !empty($settings) ? $settings : null;
        }

        $providerModel->update($validated);

        return response()->json([
            'message' => 'Provider updated',
            'provider' => $this->formatProvider($providerModel->fresh()),
        ]);
    }

    /**
     * Delete an LLM provider.
     */
    public function destroyProvider(Request $request, int $provider): JsonResponse
    {
        $user = $request->user();
        $providerModel = $user->aiProviders()->findOrFail($provider);
        $wasPrimary = $providerModel->is_primary;

        $providerModel->delete();

        // If deleted provider was primary, assign primary to first remaining
        if ($wasPrimary) {
            $user->aiProviders()->first()?->update(['is_primary' => true]);
        }

        return response()->json(['message' => 'Provider removed']);
    }

    /**
     * Format provider for API response.
     */
    private function formatProvider($provider): array
    {
        $settings = $provider->settings ?? [];

        return [
            'id' => $provider->id,
            'provider' => $provider->provider,
            'model' => $provider->model,
            'api_key_set' => !empty($provider->api_key),
            'is_enabled' => $provider->is_enabled,
            'is_primary' => $provider->is_primary,
            'last_test_at' => $provider->last_test_at?->toISOString(),
            'last_test_success' => $provider->last_test_success,
            'base_url' => $settings['base_url'] ?? null,
            'endpoint' => $settings['endpoint'] ?? null,
            'region' => $settings['region'] ?? null,
            'access_key_set' => !empty($settings['access_key']) || !empty($settings['access_key_id']),
            'secret_key_set' => !empty($settings['secret_key']) || !empty($settings['secret_access_key']),
        ];
    }

    /**
     * Test an LLM provider.
     */
    public function testProvider(Request $request, string $provider): JsonResponse
    {
        $user = $request->user();
        $providerConfig = $user->aiProviders()->where('provider', $provider)->first();

        if (!$providerConfig) {
            return response()->json([
                'message' => 'Provider not configured',
            ], 400);
        }

        try {
            $result = $this->orchestrator->testProvider($user, $provider);

            $providerConfig->update([
                'last_test_at' => now(),
                'last_test_success' => $result['success'],
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            $providerConfig->update([
                'last_test_at' => now(),
                'last_test_success' => false,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Test failed',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Execute an LLM query.
     */
    public function query(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:50000'],
            'system_prompt' => ['sometimes', 'string', 'max:10000'],
            'mode' => ['sometimes', 'in:single,aggregation,council'],
            'provider' => ['sometimes', 'string'],
        ]);

        $user = $request->user();

        try {
            $result = $this->orchestrator->query(
                user: $user,
                prompt: $validated['prompt'],
                systemPrompt: $validated['system_prompt'] ?? null,
                mode: $validated['mode'] ?? null,
                provider: $validated['provider'] ?? null,
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Query failed',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Execute an LLM vision query (with image).
     */
    public function visionQuery(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:50000'],
            'image' => ['required_without:image_url'],
            'image_url' => ['required_without:image', 'url'],
            'system_prompt' => ['sometimes', 'string', 'max:10000'],
            'mode' => ['sometimes', 'in:single,aggregation,council'],
            'provider' => ['sometimes', 'string'],
        ]);

        $user = $request->user();

        // Handle image upload or URL
        // Note: validateUrl() (not validateAndResolve) is intentional here. The URL is passed
        // to the external LLM provider which fetches it — our server does not make the HTTP
        // request, so DNS pinning is not applicable. The validation prevents sending internal
        // URLs to external providers.
        $imageData = null;
        if ($request->hasFile('image')) {
            $imageData = base64_encode(file_get_contents($request->file('image')->path()));
            $mimeType = $request->file('image')->getMimeType();
        } elseif (isset($validated['image_url'])) {
            $imageUrl = $validated['image_url'];
            if (!$this->urlValidator->validateUrl($imageUrl)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Image URL is not allowed (invalid or internal address).',
                ], 400);
            }
            $imageData = $imageUrl;
            $mimeType = null;
        }

        try {
            $result = $this->orchestrator->visionQuery(
                user: $user,
                prompt: $validated['prompt'],
                imageData: $imageData,
                mimeType: $mimeType ?? 'image/jpeg',
                systemPrompt: $validated['system_prompt'] ?? null,
                mode: $validated['mode'] ?? null,
                provider: $validated['provider'] ?? null,
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Vision query failed',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
