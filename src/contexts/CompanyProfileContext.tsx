
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { CompanyProfile } from "@/lib/types";
import { useFirestore, useDoc, useUser } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
  isDataLoaded: boolean;
}

const CompanyProfileContext = createContext<CompanyProfileContextType | undefined>(undefined);

export const CompanyProfileProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const profileRef = user ? doc(firestore, "profiles", user.uid) : null;
  const { data: profileData, isLoading } = useDoc<CompanyProfile>(profileRef);

  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);

  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    } else if (user && !isLoading) {
      // If no profile exists for the user, create one with default data
      setDocumentNonBlocking(doc(firestore, "profiles", user.uid), defaultProfile, {});
    }
  }, [profileData, user, isLoading, firestore]);

  const updateProfile = (newProfile: CompanyProfile) => {
    if (profileRef) {
      setProfile(newProfile); // Optimistic update
      setDocumentNonBlocking(profileRef, newProfile, { merge: true });
    }
  };

  return (
    <CompanyProfileContext.Provider value={{ profile, updateProfile, isDataLoaded: !isLoading }}>
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
