const express = require("express");
const router = express.Router();
const StatisticsService = require("../services/StatisticsService");
const authMiddleware = require("../middleware/auth");

const statisticsService = new StatisticsService();

// ใช้ middleware ตรวจสอบ token
router.use(authMiddleware);

// ดึงจำนวนข้อมูลในแต่ละตาราง
router.get("/counts", async (req, res) => {
  try {
    const counts = await statisticsService.getTableCounts();
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ดึงข้อมูลสถิติโดยละเอียด
router.get("/detailed", async (req, res) => {
  try {
    const statistics = await statisticsService.getDetailedStatistics();
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 