import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

async function fetchConfigData() {
  try {
    const response = await axios.get(process.env.CONFIG_URL);
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

function findProduct(products, productId) {
  const product = products.find(p => p.drone_id == productId);
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
}

function transformToProduct(data) {
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Sports'];
  const stockStatus = data.light === 'on' ? 'In Stock' : 'Out of Stock';
  
  return {
    id: data.drone_id,
    name: `Premium Product #${data.drone_id}`,
    category: categories[data.drone_id % 4],
    price: data.weight * 100,
    stock: stockStatus,
    status: data.condition || 'Available',
    location: 'Bangkok, Thailand'
  };
}

app.get("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const data = await fetchConfigData();
    const item = findProduct(data, productId);
    const product = transformToProduct(item);

    res.json(product);
  } catch (error) {
    const statusCode = error.message === "Product not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

app.get("/products/:productId/status", async (req, res) => {
  try {
    const { productId } = req.params;
    const data = await fetchConfigData();
    const item = findProduct(data, productId);

    res.json({ 
      stock: item.light === 'on' ? 'In Stock' : 'Out of Stock',
      status: item.condition || 'Available'
    });
  } catch (error) {
    const statusCode = error.message === "Product not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

app.get("/orders/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    const url = `${process.env.LOG_URL}?filter=drone_id=${productId}&sort=-created&page=${page}&perPage=${perPage}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` }
    });

    const orders = response.data.items.map(log => ({
      order_id: log.id,
      product_id: log.drone_id,
      product_name: `Premium Product #${log.drone_id}`,
      order_date: log.created,
      quantity: 1,
      total_price: log.celsius * 10,
      customer_location: 'Bangkok, Thailand'
    }));

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { product_id, quantity, total_price } = req.body;

    if (!product_id || !quantity || !total_price) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const response = await axios.post(
      process.env.LOG_URL,
      { 
        drone_id: product_id, 
        drone_name: 'Dot Dot',
        country: 'India', 
        celsius: total_price / 10
      },
      { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
    );

    res.json({ 
      success: true, 
      message: "Order placed successfully",
      order_id: response.data.id 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "E-Commerce API",
    version: "1.0"
  });
});

app.listen(PORT, () => {
  console.log(`E-Commerce API running on port ${PORT}`);
});