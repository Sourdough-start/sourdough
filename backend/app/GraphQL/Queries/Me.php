<?php

namespace App\GraphQL\Queries;

use Illuminate\Support\Facades\Auth;

class Me
{
    public function __invoke($root, array $args, $context)
    {
        // In Lighthouse, context is typically an object with a 'request' property
        $user = null;

        if (is_object($context) && property_exists($context, 'request')) {
            $user = $context->request->user();
        }

        // Fall back to auth guard
        if (!$user) {
            $user = Auth::guard('api-key')->user();
        }

        return $user;
    }
}
