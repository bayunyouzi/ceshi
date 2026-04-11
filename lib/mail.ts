import nodemailer from 'nodemailer';

// 检查是否配置了 SMTP 服务
const isSMTPConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = isSMTPConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const sendVerificationEmail = async (email: string, code: string) => {
  if (!transporter) {
    console.warn("⚠️ SMTP not configured. Printing code to console instead.");
    console.log(`[SIMULATED EMAIL] To: ${email}, Code: ${code}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Anime Creative Assistant" <${process.env.SMTP_USER}>`, // sender address
      to: email, // list of receivers
      subject: "您的注册验证码 - AI 创意助手", // Subject line
      text: `您的验证码是：${code}。该验证码 10 分钟内有效。`, // plain text body
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #6b21a8; text-align: center;">AI 创意助手</h2>
          <p style="font-size: 16px; color: #333;">您好！</p>
          <p style="font-size: 16px; color: #333;">您正在注册账号，请使用以下验证码完成验证：</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #6b21a8;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666;">该验证码将在 10 分钟后失效。如果是您本人操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send verification email");
  }
};
