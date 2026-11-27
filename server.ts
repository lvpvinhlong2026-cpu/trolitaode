/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createAiRouter } from "./src/server/routes/aiRoutes";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // Middleware (giảm JSON limit xuống 50mb vì file lớn đã chuyển sang multipart/form-data)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global Error Handler cho Body Parser & Multer (tránh trả về HTML khi file quá lớn)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
    }
    if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: "Kích thước file quá lớn (vượt giới hạn). Vui lòng thử lại với file nhỏ hơn." });
    }
    next(err);
  });

  // Mount modular API routes
  app.use("/api", createAiRouter());

  // Khi được đóng gói bằng pkg, __dirname sẽ trỏ tới thư mục ảo chứa snapshot
  const isPkg = typeof process !== 'undefined' && 'pkg' in process;
  if (isPkg) {
    process.env.NODE_ENV = "production";
  }

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file assets...");
    const distPath = isPkg ? __dirname : path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);

    if (process.env.NODE_ENV === "production") {
      const url = `http://localhost:${PORT}`;
      console.log(`Tự động mở trình duyệt tại: ${url}`);
      const { platform } = process;
      let cmd = '';
      if (platform === 'win32') cmd = `start "" "${url}"`;
      else if (platform === 'darwin') cmd = `open "${url}"`;
      else cmd = `xdg-open "${url}"`;

      exec(cmd);
    }
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to start server:", err);
});
