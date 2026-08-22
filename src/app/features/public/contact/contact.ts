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
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
    subject: ['order', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  subjects = [
    { label: 'Order Inquiry', value: 'order' },
    { label: 'Return & Refund', value: 'return' },
    { label: 'Product Question', value: 'product' },
    { label: 'Technical Support', value: 'support' },
    { label: 'Bulk / B2B Orders', value: 'bulk' },
    { label: 'Partnership', value: 'partner' },
    { label: 'Feedback', value: 'feedback' },
    { label: 'Other', value: 'other' },
  ];

  // ─── Updated with correct Duster details ───
  contactCards: ContactInfo[] = [
    {
      icon: 'phone',
      title: 'Call Us',
      subtitle: 'Mon – Sat · 9:30 AM to 6:30 PM IST',
      value: '+91 93777 04346',
      link: 'tel:+919377704346',
    },
    {
      icon: 'mail',
      title: 'Email Us',
      subtitle: 'We reply within 24 hours',
      value: 'studio@duster.com',
      link: 'mailto:studio@duster.com',
    },
    {
      icon: 'environment',
      title: 'Head Office',
      subtitle: 'Come visit us',
      value: 'Duster, Plot No 5, Ring Road, National Highway-27, Rajkot - 360002, Gujarat, India.',
    }
  ];

  faqs: FAQ[] = [
    {
      question: 'Can you make my own handle designed Products ?',
      answer:
        'Yes, we offer fully custom manufacturing and OEM/ODM services for bespoke designs. You can share your technical blueprints, 3D CAD models, or physical samples with our engineering team. We will evaluate tool design, structural viability, and material options before providing a comprehensive quotation and prototype timeline.',
    },
    {
      question: 'What condition of drawer slide capacity do you test , please ?',
      answer:
        'Our drawer slides undergo rigorous dynamic and static load capacity testing. We test them using fully extended configurations under continuous cycling (typically up to 50,000 to 100,000 open-close cycles) to measure structural fatigue, deflection limits, and smooth ball-bearing movement under maximum weight specifications.',
    },
    {
      question: 'What is the base material for the handle?',
      answer:
        'Depending on the specific model collection, our premium handles are forged from high-grade base materials including Solid Brass, Stainless Steel (Grade 304/316 for superior corrosion resistance), Zinc Alloy (Zamak), and Premium Aluminium. This ensures excellent structural integrity, tensile strength, and long-term durability.',
    },
    {
      question: 'What if my handle is free and the latch is working fine?',
      answer:
        'If the handle moves freely without resistance but the internal latch mechanism functions correctly, the issue is typically a broken or dislodged internal return spring inside the handle assembly, or a loose spindle/grub screw. Inspect the handle casing to ensure the square spindle bar is properly secured to both handles.',
    },
    {
      question: 'What are the finishes available in the Door Handle ?',
      answer:
        'Our door handles are available in a wide selection of premium architectural finishes. These include Matt Black, Satin Nickel, Polished Chrome, Antique Brass, PVD Gold, Brushed Rose Gold, and Oil Rubbed Bronze. Most finishes feature an advanced electroplated or PVD coating to protect against tarnish and fingerprints.',
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
        this.contactForm.reset({
          subject: 'order'
        });
      }, 1400);
    } else {
      Object.values(this.contactForm.controls).forEach((ctrl) => {
        ctrl.markAsTouched();
        ctrl.markAsDirty();
        ctrl.updateValueAndValidity({ onlySelf: true });
      });
    }
  }
}