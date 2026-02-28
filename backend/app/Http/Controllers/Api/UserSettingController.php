<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSettingController extends Controller
{
    /**
     * Get user personal preferences.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'theme' => $user->getSetting('appearance', 'theme', 'system'),
            'color_theme' => $user->getSetting('appearance', 'color_theme'),
            'default_llm_mode' => $user->getSetting('defaults', 'llm_mode', 'single'),
            'notification_channels' => $user->getSetting('notifications', 'preferences', []),
            'timezone' => $user->getSetting('general', 'timezone'),
            'effective_timezone' => $user->getTimezone(),
        ]);
    }

    /**
     * Update user personal preferences.
     */
    public function update(Request $request): JsonResponse
    {
        $validTimezones = \DateTimeZone::listIdentifiers();

        // Validate only the fields that are present in the request
        $validated = $request->validate([
            'theme' => ['sometimes', 'nullable', 'string', 'in:light,dark,system'],
            'color_theme' => ['sometimes', 'nullable', 'string', 'max:50'],
            'default_llm_mode' => ['sometimes', 'nullable', 'string', 'in:single,aggregation,council'],
            'notification_channels' => ['sometimes', 'nullable', 'array'],
            'timezone' => ['sometimes', 'nullable', 'string', 'in:' . implode(',', $validTimezones)],
        ]);

        $user = $request->user();

        // Only update settings that were provided and are not null
        if (isset($validated['theme']) && $validated['theme'] !== null) {
            $user->setSetting('appearance', 'theme', $validated['theme']);
        }

        if (array_key_exists('color_theme', $validated)) {
            if ($validated['color_theme'] !== null) {
                $user->setSetting('appearance', 'color_theme', $validated['color_theme']);
            } else {
                // Allow clearing to revert to global default
                $user->settings()
                    ->where('group', 'appearance')
                    ->where('key', 'color_theme')
                    ->delete();
            }
        }

        if (isset($validated['default_llm_mode']) && $validated['default_llm_mode'] !== null) {
            $user->setSetting('defaults', 'llm_mode', $validated['default_llm_mode']);
        }

        if (isset($validated['notification_channels']) && $validated['notification_channels'] !== null) {
            $user->setSetting('notifications', 'preferences', $validated['notification_channels']);
        }

        if (array_key_exists('timezone', $validated)) {
            if ($validated['timezone'] !== null) {
                $user->setSetting('general', 'timezone', $validated['timezone']);
            } else {
                // Allow clearing to revert to system default
                $user->settings()
                    ->where('group', 'general')
                    ->where('key', 'timezone')
                    ->delete();
            }
        }

        return response()->json([
            'message' => 'Preferences updated successfully',
            'preferences' => [
                'theme' => $user->getSetting('appearance', 'theme', 'system'),
                'color_theme' => $user->getSetting('appearance', 'color_theme'),
                'default_llm_mode' => $user->getSetting('defaults', 'llm_mode', 'single'),
                'notification_channels' => $user->getSetting('notifications', 'preferences', []),
                'timezone' => $user->getSetting('general', 'timezone'),
                'effective_timezone' => $user->getTimezone(),
            ],
        ]);
    }

    /**
     * Auto-detect timezone from browser.
     *
     * Only sets the timezone if the user hasn't explicitly chosen one,
     * to avoid overwriting manual choices on every login.
     */
    public function detectTimezone(Request $request): JsonResponse
    {
        $validTimezones = \DateTimeZone::listIdentifiers();

        $validated = $request->validate([
            'timezone' => ['required', 'string', 'in:' . implode(',', $validTimezones)],
        ]);

        $user = $request->user();
        $current = $user->getSetting('general', 'timezone');

        if ($current === null) {
            $user->setSetting('general', 'timezone', $validated['timezone']);
        }

        return response()->json([
            'timezone' => $user->getSetting('general', 'timezone') ?? $validated['timezone'],
            'effective_timezone' => $user->getTimezone(),
            'was_set' => $current === null,
        ]);
    }
}
