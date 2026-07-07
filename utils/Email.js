const sgMail = require("@sendgrid/mail");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
const path = require("path");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class Email {
  constructor(user, urlOrCode = null, variables = {}) {
    this.to = user.email;
    this.firstName = user.firstName || "User";
    this.urlOrCode = urlOrCode;
    this.from = process.env.SENDGRID_FROM_EMAIL;
    this.variables = variables;
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
    const msg = {
      to: this.to,
      from: this.from,
      subject,
      html,
      text: htmlToText(html),
    };
    await sgMail.send(msg);
  }

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
