const express = require("express");
const router = express.Router();
const TransactionService = require("../services/TransactionService");
const authMiddleware = require("../middleware/auth");
const transactionService = new TransactionService();

router.use(authMiddleware);

// สร้างรายการใหม่
router.post("/", async (req, res) => {
  try {
    const { title, date, amount } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!title || !date || !amount) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    const transaction = await transactionService.createTransaction(req.body);
    res.status(201).json({
      success: true,
      data: transaction,
      message: "สร้างรายการสำเร็จ",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงรายการทั้งหมด
router.get("/", async (req, res) => {
  try {
    const transactions = await transactionService.getAllTransactions();
    res.json({
      success: true,
      data: transactions,
      total: transactions.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงรายการตาม ID
router.get("/:id", async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionById(
      req.params.id
    );
    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงรายการตามปีงบประมาณ
router.get("/fiscal-year/:year", async (req, res) => {
  try {
    const transactions = await transactionService.getTransactionsByFiscalYear(
      req.params.year
    );
    res.json({
      success: true,
      data: transactions,
      total: transactions.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// อัพเดตรายการ
router.put("/:id", async (req, res) => {
  try {
    const transaction = await transactionService.updateTransaction(
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      data: transaction,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ลบรายการ
router.delete("/:id", async (req, res) => {
  try {
    await transactionService.deleteTransaction(req.params.id);
    res.json({
      success: true,
      message: "Transaction deleted successfully",
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
    const results = await transactionService.searchTransactions(term);
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
