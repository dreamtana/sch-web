"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  useDisclosure,
  Input,
} from "@nextui-org/react";
import { Search, Download } from "lucide-react";
import EditFiscalYearModal from "./EditFiscalYearModal";
import AddFiscalYearModal from "./AddFiscalYearModal";
import TableWrapper from "@/components/common/TableWrapper";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { exportToPDF } from "../utils/exportPDF";

interface FiscalYear {
  id: number;
  year: string;
  totalBudget: number;
  totalExpense: number;
  remainingBudget: number;
}

interface FiscalYearTableProps {
  searchTerm: string;
  onSearch: (value: string) => void;
}

export default function FiscalYearTable({
  searchTerm,
  onSearch,
}: FiscalYearTableProps) {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] =
    useState<FiscalYear | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchFiscalYears = async () => {
    try {
      // ดึง token จาก localStorage
      const token = localStorage.getItem("token");
      console.log("Using token:", token); // เพิ่ม log เพื่อตรวจสอบ token

      const response = await fetch(
        "https://school-web-c2oh.onrender.com/fiscal-years",
        // "http://localhost:3001/fiscal-years",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include", // เพิ่มตัวเลือกนี้
        }
      );

      console.log("Response status:", response.status); // เพิ่ม log เพื่อตรวจสอบ status

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // เพิ่ม log เพื่อตรวจสอบข้อมูลที่ได้

      if (data.success) {
        setFiscalYears(data.data || []);
      } else {
        console.error("Failed to fetch fiscal years:", data.message);
        setFiscalYears([]);
      }
    } catch (error) {
      console.error("Error fetching fiscal years:", error);
      setFiscalYears([]);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const handleEdit = (fiscalYear: FiscalYear) => {
    setSelectedFiscalYear(fiscalYear);
    onOpen();
  };

  const handleDelete = async (id: number) => {
    setSelectedId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://school-web-c2oh.onrender.com/fiscal-years/${selectedId}`,
        // `http://localhost:3001/fiscal-years/${selectedId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchFiscalYears();
      }
    } catch (error) {
      console.error("Error deleting fiscal year:", error);
    }
    setDeleteModalOpen(false);
  };

  const filteredData = fiscalYears.filter(
    (item) =>
      item.year.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.totalBudget.toString().includes(searchTerm) ||
      item.totalExpense.toString().includes(searchTerm) ||
      item.remainingBudget.toString().includes(searchTerm)
  );

  const handleExportPDF = () => {
    const dataToExport = searchTerm ? filteredData : fiscalYears;
    exportToPDF({
      title: "รายงานปีงบประมาณ",
      filename: "fiscal-years-report",
      headers: [
        "ปีงบประมาณ",
        "งบประมาณทั้งหมด",
        "ค่าใช้จ่ายทั้งหมด",
        "งบประมาณคงเหลือ",
      ],
      data: dataToExport,
      mapping: (item) => [
        item.year,
        item.totalBudget.toLocaleString() + " บาท",
        item.totalExpense.toLocaleString() + " บาท",
        item.remainingBudget.toLocaleString() + " บาท",
      ],
      columnWidths: [
        "25%", // ปีงบประมาณ
        "25%", // งบประมาณทั้งหมด
        "25%", // ค่าใช้จ่ายทั้งหมด
        "25%", // งบประมาณคงเหลือ
      ],
      styles: {
        fontSize: 12,
        alignment: "center",
      },
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="w-full sm:max-w-[400px]">
          <Input
            value={searchTerm}
            onValueChange={onSearch}
            placeholder="ค้นหาปีงบประมาณ..."
            startContent={<Search className="text-default-400" size={20} />}
            radius="lg"
            classNames={{
              input: "text-sm",
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button
            color="primary"
            variant="flat"
            onPress={handleExportPDF}
            startContent={<Download size={20} />}
          >
            Export PDF
          </Button>
          <Button color="primary" onPress={onAddOpen}>
            เพิ่มปีงบประมาณ
          </Button>
        </div>
      </div>

      <TableWrapper>
        <Table aria-label="ตารางปีงบประมาณ" className="min-w-[800px]">
          <TableHeader>
            <TableColumn>ปีงบประมาณ</TableColumn>
            <TableColumn>งบประมาณทั้งหมด</TableColumn>
            <TableColumn>ค่าใช้จ่ายทั้งหมด</TableColumn>
            <TableColumn>งบประมาณคงเหลือ</TableColumn>
            <TableColumn>จัดการ</TableColumn>
          </TableHeader>
          <TableBody>
            {filteredData && filteredData.length > 0 ? (
              filteredData.map((fiscalYear) => (
                <TableRow key={fiscalYear.id}>
                  <TableCell>{fiscalYear.year}</TableCell>
                  <TableCell>
                    {fiscalYear.totalBudget.toLocaleString()} บาท
                  </TableCell>
                  <TableCell>
                    {fiscalYear.totalExpense.toLocaleString()} บาท
                  </TableCell>
                  <TableCell>
                    {fiscalYear.remainingBudget.toLocaleString()} บาท
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => handleEdit(fiscalYear)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        onPress={() => handleDelete(fiscalYear.id)}
                      >
                        ลบ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>ไม่พบข้อมูลปีงบประมาณ</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      <EditFiscalYearModal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setSelectedFiscalYear(null);
        }}
        fiscalYear={selectedFiscalYear}
        onSuccess={fetchFiscalYears}
      />

      <AddFiscalYearModal
        isOpen={isAddOpen}
        onClose={onAddClose}
        onSuccess={() => {
          fetchFiscalYears();
        }}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบปีงบประมาณ"
        message="คุณแน่ใจหรือไม่ที่จะลบปีงบประมาณนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
      />
    </>
  );
}
