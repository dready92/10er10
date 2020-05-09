class ApiKey {
  constructor(keyAsString) {
    this.key = keyAsString;
    this.creation = Date.now();
    this.disabled = false;
    this.description = null;
    this.pairing = null;
  }

  active() {
    return !this.disabled;
  }

  static fromObject(apiKeyObject) {
    const apiKey = new ApiKey(apiKeyObject.key);
    apiKey.creation = apiKeyObject.creation;
    apiKey.disabled = apiKeyObject.disabled;
    this.description = ('description' in apiKeyObject) ? apiKeyObject.description : null;
    this.pairing = ('pairing' in apiKeyObject) ? apiKeyObject.pairing : null;
  }
}

module.exports = ApiKey;
