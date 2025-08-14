
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { CompanyProfile } from "@/lib/types";

const defaultProfile: CompanyProfile = {
  name: "ADSLAB ADVERTISING SERVICES",
  logoUrl: "https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png",
  address: "123 Printing Press Lane, Imus, Cavite, 4103",
  email: "sales@adslab.com",
  contactNumber: "(123) 456-7890",
  tinNumber: "123-456-789-000",
  facebookPage: "https://www.facebook.com/adslabservices",
};

interface CompanyProfileContextType {
  profile: CompanyProfile;
  updateProfile: (profile: CompanyProfile) => void;
}

const CompanyProfileContext = createContext<CompanyProfileContextType | undefined>(undefined);

export const CompanyProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedProfile = localStorage.getItem('companyProfile');
            if (storedProfile) {
                setProfile(JSON.parse(storedProfile));
            } else {
                setProfile(defaultProfile);
            }
        } catch (error) {
            console.error("Failed to parse company profile from localStorage", error);
            setProfile(defaultProfile);
        }
        setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
        try {
            localStorage.setItem('companyProfile', JSON.stringify(profile));
        } catch (error) {
            console.error("Failed to save company profile to localStorage", error);
        }
    }
  }, [profile, isDataLoaded]);

  const updateProfile = (newProfile: CompanyProfile) => {
    setProfile(newProfile);
  };

  return (
    <CompanyProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  );
};

export const useCompanyProfile = () => {
  const context = useContext(CompanyProfileContext);
  if (context === undefined) {
    throw new Error("useCompanyProfile must be used within a CompanyProfileProvider");
  }
  return context;
};
