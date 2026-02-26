<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponseTrait;
use App\Models\Payment;
use App\Services\SettingService;
use App\Services\Stripe\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StripePaymentController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private StripeService $stripeService,
        private SettingService $settingService
    ) {}

    /**
     * List the authenticated user's payments.
     */
    public function index(Request $request): JsonResponse
    {

        $payments = Payment::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return $this->dataResponse($payments);
    }

    /**
     * Show a single payment (user must own it or have payments.manage).
     */
    public function show(Request $request, Payment $payment): JsonResponse
    {

        if ($payment->user_id !== $request->user()->id && ! $request->user()->can('payments.manage')) {
            return $this->errorResponse('Not found', 404);
        }

        return $this->dataResponse(['payment' => $payment]);
    }

    /**
     * Create a Stripe payment intent (destination charge to connected account).
     */
    public function createIntent(Request $request): JsonResponse
    {

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:50'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ]);

        $connectedAccountId = $this->settingService->get('stripe', 'connected_account_id');
        if (empty($connectedAccountId)) {
            return $this->errorResponse('No connected Stripe account configured', 422);
        }

        $currency = $validated['currency'] ?? config('stripe.currency', 'usd');

        $result = $this->stripeService->initiatePayment(
            user: $request->user(),
            amount: $validated['amount'],
            currency: $currency,
            connectedAccountId: $connectedAccountId,
            description: $validated['description'] ?? null,
            metadata: $validated['metadata'] ?? [],
        );

        if (!$result['success']) {
            return $this->errorResponse($result['error'] ?? 'Payment failed', 500);
        }

        return $this->dataResponse([
            'payment_id' => $result['payment_id'],
            'client_secret' => $result['client_secret'],
        ], 201);
    }

    /**
     * List all payments across all users (admin).
     */
    public function adminIndex(Request $request): JsonResponse
    {

        $payments = Payment::with('user')
            ->orderByDesc('created_at')
            ->paginate(50);

        return $this->dataResponse($payments);
    }
}
