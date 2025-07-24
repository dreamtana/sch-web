const prisma = require("../lib/prisma");
const FiscalYearService = require("./FiscalYearService");
const ProjectService = require("./ProjectService");
const SubsidyService = require("./SubsidyService");

class TransactionService {
  constructor() {
    this.prisma = prisma;
    this.fiscalYearService = new FiscalYearService();
    this.projectService = new ProjectService(this.prisma);
    this.subsidyService = new SubsidyService();
  }

  // สร้างรายการใหม่
  async createTransaction(data) {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          title: data.title,
          date: new Date(data.date),
          amount: parseFloat(data.amount),
          duration: data.duration || "-",
          note: data.note,
          projectId: data.projectId ? parseInt(data.projectId) : null,
        },
      });

      // ถ้ามี projectId ให้อัพเดตงบประมาณ
      if (data.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: parseInt(data.projectId) },
          include: {
            subsidy: true,
            fiscalYear: true,
          },
        });

        if (project) {
          // อัพเดทยอดเบิกจ่ายและงบประมาณคงเหลือของโครงการ
          await this.prisma.project.update({
            where: { id: parseInt(data.projectId) },
            data: {
              withdrawalAmount: {
                increment: parseFloat(data.amount),
              },
              remainingBudget: {
                decrement: parseFloat(data.amount),
              },
            },
          });

          // อัพเดท withdrawal ของ subsidy
          const allProjects = await this.prisma.project.findMany({
            where: { subsidyId: project.subsidyId },
          });

          const totalWithdrawal =
            allProjects.reduce((sum, p) => sum + p.withdrawalAmount, 0) +
            parseFloat(data.amount);

          await this.prisma.subsidy.update({
            where: { id: project.subsidyId },
            data: {
              withdrawal: totalWithdrawal,
              remainingBudget: project.subsidy.budget - totalWithdrawal,
            },
          });

          // อัพเดทปีงบประมาณ
          const allSubsidies = await this.prisma.subsidy.findMany({
            where: { fiscalYearId: project.fiscalYearId },
            include: {
              projects: true,
            },
          });

          const totalExpense =
            allSubsidies.reduce((sum, subsidy) => {
              const subsidyWithdrawal = subsidy.projects.reduce(
                (projectSum, p) => projectSum + p.withdrawalAmount,
                0
              );
              return sum + subsidyWithdrawal;
            }, 0) + parseFloat(data.amount);

          await this.prisma.fiscalYear.update({
            where: { id: project.fiscalYearId },
            data: {
              totalExpense: totalExpense,
              remainingBudget: project.fiscalYear.totalBudget - totalExpense,
            },
          });
        }
      }

      return transaction;
    } catch (error) {
      throw new Error(`ไม่สามารถสร้างรายการได้: ${error.message}`);
    }
  }

  // ดัพเดทรายการ
  async updateTransaction(id, data) {
    try {
      // ดึงข้อมูลรายการเดิม
      const oldTransaction = await this.prisma.transaction.findUnique({
        where: { id: parseInt(id) },
        include: {
          project: true,
        },
      });

      if (!oldTransaction) {
        throw new Error("ไม่พบรายการที่ต้องการแก้ไข");
      }

      // คำนวณผลต่างของจำนวนเงิน
      const oldAmount = oldTransaction.amount;
      const newAmount = parseFloat(data.amount);
      const amountDiff = newAmount - oldAmount;

      // อัพเดตรายการก่อน
      const transaction = await this.prisma.transaction.update({
        where: { id: parseInt(id) },
        data: {
          title: data.title,
          date: new Date(data.date),
          amount: newAmount,
          duration: data.duration,
          note: data.note,
          projectId: data.projectId ? parseInt(data.projectId) : undefined,
        },
        include: {
          project: true,
        },
      });

      // ถ้ามีการเปลี่ยนแปลงจำนวนเงินและมีโครงการที่เกี่ยวข้อง
      if (amountDiff !== 0 && oldTransaction.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: oldTransaction.projectId },
          include: {
            subsidy: true,
            fiscalYear: true,
          },
        });

        if (project) {
          // อัพเดทยอดเบิกจ่ายและงบประมาณคงเหลือของโครงการ
          await this.prisma.project.update({
            where: { id: oldTransaction.projectId },
            data: {
              withdrawalAmount: {
                increment: amountDiff,
              },
              remainingBudget: {
                decrement: amountDiff,
              },
            },
          });

          // อัพเดท withdrawal ของ subsidy
          const allProjects = await this.prisma.project.findMany({
            where: { subsidyId: project.subsidyId },
          });

          // คำนวณยอดเบิกจ่ายรวมของทุกโครงการในเงินอุดหนุนนี้
          const totalWithdrawal = allProjects.reduce(
            (sum, p) => sum + p.withdrawalAmount,
            0
          );

          await this.prisma.subsidy.update({
            where: { id: project.subsidyId },
            data: {
              withdrawal: totalWithdrawal,
              remainingBudget: project.subsidy.budget - totalWithdrawal,
            },
          });

          // อัพเดทปีงบประมาณ
          const allSubsidies = await this.prisma.subsidy.findMany({
            where: { fiscalYearId: project.fiscalYearId },
            include: {
              projects: true, // รวมข้อมูลโครงการทั้งหมด
            },
          });

          // คำนวณยอดเบิกจ่ายรวมของทุกโครงการในทุกเงินอุดหนุน
          const totalExpense = allSubsidies.reduce((sum, subsidy) => {
            const subsidyWithdrawal = subsidy.projects.reduce(
              (projectSum, project) => projectSum + project.withdrawalAmount,
              0
            );
            return sum + subsidyWithdrawal;
          }, 0);

          await this.prisma.fiscalYear.update({
            where: { id: project.fiscalYearId },
            data: {
              totalExpense: totalExpense,
              remainingBudget: project.fiscalYear.totalBudget - totalExpense,
            },
          });
        }
      }

      return { success: true, data: transaction };
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตรายการได้: ${error.message}`);
    }
  }

  // ดึงข้อมูลรายการทั้งหมด
  async getAllTransactions() {
    try {
      return await this.prisma.transaction.findMany({
        include: {
          project: true,
        },
        orderBy: {
          date: "desc",
        },
      });
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลรายการได้");
    }
  }

  // ดึงข้อมูลรายการตาม ID
  async getTransactionById(id) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: parseInt(id) },
        include: {
          project: true,
        },
      });
      if (!transaction) {
        throw new Error("ไม่พบรายการ");
      }
      return transaction;
    } catch (error) {
      throw new Error("ไม่สามารถดึงข้อมูลรายการได้");
    }
  }

  // ลบรายการ
  async deleteTransaction(id) {
    try {
      // ดึงข้อมูลรายการก่อนลบ
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: Number(id) },
        include: {
          project: true,
        },
      });

      if (!transaction) {
        throw new Error("ไม่พบรายการที่ต้องการลบ");
      }

      // ล้ามีโครงการที่เกี่ยวข้อง ให้อัพเดทยอดเบิกจ่าย
      if (transaction.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: transaction.projectId },
          include: {
            subsidy: true,
            fiscalYear: true,
          },
        });

        if (project) {
          // อัพเดทยอดเบิกจ่ายและงบประมาณคงเหลือของโครงการ
          await this.prisma.project.update({
            where: { id: transaction.projectId },
            data: {
              withdrawalAmount: {
                decrement: transaction.amount,
              },
              remainingBudget: {
                increment: transaction.amount,
              },
            },
          });

          // อัพเดท withdrawal ของ subsidy
          const allProjects = await this.prisma.project.findMany({
            where: { subsidyId: project.subsidyId },
          });

          const totalWithdrawal =
            allProjects.reduce((sum, p) => sum + p.withdrawalAmount, 0) -
            transaction.amount;

          await this.prisma.subsidy.update({
            where: { id: project.subsidyId },
            data: {
              withdrawal: totalWithdrawal > 0 ? totalWithdrawal : 0,
              remainingBudget:
                project.subsidy.budget -
                (totalWithdrawal > 0 ? totalWithdrawal : 0),
            },
          });

          // อัพเดทปีงบประมาณ
          const allSubsidies = await this.prisma.subsidy.findMany({
            where: { fiscalYearId: project.fiscalYearId },
            include: {
              projects: true,
            },
          });

          const totalExpense =
            allSubsidies.reduce((sum, subsidy) => {
              const subsidyWithdrawal = subsidy.projects.reduce(
                (projectSum, p) => projectSum + p.withdrawalAmount,
                0
              );
              return sum + subsidyWithdrawal;
            }, 0) - transaction.amount;

          await this.prisma.fiscalYear.update({
            where: { id: project.fiscalYearId },
            data: {
              totalExpense: totalExpense > 0 ? totalExpense : 0,
              remainingBudget:
                project.fiscalYear.totalBudget -
                (totalExpense > 0 ? totalExpense : 0),
            },
          });
        }
      }

      // ลบรายการ
      const result = await this.prisma.transaction.delete({
        where: { id: Number(id) },
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProjectBudgets(projectId, amount) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: parseInt(projectId) },
        include: {
          subsidy: true,
          fiscalYear: true,
        },
      });

      if (!project) {
        throw new Error("ไม่พบโครงการ");
      }

      // อัพเดทยอดเบิกจ่ายและงบประมาณคงเหลือของโครงการ
      await this.prisma.project.update({
        where: { id: parseInt(projectId) },
        data: {
          withdrawalAmount: {
            increment: amount,
          },
          remainingBudget: {
            decrement: amount,
          },
        },
      });

      // อัพเดท withdrawal ของ subsidy
      const allProjects = await this.prisma.project.findMany({
        where: { subsidyId: project.subsidyId },
      });

      const totalWithdrawal = allProjects.reduce(
        (sum, p) => sum + p.withdrawalAmount,
        0
      );

      await this.prisma.subsidy.update({
        where: { id: project.subsidyId },
        data: {
          withdrawal: totalWithdrawal,
          remainingBudget: project.subsidy.budget - totalWithdrawal,
        },
      });

      // อัพเดทปีงบประมาณ
      const allSubsidies = await this.prisma.subsidy.findMany({
        where: { fiscalYearId: project.fiscalYearId },
        include: {
          projects: true,
        },
      });

      const totalExpense = allSubsidies.reduce((sum, subsidy) => {
        const subsidyWithdrawal = subsidy.projects.reduce(
          (projectSum, p) => projectSum + p.withdrawalAmount,
          0
        );
        return sum + subsidyWithdrawal;
      }, 0);

      await this.prisma.fiscalYear.update({
        where: { id: project.fiscalYearId },
        data: {
          totalExpense: totalExpense,
          remainingBudget: project.fiscalYear.totalBudget - totalExpense,
        },
      });

      return project;
    } catch (error) {
      throw new Error(`ไม่สามารถอัพเดตงบประมาณได้: ${error.message}`);
    }
  }

  // เพิ่มเมธอด searchTransactions
  async searchTransactions(searchTerm) {
    try {
      return await this.prisma.transaction.findMany({
        where: {
          OR: [
            {
              title: {
                contains: searchTerm,
              },
            },
            {
              note: {
                contains: searchTerm,
              },
            },
            {
              amount: {
                equals: !isNaN(searchTerm) ? parseFloat(searchTerm) : undefined,
              },
            },
          ],
        },
        include: {
          project: true,
        },
        orderBy: {
          date: "desc",
        },
      });
    } catch (error) {
      throw new Error(`ไม่สามารถค้นหารายการได้: ${error.message}`);
    }
  }
}

module.exports = TransactionService;
