export interface TaxSimulatorRequest {
  entered_price: number;
  tax_class_id: number;
  transaction_type: string;
  is_inclusive: boolean;
}

export interface TaxComponent {
  component_name: string;
  rate: number;
  calculation_type: string;
  calculated_amount: number;
}

export interface TaxSimulatorResponse {
  entered_price: number;
  net_base_price: number;
  total_tax_amount: number;
  final_customer_price: number;
  tax_breakdown: TaxComponent[];
}
