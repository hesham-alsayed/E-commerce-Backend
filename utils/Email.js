const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
const path = require("path");

class Email {
  constructor(user, urlOrCode = null, variables = {}) {
    this.to = user.email;
    this.firstName = user.firstName || "User";
    this.urlOrCode = urlOrCode;
    this.from = `"E-Commerce Store" <${process.env.BREVO_FROM_EMAIL}>`;
    this.variables = variables;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
      connectionTimeout: 15000,
    });
  }

  render(template, subject) {
    return pug.renderFile(
      path.join(__dirname, `../utils/templates/${template}.pug`),
      {
        firstName: this.firstName,
        urlOrCode: this.urlOrCode,
        subject,
        ...this.variables,
      },
    );
  }

  async send(template, subject) {
    const html = this.render(template, subject);
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendPasswordReset() {
    await this.send("passwordReset", "Your password reset token (valid 10 minutes)");
  }

  async sendEmailVerification() {
    await this.send("emailVerification", "Your email verification code");
  }

  async sendOrderConfirmation() {
    await this.send("orderConfirmation", "Your Order Confirmation");
  }
}

module.exports = Email;
