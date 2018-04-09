class ApiKey {
  constructor(keyAsString) {
    this.key = keyAsString;
    this.creation = Date.now();
    this.disabled = false;
    this._id = null;
  }

  active() {
    return !this.disabled;
  }

  static fromObject(apiKeyObject) {
    const apiKey = new ApiKey(apiKeyObject.key);
    apiKey.creation = apiKeyObject.creation;
    apiKey.disabled = apiKeyObject.disabled;
    if (apiKeyObject._id) apiKey._id = apiKeyObject._id;
  }
}

module.exports = ApiKey;
