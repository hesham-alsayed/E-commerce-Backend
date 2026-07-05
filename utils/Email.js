const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
const path = require("path");
const AppError = require("./AppError");

class Email {
  /**
   * user object {email, firstName}
   * urlOrCode string - tracking URL or any code (optional)
   * variables object - extra variables for email template
   */
  constructor(user, urlOrCode = null, variables = {}) {
    this.to = user.email;
    this.firstName = user.firstName || "User";
    this.urlOrCode = urlOrCode;
    this.from = `App <${process.env.EMAIL_FROM}>`;
    this.variables = variables; // extra variables for Pug template
  }

  newTransport() {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Render HTML using Pug
  render(template, subject) {
    try {
      return pug.renderFile(
        path.join(__dirname, `../utils/templates/${template}.pug`),
        {
          firstName: this.firstName,
          urlOrCode: this.urlOrCode,
          subject,
          ...this.variables, // merge extra variables (items, totalPrice, shippingAddress, etc.)
        },
      );
    } catch (err) {
      throw new AppError(`Error rendering email template: ${err.message}`, 500);
    }
  }

  // Send email
  async send(template, subject) {
    let html;
    try {
      html = this.render(template, subject);
    } catch (err) {
      throw err;
    }

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    try {
      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      throw new AppError(`Error sending email: ${err.message}`, 500);
    }
  }

  // Reusable methods
  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid 10 minutes)",
    );
  }

  async sendEmailVerification() {
    await this.send("emailVerification", "Your email verification code");
  }

  async sendOrderConfirmation() {
    await this.send("orderConfirmation", "Your Order Confirmation");
  }
}

module.exports = Email;
