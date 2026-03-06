<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\AdminAuthorizationTrait;
use App\Http\Traits\ApiResponseTrait;
use App\Services\AuditService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    use AdminAuthorizationTrait;
    use ApiResponseTrait;

    public function __construct(
        private UserService $userService,
        private AuditService $auditService,
    ) {}

    /**
     * Get user profile.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['socialAccounts:id,user_id,provider,nickname,avatar']);

        return $this->dataResponse(['user' => $user]);
    }

    /**
     * Update user profile.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'avatar' => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);

        // Check if email is being changed
        $emailChanged = isset($validated['email']) && $validated['email'] !== $user->email;

        // Capture original values before mutation for audit logging
        $original = $user->only(array_keys($validated));

        if ($emailChanged) {
            $validated['email_verified_at'] = null;
        }

        $user->update($validated);

        $this->auditService->logModelChange($user, 'profile.updated', $original, $user->only(array_keys($validated)));

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        return $this->successResponse('Profile updated successfully', [
            'user' => $user,
            'email_verification_sent' => $emailChanged,
        ]);
    }

    /**
     * Update user password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => $validated['password'],
        ]);

        $this->auditService->log('profile.password_changed', $request->user());

        return $this->successResponse('Password updated successfully');
    }

    /**
     * Delete user account.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($error = $this->ensureNotLastAdmin($user, 'delete')) {
            return $error;
        }

        $this->auditService->log('profile.deleted', $user);

        $this->userService->deleteUser($user, $user->id);

        return $this->successResponse('Account deleted successfully');
    }
}
