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
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

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

      if (jsonData.length === 0) {
        toast.error("Файл пустой или не содержит данных");
        return;
      }

      // Начинаем импорт
      setIsUploading(true);
      setProgress(0);
      setProcessedCount(0);
      setTotalCount(jsonData.length);

      try {
        const response = await fetch("/api/autoparts/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
          throw new Error("Ошибка при импорте");
        }

        // Читаем SSE поток
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Не удалось получить поток данных");
        }

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.error) {
                  toast.error(data.error);
                  setIsUploading(false);
                  return;
                }

                if (data.progress !== undefined) {
                  setProgress(data.progress);
                  // Вычисляем количество обработанных записей
                  const processed = Math.round((data.progress / 100) * jsonData.length);
                  setProcessedCount(processed);
                }

                if (data.done) {
                  setProgress(100);
                  toast.success(`Импорт завершен! Обработано ${jsonData.length} записей`);
                  setIsUploading(false);
                  router.refresh();
                  // Сброс input для возможности повторной загрузки
                  const input = document.getElementById("importFileInput") as HTMLInputElement;
                  if (input) input.value = "";
                }
              } catch (error) {
                console.error("Ошибка парсинга SSE:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Ошибка импорта:", error);
        toast.error("Ошибка при импорте файла");
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <div>
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
      </div>

      {/* Полноэкранный оверлей с лоадером */}
      {isUploading && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="space-y-6">
              {/* Заголовок */}
              <div className="text-center">
                <div className="mx-auto w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Импорт данных</h3>
                <p className="text-sm text-muted-foreground">
                  Пожалуйста, не закрывайте страницу
                </p>
              </div>

              {/* Прогресс бар */}
              <div className="space-y-3">
                <Progress value={progress} className="h-3" />
                
                {/* Статистика */}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-primary text-lg">{progress}%</span>
                  <span className="text-muted-foreground">
                    {processedCount} / {totalCount} записей
                  </span>
                </div>

                {/* Описание процесса */}
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Обрабатываются запчасти, создаются бренды и категории...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
