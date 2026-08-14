'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import DataGrid, { Column, Pager, Paging, SearchPanel } from 'devextreme-react/data-grid';
import { Typography } from '@/components/ui';
import type { BulkUploadInvalidRowResponse } from '@/proxy/models';

interface Props {
  data: BulkUploadInvalidRowResponse[];
  emptyText: string;
}

export function UserBulkUploadInvalidGrid({ data, emptyText }: Props) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <Typography variant="body" className="text-text-secondary">
        {emptyText}
      </Typography>
    );
  }

  return (
    <DataGrid dataSource={data} showBorders columnAutoWidth>
      <SearchPanel visible />
      <Paging defaultPageSize={uiConfig.grid.defaultPageSize} />
      <Pager allowedPageSizes={uiConfig.grid.sidebarPageSizes} showPageSizeSelector showInfo />
      <Column dataField="rowNumber" caption={t('users:bulkUpload.columns.row')} width={60} />
      <Column dataField="firstName" caption={t('users:bulkUpload.columns.firstName')} />
      <Column dataField="lastName" caption={t('users:bulkUpload.columns.lastName')} />
      <Column dataField="email" caption={t('users:bulkUpload.columns.email')} />
      <Column dataField="phoneNumber" caption={t('users:bulkUpload.columns.phone')} />
      <Column
        dataField="errors"
        caption={t('users:bulkUpload.columns.errors')}
        calculateCellValue={(row: BulkUploadInvalidRowResponse) => (row.errors ?? []).join('; ')}
      />
    </DataGrid>
  );
}
