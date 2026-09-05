import type { Request, Response } from "express";
import bcrypt from "bcrypt";

import User from "../models/User.ts";

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      password,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !contactNumber ||
      !password
    ) {
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
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};