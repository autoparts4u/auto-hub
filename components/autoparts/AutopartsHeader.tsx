import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AutopartsHeader({
  onCreate,
  onSearchChange,
}: {
  onCreate: () => void;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">Автозапчасти</h2>

      <div className="flex items-center gap-2">
        {onSearchChange && (
          <Input
            placeholder="Поиск по артикулу..."
            className="w-64"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>
    </div>
  );
}
