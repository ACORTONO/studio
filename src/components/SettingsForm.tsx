
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/contexts/CompanyProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Save, Upload } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import React, { useEffect, useRef } from "react";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Company name is required."),
  logoUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  address: z.string().min(1, "Address is required."),
  email: z.string().email("Invalid email address."),
  contactNumber: z.string().min(1, "Contact number is required."),
  tinNumber: z.string().optional(),
  facebookPage: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsForm() {
  const { toast } = useToast();
  const { profile, updateProfile, isDataLoaded } = useCompanyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      address: "",
      email: "",
      contactNumber: "",
      tinNumber: "",
      facebookPage: "",
    },
  });

  useEffect(() => {
    if (isDataLoaded) {
      form.reset({
        ...profile,
        tinNumber: profile.tinNumber || "",
        facebookPage: profile.facebookPage || "",
        logoUrl: profile.logoUrl || "",
      });
    }
  }, [isDataLoaded, profile, form]);


  const onSubmit = (data: SettingsFormValues) => {
    updateProfile(data);
    toast({
      title: "Success",
      description: "Company profile updated successfully.",
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            form.setValue('logoUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  if (!isDataLoaded) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Manage your company's information. This will be reflected on invoices and job orders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Your Company LLC" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Logo</FormLabel>
                            <div className="flex items-center gap-4">
                                <Image 
                                    src={field.value || "https://placehold.co/100x100.png"} 
                                    alt="Logo Preview" 
                                    width={100} 
                                    height={100} 
                                    className="w-24 h-24 rounded-md border object-cover"
                                />
                                <div className="flex-1 space-y-2">
                                     <FormControl>
                                        <Input 
                                            placeholder="Enter image URL or upload a file" 
                                            {...field} 
                                            value={field.value || ''}
                                         />
                                    </FormControl>
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Logo
                                    </Button>
                                    <Input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                </div>
                            </div>
                         <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                            <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                    />
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="contact@yourcompany.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="contactNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="tinNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>TIN Number</FormLabel>
                            <FormControl>
                                <Input placeholder="123-456-789-000" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="facebookPage"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Facebook Page URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://facebook.com/yourcompany" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
            </CardContent>
        </Card>
        <div className="flex justify-end">
            <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}
