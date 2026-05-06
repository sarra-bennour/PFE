package com.tunisia.commerce.dto.chatbot;

import lombok.Data;

@Data
public class ChatbotRequest {
    private String message;
    private String context; // "importer" or "exporter"
    private String userId;
    private String sessionId;
}
