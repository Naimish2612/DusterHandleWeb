### GET – Without Params

this.api
  .get<DashboardSummary>(MODULE, 'dashboard/summary')
  .subscribe({
    next: res => {
      console.log('Dashboard data:', res.data);
    },
    error: err => {
      console.error(err.message);
    }
  });


### GET – With Single Param

this.api
  .get<UserDto>(MODULE, 'user/view', { userId: 10 })
  .subscribe({
    next: res => {
      console.log('User:', res.data);
    },
    error: err => {
      console.error(err.message);
    }
  });

### URL generated: /api/common/user/view?userId=10

### GET – With Multiple Params

this.api
  .get<UserDto[]>(MODULE, 'user/list', {
    page: 1,
    pageSize: 20,
    isActive: true
  })
  .subscribe({
    next: res => {
      console.log('Users:', res.data);
    },
    error: err => {
      console.error(err.message);
    }
  });

### /api/common/user/list?page=1&pageSize=20&isActive=true


### POST – With Object Payload

const payload = {
  roleName: 'ADMIN',
  description: 'Administrator role'
};

this.api
  .post<null>(MODULE, 'role/create', payload)
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });


### PUT – With Single Param
this.api
  .put<null>(MODULE, 'user/activate', { userId: 15 })
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });


### PUT – With Multiple Params

this.api
  .put<null>(MODULE, 'role/update-status', {
    roleId: 5,
    isActive: false
  })
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });


### DELETE – With Single Param
this.api
  .delete<null>(MODULE, 'role/delete', { roleId: 3 })
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });


### DELETE – With Multiple Params

this.api
  .delete<null>(MODULE, 'user/delete-bulk', {
    ids: '1,2,3',
    force: true
  })
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });

### Upload Single File

const formData = new FormData();
formData.append('file', this.selectedFile);

this.api
  .upload<null>(MODULE, 'file/upload-profile', formData)
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });


### Upload Multiple File

const formData = new FormData();

this.files.forEach(file => {
  formData.append('files', file);
});

this.api
  .upload<null>(MODULE, 'file/upload-documents', formData)
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });

### Payload + Upload File 

const employee = {
  name: 'John Doe',
  departmentId: 3
};

const formData = new FormData();
formData.append('file', this.photoFile);
formData.append('payload', JSON.stringify(employee));

this.api
  .upload<null>(MODULE, 'employee/create-with-photo', formData)
  .subscribe({
    next: res => {
      console.log(res.message);
    },
    error: err => {
      console.error(err.message);
    }
  });

### DOWNLOAD – Single File

this.api
  .download(MODULE, 'invoice/download', { invoiceId: 101 })
  .subscribe(blob => {
    saveAs(blob, 'invoice-101.pdf');
  });


### DOWNLOAD – Multiple Files (ZIP)

this.api
  .download(MODULE, 'report/download-zip', {
    fromDate: '2026-01-01',
    toDate: '2026-01-31'
  })
  .subscribe(blob => {
    saveAs(blob, 'reports-jan-2026.zip');
  });
