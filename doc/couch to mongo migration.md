CouchDB to MongoDB migration
============================

10er10 storage system has switched from CouchDB to MongoDB on version 1.0.0. Follow the steps below to configure your 10er10 instance and migrate your data.

Install MongoDB
---------------

Follow the instructions of [the official MongoDB documentation](https://docs.mongodb.com/manual/installation/) to setup MongoDB on your system. The minimum required version of MongoDB is **4.0.0**.

Update your configuration
-------------------------

In your configuration file, located in the **node/** folder, and named **config.local.js**, add the information needed to connect to the MongoDB datastore:

Example for production configuration:

```javascript
exports.mongo_prod = {
  url: 'mongodb://localhost:27017/d10_prod',
  database: 'd10_prod',
  options: {},
};
```

Example for development configuration:

```javascript
exports.mongo_dev = {
  url: 'mongodb://localhost:27017/d10_dev',
  database: 'd10_dev',
  options: {},
};
```

Launch the migration script
---------------------------

The migration script is located in the folder **node/admin**, and is named **couch2mongo.js**. The migration script will not alter the data of your CouchDB server in any way, you can launch it for testing as many times as you need.

Example use of the couch2mongo.js script:

```shell
cd node/admin
node couch2mongo.js
```

The script will ask the environment to migrate ((p)roduction or (d)evelopment), then it will give you 5 seconds to abort the process by using the [Ctrl]-C keys.

At the end of the script, either everything ran fine and the message: **Migration complete. No error** is displayed, or errors are displayed. Do not hesitate to report errors on the [project issue board on Github](https://github.com/dready92/10er10/issues).
