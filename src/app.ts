import express, { Express } from "express";
import { config } from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
config();
const app: Express = express();
//middlewares
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.static("public"));
app.use(cookieParser(process.env.COOKIE_SECRET as string));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
// remove this middleware in production
app.use(morgan("dev"));

//routes
import router from "./routes/index.routes";
app.use("/api/v1", router);

export default app;
