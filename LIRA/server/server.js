const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const learnerRoutes = require("./routes/learner");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/learners", learnerRoutes);

mongoose
  .connect(process.env.MONGO_URI, {dbname: "LIRA"} )
  .then(() => {
    console.log("MongoDB connected!");
    // console.log("Database:", mongoose.connection.name);

    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
  });