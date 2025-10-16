package com.techview.hrms.controller;

import com.techview.hrms.service.EmployeeService;
import com.techview.hrms.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;
    private final EmployeeService employeeService;

    /**
     * Upload employee document
     * POST /api/files/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category) {

        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }

            // Validate file size (max 10MB)
            if (file.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("message", "File size exceeds 10MB limit");
                return ResponseEntity.badRequest().body(response);
            }

            // Store file
            String filePath = fileStorageService.storeFile(file, category);

            response.put("success", true);
            response.put("message", "File uploaded successfully");
            response.put("filePath", filePath);
            response.put("fileName", file.getOriginalFilename());
            response.put("fileSize", file.getSize());

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "Failed to upload file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Upload employee documents with employee ID
     * POST /api/files/employee/{employeeId}/upload
     */
    @PostMapping("/employee/{employeeId}/upload")
    public ResponseEntity<Map<String, Object>> uploadEmployeeDocument(
            @PathVariable Long employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType) {

        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }

            // Store file
            String filePath = fileStorageService.storeFile(file, "employee-" + employeeId);

            // Update employee document path based on type
            switch (documentType.toLowerCase()) {
                case "aadhaar":
                    employeeService.updateEmployeeDocuments(employeeId, filePath, null, null, null);
                    break;
                case "pan":
                    employeeService.updateEmployeeDocuments(employeeId, null, filePath, null, null);
                    break;
                case "photo":
                    employeeService.updateEmployeeDocuments(employeeId, null, null, filePath, null);
                    break;
                case "other":
                    employeeService.updateEmployeeDocuments(employeeId, null, null, null, filePath);
                    break;
                default:
                    response.put("success", false);
                    response.put("message", "Invalid document type");
                    return ResponseEntity.badRequest().body(response);
            }

            response.put("success", true);
            response.put("message", "Document uploaded successfully");
            response.put("filePath", filePath);
            response.put("documentType", documentType);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Download/View file
     * GET /api/files/download/{filename}
     */
    @GetMapping("/download/**")
    public ResponseEntity<Resource> downloadFile(@RequestParam String filePath) {
        try {
            Path path = fileStorageService.getFilePath(filePath);
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(path);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete file
     * DELETE /api/files/delete
     */
    @DeleteMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteFile(@RequestParam String filePath) {
        Map<String, Object> response = new HashMap<>();

        boolean deleted = fileStorageService.deleteFile(filePath);

        if (deleted) {
            response.put("success", true);
            response.put("message", "File deleted successfully");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Failed to delete file");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
