export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  is_custom: boolean;
}

export interface ServiceOrderMaterial {
  id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  material?: Material;
}

export interface ServiceOrderPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'during' | 'after';
}

export interface ServiceOrderItem {
  service_type: 'installation' | 'maintenance' | 'cleaning' | 'gas_recharge' | 'other';
  equipment_type?: string;
  equipment_power?: string;
  custom_service_value?: number;
  description?: string;
  materials: Array<{
    material: Material;
    quantity: number;
  }>;
}

export interface ServiceOrder {
  id: string;
  customer_id: string;
  services: ServiceOrderItem[];
  include_photos: boolean;
  location_lat?: number;
  location_lng?: number;
  status: 'pending' | 'in_progress' | 'completed';
  total_amount: number;
  customer?: Customer;
  photos?: string[];
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface CompanyInformation {
  id?: string;
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  logo?: string;
}

export interface ServicePrices {
  installation_prices: {
    [key: string]: {
      [btus: string]: string;
    };
  };
  cleaning_prices: {
    [key: string]: string;
  };
}