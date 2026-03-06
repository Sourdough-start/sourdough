<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Cache;
use Illuminate\Cache\RateLimiter;

abstract class TestCase extends BaseTestCase
{
    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Disable rate limiting middleware in tests to prevent 429 errors
        $this->withoutMiddleware(ThrottleRequests::class);
        
        // Clear cache to reset any rate limiter state
        Cache::flush();
    }

    /**
     * Create an authenticated user for testing.
     */
    protected function actingAsUser(array $attributes = []): \App\Models\User
    {
        $user = \App\Models\User::factory()->create($attributes);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    /**
     * Create an authenticated admin user for testing (in admin group).
     */
    protected function actingAsAdmin(array $attributes = []): \App\Models\User
    {
        $user = \App\Models\User::factory()->admin()->create($attributes);
        $this->actingAs($user, 'sanctum');
        return $user;
    }
}
