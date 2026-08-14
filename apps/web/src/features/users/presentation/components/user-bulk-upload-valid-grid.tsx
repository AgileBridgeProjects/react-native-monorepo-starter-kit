'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import DataGrid, { Column, Pager, Paging, SearchPanel } from 'devextreme-react/data-grid';
import { Typography } from '@/components/ui';
import type { BulkUploadValidRowRequest } from '@/proxy/models';

interface Props {
  data: BulkUploadValidRowRequest[];
  emptyText: string;
}

export function UserBulkUploadValidGrid({ data, emptyText }: Props) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <Typography variant="body" className="text-text-secondary">
        {emptyText}
      </Typography>
    );
  }

  return (
    <DataGrid dataSource={data} keyExpr="rowNumber" showBorders columnAutoWidth repaintChangesOnly>
      <SearchPanel visible />
      <Paging defaultPageSize={uiConfig.grid.defaultPageSize} />
      <Pager allowedPageSizes={uiConfig.grid.sidebarPageSizes} showPageSizeSelector showInfo />
      <Column dataField="rowNumber" caption={t('users:bulkUpload.columns.row')} width={60} />
      <Column dataField="firstName" caption={t('users:bulkUpload.columns.firstName')} />
      <Column dataField="lastName" caption={t('users:bulkUpload.columns.lastName')} />
      <Column dataField="email" caption={t('users:bulkUpload.columns.email')} />
      <Column dataField="phoneNumber" caption={t('users:bulkUpload.columns.phone')} />
      <Column dataField="username" caption={t('users:columns.username')} />
      <Column dataField="authMethod" caption={t('users:bulkUpload.columns.authMethod')} />
      <Column dataField="roleName" caption={t('users:bulkUpload.columns.role')} />
      <Column dataField="teamName" caption={t('users:bulkUpload.columns.team')} />
      <Column dataField="dateOfBirth" caption={t('users:bulkUpload.columns.dateOfBirth')} />
      <Column dataField="position" caption={t('users:bulkUpload.columns.position')} />
      <Column dataField="jerseyNumber" caption={t('users:bulkUpload.columns.jerseyNumber')} />
      <Column
        dataField="parentGuardianEmail"
        caption={t('users:bulkUpload.columns.parentGuardianEmail')}
      />
    </DataGrid>
  );
}
