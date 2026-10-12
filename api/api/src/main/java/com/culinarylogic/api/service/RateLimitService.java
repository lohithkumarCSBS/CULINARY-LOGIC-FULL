package com.culinarylogic.api.service;

import org.springframework.stereotype.Service;

/**
 * Stub rate limit service — no limits enforced yet.
 * Replace with real daily_limits table logic when needed.
 */
@Service
public class RateLimitService {

    public void assertWithinDailyLimit(String userId) {
        // TODO: query daily_limits table and throw if exceeded
        // For now, all requests are allowed
    }
}