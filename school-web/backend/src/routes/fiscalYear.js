const express = require("express");
const router = express.Router();
const FiscalYearService = require("../services/FiscalYearService");
const authMiddleware = require("../middleware/auth");

const fiscalYearService = new FiscalYearService();

// ใช้ middleware ตรวจสอบ authentication
router.use(authMiddleware);

// สร้างปีงบประมาณใหม่
router.post("/", async (req, res) => {
  try {
    const { year } = req.body;

    // ตรวจสอบเฉพาะปีงบประมาณ
    if (!year) {
      return res.status(400).json({
        success: false,
        error: "กรุณาระบุปีงบประมาณ",
      });
    }

    // ตรวจสอบว่ามีปีงบประมาณนี้อยู่แล้วหรือไม่
    const existingYear = await fiscalYearService.getFiscalYearByYear(year);
    if (existingYear) {
      return res.status(400).json({
        success: false,
        error: "มีปีงบประมาณนี้อยู่แล้ว",
      });
    }

    const fiscalYear = await fiscalYearService.createFiscalYear(req.body);
    res.status(201).json({
      success: true,
      data: fiscalYear,
      message: "สร้างปีงบประมาณสำเร็จ",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลปีงบประมาณทั้งหมด
router.get("/", async (req, res) => {
  try {
    const fiscalYears = await fiscalYearService.getAllFiscalYears();
    res.json({
      success: true,
      data: fiscalYears,
      total: fiscalYears.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลปีงบประมาณตาม ID
router.get("/:id", async (req, res) => {
  try {
    const fiscalYear = await fiscalYearService.getFiscalYearById(req.params.id);
    res.json({
      success: true,
      data: fiscalYear,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// อัพเดตข้อมูลปีงบประมาณ
router.put("/:id", async (req, res) => {
  try {
    const fiscalYear = await fiscalYearService.updateFiscalYear(
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      data: fiscalYear,
      message: "Fiscal year updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ลบปีงบประมาณ
router.delete("/:id", async (req, res) => {
  try {
    await fiscalYearService.deleteFiscalYear(req.params.id);
    res.json({
      success: true,
      message: "Fiscal year deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// เพิ่ม route สำหรับการค้นหา
router.get("/search", async (req, res) => {
  try {
    const { term } = req.query;
    const results = await fiscalYearService.searchFiscalYears(term);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
