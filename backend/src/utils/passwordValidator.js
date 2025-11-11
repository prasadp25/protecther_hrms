/**
 * Password Strength Validator
 * Enforces strong password policy
 */

const validatePassword = (password) => {
  const errors = [];
  
  // Minimum length check
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Maximum length check (prevent DOS attacks)
  if (password && password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>_-+=)');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123', 
    'monkey', '1234567890', 'letmein', 'admin', 'welcome'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more secure password');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    message: errors.length > 0 ? errors.join('. ') : 'Password is strong'
  };
};

/**
 * Generate password strength score (0-5)
 */
const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (!password) return 0;
  
  // Length bonus
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) strength++;
  
  return strength; // 0-5 scale
};

module.exports = {
  validatePassword,
  getPasswordStrength
};
