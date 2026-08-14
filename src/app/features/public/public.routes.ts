import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    data: { title: 'Duster' },
  },
  {
    path: 'products',
    loadComponent: () => import('./products/products').then((m) => m.Products),
    data: { title: 'Products - Duster' },
  },
  {
    path: 'catalogue',
    loadComponent: () => import('./catalogue/catalogue').then((m) => m.Catalogue),
    data: { title: 'catalogue - Duster' },
  },
  {
    path: 'product-detail/:id',
    loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
    data: { title: 'Product Details - Duster' },
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about').then((m) => m.About),
    data: { title: 'About Us - Duster' },
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact').then((m) => m.Contact),
    data: { title: 'Contact Us - Duster' },
  },
  {
    path: 'help/privacy-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'privacy_policy' }
  },
  {
    path: 'help/terms-and-conditions',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'terms_of_service' }
  },
  {
    path: 'help/cookie-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'cookie_policy' }
  },
  {
    path: 'help/return-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'return_policy' } // Adjust key if your backend uses a different name
  },
  {
    path: 'help/refund-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'refund_policy' }
  },
  {
    path: 'help/replacement-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'replacement_policy' }
  },
  {
    path: 'help/grievance-redressal-policy',
    loadComponent: () => import('./policy-terms/policy-terms').then(m => m.PolicyTerms),
    data: { policyKey: 'grievance_redressal_policy' }
  }
];
