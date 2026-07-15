import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// We can import initial data to seed the database if it doesn't exist
import {
  INITIAL_CUSTOMERS,
  INITIAL_PARTNERS,
  INITIAL_INDUSTRIES,
  INITIAL_PICKUP_REQUESTS,
  INITIAL_DIY_PROJECTS,
  INITIAL_TRANSACTIONS,
  INITIAL_REWARD_PRODUCTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SAVED_ADDRESSES,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_FEEDBACKS,
  INITIAL_PRICING_RATES
} from "./src/data";

const app = express();
const PORT = 3000;
const DB_FILE_PATH = path.join(process.cwd(), "server-db.json");

// Middleware to parse large JSON bodies
app.use(express.json({ limit: "50mb" }));

// Helper function to read from database
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      // Seed database with default data if file does not exist
      const initialDb = {
        customers: INITIAL_CUSTOMERS,
        partners: INITIAL_PARTNERS,
        industries: INITIAL_INDUSTRIES,
        pickups: INITIAL_PICKUP_REQUESTS,
        diyProjects: INITIAL_DIY_PROJECTS,
        transactions: INITIAL_TRANSACTIONS,
        rewardStore: INITIAL_REWARD_PRODUCTS,
        notifications: INITIAL_NOTIFICATIONS,
        savedAddresses: INITIAL_SAVED_ADDRESSES,
        supportTickets: INITIAL_SUPPORT_TICKETS,
        feedbacks: INITIAL_FEEDBACKS,
        pricingRates: INITIAL_PRICING_RATES
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
    const rawData = fs.readFileSync(DB_FILE_PATH, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading database file:", error);
    return null;
  }
}

// Helper function to write to database
function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing to database file:", error);
    return false;
  }
}

// Initialize database file on startup
readDatabase();

// --- API ENDPOINTS ---

// GET /api/data - Retrieve the entire database state
app.get("/api/data", (req, res) => {
  const db = readDatabase();
  if (!db) {
    return res.status(500).json({ success: false, message: "Failed to load database content." });
  }
  res.json({ success: true, data: db });
});

// POST /api/data - Update the entire database state
app.post("/api/data", (req, res) => {
  const incomingData = req.body;
  if (!incomingData || typeof incomingData !== "object") {
    return res.status(400).json({ success: false, message: "Invalid payload format. Must be an object representing the database state." });
  }

  const success = writeDatabase(incomingData);
  if (!success) {
    return res.status(500).json({ success: false, message: "Failed to persist database updates." });
  }

  res.json({ success: true, message: "Database persisted successfully.", data: incomingData });
});

// GET /api/data/raw - Endpoint for user to see the exact raw database JSON file
app.get("/api/data/raw", (req, res) => {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return res.status(404).json({ success: false, message: "Database has not been initialized yet." });
    }
    const rawData = fs.readFileSync(DB_FILE_PATH, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.send(rawData);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reading raw database file." });
  }
});

// GET /api/health - Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", databasePath: DB_FILE_PATH });
});

// --- VITE & STATIC FILES HANDLING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode: mount Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Production mode: serve compiled static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled production assets from dist/ folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EcoLoop Backend Server] Running and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start the Express full-stack server:", err);
});
