package com.tunisia.commerce.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("role", role);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        try {
            return extractAllClaims(token).getSubject();
        } catch (Exception e) {
            System.out.println("❌ Erreur extraction username: " + e.getMessage());
            return null;
        }
    }

    public String extractRole(String token) {
        try {
            return extractAllClaims(token).get("role", String.class);
        } catch (Exception e) {
            System.out.println("❌ Erreur extraction role: " + e.getMessage());
            return null;
        }
    }

    public Date extractExpiration(String token) {
        try {
            return extractAllClaims(token).getExpiration();
        } catch (Exception e) {
            System.out.println("❌ Erreur extraction expiration: " + e.getMessage());
            return null;
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // CORRECTION : Simplifier la validation
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);

            // Vérifier aussi l'expiration
            Date expiration = extractExpiration(token);
            if (expiration != null && expiration.before(new Date())) {
                System.out.println("❌ Token expiré");
                return false;
            }

            System.out.println("✅ Token valide");
            return true;
        } catch (ExpiredJwtException e) {
            System.out.println("❌ Token expiré: " + e.getMessage());
            return false;
        } catch (MalformedJwtException e) {
            System.out.println("❌ Token malformé: " + e.getMessage());
            return false;
        } catch (SignatureException e) {
            System.out.println("❌ Signature invalide: " + e.getMessage());
            return false;
        } catch (Exception e) {
            System.out.println("❌ Erreur validation token: " + e.getMessage());
            return false;
        }
    }

    // Garder pour compatibilité
    public boolean validateToken(String token, String email) {
        try {
            String extractedEmail = extractUsername(token);
            return extractedEmail != null &&
                    extractedEmail.equals(email) &&
                    validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    public Long getExpirationTime(String token) {
        try {
            Date expiration = extractExpiration(token);
            if (expiration != null) {
                return expiration.getTime();
            }
            return null;
        } catch (Exception e) {
            System.out.println("❌ Erreur récupération expiration: " + e.getMessage());
            return null;
        }
    }
}