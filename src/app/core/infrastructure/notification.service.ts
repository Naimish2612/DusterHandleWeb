import { Injectable } from '@angular/core';
import {
  NzNotificationDataOptions,
  NzNotificationService,
} from 'ng-zorro-antd/notification';
import { NotificationModel } from '../../shared/models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private nzNotification: NzNotificationService) {}

  Success(config: NotificationModel) {
    const options: NzNotificationDataOptions = {
      nzDuration: (config.duration ?? 3) * 1000, // default 3 seconds
      nzPlacement: 'bottomRight',
      nzClass: ``,
      nzAnimate: true,
    };

    this.nzNotification.success(config.title, config.message, options);
  }

  Error(config: NotificationModel) {
    const options: NzNotificationDataOptions = {
      nzDuration: (config.duration ?? 5) * 1000, // default 5 seconds
      nzPlacement: 'bottomRight',
      nzClass: ``,
      nzAnimate: true,
    };

    const lines = typeof config.message === 'string' ? config.message.split('\n') : [config.message];

    const htmlContent = lines.map(line => `<div>${line}</div>`).join('');

    this.nzNotification.error(
      config.title, 
      htmlContent,
      options
    );
  }

  Info(config: NotificationModel) {
    const options: NzNotificationDataOptions = {
      nzDuration: (config.duration ?? 3) * 1000, // default 3 seconds
      nzPlacement: 'bottomRight',
      nzClass: ``,
      nzAnimate: true,
    };

    this.nzNotification.info(config.title, config.message, options);
  }

  Warning(config: NotificationModel) {
    const options: NzNotificationDataOptions = {
      nzDuration: (config.duration ?? 5) * 1000, // default 5 seconds
      nzPlacement: 'bottomRight',
      nzClass: ``,
      nzAnimate: true,
    };

    this.nzNotification.warning(config.title, config.message, options);
  }
}
