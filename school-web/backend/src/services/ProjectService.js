const prisma = require("../lib/prisma");
const SubsidyService = require("./SubsidyService");

class ProjectService {
  constructor() {
    this.prisma = prisma;
    this.subsidyService = new SubsidyService();
  }

  async createProject(data) {
    try {
      // ตรวจสอบเงินอุดหนุน
      const subsidy = await this.prisma.subsidy.findUnique({
        where: { id: data.subsidyId },
      });

      if (!subsidy) {
        throw new Error("ไม่พบข้อมูลเงินอุดหนุน");
      }

      if (parseFloat(data.budget) > subsidy.remainingBudget) {
        throw new Error("งบประมาณเกินกว่าเงินอุดหนุนที่มี");
      }

      // สร้างโครงการ
      const projectData = {
        name: data.name,
        budget: parseFloat(data.budget),
        department: data.department,
        responsible: data.responsible,
        withdrawalAmount: 0,
        remainingBudget: parseFloat(data.budget),
        subsidyId: data.subsidyId,
        fiscalYearId: data.fiscalYearId,
      };

      // เพิ่ม department_group ถ้ามี
      if (data.department_group) {
        projectData.department_group = data.department_group;
      }

      const project = await this.prisma.project.create({
        data: projectData,
      });

      // อัพเดทงบประมาณคงเหลือของเงินอุดหนุน
      await this.prisma.subsidy.update({
        where: { id: data.subsidyId },
        data: {
          remainingBudget: {
            decrement: parseFloat(data.budget),
          },
        },
      });

      return project;
    } catch (error) {
      throw new Error(`ไม่สามารถสร้างโครงการได้: ${error.message}`);
    }
  }

