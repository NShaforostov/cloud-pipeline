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
import PropTypes from 'prop-types';
import AWSRegionTag from '../../special/AWSRegionTag';
import {Link} from 'react-router';
import {computed} from 'mobx';
import {inject, observer} from 'mobx-react';
import classNames from 'classnames';
import styles from './data-storage-badge.css';

@inject('dataStorages')
@observer
class DataStorageBadge extends React.Component {
  @computed
  get storageInfo () {
    const {dataStorages, storageId, storage} = this.props;
    if (typeof storage === 'object' && storage !== null && Object.keys(storage).length) {
      return storage;
    }
    if (dataStorages.loaded) {
      const [storage] = (this.props.dataStorages.value || [])
        .filter(storage => String(storage.id) === String(storageId))
        .map((s) => s);
      return storage;
    }
    return null;
  }

  render () {
    const {storageId, showUnknown, storage} = this.props;
    if (!storageId && !storage) {
      return null;
    };
    if (!this.storageInfo && showUnknown) {
      return (
        <span className={[styles.storageItem, styles.unknownStorage].join(' ')}>
          Unknown Storage
        </span>);
    };
    return (
      <Link
        className={styles.storageItem}
        to={`/storage/${this.storageInfo.id}`}
      >
        <AWSRegionTag regionId={this.storageInfo.regionId} />
        <span className={classNames(
          styles.storageName, {
            [styles.sensitiveStorageName]: this.storageInfo.sensitive
          }
        )}>{this.storageInfo.name}</span>
      </Link>
    );
  }
}

DataStorageBadge.propTypes = {
  storageId: PropTypes.string,
  showUnknown: PropTypes.bool,
  storage: PropTypes.object
};

DataStorageBadge.defaultProps = {
  storageId: null,
  showUnknown: false,
  storage: null
};

export default DataStorageBadge;
