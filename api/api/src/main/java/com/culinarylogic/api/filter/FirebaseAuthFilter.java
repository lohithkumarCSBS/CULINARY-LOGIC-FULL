package com.culinarylogic.api.filter;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * FirebaseAuthFilter
 *
 * Intercepts every HTTP request and validates the Firebase ID token
 * sent in the Authorization header as: "Bearer <idToken>"
 *
 * On success:  Sets a fully authenticated principal in SecurityContextHolder
 *              so downstream controllers can call @AuthenticationPrincipal
 *              or SecurityContextHolder.getContext().getAuthentication()
 *
 * On failure:  Clears the SecurityContext and continues the filter chain
 *              (Spring Security will reject the request if the endpoint
 *              requires authentication)
 *
 * Registration: Add to SecurityConfig via
 *   http.addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class)
 */
@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseAuthFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    /**
     * Paths that are completely public — skip token validation for these.
     */
    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/v1/health",
        "/api/v1/recipes/public",
        "/actuator"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String idToken = extractBearerToken(request);

        if (!StringUtils.hasText(idToken)) {
            // No token present — pass through; Spring Security will reject if auth required
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // ── Verify the token with Firebase Admin SDK ──────────
            // This validates: signature, expiry, project ID, and revocation
            FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);

            String uid   = decoded.getUid();
            String email = decoded.getEmail();

            log.debug("Firebase token verified for uid={} email={}", uid, email);

            // ── Determine roles from Firebase custom claims ───────
            List<SimpleGrantedAuthority> authorities = buildAuthorities(decoded);

            // ── Create Spring Security principal ──────────────────
            // Principal is the Firebase UID; credentials cleared after auth
            FirebasePrincipal principal = new FirebasePrincipal(uid, email, decoded.getName());

            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (FirebaseAuthException e) {
            log.warn("Firebase token validation failed: {} — {}", e.getAuthErrorCode(), e.getMessage());
            SecurityContextHolder.clearContext();
            // Don't send 401 here — let Spring Security handle it based on endpoint config
        } catch (Exception e) {
            log.error("Unexpected error during Firebase token verification", e);
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }

    private List<SimpleGrantedAuthority> buildAuthorities(FirebaseToken decoded) {
        // Read custom claims set via Firebase Admin SDK
        // e.g. FirebaseAuth.getInstance().setCustomUserClaims(uid, Map.of("role", "ADMIN"))
        Object roleClaim = decoded.getClaims().get("role");
        String role = roleClaim instanceof String r ? r.toUpperCase() : "USER";
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    // ── Inner class: strongly-typed principal ─────────────────────

    /**
     * Immutable value object placed in the SecurityContext.
     * Retrieve in controllers with:
     *   @AuthenticationPrincipal FirebaseAuthFilter.FirebasePrincipal principal
     */
    public record FirebasePrincipal(String uid, String email, String displayName) {}
}
