import { Component } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  socialLinkedIn?: string;
}

export interface Achievement {
  year: string;
  title: string;
  description: string;
  icon: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzIconModule,
    NzTimelineModule,
    NzStatisticModule,
    NzTagModule,
  ],
  templateUrl: './about.html',
  styleUrls: ['./about.scss'],
})
export class About {

  // achievements: Achievement[] = [
  //   {
  //     year: '1999',
  //     title: 'Founded Everest Instruments',
  //     description: 'Founded Everest Instruments, which has since become a leading provider of dairy and food & beverage industry solutions.',
  //     icon: 'home',
  //     highlight: true,
  //   },
  //   {
  //     year: '2005',
  //     title: 'Pioneered Milk Analyzing Instruments',
  //     description: 'Pioneered the milk analyzing instruments business in India.',
  //     icon: 'fund',
  //     highlight: true,
  //   },
  //   {
  //     year: '2010',
  //     title: 'Expanded Production Capacity',
  //     description: 'Expanded the production capacity at the Visnagar Plant.',
  //     icon: 'environment',
  //   },
  //   {
  //     year: '2016',
  //     title: 'Berlin Branch & Research Center',
  //     description: 'Established an integrated branch office and research center in Berlin.',
  //     icon: 'trophy',
  //     highlight: true,
  //   },
  //   {
  //     year: '2017',
  //     title: 'State-of-the-Art Factory in Gandhinagar',
  //     description: 'Opened a state-of-the-art factory in Gandhinagar, Gujarat, with the potential for future expansion.',
  //     icon: 'star',
  //     highlight: true,
  //   },
  //   {
  //     year: '2019',
  //     title: 'Strategic Partnership with PerkinElmer',
  //     description: 'Entered into a strategic partnership with PerkinElmer to become their exclusive distributor of dairy applications market.',
  //     icon: 'bank',
  //   },
  //   {
  //     year: '2023',
  //     title: 'Launched FatScan Milk Analyzer',
  //     description: 'Launched the FatScan Milk Analyzer, a device that can accurately and precisely analyze milk quality in real time.',
  //     icon: 'crown',
  //     highlight: true,
  //   },
  //   {
  //     year: '2024',
  //     title: 'FatScan FTIR & Somatic Cell Analyzer',
  //     description: 'Conceptualized FatScan FTIR Milk Analyzer & Somatic Cell.',
  //     icon: 'rocket',
  //     highlight: true,
  //   },
  //   {
  //     year: '2025',
  //     title: 'Rapid / Food Safety & MBRT Analysis',
  //     description: 'Developed products for Rapid/Food Safety & MBRT analysis.',
  //     icon: 'rocket',
  //     highlight: true,
  //   },
  // ];

  achievements: Achievement[] = [
    {
      year: '1999',
      title: 'Founded DUSTER',
      description: 'Founded DUSTER, establishing a specialized hub for bespoke architectural fittings and premium luxury profiles.',
      icon: 'home',
      highlight: true,
    },
    {
      year: '2005',
      title: 'Pioneered Integrated Channel Pulls',
      description: 'Pioneered the first seamless integrated kitchen and cabinet profile systems in the local market.',
      icon: 'build',
      highlight: false,
    },
    {
      year: '2010',
      title: 'Expanded Production Capacity',
      description: 'Expanded manufacturing capabilities and automated extrusion capacity at the Rajkot Plant.',
      icon: 'setting',
      highlight: true,
    },
    {
      year: '2016',
      title: 'Berlin Design Studio',
      description: 'Established an integrated design studio and architectural research center in Berlin to influence luxury trends.',
      icon: 'global',
      highlight: false,
    },
    {
      year: '2017',
      title: 'State-of-the-Art Extrusion Plant',
      description: 'Opened a state-of-the-art profile extrusion and treatment factory in Gujarat with clean automated anodizing lines.',
      icon: 'bank',
      highlight: true,
    },
    {
      year: '2019',
      title: 'Strategic Architectural Partnerships',
      description: 'Formed alliances with premium European architectural networks to serve as exclusive custom hardware specs partner.',
      icon: 'team',
      highlight: false,
    },
    {
      year: '2023',
      title: 'Launched Silent Sliding Gear System',
      description: 'Introduced the flagship concealed sliding track line with soft-close motion gears.',
      icon: 'rocket',
      highlight: true,
    },
    {
      year: '2024',
      title: 'Dynamic Lighting Gola Handles',
      description: 'Conceptualized and launched integrated LED channel lighting Gola hardware.',
      icon: 'fund',
      highlight: false,
    },
    {
      year: '2025',
      title: 'Premium Anodized Brass Finish Line',
      description: 'Developed advanced PVD finish lines for durable Brushed Gold and Muted Brass hardware coatings.',
      icon: 'safety',
      highlight: true,
    },
  ];

  teamMembers: TeamMember[] = [
    {
      name: 'Mr. Ajit Patel',
      role: 'Managing Director',
      avatar: 'AP',
      socialLinkedIn: 'https://www.linkedin.com',
    },
    {
      name: 'Parimal Patel',
      role: 'Joint Managing Director',
      avatar: 'PP',
      socialLinkedIn: 'https://www.linkedin.com',
    },
  ];

  avatarColors = [
    '#D4AF37',
    '#E5C158',
  ];

  getAvatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }
}