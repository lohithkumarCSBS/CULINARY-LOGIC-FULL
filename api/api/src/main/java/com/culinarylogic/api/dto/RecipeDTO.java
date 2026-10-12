package com.culinarylogic.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RecipeDTO {

    private Object id;
    private String title;
    private String cuisine;
    private String difficulty;
    private String description;
    private String prepTime;
    private String cookTime;
    private String requestedBy;
    private int servings;
    private List<Map<String, String>> ingredients;
    private List<String> steps;
    private List<String> tags;

    @JsonProperty("nutritionPerServing")
    private Map<String, Object> nutritionPerServing;

    private YouTubeVideoDTO youtubeVideo;

    // ── Getters ──
    public Object getId()                              { return id; }
    public String getTitle()                           { return title; }
    public String getCuisine()                         { return cuisine; }
    public String getDifficulty()                      { return difficulty; }
    public String getDescription()                     { return description; }
    public String getPrepTime()                        { return prepTime; }
    public String getCookTime()                        { return cookTime; }
    public String getRequestedBy()                     { return requestedBy; }
    public int getServings()                           { return servings; }
    public List<Map<String, String>> getIngredients()  { return ingredients; }
    public List<String> getSteps()                     { return steps; }
    public List<String> getTags()                      { return tags; }
    public Map<String, Object> getNutritionPerServing(){ return nutritionPerServing; }
    public YouTubeVideoDTO getYoutubeVideo()           { return youtubeVideo; }

    // ── Setters ──
    public void setId(Object id)                                      { this.id = id; }
    public void setTitle(String title)                                { this.title = title; }
    public void setCuisine(String cuisine)                            { this.cuisine = cuisine; }
    public void setDifficulty(String difficulty)                      { this.difficulty = difficulty; }
    public void setDescription(String description)                    { this.description = description; }
    public void setPrepTime(String prepTime)                          { this.prepTime = prepTime; }
    public void setCookTime(String cookTime)                          { this.cookTime = cookTime; }
    public void setRequestedBy(String requestedBy)                    { this.requestedBy = requestedBy; }
    public void setServings(int servings)                             { this.servings = servings; }
    public void setIngredients(List<Map<String, String>> ingredients) { this.ingredients = ingredients; }
    public void setSteps(List<String> steps)                          { this.steps = steps; }
    public void setTags(List<String> tags)                            { this.tags = tags; }
    public void setNutritionPerServing(Map<String, Object> n)         { this.nutritionPerServing = n; }
    public void setYoutubeVideo(YouTubeVideoDTO youtubeVideo)         { this.youtubeVideo = youtubeVideo; }
}