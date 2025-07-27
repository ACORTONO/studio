
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutDashboard, Briefcase, BarChart2, FileText } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/",
      label: "New Job Order",
      icon: FilePlus2,
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
        href: "/reports",
        label: "Reports",
        icon: BarChart2
    },
    {
        href: "/reports",
        label: "Invoice",
        icon: FileText
    }
  ];

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Company Logo" width={100} height={100} className="w-24 h-auto"/>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href + item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href && item.label !== "Invoice"}
                className={cn(
                  "w-full justify-start",
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5 mr-2" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
