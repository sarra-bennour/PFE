package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.user.*;

public interface UserService {
    UserDTO registerExportateur(ExportateurSignupRequest request);
    LoginResponse login(LoginRequest request);
    LoginResponse mobileLogin(MobileLoginRequest request);
    UserDTO getUserByEmail(String email);
    void enableTwoFactorAuth(String email);
    boolean verifyTwoFactorCode(String email, String code);
    void logout(String token);
    boolean verifyEmail(String token);
    void resendVerificationEmail(String email);
    void changePassword(String email, ChangePasswordRequest request);
    void initiatePasswordReset(String email);
    boolean validateResetToken(String token);
    void resetPassword(String token, String newPassword);
}