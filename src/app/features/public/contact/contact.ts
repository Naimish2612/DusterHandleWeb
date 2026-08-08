import { Component, signal, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { CommonModule } from '@angular/common';

export interface ContactInfo {
  icon: string;
  title: string;
  subtitle: string;
  value: string;
  link?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCollapseModule,
    NzSelectModule,
    NzGridModule,
    NzDividerModule,
  ],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class Contact {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);

  isLoading = signal(false);

  contactForm: FormGroup = this.fb.group({
    firstName: [null, [Validators.required, Validators.minLength(2)]],
    lastName:  [null, [Validators.required, Validators.minLength(2)]],
    email:     [null, [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    phone:     [null, [Validators.pattern(/^\d{10}$/)]],
    subject:   [null, [Validators.required]],
    message:   [null, [Validators.required, Validators.minLength(20)]],
  });

  subjects = [
    { label: 'Order Inquiry',        value: 'order' },
    { label: 'Return & Refund',      value: 'return' },
    { label: 'Product Question',     value: 'product' },
    { label: 'Technical Support',    value: 'support' },
    { label: 'Bulk / B2B Orders',    value: 'bulk' },
    { label: 'Partnership',          value: 'partner' },
    { label: 'Feedback',             value: 'feedback' },
    { label: 'Other',                value: 'other' },
  ];

  // ─── Updated with correct Everest House details ───
  contactCards: ContactInfo[] = [
    // {
    //   icon: 'home',
    //   title: 'Contact Information',
    //   subtitle: '',
    //   value: '',
    //   link: '#',
    // },
    {
      icon: 'phone',
      title: 'Call Us',
      subtitle: 'Mon – Sat · 9:30 AM to 6:30 PM IST',
      value: '1800 202 0010',
      link: 'tel:+9118002020010',
    },
    {
      icon: 'mail',
      title: 'Email Us',
      subtitle: 'We reply within 24 hours',
      value: 'info@everestinstruments.in',
      link: 'mailto:info@everestinstruments.in',
    },
    {
      icon: 'environment',
      title: 'Head Office',
      subtitle: 'Come visit us',
      value: 'Everest House, 3, Times Corporate Park, Thaltej – Shilaj Road, Thaltej, Ahmedabad- 380059, Gujarat, India.',
    }
  ];

  faqs: FAQ[] = [
    {
      question: 'How long does standard shipping take?',
      answer:
        'Standard delivery takes 3 – 5 business days within India. Metro cities typically receive orders in 1 – 2 days. Express shipping (next-day delivery) is available at checkout for an additional fee. Orders placed before 2 PM IST are dispatched the same day.',
    },
    {
      question: 'What is the return & refund policy?',
      answer:
        'We offer a hassle-free 30-day return policy for all products in their original, unused condition with original packaging. Initiate a return from your "My Orders" dashboard — we arrange free doorstep pickup. Refunds are credited within 5 – 7 business days to your original payment method.',
    },
    {
      question: 'Are my payments secure on EverestShop?',
      answer:
        'Absolutely. We use 256-bit SSL encryption and are fully PCI-DSS compliant. Accepted payment modes include UPI, Credit/Debit cards, Net Banking, Wallets, EMI, and Cash on Delivery. We never store your full card details on our servers — all card data is tokenised through our payment gateway.',
    },
    {
      question: 'How do I track my order in real time?',
      answer:
        'As soon as your order is dispatched, you receive an SMS and email with a tracking link. You can also track any order from "My Orders" → "Track Shipment" in your account. Live tracking is supported for all our logistics partners including Delhivery, Blue Dart, and Ekart.',
    },
    {
      question: 'Can I modify or cancel an order after placing it?',
      answer:
        'Orders can be modified or cancelled within 2 hours of placement via the "My Orders" page. After the 2-hour window, if the order has been handed over to logistics, cancellation is not possible — you will need to follow the return process once the order is delivered. For urgent requests, contact our support team immediately via phone or live chat.',
    },
    {
      question: 'Do you offer Cash on Delivery (COD)?',
      answer:
        'Yes! COD is available for orders up to ₹10,000 at most serviceable pin codes across India. A nominal ₹49 COD handling charge applies. Simply select "Cash on Delivery" at the payment step during checkout.',
    },
  ];

  submitForm(): void {
    if (this.contactForm.valid) {
      this.isLoading.set(true);
      setTimeout(() => {
        this.isLoading.set(false);
        this.message.success(
          'Your message has been sent! We\'ll get back to you within 24 hours. 🎉'
        );
        this.contactForm.reset();
      }, 1600);
    } else {
      Object.values(this.contactForm.controls).forEach((ctrl) => {
        ctrl.markAsDirty();
        ctrl.updateValueAndValidity({ onlySelf: true });
      });
    }
  }
}