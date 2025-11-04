import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import http from "node:http";
import createError from "http-errors";
import roomsRouter from "./routes/rooms";
import hooksRouter from "./routes/hooks";
import { setupSocket } from "./socket";

export function createServer() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/rooms", roomsRouter);
  app.use("/hooks/rtmp", hooksRouter);

  app.use((_req, _res, next) => {
    next(createError(404, "route introuvable"));
  });

  app.use(
    (
      err: createError.HttpError,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status = err.status ?? 500;
      const message = err.message ?? "erreur serveur";
      res.status(status).json({
        error: message,
        status
      });
    }
  );

  const server = http.createServer(app);
  const io = setupSocket(server);

  return {
    app,
    server,
    io
  };
}
