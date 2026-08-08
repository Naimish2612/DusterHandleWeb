// =========================================================================
// ADDRESS BOOK — Model Definitions
// Matches create/edit/list API payloads exactly.
// All future API changes should be reflected here first.
// =========================================================================

/* ── API Response Envelope ───────────────────────────────────────────── */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
}

/* ── Address Entry (as returned in list response) ────────────────────── */
export interface AddressBook {
  address_book_id: number;
  user_code: number;
  full_name: string;
  mobile_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

/* ── Create Address Payload ──────────────────────────────────────────── */
export interface CreateAddressPayload {
  user_code: number;
  full_name: string;
  mobile_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

/* ── Edit Address Payload ────────────────────────────────────────────── */
export interface EditAddressPayload extends CreateAddressPayload {
  address_book_id: number;
}

/* ── Form value type (matches reactive form structure) ───────────────── */
export interface AddressFormValue {
  full_name: string;
  mobile_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

/* ── UI state for address card ───────────────────────────────────────── */
export interface AddressCardState {
  address: AddressBook;
  isDeleting: boolean;
  isSettingShipping: boolean;
  isSettingBilling: boolean;
}

/* ── Address type label config ───────────────────────────────────────── */
export interface AddressTagConfig {
  label: string;
  color: string;
  icon: string;
}

/* ── Indian States list (used in state dropdown) ─────────────────────── */
export const INDIAN_STATES: string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ── Country list (extensible for future international support) ──────── */
export const COUNTRIES: string[] = [
  'India'
];

/* ── Address tag helper ──────────────────────────────────────────────── */
export function getAddressTags(address: AddressBook): AddressTagConfig[] {
  const tags: AddressTagConfig[] = [];
  if (address.is_default_shipping) {
    tags.push({ label: 'Default Shipping', color: 'blue', icon: 'car' });
  }
  if (address.is_default_billing) {
    tags.push({ label: 'Default Billing', color: 'purple', icon: 'credit-card' });
  }
  return tags;
}

/* ── Empty address for form reset ────────────────────────────────────── */
export function emptyAddressForm(): AddressFormValue {
  return {
    full_name: '',
    mobile_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pin_code: '',
    is_default_shipping: false,
    is_default_billing: false,
  };
}

/* ── Convert AddressBook → AddressFormValue (for edit pre-fill) ──────── */
export function addressToFormValue(address: AddressBook): AddressFormValue {
  return {
    full_name: address.full_name,
    mobile_number: address.mobile_number,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    city: address.city,
    state: address.state,
    country: address.country,
    pin_code: address.pin_code,
    is_default_shipping: address.is_default_shipping,
    is_default_billing: address.is_default_billing,
  };
}

/* ── Build create payload from form value ────────────────────────────── */
export function buildCreatePayload(
  formValue: AddressFormValue,
  userCode: number
): CreateAddressPayload {
  return { user_code: userCode, ...formValue };
}

/* ── Build edit payload from form value ──────────────────────────────── */
export function buildEditPayload(
  formValue: AddressFormValue,
  userCode: number,
  addressBookId: number
): EditAddressPayload {
  return { address_book_id: addressBookId, user_code: userCode, ...formValue };
}