  async updateProject(id, data) {
    try {
      const currentProject = await this.prisma.project.findUnique({
        where: { id: parseInt(id) },
        include: { subsidy: true },
      });

      if (!currentProject) {
        throw new Error("ไม่พบโครงการ");
      }

      // ถ้ามีการเปลี่ยนแปลงเงินอุดหนุน
      if (data.subsidyId && data.subsidyId !== currentProject.subsidyId) {
        // คืนงบประมาณให้เงินอุดหนุนเดิม
        await this.prisma.subsidy.update({
          where: { id: currentProject.subsidyId },
          data: {
            remainingBudget: {
              increment: currentProject.budget,
            },
          },
        });

        // ตรวจสอบเงินอุดหนุนใหม่
        const newSubsidy = await this.prisma.subsidy.findUnique({
          where: { id: data.subsidyId },
        });

        if (!newSubsidy) {
          throw new Error("ไม่พบข้อมูลเงินอุดหนุน");
        }

        if (
          data.budget &&
          parseFloat(data.budget) > newSubsidy.remainingBudget
        ) {
          throw new Error("งบประมาณเกินกว่าเงินอุดหนุนที่มี");
        }

        // หักงบประมาณจากเงินอุดหนุนใหม่
        await this.prisma.subsidy.update({
          where: { id: data.subsidyId },
          data: {
            remainingBudget: {
              decrement: data.budget
                ? parseFloat(data.budget)
                : currentProject.budget,
            },
          },
        });
      }
      // ถ้ามีการเปลี่ยนแปลงงบประมาณ แต่ไม่เปลี่ยนเงินอุดหนุน
      else if (data.budget) {
        const newBudget = parseFloat(data.budget);
        const budgetDiff = newBudget - currentProject.budget;

        if (budgetDiff > 0) {
          if (budgetDiff > currentProject.subsidy.remainingBudget) {
            throw new Error("งบประมาณเกินกว่าเงินอุดหนุนที่มี");
          }

          await this.prisma.subsidy.update({
            where: { id: currentProject.subsidyId },
            data: {
              remainingBudget: {
                decrement: budgetDiff,
              },
            },
          });
        } else if (budgetDiff < 0) {
          await this.prisma.subsidy.update({
            where: { id: currentProject.subsidyId },
            data: {
              remainingBudget: {
                increment: Math.abs(budgetDiff),
              },
            },
          });
        }

        data.remainingBudget = newBudget - currentProject.withdrawalAmount;
      }

      const updateData = {
        name: data.name,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        department: data.department,
        responsible: data.responsible,
        remainingBudget: data.remainingBudget,
        subsidyId: data.subsidyId,
        fiscalYearId: data.fiscalYearId,
      };

      // เพิ่ม department_group ถ้ามี
      if (data.department_group) {
        updateData.department_group = data.department_group;
      }

      // อัพเดทโครงการ
      return await this.prisma.project.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          fiscalYear: true,
          subsidy: true,
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตโครงการได้: ${error.message}`);
    }
  }

  async deleteProject(id) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: parseInt(id) },
      });

      if (!project) {
        throw new Error("ไม่พบโครงการ");
      }

      // คืนงบประมาณให้เงินอุดหนุน
      await this.prisma.subsidy.update({
        where: { id: project.subsidyId },
        data: {
          remainingBudget: {
            increment: project.remainingBudget,
          },
        },
      });

      // ลบโครงการ
      await this.prisma.project.delete({
        where: { id: parseInt(id) },
      });

      return true;
    } catch (error) {
      throw new Error(`ไม่สามารถลบโครงการได้: ${error.message}`);
    }
  }

  async updateProjectWithdrawal(id, amount) {
    try {
      // อัพเดต Project
      const project = await this.prisma.project.update({
        where: { id: parseInt(id) },
        data: {
          withdrawalAmount: amount,
          remainingBudget: { decrement: amount },
        },
      });

      // อัพเดต Subsidy withdrawal จาก Project withdrawalAmount
      await this.subsidyService.updateWithdrawalFromProjects();

      // อัพเดต FiscalYear
      await this.fiscalYearService.updateFiscalYearBudgets();

      return project;
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตการเบิกจ่ายได้: ${error.message}`);
    }
  }

  async getAllProjects() {
    try {
      return await this.prisma.project.findMany({
        include: {
          fiscalYear: true,
          subsidy: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลโครงการได้");
    }
  }

  async getProjectById(id) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: parseInt(id) },
        include: {
          fiscalYear: true,
          subsidy: true,
        },
      });
      if (!project) {
        throw new Error("ไม่พบโครงการ");
      }
      return project;
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลโครงการได้");
    }
  }

  async updateProjectBudgets(projectId, amount) {
    try {
      // อัพเดต Project
      const project = await this.prisma.project.update({
        where: { id: parseInt(projectId) },
        data: {
          withdrawalAmount: amount,
          remainingBudget: { decrement: amount },
        },
      });

      // อัพเดต Subsidy withdrawal จาก Project remainingBudget ทั้งหมด
      const allProjects = await this.prisma.project.findMany();
      const totalRemaining = allProjects.reduce(
        (sum, p) => sum + p.remainingBudget,
        0
      );

      await this.prisma.subsidy.updateMany({
        data: {
          withdrawal: totalRemaining,
          remainingBudget: {
            decrement: totalRemaining,
          },
        },
      });

      // อัพเดต FiscalYear จาก Subsidy withdrawal
      const subsidies = await this.prisma.subsidy.findMany();
      const totalWithdrawal = subsidies.reduce(
        (sum, s) => sum + s.withdrawal,
        0
      );

      await this.prisma.fiscalYear.updateMany({
        data: {
          totalExpense: totalWithdrawal,
          remainingBudget: {
            decrement: totalWithdrawal,
          },
        },
      });

      return project;
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตงบประมาณได้: ${error.message}`);
    }
  }

  async searchProjects(searchTerm) {
    try {
      return await this.prisma.project.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchTerm,
              },
            },
            {
              department: {
                contains: searchTerm,
              },
            },
            {
              responsible: {
                contains: searchTerm,
              },
            },
          ],
        },
        include: {
          fiscalYear: true,
          subsidy: true,
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถค้นหาโครงการได้: ${error.message}`);
    }
  }
}

module.exports = ProjectService;
