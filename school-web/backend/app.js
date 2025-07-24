require("dotenv").config();
const express = require("express");
const authRoutes = require("./src/routes/auth");
const transactionRoutes = require("./src/routes/transaction");
const projectRoutes = require("./src/routes/project");
const subsidyRoutes = require("./src/routes/subsidy");
const fiscalYearRoutes = require("./src/routes/fiscalYear");
const statisticsRoutes = require("./src/routes/statistics");
const cors = require("cors");

const app = express();

app.use(express.json());

// กำหนด allowed origins
const allowedOrigins = [
  "https://frontend-two-black-20.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/projects", projectRoutes);
app.use("/subsidies", subsidyRoutes);
app.use("/fiscal-years", fiscalYearRoutes);
app.use("/statistics", statisticsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
