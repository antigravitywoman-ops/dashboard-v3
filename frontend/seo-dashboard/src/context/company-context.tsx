'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompanies, type Company } from '@/lib/api'

interface CompanyContextType {
  currentCompany: Company | null
  setCurrentCompany: (company: Company | null) => void
  companies: Company[]
  companiesData: { active: Company[]; paused: Company[]; total: number } | undefined
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
  })

  const companies = [...(companiesData?.active || []), ...(companiesData?.paused || [])]

  // Auto-select first company if none selected
  useEffect(() => {
    if (!currentCompany && companies.length > 0) {
      setCurrentCompany(companies[0])
    }
  }, [companies, currentCompany])

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        setCurrentCompany,
        companies,
        companiesData,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
