package com.culinarylogic.api.controller;

import com.culinarylogic.api.dto.GenerateRequest;
import com.culinarylogic.api.dto.RecipeDTO;
import com.culinarylogic.api.filter.FirebaseAuthFilter.FirebasePrincipal;
import com.culinarylogic.api.service.CulinaryBridgeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
public class RecipeController {

    private static final Logger log = LoggerFactory.getLogger(RecipeController.class);
    private static final int MAX_PER_REQUEST = 6;

    private final CulinaryBridgeService bridgeService;

    public RecipeController(CulinaryBridgeService bridgeService) {
        this.bridgeService = bridgeService;
    }

    @PostMapping("/generate")
    public ResponseEntity<List<RecipeDTO>> generate(
            @Valid @RequestBody GenerateRequest req,
            @AuthenticationPrincipal FirebasePrincipal principal
    ) {
        String uid = principal != null ? principal.uid() : "anonymous";
        log.info("Recipe generation | user={} count={} filters={}",
                uid, req.getCount(), req.toFilterSummary());

        int count = Math.min(
                req.getCount() == null ? 1 : req.getCount(),
                MAX_PER_REQUEST
        );

        List<RecipeDTO> results = bridgeService.generateBatch(
                req.getIngredients(),
                req.toDietaryString(),
                req.getCuisine(),
                req.getDifficulty(),
                req.getMaxTotalMinutes(),
                req.getMaxServings(),
                count,
                uid
        );

        return ResponseEntity.ok(results);
    }

    @GetMapping("/public")
    public ResponseEntity<List<RecipeDTO>> publicShowcase() {
        return ResponseEntity.ok(List.of());
    }
}