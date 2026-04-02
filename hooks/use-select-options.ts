import { useState, useEffect } from 'react';
import { api } from '@/config/api';
import { useAuthStore, type SelectOptionsData, type SelectOption, type AddressOption, type SoumOption } from '@/store/auth-store';

export function useSelectOptions() {
  const selectOptions = useAuthStore((state) => state.selectOptions);
  const setSelectOptions = useAuthStore((state) => state.setSelectOptions);

  const [bankOptions, setBankOptions] = useState<SelectOption[]>(selectOptions?.bank ?? []);
  const [nationalityOptions, setNationalityOptions] = useState<SelectOption[]>(selectOptions?.nationality ?? []);
  const [relationshipOptions, setRelationshipOptions] = useState<SelectOption[]>(selectOptions?.emergencyRelation ?? []);
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>(selectOptions?.address ?? []);
  const [isLoading, setIsLoading] = useState(!selectOptions);

  useEffect(() => {
    if (selectOptions) return;

    let cancelled = false;

    async function fetchOptions() {
      try {
        const res = await api<SelectOptionsData>({ path: '/select-options' });
        if (!cancelled && res.status === 200) {
          const data: SelectOptionsData = {
            bank: res.data.bank,
            nationality: res.data.nationality,
            emergencyRelation: res.data.emergencyRelation,
            address: res.data.address,
          };
          setBankOptions(data.bank);
          setNationalityOptions(data.nationality);
          setRelationshipOptions(data.emergencyRelation);
          setAddressOptions(data.address);
          setSelectOptions(data);
        }
      } catch (error) {
        console.error('Failed to fetch select options:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchOptions();
    return () => { cancelled = true; };
  }, [selectOptions, setSelectOptions]);

  return {
    bankOptions,
    nationalityOptions,
    relationshipOptions,
    addressOptions,
    isLoading,
  };
}