package com.tunisia.commerce.service.impl;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.tunisia.commerce.dto.chatbot.ChatbotRequest;
import com.tunisia.commerce.dto.chatbot.ChatbotResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class GeminiChatbotService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String modelName;

    @Value("${gemini.max.tokens:4096}")
    private int maxOutputTokens;
    private Client geminiClient;

    // ==================== CACHE ====================
    private final Map<String, CachedResponse> cache = new ConcurrentHashMap<>();

    // ==================== RATE LIMITING ====================
    private final Map<String, UserRateLimit> rateLimits = new ConcurrentHashMap<>();

    // Configuration
    private static final int MAX_CACHE_SIZE = 1000;
    private static final long CACHE_TTL_MINUTES = 60; // 1 heure
    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final int MAX_REQUESTS_PER_DAY = 100;
    private static final long CLEANUP_INTERVAL_MINUTES = 10;

    private static final String SYSTEM_PROMPT = """
    Tu es un assistant IA expert en réglementation d'importation et d'exportation en Tunisie.
    Tu dois répondre uniquement aux questions liées au commerce international tunisien.
    
    RÈGLES IMPORTANTES:
    1. Tu es spécialisé dans: 
       - Procédures douanières tunisiennes
       - Codes NGP (Nomenclature Générale des Produits)
       - Taxes et droits de douane (TVA, DDU, DHS)
       - Accords de libre-échange (ALE) de la Tunisie
       - Certificats d'origine
       - Procédures d'agrément
       - Documents requis
    
    2. Sois CONCIS et PRÉCIS. Va à l'essentiel.
    3. Structure ta réponse avec des puces ou des courts paragraphes.
    4. Si la question est large, donne d'abord les points clés, puis propose de développer.
    5. Limite ta réponse à 3-4 paragraphes maximum.
    
    CONTEXTE BASE DE CONNAISSANCES TUNISIE:
    - Taux de TVA: 19% (normal), 13% (réduit), 7% (essentiels)
    - Droits de douane: 0% à 60% selon code NGP
    - Direction Générale des Douanes Tunisiennes
    """;

    // Classe pour les réponses mises en cache
    private static class CachedResponse {
        private final String reply;
        private final List<String> suggestions;
        private final List<ChatbotResponse.Reference> references;
        private final Instant cachedAt;

        public CachedResponse(String reply, List<String> suggestions, List<ChatbotResponse.Reference> references) {
            this.reply = reply;
            this.suggestions = suggestions;
            this.references = references;
            this.cachedAt = Instant.now();
        }

        public boolean isExpired() {
            return Duration.between(cachedAt, Instant.now()).toMinutes() > CACHE_TTL_MINUTES;
        }

        public ChatbotResponse toResponse() {
            return ChatbotResponse.builder()
                    .reply(reply)
                    .suggestions(suggestions)
                    .references(references)
                    .build();
        }
    }

    // Classe pour le rate limiting
    private static class UserRateLimit {
        private final Queue<Instant> requestTimestamps = new LinkedList<>();
        private final AtomicInteger dailyCount = new AtomicInteger(0);
        private Instant lastRequestDate = Instant.now();

        public boolean canMakeRequest() {
            // Nettoyer les anciennes timestamps
            Instant oneMinuteAgo = Instant.now().minus(Duration.ofMinutes(1));
            while (!requestTimestamps.isEmpty() && requestTimestamps.peek().isBefore(oneMinuteAgo)) {
                requestTimestamps.poll();
            }

            // Vérifier la limite par minute
            if (requestTimestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                return false;
            }

            // Vérifier la limite par jour
            Instant now = Instant.now();
            if (Duration.between(lastRequestDate, now).toDays() >= 1) {
                // Nouveau jour, réinitialiser
                dailyCount.set(0);
                lastRequestDate = now;
            }

            if (dailyCount.get() >= MAX_REQUESTS_PER_DAY) {
                return false;
            }

            // Enregistrer la requête
            requestTimestamps.offer(now);
            dailyCount.incrementAndGet();
            return true;
        }

        public long getWaitTimeSeconds() {
            if (requestTimestamps.isEmpty()) return 0;
            Instant oldest = requestTimestamps.peek();
            Instant resetTime = oldest.plus(Duration.ofMinutes(1));
            return Math.max(0, Duration.between(Instant.now(), resetTime).getSeconds());
        }
    }

    @PostConstruct
    public void init() {
        try {
            this.geminiClient = Client.builder()
                    .apiKey(apiKey)
                    .build();
            log.info("✅ Gemini Flash model initialized successfully with model: {}", modelName);

            // Démarrer le nettoyage périodique du cache
            startCacheCleanup();

        } catch (Exception e) {
            log.error("❌ Failed to initialize Gemini client: {}", e.getMessage());
        }
    }

    private void startCacheCleanup() {
        Timer timer = new Timer(true);
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                cleanupCache();
                cleanupRateLimits();
            }
        }, CLEANUP_INTERVAL_MINUTES * 60 * 1000, CLEANUP_INTERVAL_MINUTES * 60 * 1000);
    }

    private void cleanupCache() {
        int beforeSize = cache.size();
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
        int afterSize = cache.size();
        if (beforeSize != afterSize) {
            log.debug("🧹 Cache cleaned: {} -> {} entries", beforeSize, afterSize);
        }
    }

    private void cleanupRateLimits() {
        // Nettoyer les rate limits inactifs depuis plus de 24h
        rateLimits.entrySet().removeIf(entry ->
                Duration.between(entry.getValue().lastRequestDate, Instant.now()).toHours() > 24);
    }

    public ChatbotResponse sendMessage(ChatbotRequest request) {
        String userId = request.getUserId() != null ? request.getUserId().toString() : "anonymous";
        String cacheKey = generateCacheKey(request);

        // 1. Vérifier le cache
        CachedResponse cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.info("💾 Cache hit for user {}: {}", userId, request.getMessage());
            return cached.toResponse();
        } else if (cached != null) {
            cache.remove(cacheKey);
        }

        // 2. Vérifier le rate limiting
        UserRateLimit rateLimit = rateLimits.computeIfAbsent(userId, k -> new UserRateLimit());
        if (!rateLimit.canMakeRequest()) {
            long waitTime = rateLimit.getWaitTimeSeconds();
            log.warn("⏰ Rate limit exceeded for user {}. Wait {} seconds", userId, waitTime);
            return getRateLimitResponse(waitTime);
        }

        // 3. Appeler l'API Gemini
        try {
            log.info("🤖 Calling Gemini API for user {}: {}", userId, request.getMessage());

            String fullPrompt = buildPrompt(request.getMessage(), request.getContext());
            Content content = Content.builder()
                    .role("user")
                    .parts(List.of(Part.builder().text(fullPrompt).build()))
                    .build();

            GenerateContentConfig config = GenerateContentConfig.builder()
                    .temperature(Float.valueOf(0.7f))
                    .maxOutputTokens(maxOutputTokens)
                    .build();

            GenerateContentResponse response = geminiClient.models.generateContent(
                    modelName,
                    List.of(content),
                    config
            );

            String aiReply = extractTextFromResponse(response);
            List<String> suggestions = generateSuggestions(request.getMessage(), request.getContext());
            List<ChatbotResponse.Reference> references = generateReferences(aiReply);

            // Mettre en cache
            if (cache.size() >= MAX_CACHE_SIZE) {
                // Supprimer les entrées les plus anciennes
                cache.entrySet().stream()
                        .min(Comparator.comparing(entry -> entry.getValue().cachedAt))
                        .ifPresent(entry -> cache.remove(entry.getKey()));
            }

            CachedResponse cachedResponse = new CachedResponse(aiReply, suggestions, references);
            cache.put(cacheKey, cachedResponse);

            log.info("✅ Gemini response generated and cached for user {}", userId);

            return ChatbotResponse.builder()
                    .reply(aiReply)
                    .suggestions(suggestions)
                    .references(references)
                    .build();

        } catch (Exception e) {
            log.error("Error calling Gemini API: {}", e.getMessage(), e);

            // En cas d'erreur, essayer de retourner une réponse en cache même expirée
            if (cached != null) {
                log.info("⚠️ Using expired cache as fallback for user {}", userId);
                return cached.toResponse();
            }

            return getErrorResponse(e);
        }
    }

    private String generateCacheKey(ChatbotRequest request) {
        // Normaliser la question pour améliorer le cache hit
        String normalizedMessage = request.getMessage()
                .toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", " ");

        return request.getContext() + ":" + normalizedMessage;
    }

    private ChatbotResponse getRateLimitResponse(long waitTimeSeconds) {
        return ChatbotResponse.builder()
                .reply(String.format("""
                    ⏰ **Limite de requêtes atteinte**
                    
                    Vous avez effectué trop de demandes récemment. Notre système limite à %d requêtes par minute et %d par jour pour garantir la qualité de service.
                    
                    ⏳ Veuillez patienter **%d secondes** avant de poser votre prochaine question.
                    
                    💡 **Astuce :** Pour des réponses plus rapides, posez des questions précises et évitez les répétitions.
                    
                    En attendant, consultez notre FAQ ou utilisez les suggestions ci-dessous.
                    """, MAX_REQUESTS_PER_MINUTE, MAX_REQUESTS_PER_DAY, waitTimeSeconds))
                .suggestions(Arrays.asList("Calcul taxes", "Documents requis", "Codes NGP", "Procédure import"))
                .build();
    }

    private ChatbotResponse getErrorResponse(Exception e) {
        String errorMessage;
        if (e.getMessage().contains("429")) {
            errorMessage = """
                📊 **Quota API dépassé**
                
                L'assistant IA a atteint sa limite d'utilisation pour le moment.
                
                Notre équipe technique a été notifiée et travaille sur l'augmentation du quota.
                
                💡 **Solutions alternatives:**
                1. Consultez notre base de connaissances
                2. Utilisez le calculateur de taxes intégré
                3. Contactez notre support client
                
                ⏳ Veuillez réessayer dans quelques heures.
                """;
        } else {
            errorMessage = """
                🤖 **Service temporairement indisponible**
                
                L'assistant IA rencontre actuellement des difficultés techniques.
                
                ⚡ **Actions recommandées:**
                1. Rafraîchissez la page
                2. Réessayez dans quelques minutes
                3. Contactez le support si le problème persiste
                
                Désolé pour la gêne occasionnée.
                """;
        }

        return ChatbotResponse.builder()
                .reply(errorMessage)
                .suggestions(Arrays.asList("Statut agrément", "Calcul taxes", "Documents requis", "Contacter support"))
                .build();
    }

    private String extractTextFromResponse(GenerateContentResponse response) {
        if (response == null) {
            return "Désolé, je n'ai pas pu générer de réponse.";
        }

        Optional<GenerateContentResponse> optResponse = Optional.ofNullable(response);
        if (optResponse.isEmpty()) {
            return "Désolé, la réponse est vide.";
        }

        Optional<List<com.google.genai.types.Candidate>> optCandidates = response.candidates();
        if (optCandidates.isEmpty() || optCandidates.get().isEmpty()) {
            return "Désolé, aucun candidat trouvé dans la réponse.";
        }

        List<com.google.genai.types.Candidate> candidates = optCandidates.get();
        if (candidates.isEmpty()) {
            return "Désolé, la liste des candidats est vide.";
        }

        com.google.genai.types.Candidate candidate = candidates.get(0);
        if (candidate.content() == null) {
            return "Désolé, le contenu du candidat est vide.";
        }

        Optional<Content> optContent = candidate.content();
        if (optContent.isEmpty()) {
            return "Désolé, le contenu est vide.";
        }

        Content content = optContent.get();
        if (content.parts() == null) {
            return "Désolé, les parties du contenu sont vides.";
        }

        Optional<List<Part>> optParts = content.parts();
        if (optParts.isEmpty()) {
            return "Désolé, les parties sont vides.";
        }

        List<Part> parts = optParts.get();
        StringBuilder textBuilder = new StringBuilder();
        for (Part part : parts) {
            Optional<String> optText = part.text();
            if (optText.isPresent() && optText.get() != null) {
                textBuilder.append(optText.get());
            }
        }

        String result = textBuilder.toString().trim();
        return result.isEmpty() ? "Désolé, aucun texte trouvé dans la réponse." : result;
    }

    private String buildPrompt(String userMessage, String context) {
        String roleContext = "exporter".equals(context)
                ? "L'utilisateur est un EXPORTATEUR ÉTRANGER cherchant à exporter vers la Tunisie."
                : "L'utilisateur est un IMPORTATEUR TUNISIEN cherchant à importer des marchandises.";

        return SYSTEM_PROMPT + "\n\n" + roleContext + "\n\nQuestion: " + userMessage;
    }

    private List<String> generateSuggestions(String message, String context) {
        List<String> suggestions = new ArrayList<>();
        String lowerMsg = message.toLowerCase();

        if (lowerMsg.contains("taxe") || lowerMsg.contains("droit") || lowerMsg.contains("tva")) {
            suggestions.addAll(Arrays.asList("Calcul des droits de douane", "TVA applicable par produit", "Exonérations fiscales"));
        } else if (lowerMsg.contains("document") || lowerMsg.contains("papier")) {
            suggestions.addAll(Arrays.asList("Documents d'importation requis", "Certificat d'origine", "Facture proforma"));
        } else if (lowerMsg.contains("code") || lowerMsg.contains("ngp")) {
            suggestions.addAll(Arrays.asList("Recherche code NGP", "Classification tarifaire"));
        } else if (lowerMsg.contains("accord") || lowerMsg.contains("libre-échange")) {
            suggestions.addAll(Arrays.asList("Accords ALE Tunisie", "Certificat d'origine préférentiel"));
        } else if ("exporter".equals(context)) {
            suggestions = Arrays.asList("Conditions d'exportation", "Agrément exportateur", "Documents douane tunisienne");
        } else {
            suggestions = Arrays.asList("Calculateur taxes", "Procédure import", "Codes NGP");
        }

        return suggestions;
    }

    private List<ChatbotResponse.Reference> generateReferences(String reply) {
        List<ChatbotResponse.Reference> references = new ArrayList<>();

        if (reply != null && reply.toLowerCase().contains("douane")) {
            references.add(ChatbotResponse.Reference.builder()
                    .title("Direction Générale des Douanes Tunisiennes")
                    .url("https://www.douane.gov.tn")
                    .type("regulation")
                    .build());
        }

        if (reply != null && (reply.toLowerCase().contains("ngp") || reply.toLowerCase().contains("code"))) {
            references.add(ChatbotResponse.Reference.builder()
                    .title("Base des codes NGP")
                    .url("/ngp-codes/search")
                    .type("internal")
                    .build());
        }

        if (reply != null && reply.toLowerCase().contains("tva")) {
            references.add(ChatbotResponse.Reference.builder()
                    .title("Code des Taxes Tunisien")
                    .url("https://www.finances.gov.tn")
                    .type("regulation")
                    .build());
        }

        return references;
    }
}