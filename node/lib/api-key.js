class ApiKey {
  constructor(keyAsString) {
    this.key = keyAsString;
    this.creation = Date.now();
    this.disabled = false;
  }

  active() {
    return !this.disabled;
  }

  static fromObject(apiKeyObject) {
    const apiKey = new ApiKey(apiKeyObject.key);
    apiKey.creation = apiKeyObject.creation;
    apiKey.disabled = apiKeyObject.disabled;
  }
}

module.exports = ApiKey;
