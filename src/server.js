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
    console.log('Fetching config from:', process.env.CONFIG_URL);
    const response = await axios.get(process.env.CONFIG_URL);
    
    console.log('Response status:', response.status);
    
    let dataArray = null;
    
    // กรณีที่ 1: response.data.data (ตามที่เห็นจาก browser)
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      console.log('✓ Found data in response.data.data');
      dataArray = response.data.data;
    }
    // กรณีที่ 2: response.data เป็น array เลย
    else if (Array.isArray(response.data)) {
      console.log('✓ response.data is array');
      dataArray = response.data;
    }
    // กรณีที่ 3: ไม่เจอ
    else {
      console.error('Cannot find data array. Response structure:', {
        hasData: !!response.data,
        hasDataField: !!(response.data && response.data.data),
        isArray: Array.isArray(response.data),
        keys: response.data ? Object.keys(response.data) : []
      });
      throw new Error('Invalid response structure');
    }
    
    console.log('Found', dataArray.length, 'products');
    console.log('First product:', dataArray[0]);
    
    return dataArray;
    
  } catch (error) {
    console.error('Fetch config error:', error.message);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

function findProduct(products, productId) {
  console.log('Looking for product:', productId);
  console.log('Available products:', products?.length || 0);
  
  if (!Array.isArray(products)) {
    throw new Error("Products data is not an array");
  }
  
  if (products.length === 0) {
    throw new Error("No products available");
  }
  
  const product = products.find(p => p.drone_id == productId);
  
  if (!product) {
    console.log('Product not found. Available IDs:', products.map(p => p.drone_id).slice(0, 10));
    throw new Error("Product not found");
  }
  
  console.log('Found product:', product.drone_name);
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
    console.log('GET /products/:productId ->', productId);
    
    const data = await fetchConfigData();
    const item = findProduct(data, productId);
    const product = transformToProduct(item);

    res.json(product);
  } catch (error) {
    console.error('Error in /products/:productId:', error.message);
    const statusCode = error.message === "Product not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

app.get("/products/:productId/status", async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('GET /products/:productId/status ->', productId);
    
    const data = await fetchConfigData();
    const item = findProduct(data, productId);

    res.json({ 
      stock: item.light === 'on' ? 'In Stock' : 'Out of Stock',
      status: item.condition || 'Available'
    });
  } catch (error) {
    console.error('Error in /products/:productId/status:', error.message);
    const statusCode = error.message === "Product not found" ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

app.get("/orders/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 12;

    console.log(`GET /orders/:productId -> productId: ${productId}, page: ${page}, perPage: ${perPage}`);

    const url = `${process.env.LOG_URL}?filter=drone_id=${productId}&sort=-created&page=${page}&perPage=${perPage}`;
    console.log('Fetching orders from:', url);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` }
    });

    console.log('Orders response:', response.data.items?.length || 0, 'items');

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
    console.error('Error in /orders/:productId:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { product_id, quantity, total_price } = req.body;

    console.log('POST /orders ->', { product_id, quantity, total_price });

    if (!product_id || !quantity || !total_price) {
      return res.status(400).json({
        error: "Missing required fields: product_id, quantity, total_price"
      });
    }

    const payload = { 
      drone_id: product_id, 
      drone_name: 'Dot Dot',
      country: 'India', 
      celsius: total_price / 10
    };

    console.log('Sending to LOG_URL:', payload);

    const response = await axios.post(
      process.env.LOG_URL,
      payload,
      { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
    );

    console.log('Order created:', response.data.id);

    res.json({ 
      success: true, 
      message: "Order placed successfully",
      order_id: response.data.id 
    });
  } catch (error) {
    console.error('Error in POST /orders:', error.response?.data || error.message);
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
  console.log(`=================================`);
  console.log(`E-Commerce API running on port ${PORT}`);
  console.log(`Environment:`);
  console.log(`- CONFIG_URL: ${process.env.CONFIG_URL ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`- LOG_URL: ${process.env.LOG_URL ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`- LOG_API_TOKEN: ${process.env.LOG_API_TOKEN ? 'Set ✓' : 'Missing ✗'}`);
  console.log(`=================================`);
});