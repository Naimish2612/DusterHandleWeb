import { Routes } from '@angular/router';

export const customerRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'home',
    loadComponent: () => import('./customer-home/customer-home').then((m) => m.CustoemrHome),
    data: { title: 'Welcome To Everest ECommerce' },
  },
  {
    path: 'products', // ← ADD THIS ROUTE
    loadComponent: () => import('../public/products/products').then((m) => m.Products),
    data: { title: 'Products' },
  },
  {
    path: 'my/profile',
    loadComponent: () => import('./my-profile/my-profile').then((m) => m.MyProfile),
    data: { title: 'My Profile' },
  },
  {
    path: 'my/orders',
    loadComponent: () => import('./my-orders/my-orders').then((m) => m.MyOrders),
    data: { title: 'My Orders' },
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./my-wishlist/my-wishlist').then((m) => m.MyWishlist),
    data: { title: 'My Wishlist' },
  },
  {
    path: 'my/address',
    loadComponent: () => import('./my-address-book/my-address-book').then((m) => m.MyAddressBook),
    data: { title: 'Address Book' },
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./checkout/checkout-shell/checkout-shell').then((m) => m.CheckoutShell),
    data: { title: 'Checkout' },
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./product-support/product-support').then((m) => m.ProductSupport),
    data: { title: 'Product Support' },
  },
  {
    path: 'support-chat/:orderCode',
    loadComponent: () =>
      import('./product-support/support-chat/support-chat').then((m) => m.SupportChat),
    data: { title: 'Support Chat' },
  },
  {
    path: 'my-tickets',
    loadComponent: () =>
      import('./my-tickets/my-tickets').then((m) => m.MyTickets),
    data: { title: 'My Support Tickets' },
  },
  { path: '**', redirectTo: '/home' },
];
