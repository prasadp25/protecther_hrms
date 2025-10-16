package com.techview.hrms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload.dir:uploads/documents}")
    private String uploadDir;

    /**
     * Store file and return the file path
     */
    public String storeFile(MultipartFile file, String category) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir, category);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = "";
        if (originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;

        // Copy file to upload location
        Path targetLocation = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Return relative path
        return category + "/" + uniqueFilename;
    }

    /**
     * Delete file
     */
    public boolean deleteFile(String filePath) {
        try {
            Path fileToDelete = Paths.get(uploadDir, filePath);
            return Files.deleteIfExists(fileToDelete);
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Get file path
     */
    public Path getFilePath(String filename) {
        return Paths.get(uploadDir).resolve(filename).normalize();
    }
}
