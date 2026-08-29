const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const learnerRoutes = require("./routes/learner");
const teacherRoutes = require("./routes/teacher");
const adminRoutes = require("./routes/admin");
const storyRoutes = require("./routes/story");
const sectionRoutes = require("./routes/section");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
// Story cover images are resized in the browser and sent as data URLs.
app.use(express.json({ limit: "3mb" }));

app.use("/api/learners", learnerRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/auth", authRoutes);

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
