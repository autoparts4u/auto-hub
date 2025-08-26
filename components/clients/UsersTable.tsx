"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PriceTypes, User, Warehouses } from "@prisma/client";

type ShortUser = Pick<
    User,
    | "id"
    | "name"
    | "email"
    | "phone"
    | "priceAccessId"
    | "warehouseAccessId"
    | "role"
    | "isConfirmed" 
  >

type Props = {
  initialUsers: ShortUser[];
  priceTypes: PriceTypes[];
  warehouses: Warehouses[];
};

export function UsersTable({ initialUsers, priceTypes, warehouses }: Props) {
  const [users, setUsers] = useState(initialUsers);

  const handleChange = async (
    userId: string,
    field: keyof ShortUser,
    value: string | number | null | boolean
  ) => {
    const prev = users.find((u) => u.id === userId)?.[field];
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
    );

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      toast.error("Ошибка при обновлении");
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, [field]: prev } : u
        )
      );
      return;
    }

    toast.success("Обновление прошло успешно");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Пользователи</h2>
      <div className="overflow-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Имя</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Телефон</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Тип цены</th>
              <th className="p-3 text-left">База</th>
              <th className="p-3 text-left">Подтвержден</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                {/* редактируемое имя */}
                <td className="p-3">
                  <Input
                    value={user.name ?? ""}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.id === user.id
                            ? { ...u, name: e.target.value }
                            : u
                        )
                      )
                    }
                    onBlur={(e) =>
                      handleChange(user.id, "name", e.target.value)
                    }
                    placeholder="Введите имя"
                    className="w-[180px]"
                  />
                </td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.phone ?? "-"}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">
                  <Select
                    value={user.priceAccessId?.toString() ?? "none"}
                    onValueChange={(val) =>
                      handleChange(
                        user.id,
                        "priceAccessId",
                        val === "none" ? null : Number(val)
                      )
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Выберите тип цены" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбран</SelectItem>
                      {priceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <Select
                    value={user.warehouseAccessId?.toString() ?? "none"}
                    onValueChange={(val) =>
                      handleChange(
                        user.id,
                        "warehouseAccessId",
                        val === "none" ? null : Number(val)
                      )
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Выберите базу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбран</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem
                          key={warehouse.id}
                          value={warehouse.id.toString()}
                        >
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <Switch
                    checked={user.isConfirmed}
                    onCheckedChange={(val) =>
                      handleChange(user.id, "isConfirmed", val)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}