import { DELETE, P, U } from '@angular/cdk/keycodes';

// src/app/core/constants/api-endpoints.ts
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: 'api/auth/login',
    REFRESH_TOKEN: 'api/auth/refresh/token',
  },

  RIGHTS_MASTER: {
    //Role Management
    ROLE_CREATE: 'api/rightsmaster/role/create',
    ROLE_DROPDOWN: 'api/rightsmaster/role/dropdown',
    ROLE_LIST: 'api/rightsmaster/role/list',
    ROLE_UPDATE: 'api/rightsmaster/role/update',
    ROLE_DELETE: 'api/rightsmaster/role/delete',
    ROLE_PERMISSION_MAPPING: 'api/rightsmaster/role/permission/create',
    PERMISSION_LIST_OF_ROLE: 'api/rightsmaster/permission/of/role/code',

    //Permission
    PERMISSION_CREATE: 'api/rightsmaster/permission/create',
    PERMISSION_LIST: 'api/rightsmaster/permission/list',
    PERMISSION_UPDATE: 'api/rightsmaster/permission/update',
    PERMISSION_DELETE: 'api/rightsmaster/permission/delete',
    PERMISSION_DROPDOWN: 'api/rightsmaster/permission/dropdown',
    PERMISSION_ACTION_MAPPING: 'api/rightsmaster/permission/action/create',

    //Actions
    ACTION_LIST_FOR_TREE: 'api/rightsmaster/get/action/tree/for',
  },

  USER: {
    USER_CREATE: 'api/user/signup',
    USER_LIST: 'api/user/list',
    USER_EDIT: 'api/user/profile/update',
    USER_REMOVE: 'api/user/remove',
    GET_USER_FROM_CACHE: 'api/user/get/user',
    USER_OTHER_CREATE: 'api/user/create/other/user',
    USER_SEND_OTP_EMAIL_VERIFICATION: 'api/alert/send/email/for/email/verification',
    USER_EMAIL_OTP_VERIFICATION: 'api/user/email/verification',
    USER_MOBILE_OTP_VERIFICATION_BY_EMAIL: 'api/alert/send/otp/for/password/reset',
    USER_PASSWORD_RESET_OTP_VERIFICATION: 'api/user/password/reset/otp/verification',
    USER_CHANGE_PASSWORD: 'api/user/change/password',
    USER_PERMISSION: 'api/rightsmaster/get/user/permissions',
  },
  PRODUCT_MASTER: {
    PRODUCT_CATEGORY_CREATE: 'api/master/create/product/category',
    PRODUCT_CATEGORY_LIST: 'api/master/get/product/category/list',
    PRODUCT_CATEGORY_UPDATE: 'api/master/edit/product/category',
    PRODUCT_CATEGORY_DELETE: 'api/master/category/delete',
  },
  COUPON_CATEGORY_MASTER: {
    COUPON_CATEGORY_CREATE: 'api/coupon/add/category',
    COUPON_CATEGORY_LIST: 'api/coupon/get-coupon-category',
    COUPON_CATEGORY_UPDATE: 'api/coupon/update/category',
  },
  COUPON_MASTER: {
    COUPON_LIST: 'api/coupon/get/all',
    GENERATE_COUPON_CODE: 'api/coupon/get/new/coupon',
    COUPON_CATEGORY_DROPDOWN: 'api/coupon/category/dropdown',
    COUPON_CREATE: 'api/coupon/create',
    COUPON_UPDATE: 'api/coupon/update',
  },
  PRODUCT_SUBCATEGORY: {
    PRODUCT_SUBCATEGORY_CREATE: 'api/master/create/product/subcategory',
    PRODUCT_SUBCATEGORY_LIST: 'api/master/get/product/subcategory/list',
    DROPDOWN_PRODUCT_CATEGORY_LIST: 'api/master/dropdown/product/category',
    PRODUCT_SUBCATEGORY_UPDATE: 'api/master/edit/product/subcategory',
    PRODUCT_SUBCATEGORY_DELETE: 'api/master/delete/product/subcategory',
  },
  MANUFACTURERS: {
    MANUFACTURERS_CREATE: 'api/master/create/manufacturer',
    MANUFACTURERS_LIST: 'api/master/get/manufacturer/list',
    MANUFACTURERS_UPDATE: 'api/master/edit/manufacturer',
    MANUFACTURERS_DELETE: 'api/master/delete/manufacturer',
  },
  PRODUCT: {
    PRODUCT_CREATE: 'api/catalog/add/product',
    PRODUCT_LIST: 'api/catalog/admin/list',
    PRODUCT_UPDATE: 'api/catalog/edit/product',
    PRODUCT_IMAGES: 'api/catalog/get/product/images',
    PRODUCT_ADD_IMAGES: 'api/catalog/add/product/images',
    PRODUCT_DELETE_IMAGE: 'api/catalog/remove/product/image',
    GET_PRODUCT_BY_SLUG: 'api/catalog/get/product',
  },
  USER_ADMIN: {
    CREATE_USER: 'api/user/create/other/user',
    UPDATE_USER: 'api/user/profile/update',
    DELETE_USER: 'api/user/remove',
    BLOCK_USER: 'api/user/block',
    USER_LIST: 'api/user/list',
    USER_ADDRESS_BOOK: 'api/customer/get/addresses',
    USER_BY_USERTYPE: 'api/user/get/user/from/usertype',
  },

  BANNER: {
    CREATE_BANNER: 'api/banner/add',
    UPDATE_BANNER: 'api/banner/update',
    DELETE_BANNER: 'api/banner/delete',
    BANNER_LIST: 'api/banner/list',
    ACTIVE_BANNERS: 'api/banner/active-banners',
    TOGGLE_ACTIVE_STATUS: 'api/banner',
  },

  CUSTOMER: {
    BANNER: {
      BANNER_LIST: 'api/banner/cache/active-banners', // ?{stateid}&{platform}
    },

    DROPDOWN: {
      MANUFACTURER: 'api/master/cache/manufacturer',
      CATEGORY: 'api/master/cache/product/category',
      SUB_CATEGORY: 'api/master/cache/product/subcategory', // + /{categoryId}
    },

    CATALOG: {
      TOP_SELLING: 'api/catalog/cache/top/selling',
      NEW_ARRIVALS: 'api/catalog/cache/new/arrival',
      ALL_PRODUCTS: 'api/catalog/cache/list',
      GET_PRODUCT_BY_SLUG: 'api/catalog/cache/get/product',
      PRODUCT_SEARCH: 'api/catlog/search',
      PRODUCT_FILTERS: 'api/catalog/filters',
      ADD_PRODUCT_REVIEW: 'api/product/review/add',
    },

    USER: {
      GET_USER: 'api/user/get/user',
      UPDATE_USER: 'api/user/profile/update',
      CHANGE_PASSWORD: 'api/user/change/password',
      SEND_EMAIL_VERIFICATION: 'api/user/send-email-verification',
      VERIFY_EMAIL: 'api/user/email/verification', // ?{user_code}&{otp}
      SEND_PHONE_VERIFICATION: 'api/user/send-phone-verification',
      VERIFY_PHONE: 'api/user/phone/verification',
      UPLOAD_PROFILE_PIC: 'api/user/upload/profile-pic',
      REMOVE_PROFILE_PIC: 'api/user/remove/profile-pic',
    },

    ORDER: {
      PLACE_ORDER: 'api/order/place-order',
      ADD_TO_CART: 'api/order/add-to-cart',
      GET_CART: 'api/order/get-cart',
      GET_ORDER_DETAILS_BY_ORDERNO: 'api/order/get-order',
      GET_MY_ORDERS: 'api/order/get-my-order',
      CHANGE_ORDER_STATUS: 'api/order/change/order/status',
      APPLY_COUPON: 'api/coupon/validate',
      REMOVE_COUPON: 'api/coupon/validate',
    },

    ADDRESS_BOOK: {
      ADD_ADDRESS: 'api/customer/add/address',
      EDIT_ADDRESS: 'api/customer/update/address',
      GET_ALL_ADDRESS_BY_USER_CODE: 'api/customer/get/addresses',
      GET_ADDRESS_BY_ID: 'api/customer/get/address',
      GET_DEFAULT_SHIPPING_ADDRESS_BY_USER_CODE: 'api/customer/get/default-shipping-address',
      GET_DEFAULT_BILLING_ADDRESS_BY_USER_CODE: 'api/customer/get/default-billing-address',
      SET_DEFAULT_SHIPPING_ADDRESS: 'api/customer/set/default-shipping-address',
      SET_DEFAULT_BILLING_ADDRESS: 'api/customer/set/default-billing-address',
      DELETE_ADDRESS: 'api/customer/delete/address',
    },

    WISHLIST: {
      LIST: 'api/customer/my-wishlist',
      ADD: 'api/customer/add-to-wishlist',
      REMOVE: 'api/customer/remove-from-wishlist',
    },

    CART: {
      ADD_TO_CART: 'api/order/add-to-cart',
      GET_CART: 'api/order/get-cart',
      GET_OPEN_CART: 'api/order/get/open-cart',
      TAX_SIMULATOR: 'api/tax/simulator',
    },

    SUPPORT: {
      GET_FAQ: 'api/support/product-faqs',
      RAISE_TICKET: 'api/support/raise-ticket',
      GET_TICKET_THREAD: 'api/support/ticket-thread',
      TICKET_REPLY: 'api/support/ticket-reply',
      MY_TICKETS: 'api/support/my-tickets'
    },

    DELIVERY: {
      CALCULATE_COST: 'api/deliverypolicy/calculate/delivery/cost',
      SAVE_ORDER_DELIVERY: 'api/deliverypolicy/add/order/delivery/calculation',
    },
  },

  PRODUCT_REVIEW: {
    GET_REVIEWS_BY_PRODUCT: 'api/product/review/get/by/product',
    DELETE_REVIEW: 'api/product/review/delete',
    PUBLISH_REVIEW: 'api/product/review/publish',
    GET_PRODUCT_BY_SUBCATEGORYID: 'api/master/dropdown/product/by/subcategory',
  },

  ORDER_MASTER: {
    ORDER_LIST: 'api/order/list',
    ORDER_VIEW: 'api/order/get-order',
    CHANGE_ORDER_STATUS: 'api/order/change/order/status',
    CHANGE_PAYMENT_STATUS: 'api/order/change/payment/status',
    UPLOAD_INVOICE: 'api/order/upload/invoice',
  },

  FAQ: {
    CREATE_OR_UPDATE: 'api/support/faq/manage',
    MAP_FAQ: 'api/support/faq/mapping',
    FAQ_LIST: 'api/support/faq/list',
  },
  SUPPORT: {
    TICKET_LIST: 'api/support/threads',
    TICKET_THREAD: 'api/support/agent/ticket-thread',
    AGENT_REPLY: 'api/support/agent/ticket-reply',
    UPDATE_STATUS: 'api/support/ticket-status/update',
  },

  TAX_MASTER: {
    TAX_COMPONENTS: {
      CREATE_TAX_COMPONENT: 'api/tax/manage/component',
      LIST_TAX_COMPONENT: 'api/tax/get/component/list',
      UPDATE_TAX_COMPONENT: 'api/tax/manage/component',
      DROPDOWN_TAX_COMPONENT: 'api/tax/get/component/dropdown',
    },
    TAX_CLASS: {
      CREATE_TAX_CLASS: 'api/tax/manage/class',
      LIST_TAX_CLASS: 'api/tax/get/class/list',
      UPDATE_TAX_CLASS: 'api/tax/manage/class',
      DROPDOWN_TAX_CLASS: 'api/tax/get/class/dropdown',
    },
    TAX_RULES: {
      CREATE_TAX_RULE: 'api/tax/manage/rule',
      LIST_TAX_RULE: 'api/tax/get/rules/list',
      UPDATE_TAX_RULE: 'api/tax/manage/rule',
      TAX_SIMULATIOR: 'api/tax/simulator',
    },
  },
  DELIVERY_POLICY: {
    CREATE: 'api/deliverypolicy/add/new/policy',
    LIST: 'api/deliverypolicy/get/all/policy',
    UPDATE: 'api/deliverypolicy/edit/policy',
    TOGGLE_STATUS: 'api/deliverypolicy/mange/active/inactive',
    CREATE_SLAB: 'api/deliverypolicy/add/policy/slab',
    EDIT_SLAB: 'api/deliverypolicy/edit/policy/slab',
    SLAB_LIST_BY_ID: 'api/deliverypolicy/get/all/slab',
    SIMULATOR: 'api/deliverypolicy/simulator/delivery/cost/calculation'
  },
  SMTP_CONFIG: {
    CREATE: 'api/add/smtp/config',
    LIST: 'api/get/smtp/config/list',
    UPDATE: 'api/edit/smtp/config',
    GET_BY_ID: 'api/get/smtp/config',
    DROPDOWN_CATEGORY: 'api/dropdown/smtp/category',
    DROPDOWN_EMAIL: 'api/dropdown/smtp/email',
  },
  TEMPLATE: {
    CREATE: 'api/Alert/add/template',
    LIST: 'api/Alert/get/template/list',
    UPDATE: 'api/Alert/edit/template',
    GET_BY_ID: 'api/Alert/get/template',
  },
  IMPORT: {
    GET_FIELDS: 'api/import/fields',
    CREATE: 'api/import/process/create',
    UPDATE: 'api/import/process/update',
    LIST: 'api/import/process/list',
    BY_ID: 'api/import/process/by', // + /{import_id}
    DELETE: 'api/import/process/delete', // + /{import_id}
    FILE_UPLOAD: 'api/import/process/file/upload',
    FILE_STATUS: 'api/import/process/file/status',
    ALL_JOBS: 'api/import/process/file/status/all',
  },
  PRIMARY_DOCUMENTS: {
    CREATE: 'api/primarydocuments/add',
    UPDATE: 'api/primarydocuments/edit',
    LIST: 'api/primarydocuments/list',
    GET_BY_ID: 'api/primarydocuments/get/by',
    GET_BY_NAME: 'api/primarydocuments/get/by/document_',
  }
};

