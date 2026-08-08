import { Routes } from '@angular/router';

export const adminModuleRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('../../features/admin/dashboard/dash-one/dash-one.component').then(
        (m) => m.DashOneComponent,
      ),
  },
  {
    path: 'role/master',
    loadComponent: () =>
      import('../admin/rights-masters/role-master/role-master.component').then(
        (m) => m.RoleMasterComponent,
      ),
    data: { title: 'Role Master' },
  },
  {
    path: 'role/permission/:roleCode',
    loadComponent: () =>
      import('../admin/rights-masters/role-permission-mapping/role-permission-mapping.component').then(
        (m) => m.RolePermissionMappingComponent,
      ),
    data: { title: 'Role Permission Mapping' },
  },
  {
    path: 'permission/master',
    loadComponent: () =>
      import('../admin/rights-masters/permission-master/permission-master.component').then(
        (m) => m.PermissionMasterComponent,
      ),
    data: { title: 'Permission Master' },
  },
  {
    path: 'permission/action/:permissionCode',
    loadComponent: () =>
      import('../admin/rights-masters/permission-action-mapping/permission-action-mapping.component').then(
        (m) => m.PermissionActionMappingComponent,
      ),
    data: { title: 'Permission Action Mapping' },
  },
  {
    path: 'product/category',
    loadComponent: () =>
      import('./catalog-masters/product-category/product-category').then((m) => m.ProductCategory),
    data: { title: 'Product Category' },
  },
  {
    path: 'product/sub-category',
    loadComponent: () =>
      import('./catalog-masters/product-subcategory/product-subcategory').then(
        (m) => m.ProductSubCategory,
      ),
    data: { title: 'Product SubCategory' },
  },
  {
    path: 'manufacturer',
    loadComponent: () =>
      import('./catalog-masters/manufacturers/manufacturers').then((m) => m.Manufacturers),
    data: { title: 'Manufacturer' },
  },
  {
    path: 'product',
    loadComponent: () => import('./product-masters/addproduct/product').then((m) => m.Product),
    data: { title: 'Product' },
  },
  {
    path: 'product/list',
    loadComponent: () =>
      import('./product-masters/listproduct/listproduct').then((m) => m.ProductList),
    data: { title: 'Product List' },
  },
  {
    path: 'product/product-images',
    loadComponent: () =>
      import('./product-masters/product-images/product-images').then((m) => m.ProductImages),
    data: { title: 'Product Images' },
  },
  {
    path: 'add/user',
    loadComponent: () => import('./users-masters/adduser/adduser').then((m) => m.Adduser),
    data: { title: 'User' },
  },
  {
    path: 'user/list',
    loadComponent: () => import('./users-masters/userlist/userlist').then((m) => m.Userlist),
    data: { title: 'User List' },
  },
  {
    path: 'user/address/book',
    loadComponent: () =>
      import('./users-masters/useraddressbook/useraddressbook').then((m) => m.Useraddressbook),
    data: { title: 'User Address Book' },
  },
  {
    path: 'user/address/book',
    loadComponent: () =>
      import('./users-masters/useraddressbook/useraddressbook').then((m) => m.Useraddressbook),
    data: { title: 'User Address Book' },
  },
  {
    path: 'add/banner',
    loadComponent: () => import('./banner-masters/banner/banner').then((m) => m.Banner),
    data: { title: 'Banner' },
  },
  {
    path: 'banner/list',
    loadComponent: () => import('./banner-masters/bannerlist/bannerlist').then((m) => m.Bannerlist),
    data: { title: 'Banner List' },
  },
  {
    path: 'product/review',
    loadComponent: () =>
      import('./product-review-masters/product-review/product-review').then((m) => m.ProductReview),
    data: { title: 'Product Review' },
  },
  {
    path: 'order/list',
    loadComponent: () => import('./order-masters/order-list/order-list').then((m) => m.OrderList),
    data: { title: 'Order List' },
  },
  {
    path: 'order/view',
    loadComponent: () => import('./order-masters/order-view/order-view').then((m) => m.OrderView),
    data: { title: 'Order View' },
  },
  {
    path: 'coupon/category',
    loadComponent: () =>
      import('./coupon-masters/coupon-category/coupon-category').then((m) => m.CouponCategory),
    data: { title: 'Coupon Category' },
  },
  {
    path: 'add/coupon',
    loadComponent: () =>
      import('./coupon-masters/coupon-master/coupon-master').then((m) => m.CouponMaster),
    data: { title: 'Coupon' },
  },
  {
    path: 'coupon/list',
    loadComponent: () =>
      import('./coupon-masters/coupon-list/coupon-list').then((m) => m.CouponList),
    data: { title: 'Coupon List' },
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('./faq-and-support-masters/faq-master/add-faq').then((m) => m.AddFaq),
    data: { title: 'Add FAQ' },
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./faq-and-support-masters/support-masters/support-master/support-master').then(
        (m) => m.SupportMaster,
      ),
    data: { title: 'Support Management' },
  },
  {
    path: 'support/chat',
    loadComponent: () =>
      import('./faq-and-support-masters/support-masters/support-chat/support-chat').then(
        (m) => m.SupportChat,
      ),
    data: { title: 'Support Ticket Chat' },
  },
  {
    path: 'tax/component',
    loadComponent: () =>
      import('./tax-masters/tax-component/tax-component').then((m) => m.TaxComponentComponent),
    data: { title: 'Tax Component Master' },
  },
  {
    path: 'tax/class',
    loadComponent: () =>
      import('./tax-masters/tax-class/tax-class').then((m) => m.TaxClassComponent),
    data: { title: 'Tax Class Master' },
  },
  {
    path: 'tax/rules',
    loadComponent: () =>
      import('./tax-masters/tax-rules/tax-rules').then((m) => m.TaxRulesComponent),
    data: { title: 'Tax Rules Master' },
  },
  {
    path: 'add/delivery/policy',
    loadComponent: () =>
      import('./delivery-policy-masters/add-delivery-policy/add-delivery-policy').then(
        (m) => m.AddDeliveryPolicy,
      ),
    data: { title: 'Delivery Policy' },
  },
  {
    path: 'delivery/policy',
    loadComponent: () =>
      import('./delivery-policy-masters/delivery-policy-list/delivery-policy-list').then(
        (m) => m.DeliveryPolicyList,
      ),
    data: { title: 'Delivery Policy List' },
  },
  {
    path: 'system/information',
    loadComponent: () =>
      import('./system-masters/system-information/system-information').then(
        (m) => m.SystemInformation,
      ),
    data: { title: 'System Information' },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./admin-master/admin-profile/admin-profile').then((m) => m.AdminProfile),
    data: { title: 'Admin Profile' },
  },
  {
    path: 'smtp/configuration',
    loadComponent: () =>
      import('./system-masters/smtp-config/smtp-config').then((m) => m.SmtpConfig),
    data: { title: 'SMTP Configuration' },
  },
  {
    path: 'add/template',
    loadComponent: () =>
      import('./system-masters/template-masters/add-template/add-template').then((m) => m.AddTemplate),
    data: { title: 'Add Template' },
  },
  {
    path: 'template/list',
    loadComponent: () =>
      import('./system-masters/template-masters/template-list/template-list').then((m) => m.TemplateList),
    data: { title: 'Template List' },
  },
  {
    path: 'email/queue',
    loadComponent: () =>
      import('./system-masters/email-masters/email-queue/email-queue').then((m) => m.EmailQueue),
    data: { title: 'Email Queue' },
  },
  {
    path: 'import/config',
    loadComponent: () =>
      import('./import-process-master/import-process/import-process').then(
        (m) => m.ImportProcess,
      ),
    data: { title: 'Import Process Configuration' },
  },
  {
    path: 'import',
    loadComponent: () =>
      import('../../shared/ui/import-component/import-component').then(
        (m) => m.ImportComponent,
      ),
    data: { title: 'Import' },
  },
  {
    path: 'primary-documents',
    loadComponent: () =>
      import('./system-masters/primary-documents/primary-documents').then(
        (m) => m.PrimaryDocuments,
      ),
    data: { title: 'Primary Documents' },
  },
];
