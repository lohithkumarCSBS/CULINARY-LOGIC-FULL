package com.culinarylogic.api.dto;

public class YouTubeVideoDTO {

    private String videoId;
    private String title;
    private String channelName;
    private String thumbnail;
    private String publishedAt;

    // ── Builder pattern (manual) ──
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final YouTubeVideoDTO obj = new YouTubeVideoDTO();
        public Builder videoId(String v)     { obj.videoId = v;     return this; }
        public Builder title(String v)       { obj.title = v;       return this; }
        public Builder channelName(String v) { obj.channelName = v; return this; }
        public Builder thumbnail(String v)   { obj.thumbnail = v;   return this; }
        public Builder publishedAt(String v) { obj.publishedAt = v; return this; }
        public YouTubeVideoDTO build()       { return obj; }
    }

    // ── Getters ──
    public String getVideoId()     { return videoId; }
    public String getTitle()       { return title; }
    public String getChannelName() { return channelName; }
    public String getThumbnail()   { return thumbnail; }
    public String getPublishedAt() { return publishedAt; }

    // ── Setters ──
    public void setVideoId(String videoId)         { this.videoId = videoId; }
    public void setTitle(String title)             { this.title = title; }
    public void setChannelName(String channelName) { this.channelName = channelName; }
    public void setThumbnail(String thumbnail)     { this.thumbnail = thumbnail; }
    public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
}