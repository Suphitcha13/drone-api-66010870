import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// ===== Helper Functions =====

async function fetchConfigData() {
  try {
    console.log('Fetching config from:', process.env.CONFIG_URL);
    const response = await axios.get(process.env.CONFIG_URL);
    
    console.log('Response status:', response.status);
    console.log('Response keys:', Object.keys(response.data || {}));
    
    let dataArray = null;
    
    if (response.data) {
      if (Array.isArray(response.data.data)) {
        console.log('✓ Found array in response.data.data');
        dataArray = response.data.data;
      }
      else if (Array.isArray(response.data)) {
        console.log('✓ response.data is array');
        dataArray = response.data;
      }
      else if (response.data.status === "ok" && response.data.data) {
        console.log('✓ Found data with status ok');
        dataArray = response.data.data;
      }
      else if (response.data.headers && response.data.data) {
        console.log('✓ Found data with headers');
        dataArray = response.data.data;
      }
    }
    
    if (!dataArray || !Array.isArray(dataArray)) {
      const sample = JSON.stringify(response.data).substring(0, 500);
      console.error('Cannot find data array. Response sample:', sample);
      throw new Error(`Invalid response structure. Sample: ${sample}`);
    }
    
    console.log('Found', dataArray.length, 'drones');
    if (dataArray.length > 0) {
      console.log('First drone:', JSON.stringify(dataArray[0]).substring(0, 200));
    }
    
    return dataArray;
    
  } catch (error) {
    console.error('Fetch config error:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    }
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

function findDrone(drones, droneId) {
  console.log('Looking for drone:', droneId);
  console.log('Available drones:', drones?.length || 0);
  
  if (!Array.isArray(drones)) {
    throw new Error("Drones data is not an array");
  }
  
  if (drones.length === 0) {
    throw new Error("No drones available");
  }
  
  const drone = drones.find(d => d.drone_id == droneId);
  
  if (!drone) {
    console.log('Drone not found. Available IDs:', drones.map(d => d.drone_id).slice(0, 10));
    throw new Error("Drone not found");
  }
  
  console.log('Found drone:', drone.drone_name);
  return drone;
}

// GET /configs/{droneId}
app.get("/configs/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    console.log('GET /configs/:droneId ->', droneId);
    
    const data = await fetchConfigData();
    const drone = findDrone(data, droneId);

    // Response เฉพาะ drone_id, drone_name, light, country, weight
    res.json({
      drone_id: drone.drone_id,
      drone_name: drone.drone_name,
      light: drone.light,
      country: drone.country,
      weight: drone.weight
    });
  } catch (error) {
    console.error('Error in /configs/:droneId:', error.message);
    const statusCode = error.message === "Drone not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// GET /status/{droneId}
app.get("/status/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    console.log('GET /status/:droneId ->', droneId);
    
    const data = await fetchConfigData();
    const drone = findDrone(data, droneId);

    // Response เฉพาะ condition
    res.json({ 
      condition: drone.condition || 'unknown'
    });
  } catch (error) {
    console.error('Error in /status/:droneId:', error.message);
    const statusCode = error.message === "Drone not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// GET /logs/{droneId}
app.get("/logs/:droneId", async (req, res) => {
  try {
    const { droneId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    console.log(`GET /logs/:droneId -> droneId: ${droneId}, page: ${page}, perPage: ${perPage}`);

    const url = `${process.env.LOG_URL}?filter=drone_id=${droneId}&sort=-created&page=${page}&perPage=${perPage}`;
    console.log('Fetching logs from:', url);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` }
    });

    console.log('Logs response:', response.data.items?.length || 0, 'items');

    // Response เฉพาะ drone_id, drone_name, created, country, celsius
    const logs = response.data.items.map(log => ({
      drone_id: log.drone_id,
      drone_name: log.drone_name,
      created: log.created,
      country: log.country,
      celsius: log.celsius
    }));

    res.json(logs);
  } catch (error) {
    console.error('Error in /logs/:droneId:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /logs
app.post("/logs", async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;

    console.log('POST /logs ->', { drone_id, drone_name, country, celsius });

    // Validation
    if (!drone_id || !drone_name || !country || celsius === undefined) {
      return res.status(400).json({
        error: "Missing required fields: drone_id, drone_name, country, celsius"
      });
    }

    const payload = { 
      drone_id, 
      drone_name,
      country, 
      celsius: parseFloat(celsius)
    };

    console.log('Sending to LOG_URL:', payload);

    const response = await axios.post(
      process.env.LOG_URL,
      payload,
      { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
    );

    console.log('Log created:', response.data.id);

    res.json({ 
      success: true, 
      message: "Log created successfully",
      log_id: response.data.id 
    });
  } catch (error) {
    console.error('Error in POST /logs:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Drone Monitoring API",
    version: "1.0",
    endpoints: [
      "GET /configs/:droneId",
      "GET /status/:droneId", 
      "GET /logs/:droneId",
      "POST /logs"
    ]
  });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Drone Monitoring API running on port ${PORT}`);
  console.log(`Environment:`);
  console.log(`- CONFIG_URL: ${process.env.CONFIG_URL ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`- LOG_URL: ${process.env.LOG_URL ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`- LOG_API_TOKEN: ${process.env.LOG_API_TOKEN ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`=================================`);
});