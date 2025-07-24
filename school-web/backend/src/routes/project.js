const express = require("express");
const router = express.Router();
const ProjectService = require("../services/ProjectService");
const authMiddleware = require("../middleware/auth");

const projectService = new ProjectService();

// ใช้ middleware ตรวจสอบ authentication
router.use(authMiddleware);

// สร้างโครงการใหม่
router.post("/", async (req, res) => {
  try {
    const { name, budget, department, responsible } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !budget || !department || !responsible) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields",
      });
    }

    const project = await projectService.createProject(req.body);
    res.status(201).json({
      success: true,
      data: project,
      message: "Project created successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลโครงการทั้งหมด
router.get("/", async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json({
      success: true,
      data: projects,
      total: projects.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลโครงการตาม ID
router.get("/:id", async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// อัพเดตข้อมูลโครงการ
router.put("/:id", async (req, res) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.json({
      success: true,
      data: project,
      message: "Project updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ลบโครงการ
router.delete("/:id", async (req, res) => {
  try {
    await projectService.deleteProject(req.params.id);
    res.json({
      success: true,
      message: "Project deleted successfully",
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
    const results = await projectService.searchProjects(term);
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
