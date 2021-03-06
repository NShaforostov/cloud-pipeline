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

import moment from 'moment';
import BaseBillingRequest from './base-billing-request';
import GetDataWithPrevious from './get-data-with-previous';
import {costMapper} from './utils';

class GetBillingData extends BaseBillingRequest {
  constructor (filter) {
    super(filter);
    const {dateFilter, dateMapper} = filter;
    this.dateMapper = dateMapper || (o => o);
    this.dateFilter = dateFilter || (() => true);
  }

  static FILTER_BY = {
    storages: 'STORAGE',
    objectStorages: 'OBJECT_STORAGE',
    fileStorages: 'FILE_STORAGE',
    compute: 'COMPUTE',
    cpu: 'CPU',
    gpu: 'GPU'
  };

  async prepareBody () {
    await super.prepareBody();
    if (this.filters && this.filters.tick) {
      this.body.interval = this.filters.tick;
    }
    if (this.filters.filterBy) {
      if ([
        GetBillingData.FILTER_BY.storages,
        GetBillingData.FILTER_BY.fileStorages,
        GetBillingData.FILTER_BY.objectStorages
      ].includes(this.filters.filterBy)) {
        this.body.filters.resource_type = ['STORAGE'];
        if (this.filters.filterBy === GetBillingData.FILTER_BY.fileStorages) {
          this.body.filters.storage_type = ['FILE_STORAGE'];
        } else if (this.filters.filterBy === GetBillingData.FILTER_BY.objectStorages) {
          this.body.filters.storage_type = ['OBJECT_STORAGE'];
        }
      } else if ([
        GetBillingData.FILTER_BY.compute,
        GetBillingData.FILTER_BY.cpu,
        GetBillingData.FILTER_BY.gpu
      ].includes(this.filters.filterBy)) {
        this.body.filters.resource_type = ['COMPUTE'];
        if (this.filters.filterBy === GetBillingData.FILTER_BY.cpu) {
          this.body.filters.compute_type = ['CPU'];
        } else if (this.filters.filterBy === GetBillingData.FILTER_BY.gpu) {
          this.body.filters.compute_type = ['GPU'];
        }
      }
    }
  }

  postprocess (value) {
    const payload = super.postprocess(value);

    const res = {
      quota: null,
      previousQuota: null,
      values: []
    };
    (payload || []).forEach((item) => {
      const initialDate = moment.utc(item.periodStart, 'YYYY-MM-DD HH:mm:ss.SSS');
      if (this.dateFilter(initialDate)) {
        const momentDate = this.dateMapper(initialDate);
        res.values.push({
          date: moment(momentDate).format('DD MMM YYYY'),
          value: isNaN(item.accumulatedCost) ? undefined : costMapper(item.accumulatedCost),
          cost: isNaN(item.cost) ? undefined : costMapper(item.cost),
          dateValue: momentDate,
          initialDate
        });
      }
    });

    return res;
  }
}

class GetBillingDataWithPreviousRange extends GetDataWithPrevious {
  constructor (filter) {
    super(GetBillingData, filter);
  }

  static FILTER_BY = GetBillingData.FILTER_BY;

  send () {
    return this.fetch();
  }

  postprocess (value) {
    const {current, previous} = super.postprocess(value);
    if (!previous) {
      return current;
    }
    const {values: previousValues = []} = previous;
    const {values: currentValues = [], ...rest} = current || {};
    const result = previousValues.length > 0
      ? previousValues.map((o) => (
        {
          ...o,
          previous: o.value,
          previousCost: o.cost,
          previousInitialDate: o.initialDate
        }))
      : [];
    result.forEach((o) => {
      delete o.value;
      delete o.cost;
    });
    for (let i = 0; i < (currentValues || []).length; i++) {
      const item = currentValues[i];
      const {date} = item;
      const [prev] = result.filter((r) => r.date === date);
      if (prev) {
        prev.value = item.value;
        prev.cost = item.cost;
      } else {
        result.push(item);
      }
    }
    const sorter = (a, b) => a.dateValue - b.dateValue;
    result.sort(sorter);
    return {...rest, values: result};
  }
}

export default GetBillingDataWithPreviousRange;
