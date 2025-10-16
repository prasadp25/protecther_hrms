package com.techview.hrms.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;

    @Column(name = "employee_code", unique = true, nullable = false)
    private String employeeCode; // Auto-generated (e.g., EMP0001)

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    @Column(name = "last_name", nullable = false)
    private String lastName;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must be 10 digits")
    @Column(name = "mobile_no", unique = true, nullable = false)
    private String mobileNo;

    @Email(message = "Email should be valid")
    @Column(name = "email", unique = true)
    private String email;

    @NotBlank(message = "Aadhaar number is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Aadhaar number must be 12 digits")
    @Column(name = "aadhaar_no", unique = true, nullable = false)
    private String aadhaarNo;

    @NotBlank(message = "PAN number is required")
    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "PAN number format is invalid")
    @Column(name = "pan_no", unique = true, nullable = false)
    private String panNo;

    @NotBlank(message = "Account number is required")
    @Column(name = "account_no", unique = true, nullable = false)
    private String accountNo;

    @NotBlank(message = "IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code format is invalid")
    @Column(name = "ifsc_code", nullable = false)
    private String ifscCode;

    @NotBlank(message = "Bank name is required")
    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Column(name = "uan_no", unique = true)
    private String uanNo;

    @Column(name = "pf_no")
    private String pfNo;

    @Column(name = "qualification")
    private String qualification;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    @Column(name = "dob", nullable = false)
    private LocalDate dob;

    @NotBlank(message = "Address is required")
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @NotNull(message = "Date of joining is required")
    @Column(name = "date_of_joining", nullable = false)
    private LocalDate dateOfJoining;

    @Column(name = "date_of_leaving")
    private LocalDate dateOfLeaving;

    // Document paths
    @Column(name = "aadhaar_document")
    private String aadhaarDocument;

    @Column(name = "pan_document")
    private String panDocument;

    @Column(name = "photo")
    private String photo;

    @Column(name = "other_documents")
    private String otherDocuments;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Helper method to get full name
    public String getFullName() {
        return firstName + " " + lastName;
    }
}
