import express, {} from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth.routes.js";
import seasonRoutes from "./routes/season.routes.js";
import adminRoutes from "./routes/admin.routes.js";
const app = express();
const port = process.env.PORT || 3021;
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use("/api/auth", authRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/admin", adminRoutes);
app.listen(port, () => {
    console.log(`Aramyaw API listening on port ${port}`);
});
