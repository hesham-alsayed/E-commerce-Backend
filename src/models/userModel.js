const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      // User's first name
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      // User's last name / surname
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      // User's email for login
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
      // User's password (hashed)
    },
    passwordConfirm: {
      type: String,
      required: function () {
        return this.isNew;
      },
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same",
      },
    },
    phone: {
      type: String,
      // User's phone number
    },

    avatar: {
      type: String,
      default: "default-user.jpg",
      // User profile picture URL
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      lowercase: true,

      // User role (normal user or admin)
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      // Is the user's email verified?
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        // List of products user added to favorites
      },
    ],

    addresses: [
      {
        country: {
          type: String,
          // Shipping country
        },
        governorate: {
          type: String,
        },
        city: {
          type: String,
          // Shipping city
        },
        street: {
          type: String,
          // Street / detailed address
        },
        postalCode: {
          type: String,
          // Postal / ZIP code
        },
        isDefault: {
          type: Boolean,
          default: false,
          // Is this the default shipping address?
        },
      },
    ],

    lastLogin: {
      type: Date,
      // Last login time
    },

    lastLoginIP: {
      type: String,
    },
    passwordChangedAt: {
      type: Date,
      // When user last changed their password
    },

    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationCode: String,
    emailVerificationExpires: Date,
  },
  {
    timestamps: true,
    // Automatically adds createdAt and updatedAt
  },
);

userSchema.pre("save", async function () {
  // hash password
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // remove passwordConfirm
  this.passwordConfirm = undefined;
});
module.exports = mongoose.model("User", userSchema);
