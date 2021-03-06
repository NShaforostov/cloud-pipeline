import Remote from './base';

export default class UploadUrl extends Remote {
  constructor(path) {
    super();
    this.url = `/uploadUrl/${path.startsWith('/') ? path.substring(1) : path}`;
  }
}
