export interface MenuItem {
  actionCode: number;
  title: string;
  route?: string;
  icon?: string;
  children?: MenuItem[];
}
