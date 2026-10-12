package com.culinarylogic.api.service;

import com.culinarylogic.api.dto.RecipeDTO;
import com.culinarylogic.api.dto.YouTubeVideoDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * CulinaryBridgeService — Gemini + YouTube orchestration
 *
 * Supports:
 *  - generateBatch(): generate N recipes in parallel with filter constraints
 *  - Filter params (cuisine, dietary, difficulty, maxTime, servings) are
 *    baked into the Gemini prompt as hard requirements
 *  - Each recipe's title is used to query YouTube Data API v3 concurrently
 */
@Service
public class CulinaryBridgeService {

    private static final Logger log = LoggerFactory.getLogger(CulinaryBridgeService.class);

    @Value("${culinary.gemini.api-key}")
    private String geminiApiKey;

    @Value("${culinary.gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    private static final String GEMINI_BASE_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${culinary.youtube.api-key}")
    private String youtubeApiKey;

    private static final String YOUTUBE_SEARCH_URL =
        "https://www.googleapis.com/youtube/v3/search";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public CulinaryBridgeService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    // ── PUBLIC API ────────────────────────────────────────────────

    /**
     * Generate `count` recipes in parallel, each enriched with a YouTube tutorial.
     *
     * @param ingredients     Raw ingredient string from the user
     * @param dietary         Dietary restriction string (or "None")
     * @param cuisine         Optional cuisine constraint
     * @param difficulty      Optional difficulty constraint
     * @param maxTotalMinutes Optional max combined prep+cook time
     * @param maxServings     Optional max serving size
     * @param count           Number of distinct recipes to generate (1–6)
     * @param userId          Firebase UID for logging / persistence
     */
    public List<RecipeDTO> generateBatch(
            String ingredients, String dietary, String cuisine,
            String difficulty, Integer maxTotalMinutes, Integer maxServings,
            int count, String userId
    ) {
        log.info("Batch generation: count={} user={} cuisine={} difficulty={}", count, userId, cuisine, difficulty);

        // Build one prompt asking for `count` recipes at once (more efficient than N calls)
        String prompt = buildBatchPrompt(ingredients, dietary, cuisine, difficulty, maxTotalMinutes, maxServings, count);
        List<RecipeDTO> recipes = callGeminiForBatch(prompt, count);

        // Enrich each recipe with a YouTube video concurrently
        List<CompletableFuture<RecipeDTO>> futures = recipes.stream()
            .map(r -> CompletableFuture.supplyAsync(() -> {
                YouTubeVideoDTO video = searchYouTubeTutorial(r.getTitle() + " recipe cooking tutorial");
                r.setYoutubeVideo(video);
                r.setRequestedBy(userId);
                return r;
            }))
            .collect(Collectors.toList());

        return futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());
    }

    // ── GEMINI CALL ───────────────────────────────────────────────

    private List<RecipeDTO> callGeminiForBatch(String prompt, int count) {
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            ),
            "generationConfig", Map.of(
                "temperature",      0.9,
                "maxOutputTokens",  4096,
                "responseMimeType", "application/json"
            )
        );

        String url = GEMINI_BASE_URL + geminiModel + ":generateContent?key=" + geminiApiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Gemini API non-2xx: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            String raw = root
                .path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText();

            return parseRecipeList(raw, count);

        } catch (Exception e) {
            log.error("Gemini batch call failed", e);
            throw new RuntimeException("Failed to generate recipes via Gemini", e);
        }
    }

    private String buildBatchPrompt(
            String ingredients, String dietary, String cuisine,
            String difficulty, Integer maxTotalMinutes, Integer maxServings, int count
    ) {
        StringBuilder constraints = new StringBuilder();
        if (cuisine         != null && !cuisine.isBlank())     constraints.append("- Cuisine: ").append(cuisine).append("\n");
        if (dietary         != null && !dietary.equals("None")) constraints.append("- Dietary: ").append(dietary).append("\n");
        if (difficulty      != null && !difficulty.isBlank())  constraints.append("- Difficulty: ").append(difficulty).append("\n");
        if (maxTotalMinutes != null)                           constraints.append("- Total time (prep+cook) must be under ").append(maxTotalMinutes).append(" minutes\n");
        if (maxServings     != null)                           constraints.append("- Must serve ").append(maxServings).append(" people or fewer\n");

        return """
            You are a Michelin-starred culinary expert. Generate exactly %d distinct, \
            restaurant-quality recipes using the provided ingredients.

            Available ingredients: %s

            HARD CONSTRAINTS (all recipes MUST satisfy every listed constraint):
            %s
            If no constraints are listed, choose varied cuisines and styles.

            Respond with ONLY a JSON array (no markdown, no explanation) where each element matches:
            {
              "title":        "Full recipe name",
              "cuisine":      "Cuisine type",
              "difficulty":   "Beginner | Intermediate | Advanced",
              "prepTime":     "e.g. 15 min",
              "cookTime":     "e.g. 35 min",
              "servings":     4,
              "description":  "Two evocative sentences",
              "ingredients":  [ { "qty": "320g", "item": "Ingredient name" } ],
              "steps":        [ "Step 1", "Step 2" ],
              "tags":         ["Tag1", "Tag2"],
              "nutritionPerServing": { "calories": 480, "protein": "14g", "carbs": "62g", "fat": "18g" }
            }
            """.formatted(count, ingredients, constraints.isEmpty() ? "None" : constraints.toString());
    }

    private List<RecipeDTO> parseRecipeList(String raw, int expected) {
        try {
            String cleaned = raw
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                .trim();

            // Handle both array and single-object responses
            if (cleaned.startsWith("{")) {
                cleaned = "[" + cleaned + "]";
            }

            return objectMapper.readValue(cleaned, new TypeReference<List<RecipeDTO>>() {});

        } catch (JsonProcessingException e) {
            log.error("Failed to parse Gemini batch response: {}", raw, e);
            throw new RuntimeException("Recipe parsing failed — unexpected Gemini format.", e);
        }
    }

    // ── YOUTUBE SEARCH ────────────────────────────────────────────

    private YouTubeVideoDTO searchYouTubeTutorial(String searchQuery) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(YOUTUBE_SEARCH_URL)
                .queryParam("part",              "snippet")
                .queryParam("q",                 searchQuery)
                .queryParam("type",              "video")
                .queryParam("videoCategoryId",   "26")
                .queryParam("relevanceLanguage", "en")
                .queryParam("maxResults",        1)
                .queryParam("key",               youtubeApiKey)
                .build().toUriString();

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) return null;

            JsonNode root  = objectMapper.readTree(response.getBody());
            JsonNode items = root.path("items");
            if (items.isEmpty()) return null;

            JsonNode item    = items.get(0);
            JsonNode snippet = item.path("snippet");

            return YouTubeVideoDTO.builder()
                .videoId(    item.path("id").path("videoId").asText())
                .title(      snippet.path("title").asText())
                .channelName(snippet.path("channelTitle").asText())
                .thumbnail(  snippet.path("thumbnails").path("high").path("url").asText())
                .publishedAt(snippet.path("publishedAt").asText())
                .build();

        } catch (Exception e) {
            log.warn("YouTube search failed for '{}': {}", searchQuery, e.getMessage());
            return null;
        }
    }

    // ── Placeholder stubs (implement with JPA repos) ──────────────

    public RecipeDTO findByIdForUser(Long id, String uid) {
        throw new UnsupportedOperationException("Implement with RecipeRepository");
    }

    public List<RecipeDTO> findByUser(String uid, int page, int size) {
        throw new UnsupportedOperationException("Implement with RecipeRepository");
    }

    public void saveToLibrary(Long recipeId, String uid) {
        throw new UnsupportedOperationException("Implement with SavedRecipesRepository");
    }

    public List<RecipeDTO> findPublicShowcase() {
        throw new UnsupportedOperationException("Implement with RecipeRepository");
    }
}
