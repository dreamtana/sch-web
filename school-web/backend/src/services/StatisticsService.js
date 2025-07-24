const prisma = require("../lib/prisma");

class StatisticsService {
  constructor() {
    this.prisma = prisma;
  }

  async getTableCounts() {
    try {
      const [
        transactionCount,
        projectCount,
        subsidyCount,
        fiscalYearCount,
        userCount,
      ] = await Promise.all([
        this.prisma.transaction.count(),
        this.prisma.project.count(),
        this.prisma.subsidy.count(),
        this.prisma.fiscalYear.count(),
        this.prisma.user.count(),
      ]);

      return {
        transactions: transactionCount,
        projects: projectCount,
        subsidies: subsidyCount,
        fiscalYears: fiscalYearCount,
        users: userCount,
        total:
          transactionCount +
          projectCount +
          subsidyCount +
          fiscalYearCount +
          userCount,
      };
    } catch (error) {
      throw new Error(`ไม่สามารถนับจำนวนข้อมูลได้: ${error.message}`);
    }
  }

  async getDetailedStatistics() {
    try {
      // รวม queries ทั้งหมดเป็นชุดเดียว
      const [counts, projectStats, subsidyStats, fiscalYears] =
        await Promise.all([
          // ดึงจำนวนข้อมูลทั้งหมดในครั้งเดียว
          this.prisma.$transaction([
            this.prisma.transaction.count(),
            this.prisma.project.count(),
            this.prisma.subsidy.count(),
            this.prisma.fiscalYear.count(),
            this.prisma.user.count(),
          ]),
          // ดึงสถิติโครงการ
          this.prisma.project.aggregate({
            _sum: {
              budget: true,
              withdrawalAmount: true,
              remainingBudget: true,
            },
          }),
          // ดึงสถิติเงินอุดหนุน
          this.prisma.subsidy.aggregate({
            _sum: {
              budget: true,
              withdrawal: true,
              remainingBudget: true,
            },
          }),
          // ดึงข้อมูลปีงบประมาณ
          this.prisma.fiscalYear.findMany({
            include: {
              Subsidy: {
                include: {
                  projects: true,
                },
              },
              Project: true,
            },
            orderBy: {
              year: "desc",
            },
          }),
        ]);

      // แยกข้อมูลจำนวนรายการ
      const [
        transactionCount,
        projectCount,
        subsidyCount,
        fiscalYearCount,
        userCount,
      ] = counts;

      // สร้างข้อมูลสถิติแยกตามปีงบประมาณ
      const fiscalYearStats = fiscalYears.map((year) => ({
        year: year.year,
        totalBudget: year.totalBudget,
        totalExpense: year.totalExpense,
        remainingBudget: year.remainingBudget,
        subsidyCount: year.Subsidy.length,
        projectCount: year.Project.length,
        withdrawalAmount: year.Subsidy.reduce(
          (sum, subsidy) => sum + subsidy.withdrawal,
          0
        ),
      }));

      return {
        counts: {
          transactions: transactionCount,
          projects: projectCount,
          subsidies: subsidyCount,
          fiscalYears: fiscalYearCount,
          users: userCount,
          total:
            transactionCount +
            projectCount +
            subsidyCount +
            fiscalYearCount +
            userCount,
        },
        projectStatistics: {
          totalBudget: projectStats._sum.budget || 0,
          totalWithdrawal: projectStats._sum.withdrawalAmount || 0,
          totalRemaining: projectStats._sum.remainingBudget || 0,
        },
        subsidyStatistics: {
          totalBudget: subsidyStats._sum.budget || 0,
          totalWithdrawal: subsidyStats._sum.withdrawal || 0,
          totalRemaining: subsidyStats._sum.remainingBudget || 0,
        },
        fiscalYearStatistics: {
          summary: {
            totalYears: fiscalYears.length,
            totalBudget: fiscalYears.reduce(
              (sum, year) => sum + year.totalBudget,
              0
            ),
            totalExpense: fiscalYears.reduce(
              (sum, year) => sum + year.totalExpense,
              0
            ),
            totalRemaining: fiscalYears.reduce(
              (sum, year) => sum + year.remainingBudget,
              0
            ),
          },
          byYear: fiscalYearStats,
        },
      };
    } catch (error) {
      throw new Error(`ไม่สามารถดึงข้อมูลสถิติได้: ${error.message}`);
    }
  }
}

module.exports = StatisticsService;
