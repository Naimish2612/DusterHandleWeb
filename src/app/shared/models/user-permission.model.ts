export interface UserPermissionApiResponse {
  statusCode: number;
  message: string;
  data?: UserPermissionPayload | Record<string, unknown> | unknown[] | null;
  requestId?: string;
  timestamp?: string;
}

export interface UserPermissionPayload {
  user_name?: string;
  user_type?: string;
  role_name?: string;
  menu_items?: UserPermissionMenuItem[];
  allowed_actions?: string[];
  [key: string]: unknown;
}

export interface UserPermissionMenuItem {
  action_code?: string | number;
  title?: string;
  route?: string;
  icon?: string;
  children?: UserPermissionMenuItem[];
  [key: string]: unknown;
}
