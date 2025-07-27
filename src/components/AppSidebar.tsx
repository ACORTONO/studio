
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutDashboard, BarChart2, Receipt, Settings, FileText } from "lucide-react";
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
      href: "/",
      label: "Invoice Form",
      icon: FileText,
    },
    {
        href: "/delivery-receipt",
        label: "Delivery Receipt",
        icon: Receipt,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: Settings,
    }
  ];

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
            <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={150} height={150} className="w-36 h-auto"/>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item, index) => (
            <SidebarMenuItem key={`${item.href}-${index}`}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href && !(item.label === "Job Order Form" || item.label === "Invoice Form")}
                className={cn(
                  "w-full justify-start",
                   (pathname === "/" && (item.label === "Job Order Form" || item.label === "Invoice Form") && pathname === item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
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
