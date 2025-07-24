const prisma = require("../lib/prisma");
const FiscalYearService = require("./FiscalYearService");

class SubsidyService {
  constructor() {
    this.prisma = prisma;
    this.fiscalYearService = new FiscalYearService();
  }

  // สร้างเงินอุดหนุนใหม่
  async createSubsidy(data) {
    try {
      // ตรวจสอบว่ามี fiscalYearId หรือไม่
      if (!data.fiscalYearId) {
        throw new Error("กรุณาระบุปีงบประมาณ");
      }

      const subsidy = await this.prisma.subsidy.create({
        data: {
          type: data.type,
          budget: parseFloat(data.budget),
          withdrawal: 0,
          remainingBudget: parseFloat(data.budget),
          fiscalYearId: parseInt(data.fiscalYearId), // เพิ่ม fiscalYearId
        },
        include: {
          fiscalYear: true, // รวมข้อมูลปีงบประมาณ
        },
      });

      // อัพเดต FiscalYear
      await this.fiscalYearService.updateFiscalYearBudgets();
      await this.updateSubsidyWithdrawal();

      return {
        success: true,
        data: subsidy,
      };
    } catch (error) {
      throw new Error(`ไม่สามารถสร้างเงินอุดหนุนได้: ${error.message}`);
    }
  }

  // อัพเดตเงินอุดหนุน
  async updateSubsidy(id, data) {
    try {
      const subsidy = await this.prisma.subsidy.update({
        where: { id: parseInt(id) },
        data: {
          type: data.type,
          budget: data.budget ? parseFloat(data.budget) : undefined,
          remainingBudget: data.budget ? parseFloat(data.budget) : undefined,
          fiscalYearId: data.fiscalYearId
            ? parseInt(data.fiscalYearId)
            : undefined,
        },
        include: {
          fiscalYear: true,
        },
      });

      return {
        success: true,
        data: subsidy,
      };
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตเงินอุดหนุนได้: ${error.message}`);
    }
  }

  // อัพเดต withdrawal และ remainingBudget จาก Project
  async updateSubsidyFromProjects() {
    try {
      const subsidies = await this.prisma.subsidy.findMany();
      const projects = await this.prisma.project.findMany();
      const totalWithdrawal = projects.reduce(
        (sum, project) => sum + project.remainingBudget,
        0
      );

      // อัพเดตทุก subsidy
      for (const subsidy of subsidies) {
        await this.prisma.subsidy.update({
          where: { id: subsidy.id },
          data: {
            withdrawal: totalWithdrawal,
            remainingBudget: subsidy.budget - totalWithdrawal,
          },
        });
      }

      // อัพเดตปีงบประมาณ
      const currentYear = new Date().getFullYear() + 543;
      await this.fiscalYearService.updateFiscalYearFromSubsidy(
        currentYear.toString()
      );
    } catch (error) {
      throw new Error(
        `ไม่สามารถอัพเดตเงินอุดหนุนจากโครงการได้: ${error.message}`
      );
    }
  }

  // ดึงข้อมูลเงินอุดหนุนทั้งหมด
  async getAllSubsidies() {
    try {
      await this.updateSubsidyWithdrawal();

      const subsidies = await this.prisma.subsidy.findMany({
        include: {
          fiscalYear: true, // รวมข้อมูลปีงบประมาณ
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: subsidies,
      };
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลเงินอุดหนุนได้");
    }
  }

  // ดึงข้อมูลเงินอุดหนุนตาม ID
  async getSubsidyById(id) {
    try {
      const subsidy = await this.prisma.subsidy.findUnique({
        where: { id: parseInt(id) },
        include: {
          fiscalYear: true,
        },
      });

      if (!subsidy) {
        return {
          success: false,
          message: "ไม่พบข้อมูลเงินอุดหนุน",
        };
      }

      return {
        success: true,
        data: subsidy,
      };
    } catch (error) {
      throw new Error(`ไม่สามารถดึงข้อมูลเงินอุดหนุนได้: ${error.message}`);
    }
  }

  // ลบเงินอุดหนุน
  async deleteSubsidy(id) {
    try {
      const result = await this.prisma.subsidy.delete({
        where: { id: Number(id) },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateSubsidyWithdrawal() {
    try {
      const subsidies = await this.prisma.subsidy.findMany({
        include: {
          projects: true,
          fiscalYear: true,
        },
      });

      // อัพเดตแต่ละ subsidy แยกตามปีงบประมาณ
      for (const subsidy of subsidies) {
        // คำนวณ withdrawal จาก projects ที่อยู่ในปีงบประมาณเดียวกันเท่านั้น
        const totalWithdrawalAmount = subsidy.projects.reduce(
          (sum, project) => sum + project.withdrawalAmount,
          0
        );

        await this.prisma.subsidy.update({
          where: { id: subsidy.id },
          data: {
            withdrawal: totalWithdrawalAmount,
            remainingBudget: subsidy.budget - totalWithdrawalAmount,
          },
        });
      }

      return await this.prisma.subsidy.findMany();
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดต withdrawal ได้: ${error.message}`);
    }
  }

  // อัพเดต withdrawal จากผลรวมของ Project withdrawalAmount
  async updateWithdrawalFromProjects() {
    try {
      const subsidies = await this.prisma.subsidy.findMany({
        include: {
          projects: true,
          fiscalYear: true,
        },
      });

      // อัพเดตแต่ละ subsidy แยกตามปีงบประมาณ
      for (const subsidy of subsidies) {
        const totalWithdrawalAmount = subsidy.projects.reduce(
          (sum, project) => sum + project.withdrawalAmount,
          0
        );

        await this.prisma.subsidy.update({
          where: { id: subsidy.id },
          data: {
            withdrawal: totalWithdrawalAmount,
            remainingBudget: subsidy.budget - totalWithdrawalAmount,
          },
        });
      }
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดต withdrawal ได้: ${error.message}`);
    }
  }

  // เพิ่มเมธอด searchSubsidies
  async searchSubsidies(searchTerm) {
    try {
      return await this.prisma.subsidy.findMany({
        where: {
          OR: [
            {
              type: {
                contains: searchTerm,
              },
            },
            {
              budget: {
                equals: !isNaN(searchTerm) ? parseFloat(searchTerm) : undefined,
              },
            },
          ],
        },
        include: {
          fiscalYear: true,
          projects: true,
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถค้นหาเงินอุดหนุนได้: ${error.message}`);
    }
  }
}

module.exports = SubsidyService;
