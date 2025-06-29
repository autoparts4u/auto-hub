"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PriceTypes, User } from "@prisma/client";

type Props = {
  initialUsers: Pick<User, "id" | "name" | "email" | "priceAccessId" | "role">[]; 
  priceTypes: PriceTypes[];
};

export function UsersTable({ initialUsers, priceTypes }: Props) {
  const [users, setUsers] = useState(initialUsers);

  const handleChange = async (userId: string, priceAccessId: number | null) => {
    const prev = users.find((u) => u.id === userId)?.priceAccessId;
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, priceAccessId } : u))
    );

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceAccessId }),
    });

    if (!res.ok) {
      toast.error("Ошибка при обновлении");
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, priceAccessId: prev ?? null } : u
        )
      );
      return;
    }

    toast.success("Тип цены обновлён");
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
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Тип цены</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.name ?? "—"}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">
                  <Select
                    value={user.priceAccessId?.toString() ?? "none"}
                    onValueChange={(val) =>
                      handleChange(user.id, val === "none" ? null : Number(val))
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
