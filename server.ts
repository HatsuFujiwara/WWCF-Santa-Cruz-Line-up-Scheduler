import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface TransferSession {
  sessionId: string;
  token: string;
  direction: 'pc_to_phone' | 'phone_to_pc';
  createdAt: number;
  expiresAt: number;
  status: 'waiting' | 'connected' | 'data_ready' | 'transferring' | 'completed' | 'expired' | 'cancelled';
  payload?: {
    app: string;
    version: string;
    exportedAt: string;
    direction?: string;
    data: {
      members?: any[];
      songs?: any[];
      schedules?: any[];
      labels?: string[];
      songFamilies?: any[];
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

  // Create temporary transfer session (Supports PC -> Phone and Phone -> PC)
  app.post("/api/transfer/create", (req, res) => {
    try {
      const { payload, direction = 'pc_to_phone', expiresInSeconds = 600 } = req.body;
      
      // If PC -> Phone, payload is required upfront.
      // If Phone -> PC, payload will be uploaded by the phone later.
      if (direction === 'pc_to_phone' && (!payload || !payload.data)) {
        return res.status(400).json({ success: false, error: "INVALID_PAYLOAD", message: "Invalid transfer payload" });
      }

      const sessionId = `tr_${crypto.randomUUID()}`;
      const token = crypto.randomBytes(16).toString("hex");
      const createdAt = Date.now();
      const expiresAt = createdAt + expiresInSeconds * 1000;

      const session: TransferSession = {
        sessionId,
        token,
        direction: direction === 'phone_to_pc' ? 'phone_to_pc' : 'pc_to_phone',
        createdAt,
        expiresAt,
        status: "waiting",
        payload: direction === 'pc_to_phone' ? payload : undefined
      };

      transferSessions.set(sessionId, session);

      const protocol = req.protocol;
      const host = req.get("host");
      const qrData = `${protocol}://${host}?transferSessionId=${sessionId}&token=${token}`;

      res.json({
        success: true,
        sessionId,
        token,
        direction: session.direction,
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
        direction: session.direction,
        status: session.status,
        expiresAt: session.expiresAt,
        counts: {
          members: Array.isArray(data.members) ? data.members.length : 0,
          songs: Array.isArray(data.songs) ? data.songs.length : 0,
          schedules: Array.isArray(data.schedules) ? data.schedules.length : 0,
          songFamilies: Array.isArray(data.songFamilies) ? data.songFamilies.length : 0,
          hasDraft: Boolean(data.draft)
        },
        payload: session.payload
      });
    } catch (err: any) {
      console.error("Error retrieving transfer session:", err);
      res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
    }
  });

  // Upload endpoint for Phone -> PC transfer
  app.post("/api/transfer/session/:sessionId/upload", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.body.token as string) || (req.query.token as string) || (req.headers["x-transfer-token"] as string);
      const { payload } = req.body;

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

      if (session.direction !== "phone_to_pc") {
        return res.status(400).json({ success: false, error: "INVALID_DIRECTION", message: "This session is not configured to receive phone uploads." });
      }

      if (!payload || !payload.data) {
        return res.status(400).json({ success: false, error: "INVALID_PAYLOAD", message: "Invalid transfer payload data." });
      }

      session.payload = payload;
      session.status = "data_ready";

      res.json({
        success: true,
        message: "Data uploaded successfully.",
        status: session.status
      });
    } catch (err: any) {
      console.error("Error uploading transfer data:", err);
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

      const data = session.payload?.data;

      res.json({
        success: true,
        sessionId: session.sessionId,
        direction: session.direction,
        status: session.status,
        expiresAt: session.expiresAt,
        counts: data ? {
          members: Array.isArray(data.members) ? data.members.length : 0,
          songs: Array.isArray(data.songs) ? data.songs.length : 0,
          schedules: Array.isArray(data.schedules) ? data.schedules.length : 0,
          songFamilies: Array.isArray(data.songFamilies) ? data.songFamilies.length : 0,
          hasDraft: Boolean(data.draft)
        } : undefined
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "SERVER_ERROR" });
    }
  });

  // Complete session (Phone confirms import OR PC confirms import)
  app.post("/api/transfer/session/:sessionId/complete", (req, res) => {
    try {
      const { sessionId } = req.params;
      const token = (req.body.token as string) || (req.query.token as string) || (req.headers["x-transfer-token"] as string);

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
      const token = (req.body.token as string) || (req.query.token as string) || (req.headers["x-transfer-token"] as string);

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
