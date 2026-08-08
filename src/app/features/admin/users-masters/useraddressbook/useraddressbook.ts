import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { map } from 'rxjs';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';

interface CategoryOption {
  id: number;
  value: string;
}
@Component({
  selector: 'app-useraddressbook',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzGridModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzCardModule,
    NzSwitchModule,
    NzDividerModule,
    NzTagModule,
    NzTableModule,
    NzIconModule,
    NzModalModule,
    NzEmptyModule,
  ],
  templateUrl: './useraddressbook.html',
  styleUrl: './useraddressbook.scss',
})
export class Useraddressbook implements OnInit {
  api = inject(ApiCallService);
  form!: FormGroup;
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  userList: CategoryOption[] = [];
  addressList: any[] = [];
  fb = inject(FormBuilder);
  selectedUserType = '';
  user_code: number | undefined;
  ngOnInit(): void {
    this.initForm();
  }
  initForm(): void {
    this.form = this.fb.group({
      user_code: [null, [Validators.required]],
      user_type: ['', [Validators.required]],
    });
  }
  loadUser(type: string) {
    this.api
      .get<any>('common', `${API_ENDPOINTS.USER_ADMIN.USER_BY_USERTYPE}/${type}`)
      .pipe(map((res) => res.data ?? []))
      .subscribe({
        next: (data: CategoryOption[]) => {
          this.userList = data;
        },
        error: (err) => console.error('Failed to load category dropdown', err),
      });
  }

  onUserTypeChange(type: string): void {
    this.form.get('user_code')?.reset();
    this.loadUser(type);
  }
  onUserChange(type: number) {
    this.user_code = type;
  }
  submit() {
    this.loader.showGlobal('Fetching Address..');
    this.api
      .get<any>('common', `${API_ENDPOINTS.USER_ADMIN.USER_ADDRESS_BOOK}/${this.user_code}`)
      .pipe(map((res) => res.data ?? []))
      .subscribe({
        next: (data) => {
          this.addressList = data;
          this.loader.hideGlobal();

        },
        error: (err) => {
          console.error('Failed to load address', err);
          this.addressList = [];
          this.loader.hideGlobal();
          this.message.error('No address found');
        },
      });
  }
}
