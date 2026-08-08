export interface TaxRuleModel {
  rule_id: number;
  class_id: number;
  class_name?: string;
  component_id: number;
  component_name?: string;
  transaction_type: string;
  rate: number;
  calculation_type: string;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
