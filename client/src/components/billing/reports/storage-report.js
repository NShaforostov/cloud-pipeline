/*
 * Copyright 2017-2020 EPAM Systems, Inc. (https://www.epam.com/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import {inject, observer} from 'mobx-react';
import {
  Table
} from 'antd';
import moment from 'moment-timezone';
import {
  BarChart,
  BillingTable,
  Summary
} from './charts';
import {Period, getPeriod} from './periods';
import {
  GetBillingData,
  GetGroupedBillingData,
  GetGroupedBillingDataPaginated,
  GetGroupedBillingDataWithPreviousPaginated
} from '../../../models/billing';
import styles from './reports.css';

const tablePageSize = 10;

function injection (stores, props) {
  const {location, params} = props;
  const {type} = params || {};
  const {
    user,
    group,
    period = Period.month,
    range
  } = location.query;
  const periodInfo = getPeriod(period, range);
  const filters = {
    group,
    user,
    type,
    ...periodInfo
  };
  let groupedBy = GetGroupedBillingData.GROUP_BY.storages;
  let filterBy = GetBillingData.FILTER_BY.storages;
  if (/^file$/i.test(type)) {
    groupedBy = GetGroupedBillingData.GROUP_BY.fileStorages;
    filterBy = GetBillingData.FILTER_BY.fileStorages;
  }
  if (/^object$/i.test(type)) {
    groupedBy = GetGroupedBillingData.GROUP_BY.objectStorages;
    filterBy = GetBillingData.FILTER_BY.objectStorages;
  }
  const storages = new GetGroupedBillingDataWithPreviousPaginated(
    filters,
    groupedBy,
    tablePageSize,
    0
  );
  storages.fetch();
  const storagesTable = new GetGroupedBillingDataPaginated(filters, groupedBy, tablePageSize, 0);
  storagesTable.fetch();
  const summary = new GetBillingData({
    ...filters,
    filterBy
  });
  summary.fetch();

  return {
    user,
    group,
    type,
    summary,
    storages,
    storagesTable
  };
}

function StoragesDataBlock ({children}) {
  return (
    <div className={styles.storagesChartsContainer}>
      <div>
        {children}
      </div>
    </div>
  );
}

function renderTable ({storages}) {
  if (!storages || !storages.loaded) {
    return null;
  }
  const columns = [
    {
      key: 'storage',
      title: 'Storage',
      render: ({info, name}) => {
        return info && info.name ? info.pathMask || info.name : name;
      }
    },
    {
      key: 'owner',
      title: 'Owner',
      dataIndex: 'owner'
    },
    {
      key: 'cost',
      title: 'Cost',
      dataIndex: 'value',
      render: (value) => value ? `$${Math.round(value * 100.0) / 100.0}` : null
    },
    {
      key: 'region',
      title: 'Region',
      dataIndex: 'region'
    },
    {
      key: 'provider',
      title: 'Provider',
      dataIndex: 'provider'
    },
    {
      key: 'created',
      title: 'Created date',
      dataIndex: 'created',
      render: (value) => moment.utc(value).format('DD MMM YYYY')
    }
  ];
  const dataSource = Object.values(storages.value || {});
  return (
    <Table
      rowKey={({info, name}) => {
        return info && info.id ? `storage_${info.id}` : `storage_${name}`;
      }}
      loading={storages.pending}
      dataSource={dataSource}
      columns={columns}
      pagination={{
        current: storages.pageNum + 1,
        pageSize: storages.pageSize,
        total: storages.totalPages * storages.pageSize,
        onChange: async (page) => {
          await storages.fetchPage(page - 1);
        }
      }}
      size="small"
    />
  );
}

const RenderTable = observer(renderTable);

function StorageReports ({storages, storagesTable, summary, type}) {
  const getSummaryTitle = () => {
    if (/^file$/i.test(type)) {
      return 'File storages usage';
    }
    if (/^object$/i.test(type)) {
      return 'Object storages usage';
    }
    return 'Storages usage';
  };
  const getTitle = () => {
    if (/^file$/i.test(type)) {
      return 'File storages';
    }
    if (/^object$/i.test(type)) {
      return 'Object storages';
    }
    return 'Storages';
  };
  return (
    <div className={styles.chartsContainer}>
      <StoragesDataBlock>
        <BillingTable summary={summary} showQuota={false} />
        <Summary
          summary={summary}
          quota={false}
          title={getSummaryTitle()}
          style={{flex: 1, maxHeight: 500}}
        />
      </StoragesDataBlock>
      <StoragesDataBlock className={styles.chartsColumnContainer}>
        <BarChart
          data={storages && storages.loaded ? storages.value : {}}
          error={storages && storages.error ? storages.error : null}
          title={getTitle()}
          top={tablePageSize}
          style={{height: 300}}
        />
        <RenderTable storages={storagesTable} />
      </StoragesDataBlock>
    </div>
  );
}

export default inject(injection)(observer(StorageReports));