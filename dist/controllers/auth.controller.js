import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendCommonEmail } from "../services/email.js";
import User from "../models/User.js";
export const register = async (req, res) => {
    try {
        const { firstName, lastName, email, contactNumber, password, } = req.body;
        if (!firstName ||
            !lastName ||
            !email ||
            !contactNumber ||
            !password) {
            res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
            return;
        }
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: "Email is already registered.",
            });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            contactNumber,
            password: hashedPassword,
            role: "user",
        });
        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                contactNumber: user.contactNumber,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not configured.");
        }
        const token = jwt.sign({
            userId: user._id.toString(),
        }, secret, {
            expiresIn: "7d",
        });
        res.status(200).json({
            success: true,
            message: "Signed in successfully.",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                contactNumber: user.contactNumber,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required.",
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail,
        });
        if (!user) {
            res.status(200).json({
                success: true,
                message: "If an account exists with this email, a password reset link has been sent.",
            });
            return;
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) {
            throw new Error("FRONTEND_URL is not configured.");
        }
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        await sendCommonEmail([user.email], "Reset your Aramyaw BallClub password", `
        <div style="font-family: Arial, sans-serif;">
          <h2>Reset your password</h2>

          <p>Hi ${user.firstName},</p>

          <p>
            We received a request to reset the password for your
            Aramyaw BallClub account.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p style="margin: 24px 0;">
            <a
              href="${resetUrl}"
              style="
                background-color: #f15a24;
                color: #ffffff;
                padding: 12px 20px;
                text-decoration: none;
                border-radius: 6px;
                display: inline-block;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link will expire in 15 minutes.
          </p>

          <p>
            If you didn't request a password reset,
            you can safely ignore this email.
          </p>

          <p>Aramyaw BallClub</p>
        </div>
      `);
        res.status(200).json({
            success: true,
            message: "If an account exists with this email, a password reset link has been sent.",
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            res.status(400).json({
                success: false,
                message: "Token and new password are required.",
            });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
            return;
        }
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: {
                $gt: new Date(),
            },
        }).select("+password +resetPasswordToken +resetPasswordExpires");
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Reset link is invalid or has expired.",
            });
            return;
        }
        user.password = await bcrypt.hash(password, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now sign in with your new password.",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};
