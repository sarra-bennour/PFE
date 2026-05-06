package com.tunisia.commerce.controller;

import com.tunisia.commerce.dto.chatbot.ChatbotRequest;
import com.tunisia.commerce.dto.chatbot.ChatbotResponse;
import com.tunisia.commerce.service.impl.GeminiChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final GeminiChatbotService chatbotService;

    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> sendMessage(@RequestBody ChatbotRequest request) {
        ChatbotResponse response = chatbotService.sendMessage(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/suggestions/{context}")
    public ResponseEntity<java.util.List<String>> getSuggestions(@PathVariable String context) {
        java.util.List<String> suggestions;
        if ("exporter".equals(context)) {
            suggestions = java.util.Arrays.asList(
                    "Comment obtenir un agrément d'exportateur?",
                    "Quels documents pour exporter vers la Tunisie?",
                    "TVA sur les produits exportés",
                    "Accord de libre-échange Tunisie-UE",
                    "Certificat d'origine requis"
            );
        } else {
            suggestions = java.util.Arrays.asList(
                    "Calcul des droits de douane",
                    "Procédure d'importation étape par étape",
                    "Codes NGP pour produits alimentaires",
                    "Quels sont les produits interdits?",
                    "Délais de dédouanement"
            );
        }
        return ResponseEntity.ok(suggestions);
    }
}