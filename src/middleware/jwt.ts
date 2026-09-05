import type { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import User from "../models/User.ts";

interface JwtPayload {
  email: string;
}

type MiddlewareRequest = Request & {
  token: string
};

export const extractToken = (req: MiddlewareRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    req.token = token;
  }
  next();
};


export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if(token == null) return res.sendStatus(401);
  const resp = await verifyJWT(token);

  if (!resp.success) {
    res.status(403).send({error: "Session Expired"})
    return;
  } else {
    req.user = resp.user;
    next()
  }
}

const verifyJWT = async (
  token: string
): Promise<{ success: boolean; user?: any }> => {
  return new Promise((resolve) => {
    const secret = process.env.JWT_SECRET!;

    jwt.verify(token, secret, async (err, decoded) => {
      try {
        if (err || !decoded || typeof decoded === "string") {
          resolve({
            success: false,
          });
          return;
        }

        const payload = decoded as JwtPayload;

        const user = await User.findOne({
          email: payload.email,
        });

        if (!user) {
          resolve({
            success: false,
          });
          return;
        }

        resolve({
          success: true,
          user: {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            contactNumber: user.contactNumber,
          },
        });
      } catch (error) {
        resolve({
          success: false,
        });
      }
    });
  });
};

