"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  Inbox,
  House,
  Cog,
  Users,
  Settings2,
  X,
  BarChart2,
  BookMarked,
  ChevronLeft,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useReservationBadge } from "@/lib/hooks/useReservationBadge";

const navItems = [
  { label: "Главная", href: "/dashboard", icon: House },
  { label: "Заказы", href: "/dashboard/orders", icon: Inbox },
  { label: "Детали", href: "/dashboard/autoparts", icon: Cog },
  { label: "Бронирования", href: "/dashboard/reservations", icon: BookMarked },
  { label: "Клиенты", href: "/dashboard/clients", icon: Users },
  { label: "Общие", href: "/dashboard/general", icon: Settings2 },
  { label: "Аналитика", href: "/dashboard/analytics", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { count: reservationCount, markAsRead } = useReservationBadge();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = open && isMobile ? "hidden" : "";
  }, [open, isMobile]);

  useEffect(() => {
    if (pathname === "/dashboard/reservations") markAsRead();
  }, [pathname, markAsRead]);

  const NavItem = ({ item }: { item: (typeof navItems)[number] }) => {
    const isActive = pathname === item.href;
    const badge = item.href === "/dashboard/reservations" ? reservationCount : 0;

    return (
      <Link
        href={item.href}
        onClick={() => isMobile && setOpen(false)}
        className={clsx(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="relative shrink-0">
          <item.icon className="h-[18px] w-[18px]" />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className="truncate leading-none">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b bg-background z-40 relative">
        <span className="font-semibold text-sm">Admin Panel</span>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {reservationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none pointer-events-none">
              {reservationCount > 9 ? "9+" : reservationCount}
            </span>
          )}
        </div>
      </div>

      {/* Overlay */}
      {open && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-background border-r z-50 flex flex-col shrink-0 transition-all duration-300",
          "fixed inset-y-0 left-0 h-dvh md:sticky md:top-0 md:h-screen",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[52px]" : "w-52"
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            "flex items-center h-14 border-b px-3 shrink-0",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <span className="font-semibold text-sm truncate">Admin Panel</span>
          )}
          <button
            onClick={() => (isMobile ? setOpen(false) : setCollapsed((v) => !v))}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            {isMobile ? (
              <X className="h-5 w-5" />
            ) : collapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t p-2">
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className={clsx(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
