
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutDashboard, BarChart2, Receipt, Settings, FileText, Building2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/job-order",
      label: "Job Order Form",
      icon: FilePlus2,
    },
    {
      href: "/dashboard",
      label: "Sales Dashboard",
      icon: LayoutDashboard,
    },
    {
        href: "/reports",
        label: "Sales Reports",
        icon: BarChart2
    },
    {
        href: "/delivery-receipt",
        label: "Delivery Receipt",
        icon: Receipt,
    },
     {
      href: "/invoice",
      label: "Invoice Form",
      icon: FileText,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: Settings,
    }
  ];

  return (
    <>
      <div className="p-4">
        <Link href="/">
            <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={150} height={150} className="w-36 h-auto"/>
        </Link>
      </div>
      <div className="flex flex-col flex-1 overflow-auto">
        <SidebarMenu>
          {menuItems.map((item, index) => (
            <SidebarMenuItem key={`${item.href}-${index}`}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
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
      </div>
    </>
  );
}
