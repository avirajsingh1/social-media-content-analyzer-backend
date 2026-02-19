const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const uploadRoutes = require('./routes/upload');
const analyzeRoutes = require('./routes/analyze');
const historyRoutes = require('./routes/history');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "https://social-media-content-analyzer-git-adc5b8-avis-projects-b39c9678.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-media-analyzer';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check your MongoDB Atlas username and password');
    console.error('2. Ensure your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Verify the database user has proper permissions');
    console.error('4. Check the connection string format in .env file');
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
