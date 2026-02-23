package com.tunisia.commerce.dto.user;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String companyName;
    private String phone;
    private String address;
    private String country;
    private String city;
    private String tinNumber;
    private String website;
    private String legalRep;
}