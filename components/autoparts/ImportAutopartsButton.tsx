"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ImportAutopartsButton() {
  const router = useRouter();

  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: unknown[] = XLSX.utils.sheet_to_json(sheet);

      // Загружаем файл с прогрессом
      setIsUploading(true);
      setProgress(0);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/autoparts/import", true);
      xhr.setRequestHeader("Content-Type", "application/json");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          setProgress(100);
          toast.success("Импорт завершен");
          router.refresh();
        } else {
          toast.error("Ошибка при импорте");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        toast.error("Ошибка сети");
      };

      xhr.send(JSON.stringify(jsonData));
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      <Button
        className="bg-green-700 hover:bg-green-800 hover:cursor-pointer text-white"
        disabled={isUploading}
        onClick={() => document.getElementById("importFileInput")?.click()}
      >
        {isUploading ? "Импортируется..." : "Импортировать Excel"}
      </Button>

      <input
        type="file"
        id="importFileInput"
        accept=".xlsx, .xls, .csv"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-[300px]" />
          <p className="text-sm text-muted-foreground">{progress}%</p>
        </div>
      )}
    </div>
  );
}
