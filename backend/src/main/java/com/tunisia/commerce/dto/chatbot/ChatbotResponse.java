package com.tunisia.commerce.dto.chatbot;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ChatbotResponse {
    private String reply;
    private List<String> suggestions;
    private List<Reference> references;

    @Data
    @Builder
    public static class Reference {
        private String title;
        private String url;
        private String type; // "regulation", "procedure", "contact"
    }
}
