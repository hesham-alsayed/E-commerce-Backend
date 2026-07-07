const https = require("https");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
const path = require("path");

class Email {
  constructor(user, urlOrCode = null, variables = {}) {
    this.to = user.email;
    this.firstName = user.firstName || "User";
    this.urlOrCode = urlOrCode;
    this.from = process.env.RESEND_FROM_EMAIL;
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
    const data = JSON.stringify({
      from: this.from,
      to: [this.to],
      subject,
      html,
      text: htmlToText(html),
    });

    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.resend.com",
          path: "/emails",
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
          timeout: 15000,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            if (res.statusCode === 200) resolve();
            else {
              let msg = body;
              try { msg = JSON.parse(body).message || body; } catch {}
              reject(new Error(msg));
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
      req.write(data);
      req.end();
    });
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
