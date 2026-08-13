import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface TransferSession {
  sessionId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  status: 'waiting' | 'connected' | 'transferring' | 'completed' | 'expired' | 'cancelled';
  payload?: {
    app: string;
    version: string;
    exportedAt: string;
    data: {
      members?: any[];
      songs?: any[];
      schedules?: any[];
      labels?: string[];
      draft?: any;
    };
  };
}

const transferSessions = new Map<string, TransferSession>();

// Cleanup expired sessions every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of transferSessions.entries()) {
    if (now > session.expiresAt + 60000) {
      transferSessions.delete(id);
    }
  }
}, 2 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Create temporary transfer session
  app.post("/api/transfer/create", (req, res) => {
    try {
      const { payload, expiresInSeconds = 600 } = req.body;
      if (!payload || !payload.data) {
        return res.status(400).json({ success: false, error: "INVALID_PAYLOAD", message: "Invalid transfer payload" });
      }

      const sessionId = `tr_${crypto.randomUUID()}`;
      const token = crypto.randomBytes(16).toString("hex");
      const createdAt = Date.now();
      const expiresAt = createdAt + expiresInSeconds * 1000;

      const session: TransferSession = {
        sessionId,
        token,
        createdAt,
        expiresAt,
        status: "waiting",
        payload
      };

      transferSessions.set(sessionId, session);

      const protocol = req.protocol;
      const host = req.get("host");
      const qrData = `${protocol}://${host}?transferSessionId=${sessionId}&token=${token}`;

      res.json({
        success: true,
        sessionId,
        token,
        expiresAt,
        qrData
      });
    } catch (err: any) {
      console.error("Failed to create transfer session:", err);
      res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
    }
  });

  // Get session details & data (Phone connecting or PC polling)
  app.get("/api/transfer/session/:sessionId", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.query.token as string) || (req.headers["x-transfer-token"] as string);

      const session = transferSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Transfer session not found or has expired." });
      }

      if (session.token !== token) {
        return res.status(403).json({ success: false, error: "UNAUTHORIZED", message: "Invalid session token." });
      }

      const now = Date.now();
      if (now > session.expiresAt) {
        session.status = "expired";
        return res.status(410).json({ success: false, error: "EXPIRED", message: "This transfer session has expired." });
      }

      if (session.status === "completed") {
        return res.status(410).json({ success: false, error: "ALREADY_USED", message: "This transfer session has already been used." });
      }

      if (session.status === "cancelled") {
        return res.status(410).json({ success: false, error: "CANCELLED", message: "This transfer session was cancelled." });
      }

      // Mark as connected if was waiting
      if (session.status === "waiting") {
        session.status = "connected";
      }

      const data = session.payload?.data || {};

      res.json({
        success: true,
        sessionId: session.sessionId,
        status: session.status,
        expiresAt: session.expiresAt,
        counts: {
          members: Array.isArray(data.members) ? data.members.length : 0,
          songs: Array.isArray(data.songs) ? data.songs.length : 0,
          schedules: Array.isArray(data.schedules) ? data.schedules.length : 0,
          hasDraft: Boolean(data.draft)
        },
        payload: session.payload
      });
    } catch (err: any) {
      console.error("Error retrieving transfer session:", err);
      res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
    }
  });

  // Get status only (lightweight polling endpoint for PC)
  app.get("/api/transfer/session/:sessionId/status", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.query.token as string) || (req.headers["x-transfer-token"] as string);

      const session = transferSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", status: "expired" });
      }

      if (session.token !== token) {
        return res.status(403).json({ success: false, error: "UNAUTHORIZED" });
      }

      if (Date.now() > session.expiresAt) {
        session.status = "expired";
      }

      res.json({
        success: true,
        sessionId: session.sessionId,
        status: session.status,
        expiresAt: session.expiresAt
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "SERVER_ERROR" });
    }
  });

  // Complete session (Phone confirms import)
  app.post("/api/transfer/session/:sessionId/complete", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.body.token as string) || (req.query.token as string);

      const session = transferSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: "NOT_FOUND" });
      }

      if (session.token !== token) {
        return res.status(403).json({ success: false, error: "UNAUTHORIZED" });
      }

      session.status = "completed";
      delete session.payload;

      res.json({ success: true, message: "Transfer session completed successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "SERVER_ERROR" });
    }
  });

  // Cancel session
  app.post("/api/transfer/session/:sessionId/cancel", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.body.token as string) || (req.query.token as string);

      const session = transferSessions.get(sessionId);
      if (session && session.token === token) {
        session.status = "cancelled";
        delete session.payload;
      }

      res.json({ success: true, message: "Transfer session cancelled." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "SERVER_ERROR" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
