const express = require("express");
const router = express.Router();
const SubsidyService = require("../services/SubsidyService");
const authMiddleware = require("../middleware/auth");

const subsidyService = new SubsidyService();

// ใช้ middleware ตรวจสอบ authentication
router.use(authMiddleware);

// สร้างเงินอุดหนุนใหม่
router.post("/", async (req, res) => {
  try {
    const { type, budget, fiscalYearId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!type || !budget || !fiscalYearId) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    const result = await subsidyService.createSubsidy(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการสร้างข้อมูลเงินอุดหนุน",
    });
  }
});

// ดึงข้อมูลเงินอุดหนุนทั้งหมด
router.get("/", async (req, res) => {
  try {
    const result = await subsidyService.getAllSubsidies();
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลเงินอุดหนุน",
    });
  }
});

// ดึงข้อมูลเงินอุดหนุนตาม ID
router.get("/:id", async (req, res) => {
  try {
    const result = await subsidyService.getSubsidyById(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลเงินอุดหนุน",
    });
  }
});

// อัพเดตข้อมูลเงินอุดหนุน
router.put("/:id", async (req, res) => {
  try {
    const { type, budget, fiscalYearId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!type || !budget) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    const result = await subsidyService.updateSubsidy(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูลเงินอุดหนุน",
    });
  }
});

// ลบเงินอุดหนุน
router.delete("/:id", async (req, res) => {
  try {
    await subsidyService.deleteSubsidy(req.params.id);
    res.json({
      success: true,
      message: "ลบข้อมูลเงินอุดหนุนสำเร็จ",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการลบข้อมูลเงินอุดหนุน",
    });
  }
});

// เพิ่ม route สำหรับการค้นหา
router.get("/search", async (req, res) => {
  try {
    const { term } = req.query;
    const results = await subsidyService.searchSubsidies(term);
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
