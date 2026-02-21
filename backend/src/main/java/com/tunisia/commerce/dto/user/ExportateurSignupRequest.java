package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class ExportateurSignupRequest {
    private String companyName;
    private String country;
    private String city;
    private String address;
    private String website;
    private String phone;
    private String legalRep;
    private String tinNumber;
    private String email;
    private String password;
    private String numeroTVA;
}