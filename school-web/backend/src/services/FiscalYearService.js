const prisma = require("../lib/prisma");

class FiscalYearService {
  constructor() {
    this.prisma = prisma;
  }

  async createFiscalYear(data) {
    try {
      const fiscalYear = await this.prisma.fiscalYear.create({
        data: {
          year: data.year,
          totalBudget: 0,
          totalExpense: 0,
          remainingBudget: 0,
        },
      });
      return fiscalYear;
    } catch (error) {
      throw new Error(`ไม่สามารถสร้างปีงบประมาณได้: ${error.message}`);
    }
  }

  async getFiscalYearByYear(year) {
    try {
      return await this.prisma.fiscalYear.findFirst({
        where: { year },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถดึงข้อมูลปีงบประมาณ: ${error.message}`);
    }
  }

  async getAllFiscalYears() {
    try {
      await this.updateFiscalYearBudgets();
      return await this.prisma.fiscalYear.findMany({
        orderBy: { year: "desc" },
      });
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลปีงบประมาณได้");
    }
  }

  async getFiscalYearById(id) {
    try {
      const fiscalYear = await this.prisma.fiscalYear.findUnique({
        where: { id: parseInt(id) },
      });
      if (!fiscalYear) throw new Error("ไม่พบปีงบประมาณ");
      return fiscalYear;
    } catch (error) {
      throw new Error(`ไม่สามารถดึงข้อมูลปีงบประมาณได้: ${error.message}`);
    }
  }

  async updateFiscalYear(id, data) {
    try {
      return await this.prisma.fiscalYear.update({
        where: { id: parseInt(id) },
        data: {
          year: data.year,
          totalBudget: data.totalBudget
            ? parseFloat(data.totalBudget)
            : undefined,
          remainingBudget: data.totalBudget
            ? parseFloat(data.totalBudget)
            : undefined,
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตปีงบประมาณได้: ${error.message}`);
    }
  }

  async deleteFiscalYear(id) {
    try {
      const result = await this.prisma.fiscalYear.delete({
        where: { id: Number(id) },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateFiscalYearBudgets() {
    try {
      const fiscalYears = await this.prisma.fiscalYear.findMany({
        include: {
          Subsidy: {
            include: {
              projects: true,
            },
          },
        },
      });

      for (const fiscalYear of fiscalYears) {
        const totalBudget = fiscalYear.Subsidy.reduce(
          (sum, subsidy) => sum + subsidy.budget,
          0
        );

        const totalExpense = fiscalYear.Subsidy.reduce((sum, subsidy) => {
          return (
            sum +
            subsidy.projects.reduce(
              (projectSum, project) => projectSum + project.withdrawalAmount,
              0
            )
          );
        }, 0);

        await this.prisma.fiscalYear.update({
          where: { id: fiscalYear.id },
          data: {
            totalBudget: totalBudget,
            totalExpense: totalExpense,
            remainingBudget: totalBudget - totalExpense,
          },
        });
      }
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตปีงบประมาณได้: ${error.message}`);
    }
  }

  async searchFiscalYears(searchTerm) {
    try {
      return await this.prisma.fiscalYear.findMany({
        where: {
          year: {
            contains: searchTerm,
          },
        },
        include: {
          Subsidy: true,
          Project: true,
        },
        orderBy: {
          year: "desc",
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถค้นหาปีงบประมาณได้: ${error.message}`);
    }
  }
}

module.exports = FiscalYearService;
