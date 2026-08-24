const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const learnerRoutes = require("./routes/learner");
const teacherRoutes = require("./routes/teacher");
const adminRoutes = require("./routes/admin");

const app = express();
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/LIRA";

app.use(cors());
app.use(express.json());

app.use("/api/learners", learnerRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/admin", adminRoutes);

const startServer = () => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

mongoose
  .connect(mongoUri, {
    dbName: "LIRA",
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected!");
    startServer();
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    console.error("If you are using MongoDB Atlas, verify that the cluster is running and that your IP is allowed in Network Access.");
    console.error("If you are using a local MongoDB instance, make sure MongoDB is running on localhost:27017.");
    startServer();
  });
