const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
const path = require("path");
const dns = require("dns");

let smtpHost = null;
async function resolveGmailIPv4() {
  if (!smtpHost) {
    const addrs = await dns.promises.resolve4("smtp.gmail.com");
    smtpHost = addrs[0];
  }
  return smtpHost;
}

class Email {
  constructor(user, urlOrCode = null, variables = {}) {
    this.to = user.email;
    this.firstName = user.firstName || "User";
    this.urlOrCode = urlOrCode;
    this.from = (process.env.EMAIL_FROM || "").trim();
    this.variables = variables;
  }

  async newTransport() {
    const host = await resolveGmailIPv4();
    return nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
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
    const transport = await this.newTransport();
    await transport.sendMail(mailOptions);
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
