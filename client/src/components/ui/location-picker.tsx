import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LocationPickerProps {
  value?: string;
  onChange: (location: string) => void;
  label?: string;
  className?: string;
}

// Top countries with states/provinces
const COUNTRIES_WITH_STATES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "Other", name: "Other" }
];

// US States
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
];

// Canadian Provinces
const CA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Saskatchewan", "Yukon"
];

// UK Regions
const UK_REGIONS = [
  "England", "Scotland", "Wales", "Northern Ireland"
];

// Australian States
const AU_STATES = [
  "New South Wales", "Victoria", "Queensland", "South Australia", "Western Australia",
  "Tasmania", "Northern Territory", "Australian Capital Territory"
];

// Mexican States (top states)
const MX_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo",
  "Jalisco", "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
  "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  US: US_STATES,
  CA: CA_PROVINCES,
  GB: UK_REGIONS,
  AU: AU_STATES,
  MX: MX_STATES
};

export function LocationPicker({ value, onChange, label = "Location (State/Province)", className }: LocationPickerProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  
  // Parse existing value on mount
  useEffect(() => {
    if (value && value.includes(",")) {
      const parts = value.split(",").map(p => p.trim());
      if (parts.length >= 2) {
        const state = parts[0];
        const country = parts[parts.length - 1];
        
        // Find country code
        const countryData = COUNTRIES_WITH_STATES.find(c => c.name === country);
        if (countryData) {
          setSelectedCountry(countryData.code);
          setSelectedState(state);
        }
      }
    }
  }, [value]);
  
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedState("");
    
    // If country doesn't have states, just save country
    if (!STATES_BY_COUNTRY[country]) {
      const countryName = COUNTRIES_WITH_STATES.find(c => c.code === country)?.name || country;
      onChange(countryName);
    } else {
      onChange("");
    }
  };
  
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const countryName = COUNTRIES_WITH_STATES.find(c => c.code === selectedCountry)?.name || selectedCountry;
    onChange(`${state}, ${countryName}`);
  };
  
  const stateOptions = selectedCountry ? STATES_BY_COUNTRY[selectedCountry] : [];
  const hasStates = stateOptions && stateOptions.length > 0;
  
  return (
    <div className={className}>
      {label && <Label className="text-gray-300 mb-2 block">{label}</Label>}
      
      <div className="space-y-3">
        {/* Country Selector */}
        <Select value={selectedCountry} onValueChange={handleCountryChange}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Select Country" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-white/10">
            {COUNTRIES_WITH_STATES.map((country) => (
              <SelectItem 
                key={country.code} 
                value={country.code}
                className="text-white hover:bg-white/10"
              >
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* State/Province Selector (conditional) */}
        {selectedCountry && hasStates && (
          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select State/Province" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10 max-h-[300px]">
              {stateOptions.map((state) => (
                <SelectItem 
                  key={state} 
                  value={state}
                  className="text-white hover:bg-white/10"
                >
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {selectedCountry === "Other" && (
          <p className="text-xs text-gray-400">
            For other countries, please enter your location in your bio.
          </p>
        )}
      </div>
    </div>
  );
}

