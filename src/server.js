import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Helper function to fetch config data
async function fetchConfigData() {
  try {
    const response = await axios.get(process.env.CONFIG_URL);
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to fetch config: ${error.message}`);
  }
}

// Helper function to find drone by ID
function findDrone(drones, droneId) {
  const drone = drones.find(d => d.drone_id == droneId);
  if (!drone) {
    throw new Error("Drone not found");
  }
  return drone;
}

// GET drone configuration
app.get("/configs/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    const drones = await fetchConfigData();
    const drone = findDrone(drones, droneId);

    res.json({
      drone_id: drone.drone_id,
      drone_name: drone.drone_name,
      light: drone.light,
      country: drone.country,
      weight: drone.weight,
    });
  } catch (error) {
    const statusCode = error.message === "Drone not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// GET drone status
app.get("/status/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    const drones = await fetchConfigData();
    const drone = findDrone(drones, droneId);

    res.json({ condition: drone.condition });
  } catch (error) {
    const statusCode = error.message === "Drone not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// GET drone logs with pagination
app.get("/logs/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    const url = `${process.env.LOG_URL}?filter=drone_id=${droneId}&sort=-created&page=${page}&perPage=${perPage}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` }
    });

    const logs = response.data.items.map(log => ({
      drone_id: log.drone_id,
      drone_name: log.drone_name,
      created: log.created,
      country: log.country,
      celsius: log.celsius,
    }));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new log entry
app.post("/logs", async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;

    if (!drone_id || !drone_name || !country || celsius === undefined) {
      return res.status(400).json({
        error: "Missing required fields: drone_id, drone_name, country, celsius"
      });
    }

    const response = await axios.post(
      process.env.LOG_URL,
      { drone_id, drone_name, country, celsius },
      { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Drone API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});