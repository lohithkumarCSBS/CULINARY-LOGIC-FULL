package com.culinarylogic.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GenerateRequest {

    @NotBlank(message = "ingredients must not be blank")
    @Size(max = 500, message = "ingredients string too long")
    private String ingredients;

    private Integer count = 1;
    private String cuisine;
    private String dietary;
    private String difficulty;
    private Integer maxTotalMinutes;
    private Integer maxServings;

    // ── Getters ──
    public String getIngredients()     { return ingredients; }
    public Integer getCount()          { return count; }
    public String getCuisine()         { return cuisine; }
    public String getDietary()         { return dietary; }
    public String getDifficulty()      { return difficulty; }
    public Integer getMaxTotalMinutes(){ return maxTotalMinutes; }
    public Integer getMaxServings()    { return maxServings; }

    // ── Setters ──
    public void setIngredients(String ingredients)          { this.ingredients = ingredients; }
    public void setCount(Integer count)                     { this.count = count; }
    public void setCuisine(String cuisine)                  { this.cuisine = cuisine; }
    public void setDietary(String dietary)                  { this.dietary = dietary; }
    public void setDifficulty(String difficulty)            { this.difficulty = difficulty; }
    public void setMaxTotalMinutes(Integer maxTotalMinutes) { this.maxTotalMinutes = maxTotalMinutes; }
    public void setMaxServings(Integer maxServings)         { this.maxServings = maxServings; }

    // ── Helpers ──
    public String toDietaryString() {
        return dietary != null && !dietary.isBlank() ? dietary : "None";
    }

    public String toFilterSummary() {
        return String.format("cuisine=%s dietary=%s difficulty=%s maxTime=%s servings=%s",
                cuisine, dietary, difficulty, maxTotalMinutes, maxServings);
    }
}