const nodemailer = require('nodemailer');

// ==============================================
// EMAIL TRANSPORTER CONFIGURATION
// ==============================================
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// ==============================================
// GENERATE 6-DIGIT OTP
// ==============================================
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==============================================
// SEND OTP EMAIL
// ==============================================
const sendOTPEmail = async (email, otp, employeeName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || `ProtectHer HRMS <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Login OTP - ProtectHer HRMS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ProtectHer HRMS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Employee Portal</p>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>

          <p>You have requested to login to the Employee Portal. Use the OTP below to complete your login:</p>

          <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${otp}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            <strong>Note:</strong> This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>

          <p style="color: #666; font-size: 14px;">
            If you did not request this OTP, please ignore this email or contact HR.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

          <p style="color: #999; font-size: 12px; margin-bottom: 0;">
            This is an automated message from ProtectHer HRMS. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${employeeName},

Your OTP for Employee Portal login is: ${otp}

This OTP is valid for 10 minutes. Do not share this code with anyone.

If you did not request this OTP, please ignore this email.

- ProtectHer HRMS
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw new Error('Failed to send OTP email. Please try again later.');
  }
};

// ==============================================
// SEND GENERIC EMAIL
// ==============================================
const sendEmail = async (to, subject, htmlContent, textContent) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || `ProtectHer HRMS <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlContent,
    text: textContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw new Error('Failed to send email. Please try again later.');
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendEmail
};
